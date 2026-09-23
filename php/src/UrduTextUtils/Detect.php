<?php

declare(strict_types=1);

namespace UrduTextUtils;

/**
 * Script detection — a faithful PHP port of src/detect.ts.
 *
 * The Arabic script is shared by Urdu, Arabic, Persian and Pashto, so these
 * helpers measure script, not language. Use hasUrduSpecificLetters() when
 * Urdu must be told apart from Arabic.
 */
final class Detect
{
    /**
     * Letters that exist in Urdu but not in Arabic — the only reliable
     * script-level signal (kept in sync with src/detect.ts URDU_ONLY).
     */
    private const URDU_ONLY = [
        'ٹ', // ٹ tteh
        'ڈ', // ڈ ddal
        'ڑ', // ڑ rreh
        'ں', // ں noon ghunna
        'ے', // ے bari ye
        'ۓ', // ۓ bari ye with hamza
        'ہ', // ہ heh goal
        'ھ', // ھ do-chashmi heh
        'ک', // ک keheh
        'گ', // گ gaf
        'چ', // چ tcheh
        'پ', // پ peh
        'ژ', // ژ jeh
        'ی', // ی farsi yeh
    ];

    /**
     * Ratio of Arabic-script letters to all letters, 0-1.
     * Returns 0 for text with no letters at all (digits, punctuation, emoji).
     *
     * Integral results arrive as int so assertSame matches the JS fixtures
     * (JSON serializes 1.0 as 1, PHP keeps 1.0 a float).
     */
    public static function urduRatio(string $input): int|float
    {
        if ($input === '') {
            return 0;
        }

        $letters = 0;
        $urdu = 0;
        foreach (Tables::chars($input) as $ch) {
            if (preg_match(Tables::regex('anyLetter'), $ch) === 1) {
                $letters++;
                if (preg_match(Tables::regex('arabicLetter'), $ch) === 1) {
                    $urdu++;
                }
            }
        }

        if ($letters === 0) {
            return 0;
        }

        $ratio = $urdu / $letters;

        return floor($ratio) === $ratio ? (int) $ratio : $ratio;
    }

    /**
     * Is this text Urdu (more precisely: predominantly Arabic-script)?
     *
     * @param array{threshold?: float, minLetters?: int} $options
     */
    public static function isUrdu(string $input, array $options = []): bool
    {
        $threshold = $options['threshold'] ?? 0.5;
        $minLetters = $options['minLetters'] ?? 1;
        if ($input === '') {
            return false;
        }

        $letters = 0;
        $urdu = 0;
        foreach (Tables::chars($input) as $ch) {
            if (preg_match(Tables::regex('anyLetter'), $ch) === 1) {
                $letters++;
                if (preg_match(Tables::regex('arabicLetter'), $ch) === 1) {
                    $urdu++;
                }
            }
        }
        if ($urdu < $minLetters) {
            return false;
        }

        return $letters > 0 && $urdu / $letters >= $threshold;
    }

    /**
     * True when the text contains at least one letter that Arabic does not use.
     * Cheap way to separate Urdu/Persian-family text from Arabic text.
     */
    public static function hasUrduSpecificLetters(string $input): bool
    {
        foreach (Tables::chars($input) as $ch) {
            if (in_array($ch, self::URDU_ONLY, true)) {
                return true;
            }
        }

        return false;
    }
}
