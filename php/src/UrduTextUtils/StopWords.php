<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Stop words — a faithful PHP port of src/stopwords.ts.
 *
 * The canonical list lives in tables.json (generated from src/stopwords.ts),
 * so the two languages consume identical data.
 */
final class StopWords
{
    /** The generated canonical list; custom lists are honored per call. */
    private static ?array $defaults = null;

    /**
     * The standard list of Urdu stop words: pronouns, postpositions,
     * auxiliaries, conjunctions, particles and high-frequency function words.
     *
     * @return string[]
     */
    public static function defaults(): array
    {
        if (self::$defaults === null) {
            self::$defaults = Tables::stopWords();
        }

        return self::$defaults;
    }

    /**
     * Resolve a custom stop-word list (array of words) to a lookup set of
     * normalized words. Mirrors toStopWordSet() in src/stopwords.ts: entries
     * are trimmed and normalizeUrdu'd, while the defaults are used as-is.
     *
     * @param string[]|null $customStopWords
     * @return array<string, true>
     */
    private static function stopSet(?array $customStopWords): array
    {
        if ($customStopWords === null) {
            $set = [];
            foreach (self::defaults() as $word) {
                $set[$word] = true;
            }

            return $set;
        }

        $set = [];
        foreach ($customStopWords as $word) {
            $normalized = Normalizer::normalizeUrdu(trim($word));
            if ($normalized !== '') {
                $set[$normalized] = true;
            }
        }

        return $set;
    }

    /**
     * Checks if a given Urdu word is a stop word.
     *
     * @param string[]|null $customStopWords Optional custom stop words. Defaults to the canonical list.
     *
     * @example StopWords::isStopWord('اور') // true
     */
    public static function isStopWord(string $word, ?array $customStopWords = null): bool
    {
        if ($word === '') {
            return false;
        }
        $normalized = Normalizer::normalizeUrdu(trim($word));
        if ($normalized === '') {
            return false;
        }

        return isset(self::stopSet($customStopWords)[$normalized]);
    }

    /**
     * Filters out stop words from an array of words.
     *
     * @param string[] $words
     * @param string[]|null $customStopWords
     * @return string[]
     *
     * @example StopWords::filterStopWords(['یہ', 'ایک', 'بہترین', 'کتاب', 'ہے']) // ['بہترین', 'کتاب']
     */
    public static function filterStopWords(array $words, ?array $customStopWords = null): array
    {
        if ($words === []) {
            return [];
        }
        $stopSet = self::stopSet($customStopWords);

        $out = [];
        foreach ($words as $word) {
            $normalized = Normalizer::normalizeUrdu(trim($word));
            if ($normalized !== '' && !isset($stopSet[$normalized])) {
                $out[] = $word;
            }
        }

        return $out;
    }

    /**
     * Removes stop words from an Urdu text string, returning the cleaned text.
     *
     * @param string[]|null $customStopWords
     *
     * @example StopWords::removeStopWords('یہ ایک بہترین کتاب ہے') // 'بہترین کتاب'
     */
    public static function removeStopWords(string $text, ?array $customStopWords = null): string
    {
        if ($text === '') {
            return '';
        }
        $filtered = self::filterStopWords(Words::split($text), $customStopWords);

        return implode(' ', $filtered);
    }
}
