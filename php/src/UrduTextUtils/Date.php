<?php

declare(strict_types=1);

namespace UrduTextUtils;

use DateTime;
use DateTimeInterface;
use DateTimeZone;

/**
 * Urdu date formatting and relative time — a faithful PHP port of src/date.ts.
 *
 * Month and weekday name tables live in tables.json (generated from
 * src/date.ts), so the two languages consume identical data.
 *
 * Accepts DateTimeInterface, parseable date strings and Unix timestamps.
 * Like the TypeScript Date getters, all components are resolved in the
 * runtime's local timezone: the TS library runs wherever Node runs (UTC in
 * CI, local time on a user machine), PHP behaves the same via date_default_timezone.
 */
final class Date
{
    private const TOKEN_RE = '/YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a/';

    /**
     * Returns the Urdu name for a given month index (0 to 11), wrapping
     * out-of-range indices like the TS implementation.
     *
     * @param 'gregorian'|'hijri' $calendar
     */
    public static function getUrduMonthName(int $monthIndex, string $calendar = 'gregorian'): string
    {
        $normalized = intdiv((int) floor($monthIndex), 1) % 12;
        $idx = $normalized < 0 ? $normalized + 12 : $normalized;
        $names = $calendar === 'hijri'
            ? Tables::date()['monthsHijri']
            : Tables::date()['monthsGregorian'];

        return $names[$idx];
    }

    /** Returns the Urdu name for a day of the week (0 = Sunday, 6 = Saturday). */
    public static function getUrduWeekdayName(int $dayIndex): string
    {
        $normalized = $dayIndex % 7;
        $idx = $normalized < 0 ? $normalized + 7 : $normalized;

        return Tables::date()['weekdays'][$idx];
    }

    /**
     * Formats a date into an Urdu formatted date string.
     *
     * $date accepts a DateTimeInterface, a string parseable by strtotime()
     * (ISO-8601 recommended) or a Unix timestamp in seconds.
     *
     * Supported tokens: YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh h mm m ss s A a.
     *
     * @param DateTimeInterface|string|int $date
     * @param array{digits?: 'urdu'|'english', calendar?: 'gregorian'|'hijri'} $options
     */
    public static function formatUrduDate(DateTimeInterface|string|int $date, string $pattern = 'DD MMMM YYYY', array $options = []): string
    {
        $d = self::parseDateInput($date);
        if ($d === null) {
            return '';
        }

        $digits = $options['digits'] ?? 'urdu';
        $calendar = $options['calendar'] ?? 'gregorian';

        $year = (int) $d->format('Y');
        $month = (int) $d->format('n') - 1;
        $dayOfMonth = (int) $d->format('j');
        $dayOfWeek = (int) $d->format('w');
        $hours24 = (int) $d->format('G');
        $hours12 = $hours24 % 12 === 0 ? 12 : $hours24 % 12;
        $minutes = (int) $d->format('i');
        $seconds = (int) $d->format('s');

        $pad = static fn (int $n): string => $n < 10 ? "0{$n}" : "{$n}";

        // Day period calculation, identical boundaries to src/date.ts.
        if ($hours24 >= 4 && $hours24 < 12) {
            $periodDetailed = 'صبح';
            $periodSimple = 'صبح';
        } elseif ($hours24 >= 12 && $hours24 < 16) {
            $periodDetailed = 'دوپہر';
            $periodSimple = 'شام';
        } elseif ($hours24 >= 16 && $hours24 < 20) {
            $periodDetailed = 'شام';
            $periodSimple = 'شام';
        } else {
            $periodDetailed = 'رات';
            $periodSimple = 'رات';
        }

        $tokenValues = [
            'YYYY' => "{$year}",
            'YY' => substr("{$year}", -2),
            'MMMM' => self::getUrduMonthName($month, $calendar),
            'MMM' => self::getUrduMonthName($month, $calendar),
            'MM' => $pad($month + 1),
            'M' => (string) ($month + 1),
            'DD' => $pad($dayOfMonth),
            'D' => "{$dayOfMonth}",
            'dddd' => self::getUrduWeekdayName($dayOfWeek),
            'ddd' => self::getUrduWeekdayName($dayOfWeek),
            'HH' => $pad($hours24),
            'H' => "{$hours24}",
            'hh' => $pad($hours12),
            'h' => "{$hours12}",
            'mm' => $pad($minutes),
            'm' => "{$minutes}",
            'ss' => $pad($seconds),
            's' => "{$seconds}",
            'A' => $periodDetailed,
            'a' => $periodSimple,
        ];

        return preg_replace_callback(
            self::TOKEN_RE,
            static function (array $m) use ($tokenValues, $digits): string {
                $token = $m[0];
                $val = $tokenValues[$token] ?? null;
                if ($val === null) {
                    return $token;
                }

                return $digits === 'urdu' && preg_match('/^\d+$/', $val) === 1
                    ? Numbers::toUrduDigits($val)
                    : $val;
            },
            $pattern
        ) ?? $pattern;
    }

    /**
     * Returns a human-friendly relative time string in Urdu ("۵ منٹ پہلے",
     * "کل", "پرسوں", "۲ ہفتے بعد", …), mirroring the TS rounding ladder.
     *
     * @param DateTimeInterface|string|int $date
     * @param DateTimeInterface|string|int|null $relativeTo Defaults to the current time.
     * @param array{digits?: 'urdu'|'english', addSuffix?: bool} $options
     */
    public static function timeAgoUrdu(DateTimeInterface|string|int $date, DateTimeInterface|string|int|null $relativeTo = null, array $options = []): string
    {
        $d = self::parseDateInput($date);
        $now = $relativeTo === null
            ? new DateTime('now')
            : self::parseDateInput($relativeTo);
        if ($d === null || $now === null) {
            return '';
        }

        $digits = $options['digits'] ?? 'urdu';
        $addSuffix = $options['addSuffix'] ?? true;

        $formatNum = static function (int $num) use ($digits): string {
            $s = "{$num}";

            return $digits === 'urdu' ? Numbers::toUrduDigits($s) : $s;
        };

        $diffMs = ((int) $now->format('Uv')) - ((int) $d->format('Uv'));
        $isPast = $diffMs >= 0;
        $absDiffSeconds = (int) round(abs($diffMs) / 1000);

        // Less than 45 seconds
        if ($absDiffSeconds < 45) {
            return $isPast ? 'ابھی' : 'چند لمحے بعد';
        }

        // Minutes (45s to 45m)
        $minutes = (int) round($absDiffSeconds / 60);
        if ($minutes <= 45) {
            if ($minutes === 1) {
                return $addSuffix ? ($isPast ? 'ایک منٹ پہلے' : 'ایک منٹ بعد') : 'ایک منٹ';
            }
            $count = $formatNum($minutes);
            if (! $addSuffix) {
                return "{$count} منٹ";
            }

            return $isPast ? "{$count} منٹ پہلے" : "{$count} منٹ بعد";
        }

        // Hours (45m to 22 hours)
        $hours = (int) round($minutes / 60);
        if ($hours <= 22) {
            if ($hours === 1) {
                return $addSuffix ? ($isPast ? 'ایک گھنٹہ پہلے' : 'ایک گھنٹہ بعد') : 'ایک گھنٹہ';
            }
            $count = $formatNum($hours);
            if (! $addSuffix) {
                return "{$count} گھنٹے";
            }

            return $isPast ? "{$count} گھنٹے پہلے" : "{$count} گھنٹے بعد";
        }

        // Days (22 hours to 6 days)
        $days = (int) round($hours / 24);
        if ($days === 1) {
            return 'کل';
        }
        if ($days === 2) {
            return 'پرسوں';
        }
        if ($days <= 6) {
            $count = $formatNum($days);
            if (! $addSuffix) {
                return "{$count} دن";
            }

            return $isPast ? "{$count} دن پہلے" : "{$count} دن بعد";
        }

        // Weeks (7 days to 28 days)
        $weeks = (int) round($days / 7);
        if ($days <= 28) {
            if ($weeks === 1) {
                return $addSuffix ? ($isPast ? 'ایک ہفتہ پہلے' : 'ایک ہفتہ بعد') : 'ایک ہفتہ';
            }
            $count = $formatNum($weeks);
            if (! $addSuffix) {
                return "{$count} ہفتے";
            }

            return $isPast ? "{$count} ہفتے پہلے" : "{$count} ہفتے بعد";
        }

        // Months (29 days to 320 days)
        $months = (int) round($days / 30.44);
        if ($days <= 320) {
            if ($months <= 1) {
                return $addSuffix ? ($isPast ? 'ایک ماہ پہلے' : 'ایک ماہ بعد') : 'ایک ماہ';
            }
            $count = $formatNum($months);
            if (! $addSuffix) {
                return "{$count} ماہ";
            }

            return $isPast ? "{$count} ماہ پہلے" : "{$count} ماہ بعد";
        }

        // Years (> 320 days)
        $years = (int) round($days / 365.25);
        if ($years <= 1) {
            return $addSuffix ? ($isPast ? 'ایک سال پہلے' : 'ایک سال بعد') : 'ایک سال';
        }
        $count = $formatNum($years);
        if (! $addSuffix) {
            return "{$count} سال";
        }

        return $isPast ? "{$count} سال پہلے" : "{$count} سال بعد";
    }

    /** Normalize any accepted input to a DateTime, or null when invalid. */
    private static function parseDateInput(DateTimeInterface|string|int $input): ?DateTimeInterface
    {
        if ($input instanceof DateTimeInterface) {
            return $input;
        }
        if (is_int($input)) {
            $d = new DateTime();
            $d = DateTime::createFromFormat('U', (string) $input);
            if ($d === false) {
                return null;
            }
            $d->setTimezone(new DateTimeZone(date_default_timezone_get()));

            return $d;
        }

        // Match JS new Date(string): ISO strings parse as UTC; unparseable -> null.
        $d = new DateTime($input);
        if ($d === false) {
            return null;
        }

        return $d;
    }
}
