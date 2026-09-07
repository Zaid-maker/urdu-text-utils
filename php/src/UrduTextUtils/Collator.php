<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Urdu alphabetical order — a faithful PHP port of src/collate.ts.
 *
 * PHP has no Urdu-aware collation: sorted() orders by codepoint, which puts
 * گ/ٹ/ڈ/ڑ/ں/ے far from their alphabet neighbours. The order here comes from
 * the shared letter inventory, exactly like the TS implementation. Hamza
 * variants (ؤ, ئ, ۂ, ۓ) carry a tiebreaker so they sort next to their base.
 */
final class Collator
{
    /** Non-alphabet characters sort after every Urdu letter, ordered by codepoint. */
    private static function nonLetterBase(): int
    {
        static $base = null;
        if ($base === null) {
            $primaries = array_values(array_filter(Tables::letters(), fn ($l) => !isset($l['variantOf'])));
            $base = (count($primaries) + 1) * 10;
        }
        return $base;
    }

    /** Primary weight map: letter -> weight*10. Built once from the table order. */
    private static function primaryWeights(): array
    {
        static $weights = null;
        if ($weights === null) {
            $weights = [];
            $index = 0;
            foreach (Tables::letters() as $letter) {
                if (isset($letter['variantOf'])) {
                    continue;
                }
                $weights[$letter['ch']] = ($index + 1) * 10;
                $index++;
            }
        }
        return $weights;
    }

    /** Full weight map including hamza variants (base weight, tiebreak 1). */
    private static function weights(): array
    {
        static $weights = null;
        if ($weights === null) {
            $weights = self::primaryWeights();
            foreach (Tables::letters() as $letter) {
                if (!isset($letter['variantOf'])) {
                    continue;
                }
                $baseWeight = $weights[$letter['variantOf']] ?? null;
                if ($baseWeight !== null) {
                    $weights[$letter['ch']] = $baseWeight;
                }
            }
        }
        return $weights;
    }

    /** Tiebreaker: 1 for hamza variants, 0 otherwise. */
    private static function variantTiebreak(): array
    {
        static $tiebreak = null;
        if ($tiebreak === null) {
            $tiebreak = [];
            foreach (Tables::letters() as $letter) {
                if (isset($letter['variantOf'])) {
                    $tiebreak[$letter['ch']] = 1;
                }
            }
        }
        return $tiebreak;
    }

    /** Weight list for a folded string, mirroring collate.ts weightsOf(). */
    private static function weightsOf(string $text): array
    {
        $out = [];
        $weights = self::weights();
        $tiebreak = self::variantTiebreak();
        $nonLetterBase = self::nonLetterBase();
        foreach (Tables::chars($text) as $ch) {
            if (isset($weights[$ch])) {
                $out[] = $weights[$ch];
                $out[] = $tiebreak[$ch] ?? 0;
            } elseif ($ch === ' ') {
                $out[] = 1; // spaces sort before letters
                $out[] = 0;
            } else {
                $out[] = $nonLetterBase + Tables::ord($ch);
                $out[] = 0;
            }
        }
        return $out;
    }

    /** Comparator for Urdu strings; usable directly with usort(). */
    public static function compareUrdu(string $a, string $b): int
    {
        $left = self::weightsOf(Normalizer::foldUrdu($a));
        $right = self::weightsOf(Normalizer::foldUrdu($b));
        $length = min(count($left), count($right));
        for ($i = 0; $i < $length; $i++) {
            $diff = $left[$i] - $right[$i];
            if ($diff !== 0) {
                return $diff <=> 0;
            }
        }
        return count($left) <=> count($right);
    }

    /**
     * Sort strings or objects in Urdu alphabetical order (does not mutate input).
     *
     * @param array $items
     * @param array{descending?: bool, getText?: callable} $options
     * @return array
     */
    public static function sortUrdu(array $items, array $options = []): array
    {
        $descending = $options['descending'] ?? false;
        $getText = $options['getText'] ?? null;

        $sorted = $items;
        usort($sorted, function ($a, $b) use ($getText) {
            $ka = $getText !== null ? $getText($a) : (string) $a;
            $kb = $getText !== null ? $getText($b) : (string) $b;
            return self::compareUrdu($ka, $kb);
        });

        return $descending ? array_reverse($sorted) : $sorted;
    }
}
