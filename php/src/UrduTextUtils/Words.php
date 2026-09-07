<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Word splitting — the shared tokenizer behind search and transliteration
 * (ported from src/stats.ts's splitWords).
 */
final class Words
{
    /**
     * Split on whitespace plus punctuation that cannot occur inside an Urdu
     * word, trimming each token. Equivalent to src/stats.ts splitWords().
     *
     * @return string[]
     */
    public static function split(string $input): array
    {
        if ($input === '') {
            return [];
        }
        $parts = preg_split(Tables::regex('wordSplit'), $input) ?: [];
        $out = [];
        foreach ($parts as $word) {
            $trimmed = trim($word);
            if ($trimmed !== '') {
                $out[] = $trimmed;
            }
        }
        return $out;
    }
}
