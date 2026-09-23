<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Rule-based Urdu stemmer — a faithful PHP port of src/stemmer.ts.
 *
 * The prefix, suffix and protected-word tables live in tables.json (generated
 * from src/stemmer.ts), so the two languages consume identical data.
 *
 * All string slicing is codepoint-based (Tables::chars) to mirror JavaScript,
 * because several Urdu letters occupy more than one byte in UTF-8 — raw PHP
 * substr/strlen would corrupt words.
 */
final class Stemmer
{
    /** Options accepted by stem()/getAffixes(): stripPrefixes, stripSuffixes, minStemLength, customPrefixes, customSuffixes, exceptions. */

    /**
     * Analyzes an Urdu word and extracts its prefix, stem, and suffix.
     * The returned array carries a "prefix"/"suffix" key only when one was
     * stripped, mirroring the TS AffixBreakdown (undefined keys are omitted
     * in JSON fixtures).
     *
     * @param array{stripPrefixes?: bool, stripSuffixes?: bool, minStemLength?: int, customPrefixes?: string[], customSuffixes?: string[], exceptions?: array<string, string>} $options
     * @return array{prefix?: string, stem: string, suffix?: string}
     *
     * @example Stemmer::getAffixes('بےوقوف') // ['prefix' => 'بے', 'stem' => 'وقوف']
     */
    public static function getAffixes(string $input, array $options = []): array
    {
        if ($input === '') {
            return ['stem' => ''];
        }

        $clean = Normalizer::removeDiacritics(Normalizer::normalizeUrdu(trim($input)));
        if ($clean === '') {
            return ['stem' => ''];
        }

        $exceptions = $options['exceptions'] ?? [];
        if (isset($exceptions[$clean])) {
            return ['stem' => $exceptions[$clean]];
        }

        $protected = self::protectedWords();
        if (isset($protected[$clean])) {
            return ['stem' => $clean];
        }

        $minLen = $options['minStemLength'] ?? 2;
        $doSuffixes = $options['stripSuffixes'] ?? true;
        $doPrefixes = $options['stripPrefixes'] ?? true;

        $suffixes = $options['customSuffixes'] ?? self::suffixes();
        $prefixes = $options['customPrefixes'] ?? self::prefixes();

        $current = $clean;
        $detectedSuffix = null;
        $detectedPrefix = null;

        // 1. Suffix stripping
        if ($doSuffixes) {
            $sRes = self::applySuffixStripping($current, $suffixes, $minLen);
            $current = $sRes['stem'];
            $detectedSuffix = $sRes['suffix'] ?? null;
        }

        // 2. Prefix stripping
        if ($doPrefixes) {
            $pRes = self::applyPrefixStripping($current, $prefixes, $minLen);
            $current = $pRes['stem'];
            $detectedPrefix = $pRes['prefix'] ?? null;
        }

        $out = ['stem' => $current];
        if ($detectedPrefix !== null) {
            $out = ['prefix' => $detectedPrefix] + $out;
        }
        if ($detectedSuffix !== null) {
            $out['suffix'] = $detectedSuffix;
        }

        return $out;
    }

    /**
     * Reduces an Urdu word to its morphological root/stem.
     *
     * @param array{stripPrefixes?: bool, stripSuffixes?: bool, minStemLength?: int, customPrefixes?: string[], customSuffixes?: string[], exceptions?: array<string, string>} $options
     *
     * @example Stemmer::stem('کتابیں') // 'کتاب'
     */
    public static function stem(string $word, array $options = []): string
    {
        return self::getAffixes($word, $options)['stem'];
    }

    /**
     * Stems all words within a block of Urdu text while preserving
     * punctuation, whitespace, and document formatting.
     *
     * @param array{stripPrefixes?: bool, stripSuffixes?: bool, minStemLength?: int, customPrefixes?: string[], customSuffixes?: string[], exceptions?: array<string, string>} $options
     *
     * @example Stemmer::stemText('طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔')
     *          // 'طلباء کتاب پڑھ ہیں اور کہانی سن ہیں۔'
     */
    public static function stemText(string $text, array $options = []): string
    {
        if ($text === '') {
            return '';
        }

        // Split into word/separator tokens keeping separators, like the TS
        // split(/([\s\p{P}\p{S}]+)/u). \s is spelled out because JS \s spans
        // more codepoints than PCRE's ASCII default.
        $tokens = preg_split(
            '#([\s\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}\p{P}\p{S}]+)#u',
            $text,
            -1,
            PREG_SPLIT_DELIM_CAPTURE
        );
        if ($tokens === false) {
            return $text;
        }

        $out = '';
        foreach ($tokens as $token) {
            $out .= $token !== '' && preg_match(self::URDU_TOKEN_RE, $token) === 1
                ? self::stem($token, $options)
                : $token;
        }

        return $out;
    }

    /** Single Urdu-script character test used to decide which tokens to stem. */
    private const URDU_TOKEN_RE = '#[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]#u';

    // -------------------------------------------------------------------------
    // Generated tables
    // -------------------------------------------------------------------------

    /** @return string[] */
    private static function prefixes(): array
    {
        return Tables::stemmer()['prefixes'];
    }

    /** @return string[] */
    private static function suffixes(): array
    {
        return Tables::stemmer()['suffixes'];
    }

    /** @return array<string, true> */
    private static function protectedWords(): array
    {
        static $set = null;
        if ($set === null) {
            $set = [];
            foreach (Tables::stemmer()['protectedWords'] as $word) {
                $set[$word] = true;
            }
        }

        return $set;
    }

    // -------------------------------------------------------------------------
    // Codepoint-faithful helpers (JS string semantics)
    // -------------------------------------------------------------------------

    /** JS word.length — number of codepoints. */
    private static function len(string $s): int
    {
        return count(Tables::chars($s));
    }

    /** JS String.slice(0, -n) — drop the last n codepoints. */
    private static function dropLast(string $s, int $n): string
    {
        $chars = Tables::chars($s);

        return implode('', array_slice($chars, 0, max(0, count($chars) - $n)));
    }

    /** JS String.slice(n) — drop the first n codepoints. */
    private static function dropFirst(string $s, int $n): string
    {
        return implode('', array_slice(Tables::chars($s), $n));
    }

    /** JS startsWith on codepoints. */
    private static function startsWith(string $word, string $affix): bool
    {
        return self::len($word) >= self::len($affix)
            && self::dropLast($word, self::len($word) - self::len($affix)) === $affix;
    }

    /** JS endsWith on codepoints. */
    private static function endsWith(string $word, string $affix): bool
    {
        return self::len($word) >= self::len($affix)
            && self::dropFirst($word, self::len($word) - self::len($affix)) === $affix;
    }

    /**
     * Strips a suffix from an Urdu word while applying morphological
     * restoration rules (لڑکیاں -> لڑکی, دعاؤں -> دعا, …).
     *
     * @param string[] $suffixes
     * @return array{stem: string, suffix?: string}
     */
    private static function applySuffixStripping(string $word, array $suffixes, int $minLen): array
    {
        if (self::len($word) <= $minLen) {
            return ['stem' => $word];
        }

        // Special morphological restorations:
        // 1. Plurals ending in -یاں (لڑکیاں -> لڑکی, کہانیاں -> کہانی)
        if (self::endsWith($word, 'یاں') && self::len($word) - 3 >= $minLen) {
            return ['stem' => self::dropLast($word, 3) . 'ی', 'suffix' => 'یاں'];
        }

        // 2. Plurals ending in -یوں (لڑکیوں -> لڑکی, گاڑیوں -> گاڑی)
        if (self::endsWith($word, 'یوں') && self::len($word) - 3 >= $minLen) {
            return ['stem' => self::dropLast($word, 3) . 'ی', 'suffix' => 'یوں'];
        }

        // 3. Plurals ending in -ئیں (دعائیں -> دعا, خوشبوئیں -> خوشبو)
        if (self::endsWith($word, 'ئیں') && self::len($word) - 3 >= $minLen) {
            return ['stem' => self::dropLast($word, 3), 'suffix' => 'ئیں'];
        }

        // 4. Plurals ending in -ؤں (دعاؤں -> دعا, خوشبوؤں -> خوشبو)
        if (self::endsWith($word, 'ؤں') && self::len($word) - 2 >= $minLen) {
            return ['stem' => self::dropLast($word, 2), 'suffix' => 'ؤں'];
        }

        foreach ($suffixes as $suf) {
            if (self::endsWith($word, $suf)) {
                $remainder = preg_replace('/[\s\x{200C}\x{200D}]+$/u', '', self::dropLast($word, self::len($suf))) ?? '';
                if (self::len($remainder) >= $minLen && !isset(self::protectedWords()[$word])) {
                    return ['stem' => $remainder, 'suffix' => $suf];
                }
            }
        }

        return ['stem' => $word];
    }

    /**
     * Strips a prefix from an Urdu word with protected length and root checks.
     *
     * @param string[] $prefixes
     * @return array{stem: string, prefix?: string}
     */
    private static function applyPrefixStripping(string $word, array $prefixes, int $minLen): array
    {
        if (self::len($word) <= $minLen) {
            return ['stem' => $word];
        }

        foreach ($prefixes as $pref) {
            if (self::startsWith($word, $pref)) {
                $remainder = preg_replace('/^[\s\x{200C}\x{200D}]+/u', '', self::dropFirst($word, self::len($pref))) ?? '';
                if (self::len($remainder) >= $minLen && !isset(self::protectedWords()[$word])) {
                    return ['stem' => $remainder, 'prefix' => $pref];
                }
            }
        }

        return ['stem' => $word];
    }
}
