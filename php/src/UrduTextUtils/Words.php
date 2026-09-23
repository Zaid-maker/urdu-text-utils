<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Word and sentence tokenization plus text statistics — a faithful PHP port
 * of src/stats.ts.
 *
 * Word splitting (Words::split) is the shared tokenizer behind search,
 * transliteration and stop-word removal.
 */
final class Words
{
    /** Titles/honorifics whose dot must not end a sentence (generated from src/stats.ts). */
    private const SENTENCE_ABBREVIATIONS = [
        'ڈاکٹر', 'پروفیسر', 'انجینئر', 'ایڈووکیٹ', 'جناب', 'صاحب', 'صاحبہ',
        'محترم', 'محترمہ', 'مولانا', 'مفتی', 'علامہ', 'بیگم', 'وغیرہ',
        'رحمتہ', 'رضی', 'تعالی', 'تعالیٰ', 'علیہ', 'السلام', 'صلی', 'وسلم',
    ];

    /** Placeholder for protected dots during sentence splitting. */
    private const PROTECTED_DOT = "\u{E000}";

    /** Placeholder for protected Urdu full stops during sentence splitting. */
    private const PROTECTED_URDU_FULL_STOP = "\u{E001}";

    /** Cached (abbreviation|title)[.۔] pattern, built from the generated table. */
    private static ?string $abbrevPattern = null;

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

    /** Words in the text. Splits on whitespace and punctuation, so `ہے۔` counts once. */
    public static function count(string $input): int
    {
        return count(self::split($input));
    }

    /**
     * Split text into sentences using Urdu punctuation rules.
     *
     * Handles Urdu full stop `۔`, Arabic question mark `؟`, exclamation `!`,
     * ASCII `.`, `?`, `!`, and ellipses `…`, while protecting abbreviations
     * and numbers.
     *
     * @param array{preserveTerminators?: bool} $options
     * @return string[]
     */
    public static function splitSentences(string $input, array $options = []): array
    {
        if ($input === '') {
            return [];
        }

        $preserveTerminators = $options['preserveTerminators'] ?? false;

        // Protect decimal numbers (1.5, 3.14, ۱٫۵) and abbreviation dots before splitting.
        $sanitized = preg_replace(
            '/(\d)\.(\d)/u',
            '$1' . self::PROTECTED_DOT . '$2',
            $input
        ) ?? $input;
        $sanitized = preg_replace_callback(
            self::abbrevPattern(),
            static fn (array $m): string => str_replace(
                ['.', '۔'],
                [self::PROTECTED_DOT, self::PROTECTED_URDU_FULL_STOP],
                $m[0]
            ),
            $sanitized
        ) ?? $sanitized;

        $restore = static fn (string $s): string => str_replace(
            [self::PROTECTED_DOT, self::PROTECTED_URDU_FULL_STOP],
            ['.', '۔'],
            $s
        );

        if ($preserveTerminators) {
            // Split keeping the delimiter: text followed by one or more terminators.
            preg_match_all('/[^۔؟?!.…]+[۔؟?!.…]+|[^۔؟?!.…]+$/u', $sanitized, $matches);
            $out = [];
            foreach ($matches[0] as $s) {
                $s = trim($restore($s));
                if ($s !== '') {
                    $out[] = $s;
                }
            }

            return $out;
        }

        $parts = preg_split(Tables::regex('sentenceSplit'), $sanitized) ?: [];
        $out = [];
        foreach ($parts as $s) {
            $s = trim($restore($s));
            if ($s !== '') {
                $out[] = $s;
            }
        }

        return $out;
    }

    /**
     * Sentences count, split on Urdu and standard terminators (۔ ؟ ! . …).
     * Protects common titles, abbreviations, and numeric decimals from false splits.
     *
     * @param array{preserveTerminators?: bool} $options
     */
    public static function countSentences(string $input, array $options = []): int
    {
        return count(self::splitSentences($input, $options));
    }

    /**
     * Character, word, sentence and script statistics for a block of text.
     * Mirrors analyzeUrdu() in src/stats.ts field for field.
     *
     * @return array{
     *   characters: int,
     *   charactersNoSpaces: int,
     *   words: int,
     *   sentences: int,
     *   paragraphs: int,
     *   urduPercentage: int,
     *   diacritics: int,
     *   digits: int,
     *   averageWordsPerSentence: float|int,
     *   readingTimeMinutes: float|int,
     * }
     */
    public static function analyze(string $input): array
    {
        $text = $input;
        $characters = count(Tables::chars($text));
        $charactersNoSpaces = count(Tables::chars((string) preg_replace('/\s+/u', '', $text)));
        $words = self::count($text);
        $sentences = self::countSentences($text);
        $paragraphs = 0;
        foreach (preg_split('/\n\s*\n/u', $text) ?: [] as $p) {
            if (trim($p) !== '') {
                $paragraphs++;
            }
        }

        $diacritics = 0;
        if (preg_match_all(Tables::regex('diacritics'), $text, $m) !== false) {
            $diacritics = count($m[0]);
        }
        $digits = 0;
        if (preg_match_all(Tables::regex('anyDigit'), $text, $m) !== false) {
            $digits = count($m[0]);
        }

        return [
            'characters' => $characters,
            'charactersNoSpaces' => $charactersNoSpaces,
            'words' => $words,
            'sentences' => $sentences,
            'paragraphs' => $paragraphs,
            'urduPercentage' => (int) round(Detect::urduRatio($text) * 100),
            'diacritics' => $diacritics,
            'digits' => $digits,
            'averageWordsPerSentence' => self::jsonNumber($sentences === 0 ? 0 : round(($words / $sentences) * 10) / 10),
            'readingTimeMinutes' => self::jsonNumber(round(($words / 180) * 10) / 10),
        ];
    }

    /**
     * JS numbers that JSON serializes as integers (0, 3, …) must arrive in PHP
     * as ints too, or assertSame against the fixture fails on type.
     */
    private static function jsonNumber(int|float $value): int|float
    {
        return is_int($value) || floor($value) === $value ? (int) $value : $value;
    }

    /** (abbreviation|title)[.۔] PCRE pattern, cached, from the generated table. */
    private static function abbrevPattern(): string
    {
        if (self::$abbrevPattern === null) {
            $alternation = implode('|', array_map(
                static fn (string $w): string => preg_quote($w, '#'),
                Tables::sentenceAbbreviations()
            ));
            self::$abbrevPattern = '#(?:' . $alternation . ')[.۔]#u';
        }

        return self::$abbrevPattern;
    }
}
