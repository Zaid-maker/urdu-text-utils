<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Urdu/Arabic/English digit conversion, parsing, and numbers in Urdu words —
 * a faithful PHP port of src/numbers.ts.
 */
final class Numbers
{
    /** Every digit character across the three blocks -> its numeric value. */
    private static function valueOf(): array
    {
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach (Tables::digits() as $set) {
                foreach (Tables::chars($set) as $i => $ch) {
                    $map[$ch] = $i;
                }
            }
        }
        return $map;
    }

    private static function convert(string $input, string $target): string
    {
        if ($input === '') {
            return '';
        }
        $digits = Tables::chars(Tables::digits()[$target]);
        $map = self::valueOf();
        $out = '';
        foreach (Tables::chars($input) as $ch) {
            $value = $map[$ch] ?? null;
            $out .= $value === null ? $ch : $digits[$value];
        }
        return $out;
    }

    /** 12345 -> ۱۲۳۴۵. Accepts Arabic-Indic digits as input too. */
    public static function toUrduDigits(string $input): string
    {
        return self::convert($input, 'urdu');
    }

    /** ۱۲۳۴۵ -> 12345. Safe to feed into (float) afterwards. */
    public static function toEnglishDigits(string $input): string
    {
        return self::convert($input, 'english');
    }

    /** ۱۲۳۴۵ -> ١٢٣٤٥ (Arabic-Indic, U+0660 block). */
    public static function toArabicIndicDigits(string $input): string
    {
        return self::convert($input, 'arabic');
    }

    /** Rewrite every digit in $input to one style. */
    public static function convertNumbers(string $input, string $to = 'urdu'): string
    {
        return self::convert($input, $to);
    }

    /**
     * Parse a number written with Urdu or Arabic-Indic digits. Handles the Urdu
     * decimal separator ٫ and thousands separator ٬. Returns NAN when the
     * string is not a number.
     */
    public static function parseUrduNumber(string $input): float
    {
        if ($input === '') {
            return NAN;
        }
        $ascii = str_replace(['٬', ','], '', self::toEnglishDigits($input));
        $ascii = str_replace('٫', '.', $ascii);
        $ascii = preg_replace('/\s+/u', '', $ascii) ?? $ascii;
        if (!preg_match('/^[+-]?(\d+(\.\d*)?|\.\d+)$/', $ascii)) {
            return NAN;
        }
        return (float) $ascii;
    }

    private const ONES = ['', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو'];

    private const TEENS_AND_TENS = [
        10 => 'دس', 11 => 'گیارہ', 12 => 'بارہ', 13 => 'تیرہ', 14 => 'چودہ', 15 => 'پندرہ',
        16 => 'سولہ', 17 => 'سترہ', 18 => 'اٹھارہ', 19 => 'انیس', 20 => 'بیس', 30 => 'تیس',
        40 => 'چالیس', 50 => 'پچاس', 60 => 'ساٹھ', 70 => 'ستر', 80 => 'اسی', 90 => 'نوے',
        100 => 'سو',
    ];

    /**
     * Spell a whole number in Urdu words using the South Asian scale
     * (ہزار, لاکھ, کروڑ, ارب). Non-integers throw \TypeError, non-finite
     * values return ''. @experimental — see the TS module note.
     */
    public static function numberToUrduWords(float|int $value): string
    {
        if (!is_finite($value)) {
            return '';
        }
        $value = (float) $value;
        if ($value != floor($value)) {
            throw new \TypeError('numberToUrduWords expects an integer');
        }
        $n = (int) $value;
        if ($n < 0) {
            return 'منفی ' . self::numberToUrduWords(-$n);
        }
        if ($n === 0) {
            return 'صفر';
        }

        $scales = [
            [10000000, 'کروڑ'],
            [100000, 'لاکھ'],
            [1000, 'ہزار'],
            [100, 'سو'],
        ];

        $parts = [];
        $rest = $n;
        foreach ($scales as [$size, $name]) {
            if ($rest >= $size) {
                $count = (int) floor($rest / $size);
                $rest = $rest % $size;
                $parts[] = self::numberToUrduWords($count) . ' ' . $name;
            }
        }
        if ($rest > 0) {
            if (isset(self::TEENS_AND_TENS[$rest])) {
                $parts[] = self::TEENS_AND_TENS[$rest];
            } elseif ($rest < 10) {
                $parts[] = self::ONES[$rest];
            } else {
                $tens = (int) (floor($rest / 10) * 10);
                $word = trim((self::TEENS_AND_TENS[$tens] ?? '') . ' ' . (self::ONES[$rest % 10] ?? ''));
                $parts[] = $word;
            }
        }
        return trim(preg_replace('/\s+/u', ' ', implode(' ', $parts)) ?? implode(' ', $parts));
    }
}
