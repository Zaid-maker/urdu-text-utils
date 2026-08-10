import { ANY_LETTER_RE_G, ARABIC_LETTER_RE } from "./chars.js";

export interface IsUrduOptions {
  /**
   * Minimum share of Arabic-script letters among all letters, 0-1. Default `0.5`.
   * A ratio rather than "contains any Urdu" so that a mostly-English string with
   * one Urdu word does not count as Urdu.
   */
  threshold?: number;
  /** Require at least this many Arabic-script letters. Default `1`. */
  minLetters?: number;
}

/**
 * Ratio of Arabic-script letters to all letters, 0-1.
 * Returns 0 for text with no letters at all (digits, punctuation, emoji).
 */
export function urduRatio(input: string): number {
  if (!input) return 0;
  let letters = 0;
  let urdu = 0;
  for (const ch of input.match(ANY_LETTER_RE_G) ?? []) {
    letters++;
    if (ARABIC_LETTER_RE.test(ch)) urdu++;
  }
  return letters === 0 ? 0 : urdu / letters;
}

/**
 * Is this text Urdu (more precisely: predominantly Arabic-script)?
 *
 * The Arabic script is shared by Urdu, Arabic, Persian, Pashto and others, so
 * this cannot distinguish Urdu from Arabic on script alone. Use
 * {@link hasUrduSpecificLetters} when that distinction matters.
 *
 * @example
 * isUrdu("آپ کیسے ہیں؟") // true
 */
export function isUrdu(input: string, options: IsUrduOptions = {}): boolean {
  const { threshold = 0.5, minLetters = 1 } = options;
  if (!input) return false;

  let letters = 0;
  let urdu = 0;
  for (const ch of input.match(ANY_LETTER_RE_G) ?? []) {
    letters++;
    if (ARABIC_LETTER_RE.test(ch)) urdu++;
  }
  if (urdu < minLetters) return false;
  return letters > 0 && urdu / letters >= threshold;
}

/** Letters that exist in Urdu but not in Arabic — the only reliable script-level signal. */
const URDU_ONLY = new Set([
  "ٹ", // ٹ tteh
  "ڈ", // ڈ ddal
  "ڑ", // ڑ rreh
  "ں", // ں noon ghunna
  "ے", // ے bari ye
  "ۓ", // ۓ bari ye with hamza
  "ہ", // ہ heh goal
  "ھ", // ھ do-chashmi heh
  "ک", // ک keheh
  "گ", // گ gaf
  "چ", // چ tcheh
  "پ", // پ peh
  "ژ", // ژ jeh
  "ی", // ی farsi yeh
]);

/**
 * True when the text contains at least one letter that Arabic does not use.
 * Cheap way to separate Urdu/Persian-family text from Arabic text.
 */
export function hasUrduSpecificLetters(input: string): boolean {
  for (const ch of input) if (URDU_ONLY.has(ch)) return true;
  return false;
}
