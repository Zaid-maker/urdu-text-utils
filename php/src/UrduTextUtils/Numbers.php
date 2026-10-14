<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Urdu/Arabic/English digit conversion, number formatting, parsing, and
 * numbers in Urdu words — a faithful PHP port of src/numbers.ts.
 *
 * The number-word tables (cardinals, the South Asian scales and the irregular
 * ordinals) live in tables.json, generated from src/numbers.ts, so both
 * languages spell numbers from identical data.
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

    /**
     * Spell a whole number in Urdu words using the South Asian scale
     * (ہزار, لاکھ, کروڑ, ارب, کھرب). Every cardinal from 0 to 99 is a real
     * irregular word, so 21 is اکیس rather than a composed بیس ایک.
     *
     * Non-integers throw \TypeError, non-finite values return ''.
     * @experimental — see the TS module note on variant spellings.
     */
    public static function numberToUrduWords(float|int $value): string
    {
        $value = (float) $value;
        if (!is_finite($value)) {
            return '';
        }
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

        $tables = Tables::numbers();
        $parts = [];
        $rest = $n;
        foreach ($tables['scales'] as [$size, $name]) {
            if ($rest >= $size) {
                $count = (int) floor($rest / $size);
                $rest = $rest % $size;
                $parts[] = self::numberToUrduWords($count) . ' ' . $name;
            }
        }
        if ($rest > 0) {
            if (isset($tables['tensUnits'][$rest])) {
                $parts[] = $tables['tensUnits'][$rest];
            } elseif (isset($tables['teensAndTens'][$rest])) {
                $parts[] = $tables['teensAndTens'][$rest];
            } elseif ($rest < 10) {
                $parts[] = $tables['ones'][$rest];
            } else {
                // Unreachable while tensUnits is complete; a safety net so a gap
                // in the table degrades to composed words instead of throwing.
                $tens = (int) (floor($rest / 10) * 10);
                $word = trim(($tables['teensAndTens'][$tens] ?? '') . ' ' . ($tables['ones'][$rest % 10] ?? ''));
                $parts[] = $word;
            }
        }
        return trim(preg_replace('/\s+/u', ' ', implode(' ', $parts)) ?? implode(' ', $parts));
    }

    /** Separator pair per digit style: Urdu digits pair with ٬/٫, English with ,/. */
    private static function separators(string $digits): array
    {
        return $digits === 'urdu'
            ? ['group' => '٬', 'decimal' => '٫']
            : ['group' => ',', 'decimal' => '.'];
    }

    /** Insert grouping separators: southAsian groups lakh/crore, western thousands. */
    private static function groupDigits(string $intStr, string $grouping, string $separator): string
    {
        if ($grouping === 'none' || $separator === '') {
            return $intStr;
        }
        if ($grouping === 'western') {
            return preg_replace('/\B(?=(\d{3})+(?!\d))/', $separator, $intStr) ?? $intStr;
        }
        // South Asian: the last three digits form one group, then pairs.
        $lastThree = substr($intStr, -3);
        $rest = substr($intStr, 0, -3);
        if ($rest === '') {
            return $lastThree;
        }
        return (preg_replace('/\B(?=(\d{2})+(?!\d))/', $separator, $rest) ?? $rest) . $separator . $lastThree;
    }

    /**
     * Format a number the way Urdu software prints numbers, with South Asian
     * digit grouping and Urdu digits by default. Returns '' for NAN/infinity.
     *
     * Rounding is applied to the binary double rather than its decimal
     * spelling, and identically on both sides, so output stays byte-identical
     * between the ports. Keep $decimals at 6 or below for display.
     *
     * @param array{digits?: 'urdu'|'english', grouping?: 'southAsian'|'western'|'none', decimals?: int} $options
     */
    public static function formatUrduNumber(float|int $value, array $options = []): string
    {
        $value = (float) $value;
        if (!is_finite($value)) {
            return '';
        }

        $digits = $options['digits'] ?? 'urdu';
        $grouping = $options['grouping'] ?? 'southAsian';
        $decimals = max(0, min(15, (int) ($options['decimals'] ?? 2)));
        $separators = self::separators($digits);

        $negative = $value < 0;
        $abs = abs($value);
        $scale = 10 ** $decimals;

        // Split the integer and fraction parts in double arithmetic before any
        // string handling, and round the fraction with floor(x + 0.5) — the same
        // operation the TypeScript side performs, so both round identically.
        $intPart = floor($abs);
        $scaledFraction = (int) floor(($abs - $intPart) * $scale + 0.5);
        if ($scaledFraction >= $scale) {
            $intPart += 1;
            $scaledFraction -= (int) $scale;
        }

        $intStr = self::groupDigits(sprintf('%.0F', $intPart), $grouping, $separators['group']);
        $fraction = rtrim(str_pad((string) $scaledFraction, $decimals, '0', STR_PAD_LEFT), '0');
        $body = $fraction === '' ? $intStr : $intStr . $separators['decimal'] . $fraction;
        $sign = $negative ? '-' : '';

        return $digits === 'urdu' ? $sign . self::toUrduDigits($body) : $sign . $body;
    }

    /**
     * Format a money amount with the right Urdu unit for the quantity.
     *
     * @experimental The 'words' style inherits the note on numberToUrduWords,
     * and like it requires a whole amount.
     *
     * @param array{digits?: 'urdu'|'english', grouping?: 'southAsian'|'western'|'none', decimals?: int, style?: 'digits'|'words', unit?: string, singularUnit?: string} $options
     */
    public static function formatUrduCurrency(float|int $value, array $options = []): string
    {
        $value = (float) $value;
        if (!is_finite($value)) {
            return '';
        }

        $style = $options['style'] ?? 'digits';
        $unit = $options['unit'] ?? 'روپے';
        $singularUnit = $options['singularUnit'] ?? 'روپیہ';

        $amount = $style === 'words'
            ? self::numberToUrduWords($value)
            : self::formatUrduNumber($value, $options);
        if ($amount === '') {
            return '';
        }

        return $amount . ' ' . (abs($value) === 1.0 ? $singularUnit : $unit);
    }

    /**
     * Spell an ordinal in Urdu — پہلا, دوسرا, اکیسواں, سواں. 1-6 are irregular;
     * everything else is the last word of the cardinal with the ordinal suffix,
     * and a word-final و contracts rather than doubling (نو -> نواں).
     * 0 returns صفر, since "zeroth" has no Urdu ordinal form.
     *
     * @experimental Inherits the note on numberToUrduWords.
     *
     * @param array{gender?: 'masculine'|'feminine'} $options
     */
    public static function toUrduOrdinal(float|int $value, array $options = []): string
    {
        $value = (float) $value;
        if (!is_finite($value)) {
            return '';
        }
        if ($value != floor($value)) {
            throw new \TypeError('toUrduOrdinal expects an integer');
        }

        $gender = $options['gender'] ?? 'masculine';
        $n = (int) $value;
        if ($n < 0) {
            return 'منفی ' . self::toUrduOrdinal(-$n, $options);
        }
        if ($n === 0) {
            return 'صفر';
        }

        $irregulars = Tables::numbers()['ordinalIrregulars'];
        if (isset($irregulars[$n])) {
            return $irregulars[$n][$gender];
        }

        $words = explode(' ', self::numberToUrduWords($n));
        $last = array_pop($words);
        // A final و contracts rather than doubling: نو -> نواں, سو -> سواں.
        // Strip it by BYTE length, not substr($last, 0, -1): Urdu letters are
        // two bytes in UTF-8, so a -1 offset would cut the character in half.
        $stem = str_ends_with($last, 'و') ? substr($last, 0, -strlen('و')) : $last;
        $ordinated = $stem . ($gender === 'feminine' ? 'ویں' : 'واں');

        // An exact scale value drops its ایک: 100th is سواں, not ایک سواں, and
        // 1000th is ہزارواں. A compound keeps it (1100th is ایک ہزار ایک سواں).
        $prefix = (count($words) === 1 && $words[0] === 'ایک') ? [] : $words;

        return implode(' ', array_merge($prefix, [$ordinated]));
    }
}
