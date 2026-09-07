<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Urdu normalization — a faithful PHP port of src/normalize.ts.
 *
 * Folds Arabic-keyboard and historical spellings onto canonical Urdu letters,
 * strips noise (tatweel, bidi controls, BOM) and optionally diacritics, and
 * rewrites digits. Every behavior mirrors the TypeScript implementation, which
 * is the reference for the parity fixtures.
 */
final class Normalizer
{
    /** ASCII -> Urdu punctuation, applied only on request. */
    private const PUNCTUATION_MAP = [
        ',' => '،',
        ';' => '؛',
        '?' => '؟',
    ];

    /**
     * Fold an Urdu string to a single canonical Unicode form.
     *
     * @param array{
     *   compatibility?: bool,
     *   stripDiacritics?: bool,
     *   stripTatweel?: bool,
     *   stripZwnj?: bool,
     *   collapseWhitespace?: bool,
     *   digits?: 'urdu'|'english'|'arabic'|'preserve',
     *   urduPunctuation?: bool,
     * } $options
     */
    public static function normalizeUrdu(string $input, array $options = []): string
    {
        if ($input === '') {
            return '';
        }

        $compatibility = $options['compatibility'] ?? true;
        $stripDiacritics = $options['stripDiacritics'] ?? false;
        $stripTatweel = $options['stripTatweel'] ?? true;
        $stripZwnj = $options['stripZwnj'] ?? false;
        $collapseWhitespace = $options['collapseWhitespace'] ?? true;
        $digits = $options['digits'] ?? 'preserve';
        $urduPunctuation = $options['urduPunctuation'] ?? false;

        $text = $compatibility ? self::nfkc($input) : self::nfc($input);

        $text = preg_replace(Tables::regex('invisible'), '', $text) ?? $text;
        if ($stripZwnj) {
            $text = preg_replace(Tables::regex('zwnj'), '', $text) ?? $text;
        }
        if ($stripTatweel) {
            $text = preg_replace(Tables::regex('tatweel'), '', $text) ?? $text;
        }
        if ($stripDiacritics) {
            $text = preg_replace(Tables::regex('diacritics'), '', $text) ?? $text;
        }

        $letterMap = Tables::letterMap();
        $digitTarget = $digits === 'preserve' ? null : Tables::digits()[$digits];
        $digitLookup = self::digitLookup();

        $out = '';
        foreach (Tables::chars($text) as $ch) {
            $mapped = $letterMap[$ch] ?? null;
            if ($mapped !== null) {
                $out .= $mapped;
                continue;
            }
            if ($digitTarget !== null) {
                $value = $digitLookup[$ch] ?? null;
                if ($value !== null) {
                    $out .= Tables::chars($digitTarget)[$value];
                    continue;
                }
            }
            if ($urduPunctuation) {
                $punct = self::PUNCTUATION_MAP[$ch] ?? null;
                if ($punct !== null) {
                    $out .= $punct;
                    continue;
                }
            }
            $out .= $ch;
        }

        if ($collapseWhitespace) {
            $out = trim(preg_replace('/\s+/u', ' ', $out) ?? $out);
        }

        return $out;
    }

    /**
     * Strip harakat, quranic annotation marks and the superscript alef.
     * Keeps ۔ ے ۓ, which are letters/punctuation rather than marks.
     */
    public static function removeDiacritics(string $input): string
    {
        if ($input === '') {
            return '';
        }
        $text = self::nfc($input);
        return preg_replace(Tables::regex('diacritics'), '', $text) ?? $text;
    }

    /**
     * The comparison key used by searchUrdu and sortUrdu: normalized,
     * diacritic-free, whitespace-collapsed. Two strings a reader would call
     * "the same word" fold to the same key.
     */
    public static function foldUrdu(string $input): string
    {
        return strtolower(self::normalizeUrdu($input, [
            'stripDiacritics' => true,
            'stripZwnj' => true,
            'collapseWhitespace' => true,
        ]));
    }

    /** Unicode NFKC when ext-intl exists; otherwise the generated fallback map. */
    private static function nfkc(string $input): string
    {
        if (class_exists(\Normalizer::class)) {
            $out = \Normalizer::normalize($input, \Normalizer::FORM_KC);
            return $out === false ? $input : $out;
        }
        $map = Tables::presentationMap();
        $out = '';
        foreach (Tables::chars($input) as $ch) {
            $out .= $map[$ch] ?? $ch;
        }
        return $out;
    }

    /** Unicode NFC when ext-intl exists; otherwise pass through. */
    private static function nfc(string $input): string
    {
        if (class_exists(\Normalizer::class)) {
            $out = \Normalizer::normalize($input, \Normalizer::FORM_C);
            return $out === false ? $input : $out;
        }
        return $input;
    }

    /** Every digit character across the three blocks -> its numeric value. */
    private static function digitLookup(): array
    {
        static $lookup = null;
        if ($lookup === null) {
            $lookup = [];
            foreach (Tables::digits() as $set) {
                foreach (Tables::chars($set) as $i => $ch) {
                    $lookup[$ch] = $i;
                }
            }
        }
        return $lookup;
    }
}
