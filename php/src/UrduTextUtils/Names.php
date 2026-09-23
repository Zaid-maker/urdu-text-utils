<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Urdu name transliteration for Pakistani names — a faithful PHP port of
 * src/names.ts.
 *
 * Handles common first names, family names, honorifics, and name prefixes.
 * The name tables live in tables.json (generated from src/names.ts); the
 * English → Urdu reverse dictionary is DERIVED from them at runtime exactly
 * like the TS module does, so the two directions can never drift.
 */
final class Names
{
    /**
     * Transliterate an Urdu name to English.
     *
     * @param array{preserveCase?: bool, includeHonorifics?: bool} $options
     *
     * @example Names::toEnglish('محمد علی') // 'Muhammad Ali'
     */
    public static function toEnglish(string $urduName, array $options = []): string
    {
        if ($urduName === '') {
            return '';
        }

        $preserveCase = $options['preserveCase'] ?? true;
        $includeHonorifics = $options['includeHonorifics'] ?? true;

        $result = self::transliterateSingleName($urduName);

        if (! $includeHonorifics) {
            $out = [];
            foreach (preg_split('/\s+/u', $result) ?: [] as $word) {
                if ($word !== '' && ! in_array($word, array_values(self::honorifics()), true)) {
                    $out[] = $word;
                }
            }

            return implode(' ', $out);
        }

        return $preserveCase ? $result : strtolower($result);
    }

    /**
     * Transliterate an English name to Urdu script. Unknown names pass
     * through unchanged; reverse transliteration is deliberately not
     * rule-based, mirroring the TS module.
     *
     * @example Names::toUrdu('Muhammad Ali') // 'محمد علی'
     */
    public static function toUrdu(string $englishName): string
    {
        if ($englishName === '') {
            return '';
        }

        $out = [];
        foreach (preg_split('/\s+/u', $englishName) ?: [] as $word) {
            if ($word === '') {
                continue;
            }
            $out[] = self::reverseTransliterateName($word);
        }

        return implode(' ', $out);
    }

    /**
     * Extract name parts from a full Urdu name. Keys are present only when a
     * part was found, mirroring the TS return value (undefined keys are
     * dropped by JSON).
     *
     * @return array{honorific?: string, firstName: string, familyName?: string, suffix?: string}
     *
     * @example Names::extractNameParts('جناب محمد علی خان صاحب')
     *          // ['honorific' => 'جناب', 'firstName' => 'محمد علی', 'familyName' => 'خان', 'suffix' => 'صاحب']
     */
    public static function extractNameParts(string $fullName): array
    {
        $normalized = Normalizer::removeDiacritics(Normalizer::normalizeUrdu(trim($fullName)));
        $words = preg_split('/\s+/u', $normalized) ?: [];
        $words = array_values(array_filter($words, static fn (string $w): bool => $w !== ''));

        $honorifics = array_keys(self::honorifics());
        $suffixes = ['sahib', 'sahab', 'بیگم', 'begum'];

        $honorific = null;
        $suffix = null;
        $nameWords = [];

        foreach ($words as $word) {
            // Check honorifics first (includes صاحب)
            if (in_array($word, $honorifics, true)) {
                // Only set honorific if not already set (first honorific wins)
                if ($honorific === null) {
                    $honorific = $word;
                } else {
                    // Second honorific becomes suffix
                    $suffix = $word;
                }
            } elseif (in_array($word, $suffixes, true)) {
                $suffix = $word;
            } else {
                $nameWords[] = $word;
            }
        }

        // Assume last word is family name if there are multiple words
        $count = count($nameWords);
        $out = [];
        if ($honorific !== null) {
            $out['honorific'] = $honorific;
        }
        $out['firstName'] = $count > 1
            ? implode(' ', array_slice($nameWords, 0, -1))
            : ($nameWords[0] ?? '');
        if ($count > 1) {
            $out['familyName'] = $nameWords[$count - 1];
        }
        if ($suffix !== null) {
            $out['suffix'] = $suffix;
        }

        return $out;
    }

    // -------------------------------------------------------------------------
    // Generated tables
    // -------------------------------------------------------------------------

    /** @return array<string, string> */
    private static function firstNames(): array
    {
        return Tables::names()['firstNames'];
    }

    /** @return array<string, string> */
    private static function familyNames(): array
    {
        return Tables::names()['familyNames'];
    }

    /** @return array<string, string> */
    private static function honorifics(): array
    {
        return Tables::names()['honorifics'];
    }

    /** @return array<string, string> */
    private static function prefixes(): array
    {
        return Tables::names()['prefixes'];
    }

    /** @return array<string, string> */
    private static function englishAliases(): array
    {
        return Tables::names()['englishAliases'];
    }

    /**
     * English (lowercased) -> Urdu, derived from the forward tables in the
     * same order as the TS module so both directions can never drift.
     *
     * @return array<string, string>
     */
    private static function englishToUrdu(): array
    {
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach ([self::honorifics(), self::firstNames(), self::familyNames(), self::prefixes()] as $table) {
                foreach ($table as $urduWord => $englishWord) {
                    $map[strtolower($englishWord)] = $urduWord;
                }
            }
        }

        return $map;
    }

    // -------------------------------------------------------------------------
    // Transliteration internals
    // -------------------------------------------------------------------------

    /** Transliterate a single Urdu name, handling honorifics and prefixes. */
    private static function transliterateSingleName(string $urduName): string
    {
        $normalized = Normalizer::removeDiacritics(Normalizer::normalizeUrdu(trim($urduName)));
        $words = array_values(array_filter(
            preg_split('/\s+/u', $normalized) ?: [],
            static fn (string $w): bool => $w !== ''
        ));

        $honorifics = self::honorifics();
        $firstNames = self::firstNames();
        $familyNames = self::familyNames();
        $prefixes = self::prefixes();

        $result = [];
        foreach ($words as $word) {
            if (isset($honorifics[$word])) {
                $result[] = $honorifics[$word];
                continue;
            }
            if (isset($firstNames[$word])) {
                $result[] = $firstNames[$word];
                continue;
            }
            if (isset($familyNames[$word])) {
                $result[] = $familyNames[$word];
                continue;
            }
            if (isset($prefixes[$word])) {
                $result[] = $prefixes[$word];
                continue;
            }
            // Rule-based fallback for unknown names
            $result[] = self::transliterateNameWord($word);
        }

        return implode(' ', $result);
    }

    /** Common Urdu letter patterns in names (src/names.ts consonants map). */
    private const CONSONANTS = [
        'ب' => 'b', 'پ' => 'p', 'ت' => 't', 'ٹ' => 't', 'ج' => 'j', 'چ' => 'ch',
        'ح' => 'h', 'خ' => 'kh', 'د' => 'd', 'ڈ' => 'd', 'ر' => 'r', 'ڑ' => 'r',
        'ز' => 'z', 'س' => 's', 'ش' => 'sh', 'ص' => 's', 'ض' => 'z', 'ط' => 't',
        'ظ' => 'z', 'ع' => 'a', 'غ' => 'gh', 'ف' => 'f', 'ق' => 'q', 'ک' => 'k',
        'گ' => 'g', 'ل' => 'l', 'م' => 'm', 'ن' => 'n', 'و' => 'w', 'ہ' => 'h',
        'ھ' => 'h', 'ی' => 'y',
    ];

    /** Rule-based transliteration for individual name words. */
    private static function transliterateNameWord(string $word): string
    {
        if ($word === '') {
            return '';
        }

        $result = '';
        $chars = Tables::chars($word);
        $len = count($chars);

        for ($i = 0; $i < $len; $i++) {
            $ch = $chars[$i];
            $next = $chars[$i + 1] ?? null;

            // Handle digraphs (consonant + ھ)
            if ($next === 'ھ' && isset(self::CONSONANTS[$ch])) {
                $result .= self::CONSONANTS[$ch] . 'h';
                $i++; // Skip the ھ
                continue;
            }

            // Handle special cases
            if ($ch === 'آ') {
                $result .= 'Aa';
                continue;
            }
            if ($ch === 'ا' && $i === 0) {
                $result .= 'A';
                continue;
            }
            if ($ch === 'ا') {
                $result .= 'a';
                continue;
            }
            if ($ch === 'ی' && $i === $len - 1) {
                $result .= 'i';
                continue;
            }
            if ($ch === 'ی' && $next === 'ں') {
                $result .= 'ain';
                $i++; // Skip the ں
                continue;
            }
            if ($ch === 'و' && $i === 0) {
                $result .= 'W';
                continue;
            }
            if ($ch === 'و') {
                $result .= 'o';
                continue;
            }

            // Regular consonant
            if (isset(self::CONSONANTS[$ch])) {
                $result .= self::CONSONANTS[$ch];
                continue;
            }

            // Unknown character - keep as is
            $result .= $ch;
        }

        // Capitalize first letter (ucfirst leaves non-ASCII untouched, like toUpperCase on Urdu)
        return ucfirst($result);
    }

    /** Reverse lookup: derived dictionary, pinned aliases, then unchanged. */
    private static function reverseTransliterateName(string $englishName): string
    {
        $lower = strtolower($englishName);
        $derived = self::englishToUrdu();

        return $derived[$lower] ?? self::englishAliases()[$lower] ?? $englishName;
    }
}
