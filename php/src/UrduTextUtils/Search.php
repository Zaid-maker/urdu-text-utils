<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Diacritic- and variant-insensitive Urdu search — a faithful PHP port of
 * src/search.ts. Both sides are folded with foldUrdu before comparing, so
 * محمد matches مُحَمَّد and Arabic-keyboard كتاب matches کتاب.
 */
final class Search
{
    /** Levenshtein distance over codepoints with early exit past the limit. */
    public static function editDistance(string $a, string $b, float $limit = INF): int
    {
        if ($a === $b) {
            return 0;
        }
        $limitInt = is_infinite($limit) ? PHP_INT_MAX : (int) $limit;
        $ac = Tables::chars($a);
        $bc = Tables::chars($b);
        if (abs(count($ac) - count($bc)) > $limitInt) {
            return $limitInt + 1;
        }

        $previous = range(0, count($bc));
        $current = array_fill(0, count($bc) + 1, 0);

        for ($i = 1; $i <= count($ac); $i++) {
            $current[0] = $i;
            $rowMin = $current[0];
            for ($j = 1; $j <= count($bc); $j++) {
                $cost = $ac[$i - 1] === $bc[$j - 1] ? 0 : 1;
                $current[$j] = min($current[$j - 1] + 1, $previous[$j] + 1, $previous[$j - 1] + $cost);
                $rowMin = min($rowMin, $current[$j]);
            }
            if ($rowMin > $limitInt) {
                return $limitInt + 1;
            }
            [$previous, $current] = [$current, $previous];
        }
        return $previous[count($bc)];
    }

    private static function scoreOf(string $query, string $text, array $options): float
    {
        $fuzzy = $options['fuzzy'];
        $maxDistance = $options['maxDistance'];
        if ($query === '') {
            return 0;
        }
        if ($text === $query) {
            return 1;
        }
        if (str_starts_with($text, $query)) {
            return 0.9;
        }
        if (str_contains($text, $query)) {
            return 0.8;
        }
        if (!$fuzzy) {
            return 0;
        }

        // Compare word by word: a one-letter typo inside a long sentence should still hit.
        $queryWords = Words::split($query);
        $textWords = Words::split($text);
        if (count($queryWords) === 0 || count($textWords) === 0) {
            return 0;
        }

        $matched = 0;
        foreach ($queryWords as $qw) {
            $limit = (int) min($maxDistance, max(1, floor(self::charLength($qw) / 3)));
            $hit = false;
            foreach ($textWords as $tw) {
                if (str_contains($tw, $qw) || self::editDistance($qw, $tw, $limit) <= $limit) {
                    $hit = true;
                    break;
                }
            }
            if ($hit) {
                $matched++;
            }
        }
        if ($matched === 0) {
            return 0;
        }
        return ($matched / count($queryWords)) * 0.7;
    }

    private static function charLength(string $s): int
    {
        return preg_match_all('/./us', $s);
    }

    /**
     * Search a list of Urdu strings, ignoring diacritics and Unicode variant
     * spellings. Returns matching items in score order.
     *
     * @param string[]|array $items
     * @param array{getText?: callable, fuzzy?: bool, maxDistance?: int, limit?: int, sortByScore?: bool} $options
     * @return array
     */
    public static function searchUrdu(string $query, array $items, array $options = []): array
    {
        $ranked = self::searchUrduRanked($query, $items, $options);
        return array_column($ranked, 'item');
    }

    /**
     * Like searchUrdu but keeps the match scores. Each result is
     * ['item' => ..., 'score' => float] with 1 = exact, 0.9 = prefix,
     * 0.8 = substring, lower = fuzzy word match.
     *
     * @param string[]|array $items
     * @param array{getText?: callable, fuzzy?: bool, maxDistance?: int, limit?: int, sortByScore?: bool} $options
     * @return array<int, array{item: mixed, score: float}>
     */
    public static function searchUrduRanked(string $query, array $items, array $options = []): array
    {
        $getText = $options['getText'] ?? null;
        $fuzzy = $options['fuzzy'] ?? false;
        $maxDistance = $options['maxDistance'] ?? 1;
        $limit = $options['limit'] ?? null;
        $sortByScore = $options['sortByScore'] ?? true;

        $folded = Normalizer::foldUrdu($query);
        if ($folded === '') {
            return [];
        }

        $results = [];
        foreach ($items as $index => $item) {
            $text = $getText !== null ? $getText($item) : (string) $item;
            $score = self::scoreOf($folded, Normalizer::foldUrdu($text), [
                'fuzzy' => $fuzzy,
                'maxDistance' => $maxDistance,
            ]);
            if ($score > 0) {
                $results[] = ['item' => $item, 'score' => $score, '_i' => $index];
            }
        }

        if ($sortByScore) {
            // Stable sort by score descending (ties keep input order).
            usort($results, fn ($a, $b) => $b['score'] <=> $a['score'] ?: $a['_i'] <=> $b['_i']);
        }
        $results = array_map(fn ($r) => ['item' => $r['item'], 'score' => $r['score']], $results);

        return $limit === null ? $results : array_slice($results, 0, $limit);
    }

    /**
     * Highlight every occurrence of $query in $text by wrapping it. Matching is
     * diacritic-insensitive, but the returned string keeps the original
     * spelling and diacritics intact.
     */
    public static function highlightUrdu(string $text, string $query, ?callable $wrap = null): string
    {
        $wrapper = $wrap ?? fn ($m) => '<mark>' . $m . '</mark>';
        $foldedQuery = Normalizer::foldUrdu($query);
        if ($foldedQuery === '' || $text === '') {
            return $text;
        }

        // Fold character by character so folded offsets map back to source offsets.
        $sourceChars = Tables::chars($text);
        $foldedChars = [];
        $sourceIndexOf = [];
        foreach ($sourceChars as $i => $ch) {
            // Per-character folding must keep whitespace, otherwise multi-word
            // queries could never match: foldUrdu() trims, and a lone space
            // would fold to "".
            $folded = strtolower(Normalizer::normalizeUrdu($ch, [
                'stripDiacritics' => true,
                'stripZwnj' => true,
                'collapseWhitespace' => false,
            ]));
            foreach (Tables::chars($folded) as $f) {
                $foldedChars[] = $f;
                $sourceIndexOf[] = $i;
            }
        }

        $haystack = implode('', $foldedChars);
        $queryChars = Tables::chars($foldedQuery);
        $qLen = count($queryChars);

        $out = '';
        $cursor = 0; // index into sourceChars
        $from = 0; // index into haystack

        $hayChars = $foldedChars;
        for (;;) {
            $hit = self::haystackIndexOf($hayChars, $queryChars, $from);
            if ($hit === -1) {
                break;
            }
            $startSource = $sourceIndexOf[$hit];
            $endSource = ($sourceIndexOf[$hit + $qLen - 1] ?? $startSource) + 1;
            $out .= implode('', array_slice($sourceChars, $cursor, $startSource - $cursor));
            $out .= $wrapper(implode('', array_slice($sourceChars, $startSource, $endSource - $startSource)));
            $cursor = $endSource;
            $from = $hit + $qLen;
        }

        $out .= implode('', array_slice($sourceChars, $cursor));
        return $out;
    }

    /** indexOf for codepoint arrays, starting the scan at $from. */
    private static function haystackIndexOf(array $haystack, array $needle, int $from): int
    {
        $limit = count($haystack) - count($needle);
        for ($i = $from; $i <= $limit; $i++) {
            $ok = true;
            for ($j = 0; $j < count($needle); $j++) {
                if ($haystack[$i + $j] !== $needle[$j]) {
                    $ok = false;
                    break;
                }
            }
            if ($ok) {
                return $i;
            }
        }
        return -1;
    }
}
