<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Loads the shared Urdu tables (letters, dictionary, roman variants, regex
 * patterns) from data/tables.json — the single JSON asset generated from the
 * canonical TypeScript sources by scripts/generate-php-tables.mjs.
 *
 * Keeping every table in one generated file means the PHP port can never drift
 * from the TS implementation: both consume the same data.
 */
final class Tables
{
    private static ?array $data = null;

    /** All canonical letters in collation order: {ch, roman, vowel?, aliases?, variantOf?}. */
    public static function letters(): array
    {
        return self::data()['letters'];
    }

    /** Map of every non-canonical spelling (alias) to its canonical letter. */
    public static function letterMap(): array
    {
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach (self::letters() as $letter) {
                foreach ($letter['aliases'] ?? [] as $alias) {
                    $map[$alias] = $letter['ch'];
                }
            }
        }
        return $map;
    }

    public static function digits(): array
    {
        return self::data()['digits'];
    }

    /** Urdu word -> Roman word dictionary. */
    public static function dictionary(): array
    {
        return self::data()['dictionary'];
    }

    /** Alternate Roman spellings -> Urdu word. */
    public static function romanVariants(): array
    {
        return self::data()['romanVariants'];
    }

    /**
     * Compile a named JS RegExp into PCRE (with /u), converting \uXXXX and
     * \u{...} escapes to PCRE's \x{...} form.
     */
    public static function regex(string $name): string
    {
        static $cache = [];
        if (isset($cache[$name])) {
            return $cache[$name];
        }
        $source = self::data()['regex'][$name];
        $pcre = preg_replace('/\\\\u\{([0-9a-fA-F]+)\}|\\\\u([0-9a-fA-F]{4})/', '\\\\x{$1$2}', $source);
        // '#' delimiter: the word-split class contains a literal '~' (in the {-~ range).
        return $cache[$name] = '#' . $pcre . '#u';
    }

    /**
     * Presentation forms whose NFKC decomposition differs. Keyed by the
     * codepoint (hex) and applied character-by-character when ext-intl is
     * unavailable.
     */
    public static function presentationMap(): array
    {
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach (self::data()['presentation'] as $hex => $decomposed) {
                $map[self::chr((int) hexdec($hex))] = $decomposed;
            }
        }
        return $map;
    }

    /** Codepoint of the first character of a UTF-8 string. */
    public static function ord(string $char): int
    {
        $bytes = strlen($char);
        $b0 = ord($char[0]);
        if ($bytes === 1) {
            return $b0;
        }
        if ($bytes === 2) {
            return (($b0 & 0x1f) << 6) | (ord($char[1]) & 0x3f);
        }
        if ($bytes === 3) {
            return (($b0 & 0x0f) << 12) | ((ord($char[1]) & 0x3f) << 6) | (ord($char[2]) & 0x3f);
        }
        return (($b0 & 0x07) << 18) | ((ord($char[1]) & 0x3f) << 12) | ((ord($char[2]) & 0x3f) << 6) | (ord($char[3]) & 0x3f);
    }

    /** Codepoint -> UTF-8 character. */
    public static function chr(int $cp): string
    {
        if ($cp < 0x80) {
            return chr($cp);
        }
        if ($cp < 0x800) {
            return chr(0xc0 | ($cp >> 6)) . chr(0x80 | ($cp & 0x3f));
        }
        if ($cp < 0x10000) {
            return chr(0xe0 | ($cp >> 12)) . chr(0x80 | (($cp >> 6) & 0x3f)) . chr(0x80 | ($cp & 0x3f));
        }
        return chr(0xf0 | ($cp >> 18)) . chr(0x80 | (($cp >> 12) & 0x3f)) . chr(0x80 | (($cp >> 6) & 0x3f)) . chr(0x80 | ($cp & 0x3f));
    }

    /** Split a UTF-8 string into single characters. */
    public static function chars(string $input): array
    {
        return preg_split('//u', $input, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    }

    private static function data(): array
    {
        if (self::$data === null) {
            $json = file_get_contents(__DIR__ . '/../../data/tables.json');
            self::$data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        }
        return self::$data;
    }
}
