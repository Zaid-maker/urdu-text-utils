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

    /**
     * The day-period words formatUrduDate emits, and the 12-hour window each
     * one covers, so parsing can invert formatting exactly.
     *
     * رات is the awkward one: it spans 20:00-03:59, which hh renders as 08-11
     * and 12, 1, 2, 3 respectively. Both halves have to be resolved back.
     */
    private const URDU_PERIODS = [
        'صبح' => 'morning',
        'دوپہر' => 'afternoon',
        'شام' => 'evening',
        'رات' => 'night',
    ];

    private const ENGLISH_MONTHS = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
    ];

    private const ENGLISH_WEEKDAYS = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ];

    /**
     * Recognised month spellings -> month index. Only Gregorian names are
     * accepted: Hijri names include صفر, which is also the Urdu word for zero
     * and would make a bare صفر genuinely ambiguous.
     */
    private static function monthLookup(): array
    {
        static $lookup = null;
        if ($lookup === null) {
            $lookup = [];
            foreach (Tables::date()['monthsGregorian'] as $index => $name) {
                $lookup[$name] = $index;
            }
            foreach (self::ENGLISH_MONTHS as $index => $name) {
                $lookup[$name] = $index;
                $lookup[substr($name, 0, 3)] = $index;
            }
        }
        return $lookup;
    }

    /** Weekday names are recognised only so they can be skipped, never used. */
    private static function weekdayTokens(): array
    {
        static $tokens = null;
        if ($tokens === null) {
            $tokens = [];
            foreach (Tables::date()['weekdays'] as $name) {
                $tokens[$name] = true;
            }
            foreach (self::ENGLISH_WEEKDAYS as $name) {
                $tokens[$name] = true;
                $tokens[substr($name, 0, 3)] = true;
            }
        }
        return $tokens;
    }

    /** Resolve a 12-hour clock reading plus its period word to a 24-hour hour. */
    private static function resolveHour(int $hour, ?string $period): int
    {
        switch ($period) {
            case 'am':
            case 'morning':
                return $hour === 12 ? 0 : $hour;
            case 'pm':
            case 'afternoon':
            case 'evening':
                return $hour < 12 ? $hour + 12 : $hour;
            case 'night':
                if ($hour === 12) {
                    return 0;
                }
                // 20:00-23:59 formats as hh 08-11 with رات; 00:00-03:59 as 12, 1, 2, 3.
                return ($hour >= 8 && $hour <= 11) ? $hour + 12 : $hour;
            default:
                return $hour;
        }
    }

    /** Expand a two-digit year the way date libraries conventionally do. */
    private static function expandYear(int $year): int
    {
        if ($year >= 100) {
            return $year;
        }
        return $year < 70 ? 2000 + $year : 1900 + $year;
    }

    /** Build a DateTime from wall-clock components, rejecting overflowed dates. */
    private static function buildLocalDate(int $year, int $month, int $day, int $hour, int $minute, int $second): ?DateTime
    {
        if ($year < 100 || $month < 0 || $month > 11 || $day < 1 || $day > 31) {
            return null;
        }
        if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59 || $second < 0 || $second > 59) {
            return null;
        }

        // Every component is zero-padded and the format tokens are the padded
        // ones: createFromFormat requires exactly two digits for i and s, so a
        // single-digit minute/second ("0:0:0") makes it return false outright.
        $date = DateTime::createFromFormat(
            'Y-m-d H:i:s',
            sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month + 1, $day, $hour, $minute, $second)
        );
        if ($date === false) {
            return null;
        }

        // A rolled-over date (31 فروری) must not silently become March.
        if (
            (int) $date->format('Y') !== $year
            || (int) $date->format('n') - 1 !== $month
            || (int) $date->format('j') !== $day
            || (int) $date->format('G') !== $hour
        ) {
            return null;
        }

        return $date;
    }

    /** Numeric date form, day-first (Pakistani convention) or ISO with a 4-digit lead. */
    private static function parseNumericDate(string $input): ?DateTime
    {
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $input, $m) === 1) {
            return self::buildLocalDate(
                (int) $m[1],
                (int) $m[2] - 1,
                (int) $m[3],
                isset($m[4]) && $m[4] !== '' ? (int) $m[4] : 0,
                isset($m[5]) && $m[5] !== '' ? (int) $m[5] : 0,
                isset($m[6]) && $m[6] !== '' ? (int) $m[6] : 0
            );
        }

        if (preg_match('/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $input, $m) === 1) {
            return self::buildLocalDate(
                self::expandYear((int) $m[3]),
                (int) $m[2] - 1,
                (int) $m[1],
                isset($m[4]) && $m[4] !== '' ? (int) $m[4] : 0,
                isset($m[5]) && $m[5] !== '' ? (int) $m[5] : 0,
                isset($m[6]) && $m[6] !== '' ? (int) $m[6] : 0
            );
        }

        return null;
    }

    /**
     * Parse a date written with Urdu or English month names and Urdu or ASCII
     * digits. This is the inverse of formatUrduDate, so anything that function
     * can produce parses back to the same wall-clock moment.
     *
     * Accepted input:
     * - ۲۲ اگست ۲۰۲۶, 22 August 2026, Aug 22, 2026 (Urdu or English month name)
     * - ۲۲/۰۸/۲۰۲۶ — day-first, matching Pakistani convention
     * - 2026-08-22 and 2026-08-22T14:30 — ISO, T form, no timezone offset
     * - an optional preceding weekday name (ignored) and an optional time with
     *   صبح دوپہر شام رات or am/pm, e.g. ۰۲:۳۰ دوپہر
     *
     * Deliberately rejected, returning null: absolute instants carrying a Z or
     * numeric offset (this never does timezone conversion — it builds the
     * wall-clock time in the runtime's own zone, exactly as formatUrduDate
     * reads it), Hijri month names, and dates that do not exist (۳۱ فروری).
     * A two-digit year expands as 00-69 -> 20xx and 70-99 -> 19xx.
     *
     * @param array{defaultYear?: int} $options
     */
    public static function parseUrduDate(string $input, array $options = []): ?DateTime
    {
        if ($input === '') {
            return null;
        }

        $normalized = Numbers::toEnglishDigits($input);
        $normalized = preg_replace('/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', '', $normalized) ?? $normalized;
        $normalized = str_replace(['،', '۔'], ' ', $normalized);
        $normalized = trim(preg_replace('/\s+/u', ' ', $normalized) ?? $normalized);
        if ($normalized === '') {
            return null;
        }

        $numeric = self::parseNumericDate($normalized);
        if ($numeric !== null) {
            return $numeric;
        }

        $month = null;
        $hour = null;
        $minute = 0;
        $second = 0;
        $period = null;
        $numbers = [];
        $weekdays = self::weekdayTokens();
        $months = self::monthLookup();

        foreach (explode(' ', $normalized) as $rawToken) {
            // Strip punctuation hugging a token (۲۰۲۶، is already spaced out, but
            // 2026. and (۲۰۲۶) are not).
            $token = preg_replace('/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/u', '', $rawToken) ?? $rawToken;
            if ($token === '') {
                continue;
            }

            $urduPeriod = self::URDU_PERIODS[$token] ?? null;
            if ($urduPeriod !== null) {
                $period = $urduPeriod;
                continue;
            }

            // strtolower, not mb_strtolower: English month names are ASCII and
            // mbstring is deliberately not a required extension.
            $lower = strtolower($token);
            if ($lower === 'am' || $lower === 'pm') {
                $period = $lower;
                continue;
            }

            if (isset($weekdays[$token]) || isset($weekdays[$lower])) {
                continue;
            }

            if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $token, $m) === 1) {
                $hour = (int) $m[1];
                $minute = (int) $m[2];
                $second = isset($m[3]) && $m[3] !== '' ? (int) $m[3] : 0;
                continue;
            }

            $monthIndex = $months[$token] ?? $months[$lower] ?? null;
            if ($monthIndex !== null) {
                $month = $monthIndex;
                continue;
            }

            if (preg_match('/^\d+$/', $token) === 1) {
                $numbers[] = (int) $token;
            }
            // Anything else (بتاریخ, stray words) is ignored rather than fatal,
            // so a decorated date string still parses.
        }

        if ($month === null || $numbers === []) {
            return null;
        }

        if (count($numbers) === 1) {
            $only = $numbers[0];
            if ($only > 31) {
                // جنوری ۲۰۲۶ — month precision, resolved to the first of the month.
                $day = 1;
                $year = $only;
            } else {
                $day = $only;
                $year = $options['defaultYear'] ?? (int) date('Y');
            }
        } else {
            $first = $numbers[0];
            $last = $numbers[count($numbers) - 1];
            // Day-first, but tolerate a year that leads (۲۰۲۶ اگست ۲۲).
            if ($first > 31 && $last <= 31) {
                $day = $last;
                $year = $first;
            } else {
                $day = $first;
                $year = $last;
            }
        }

        return self::buildLocalDate(
            self::expandYear($year),
            $month,
            $day,
            $hour === null ? 0 : self::resolveHour($hour, $period),
            $minute,
            $second
        );
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
