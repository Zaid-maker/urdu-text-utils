<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Transliteration between Urdu script and Roman Urdu — a faithful PHP port of
 * src/transliterate.ts.
 *
 * Two layers, like the original: a dictionary of common words, then a rule
 * fallback. Urdu script omits short vowels, so expect roughly 70% word accuracy
 * on ordinary prose from the rules; treat everything here as experimental.
 */
final class Transliterator
{
    /** Consonant + ھ forms one aspirated sound and is matched first. */
    private const DIGRAPHS = [
        'بھ' => 'bh', 'پھ' => 'ph', 'تھ' => 'th', 'ٹھ' => 'th', 'جھ' => 'jh',
        'چھ' => 'chh', 'دھ' => 'dh', 'ڈھ' => 'dh', 'ڑھ' => 'rh', 'کھ' => 'kh',
        'گھ' => 'gh', 'لھ' => 'lh', 'مھ' => 'mh', 'نھ' => 'nh', 'رھ' => 'rh',
    ];

    /** Default per-letter Roman values from the shared letter inventory. */
    private static function letters(): array
    {
        static $letters = null;
        if ($letters === null) {
            $letters = [];
            foreach (Tables::letters() as $letter) {
                $letters[$letter['ch']] = $letter['roman'];
            }
        }
        return $letters;
    }

    /** Letters that carry a vowel in Roman output (drives the schwa rule). */
    private static function vowelLetters(): array
    {
        static $vowels = null;
        if ($vowels === null) {
            $vowels = [];
            foreach (Tables::letters() as $letter) {
                if (!empty($letter['vowel'])) {
                    $vowels[$letter['ch']] = true;
                }
            }
        }
        return $vowels;
    }

    private static function romanizeWord(string $word): string
    {
        $dictionary = Tables::dictionary()[$word] ?? null;
        if ($dictionary !== null) {
            return $dictionary;
        }

        $chars = Tables::chars($word);
        $pieces = []; // list of ['text' => string, 'vowel' => bool]
        $count = count($chars);

        for ($i = 0; $i < $count; $i++) {
            $last = $i === $count - 1;
            $pair = $chars[$i] . ($chars[$i + 1] ?? '');
            $digraph = self::DIGRAPHS[$pair] ?? null;
            if ($digraph !== null) {
                $pieces[] = ['text' => $digraph, 'vowel' => false];
                $i++;
                continue;
            }

            $ch = $chars[$i];

            if ($i === 0 && $ch === 'ا') {
                // Word-initial alef is a vowel carrier: اسلام -> islam, not aislam.
                $next = $chars[1] ?? null;
                if ($next === 'و') {
                    $pieces[] = ['text' => 'o', 'vowel' => true];
                    $i++;
                    continue;
                }
                if ($next === 'ی') {
                    $pieces[] = ['text' => 'i', 'vowel' => true];
                    $i++;
                    continue;
                }
                $pieces[] = ['text' => 'a', 'vowel' => true];
                continue;
            }

            // Word-initially و and ی are consonants, not the vowels they spell
            // elsewhere: والا -> wala, یار -> yaar.
            if ($i === 0 && $ch === 'و') {
                $pieces[] = ['text' => 'w', 'vowel' => false];
                continue;
            }
            if ($i === 0 && $ch === 'ی') {
                $pieces[] = ['text' => 'y', 'vowel' => false];
                continue;
            }

            // Word-final ہ is the -a ending: کمرہ -> kamra.
            if ($last && $ch === 'ہ' && count($pieces) > 0) {
                $pieces[] = ['text' => 'a', 'vowel' => true];
                continue;
            }

            // Final یں is the plural/oblique ending: سڑکیں -> sarkein.
            if ($ch === 'ی' && ($chars[$i + 1] ?? null) === 'ں' && $i + 1 === $count - 1) {
                $pieces[] = ['text' => 'ein', 'vowel' => true];
                $i++;
                continue;
            }

            // ی is "i" at the end of a word (لڑکی -> larki) but "e" inside one
            // (کھیل -> khel, تیز -> tez).
            if ($ch === 'ی' && !$last) {
                $pieces[] = ['text' => 'e', 'vowel' => true];
                continue;
            }

            $letters = self::letters();
            $vowelLetters = self::vowelLetters();
            $pieces[] = ['text' => $letters[$ch] ?? $ch, 'vowel' => isset($vowelLetters[$ch])];
        }

        // A word starting with two consonants is unpronounceable (رہنے -> "rhne");
        // one schwa after the first consonant fixes the common case.
        if (count($pieces) > 2 && !$pieces[0]['vowel'] && !$pieces[1]['vowel']) {
            array_splice($pieces, 1, 0, [['text' => 'a', 'vowel' => true]]);
        }

        $out = '';
        foreach ($pieces as $piece) {
            $out .= $piece['text'];
        }
        return $out;
    }

    /**
     * Urdu script -> Roman Urdu. @experimental; see the module note.
     *
     * @param array{capitalize?: bool} $options
     */
    public static function romanize(string $input, array $options = []): string
    {
        if ($input === '') {
            return '';
        }
        $clean = Normalizer::removeDiacritics(Normalizer::normalizeUrdu($input));
        $chunks = preg_split('/(\s+)/u', $clean, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];
        $out = '';
        foreach ($chunks as $chunk) {
            $out .= preg_match('/^\s+$/u', $chunk) ? $chunk : self::romanizeWord($chunk);
        }
        if (!empty($options['capitalize']) && $out !== '') {
            $out = strtoupper($out[0]) . substr($out, 1);
        }
        return $out;
    }

    /** Roman word -> Urdu dictionary, derived from the forward table + variants. */
    private static function romanDictionary(): array
    {
        static $dict = null;
        if ($dict === null) {
            $dict = [];
            foreach (Tables::dictionary() as $urduWord => $roman) {
                $dict[$roman] = $urduWord;
            }
            foreach (Tables::romanVariants() as $roman => $urduWord) {
                $dict[$roman] = $urduWord;
            }
        }
        return $dict;
    }

    /**
     * Roman Urdu -> Urdu script. @experimental — substantially less accurate
     * than romanize; Roman Urdu has no standard spelling.
     */
    public static function romanToUrdu(string $input): string
    {
        if ($input === '') {
            return '';
        }
        $chunks = preg_split('/(\s+)/u', $input, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];
        $out = '';
        foreach ($chunks as $chunk) {
            $out .= preg_match('/^\s+$/u', $chunk) ? $chunk : self::romanWordToUrdu($chunk);
        }
        return $out;
    }

    private static function romanWordToUrdu(string $word): string
    {
        $lower = strtolower($word);
        $dictionary = self::romanDictionary()[$lower] ?? null;
        if ($dictionary !== null) {
            return $dictionary;
        }

        // Prefix rules in the same order as transliterate.ts — literal prefixes,
        // except v|w which accepts either letter.
        $rules = [
            'kh' => 'کھ', 'gh' => 'گھ', 'chh' => 'چھ', 'ch' => 'چ', 'sh' => 'ش',
            'th' => 'تھ', 'ph' => 'پھ', 'bh' => 'بھ', 'aa' => 'آ', 'oo' => 'و',
            'ee' => 'ی', 'ai' => 'ی', 'b' => 'ب', 'p' => 'پ', 't' => 'ت', 'j' => 'ج',
            'd' => 'د', 'r' => 'ر', 'z' => 'ز', 's' => 'س', 'f' => 'ف', 'q' => 'ق',
            'k' => 'ک', 'g' => 'گ', 'l' => 'ل', 'm' => 'م', 'n' => 'ن',
        ];
        // (v|w, h, y and the single short vowels are handled in the fallback below,
        //  after every literal prefix above has been tried — mirroring the TS rule order.)

        $rest = $lower;
        $out = '';
        $position = 0;
        while ($rest !== '') {
            $matched = false;
            foreach ($rules as $prefix => $replacement) {
                if (str_starts_with($rest, $prefix)) {
                    $hitLength = strlen($prefix);
                    // Short vowels are not written inside a word — only word-initially.
                    $isShortVowel = (bool) preg_match('/^[aeiou]$/', $prefix);
                    $skip = $isShortVowel && $position > 0 && self::charLength($rest) > 1;
                    if (!$skip) {
                        $out .= $replacement;
                    }
                    $rest = substr($rest, $hitLength);
                    $position++;
                    $matched = true;
                    break;
                }
            }
            if (!$matched) {
                // Single-letter rules that must not be matched as prefixes of the
                // digraphs above: v/w, h, y, a, e, i, o, u — in TS these are
                // separate anchored rules tried after the literal prefixes.
                $first = $rest[0];
                $consumed = 1;
                $replacement = null;
                if ($first === 'v' || $first === 'w') {
                    $replacement = 'و';
                } elseif ($first === 'h') {
                    $replacement = 'ہ';
                } elseif ($first === 'y') {
                    $replacement = 'ی';
                } elseif ($first === 'a') {
                    $replacement = 'ا';
                } elseif ($first === 'e' || $first === 'i') {
                    $replacement = 'ی';
                } elseif ($first === 'o' || $first === 'u') {
                    $replacement = 'و';
                }
                if ($replacement !== null) {
                    $isShortVowel = (bool) preg_match('/^[aeiou]$/', $first);
                    $skip = $isShortVowel && $position > 0 && self::charLength($rest) > 1;
                    if (!$skip) {
                        $out .= $replacement;
                    }
                } else {
                    $out .= $first;
                }
                $rest = substr($rest, $consumed);
                $position++;
            }
        }
        return $out;
    }

    private static function charLength(string $s): int
    {
        return preg_match_all('/./us', $s);
    }

    /**
     * URL slug from an Urdu title. @experimental in transliterating mode;
     * pass preserveUrdu: true for a lossless slug.
     *
     * @param array{separator?: string, maxLength?: int, preserveUrdu?: bool} $options
     */
    public static function urduSlug(string $input, array $options = []): string
    {
        $separator = $options['separator'] ?? '-';
        $maxLength = $options['maxLength'] ?? null;
        $preserveUrdu = $options['preserveUrdu'] ?? false;
        if ($input === '') {
            return '';
        }

        $words = Words::split(Normalizer::removeDiacritics(Normalizer::normalizeUrdu($input)));
        $parts = [];
        foreach ($words as $word) {
            $parts[] = $preserveUrdu ? $word : self::romanizeWord($word);
        }

        $allowed = $preserveUrdu ? '/[^\p{L}\p{N}]+/u' : '/[^a-z0-9]+/u';
        $tokens = [];
        foreach ($parts as $part) {
            $cleaned = trim(preg_replace($allowed, ' ', strtolower($part)) ?? '');
            foreach (preg_split('/\s+/u', $cleaned) ?: [] as $token) {
                if ($token !== '') {
                    $tokens[] = $token;
                }
            }
        }
        $slug = implode($separator, $tokens);

        if ($maxLength !== null && self::charLength($slug) > $maxLength) {
            $slug = implode('', array_slice(Tables::chars($slug), 0, $maxLength));
            $lastSeparator = strrpos($slug, $separator);
            if ($lastSeparator !== false && $lastSeparator > 0) {
                $slug = substr($slug, 0, $lastSeparator);
            }
        }
        return $slug;
    }
}
