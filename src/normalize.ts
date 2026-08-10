import {
  ARABIC_INDIC_DIGITS,
  ASCII_DIGITS,
  DIACRITICS_RE,
  INVISIBLE_RE,
  TATWEEL_RE,
  URDU_DIGITS,
  ZWNJ_RE,
} from "./chars.js";
import type { DigitStyle } from "./numbers.js";

/**
 * Arabic-script characters that Urdu writes with a different codepoint.
 *
 * The direction matters and is a common source of bugs: Urdu uses
 * ہ (U+06C1 heh goal) and ی (U+06CC farsi yeh), NOT the Arabic
 * ه (U+0647) and ي (U+064A). Text pasted from Arabic keyboards,
 * Windows-1256 conversions or older CMSes carries the Arabic forms,
 * which then fail every naive `===` comparison.
 */
const URDU_YEH = "ی"; // ی farsi yeh
const URDU_KEHEH = "ک"; // ک keheh
const URDU_HEH_GOAL = "ہ"; // ہ heh goal
const ALEF = "ا"; // ا
const WAW = "و"; // و

const LETTER_MAP: Record<string, string> = {
  // yeh family -> ی. Note ے (U+06D2 bari ye) is a distinct letter and is preserved.
  "ي": URDU_YEH, // ي arabic yeh
  "ى": URDU_YEH, // ى alef maksura
  "ۍ": URDU_YEH, // ۍ yeh with tail
  "ې": URDU_YEH, // ې pashto e
  "ؠ": URDU_YEH, // ؠ kashmiri yeh
  // kaf family -> ک
  "ك": URDU_KEHEH, // ك arabic kaf
  "ڪ": URDU_KEHEH, // ڪ swash kaf
  // heh family -> ہ. ھ (U+06BE do-chashmi heh) is a distinct letter and is preserved.
  "ه": URDU_HEH_GOAL, // ه arabic heh
  "ۀ": URDU_HEH_GOAL, // ۀ heh with yeh above
  "ة": URDU_HEH_GOAL, // ة teh marbuta
  "ۃ": URDU_HEH_GOAL, // ۃ teh marbuta goal
  "ە": URDU_HEH_GOAL, // ە ae
  // alef family -> ا. آ (U+0622 alef madda) is a real Urdu letter and is preserved.
  "أ": ALEF, // أ alef with hamza above
  "إ": ALEF, // إ alef with hamza below
  "ٱ": ALEF, // ٱ alef wasla
  "ٲ": ALEF, // ٲ alef with wavy hamza above
  "ٳ": ALEF, // ٳ alef with wavy hamza below
  // waw family -> و. ؤ (U+0624) is preserved: it carries hamza meaningfully in Urdu.
  "ۋ": WAW, // ۋ ve
  "ۆ": WAW, // ۆ oe
  "ۇ": WAW, // ۇ u
};

const digitTargets: Record<DigitStyle, string> = {
  urdu: URDU_DIGITS,
  english: ASCII_DIGITS,
  arabic: ARABIC_INDIC_DIGITS,
};

export interface NormalizeOptions {
  /** Apply Unicode NFKC first, folding presentation forms (ﻻ, ﮐ) back to real letters. Default `true`. */
  compatibility?: boolean;
  /** Strip harakat and quranic marks. Default `false` — see {@link removeDiacritics}. */
  stripDiacritics?: boolean;
  /** Remove tatweel/kashida padding. Default `true`. */
  stripTatweel?: boolean;
  /** Remove zero-width non-joiner. Default `false`, since ZWNJ can be meaningful. */
  stripZwnj?: boolean;
  /** Collapse whitespace runs to a single space and trim. Default `true`. */
  collapseWhitespace?: boolean;
  /** Rewrite every digit to one style. Default `"preserve"`. */
  digits?: DigitStyle | "preserve";
  /** Map ASCII `,` `;` `?` to Urdu `،` `؛` `؟`. Default `false`. */
  urduPunctuation?: boolean;
}

const PUNCTUATION_MAP: Record<string, string> = {
  ",": "،", // ،
  ";": "؛", // ؛
  "?": "؟", // ؟
};

const DIGIT_LOOKUP = new Map<string, number>();
for (const set of [ASCII_DIGITS, URDU_DIGITS, ARABIC_INDIC_DIGITS]) {
  for (let i = 0; i < 10; i++) DIGIT_LOOKUP.set(set[i]!, i);
}

/**
 * Fold an Urdu string to a single canonical Unicode form.
 *
 * @example
 * normalizeUrdu("كيا حال ہے") // "کیا حال ہے"
 */
export function normalizeUrdu(input: string, options: NormalizeOptions = {}): string {
  if (!input) return "";

  const {
    compatibility = true,
    stripDiacritics = false,
    stripTatweel = true,
    stripZwnj = false,
    collapseWhitespace = true,
    digits = "preserve",
    urduPunctuation = false,
  } = options;

  let text = compatibility ? input.normalize("NFKC") : input.normalize("NFC");

  text = text.replace(INVISIBLE_RE, "");
  if (stripZwnj) text = text.replace(ZWNJ_RE, "");
  if (stripTatweel) text = text.replace(TATWEEL_RE, "");
  if (stripDiacritics) text = text.replace(DIACRITICS_RE, "");

  const digitTarget = digits === "preserve" ? null : digitTargets[digits];

  let out = "";
  for (const ch of text) {
    const mapped = LETTER_MAP[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    if (digitTarget) {
      const value = DIGIT_LOOKUP.get(ch);
      if (value !== undefined) {
        out += digitTarget[value];
        continue;
      }
    }
    if (urduPunctuation) {
      const punct = PUNCTUATION_MAP[ch];
      if (punct !== undefined) {
        out += punct;
        continue;
      }
    }
    out += ch;
  }

  if (collapseWhitespace) out = out.replace(/\s+/gu, " ").trim();

  return out;
}

/**
 * Strip harakat, quranic annotation marks and superscript alef.
 * Keeps ۔ ے ۓ, which are letters/punctuation rather than marks.
 *
 * @example
 * removeDiacritics("مُحَمَّد") // "محمد"
 */
export function removeDiacritics(input: string): string {
  if (!input) return "";
  return input.normalize("NFC").replace(DIACRITICS_RE, "");
}

/**
 * The comparison key used by {@link searchUrdu} and {@link sortUrdu}:
 * normalized, diacritic-free, lowercased, whitespace-collapsed.
 * Two strings that a reader would call "the same word" should fold to the same key.
 */
export function foldUrdu(input: string): string {
  return normalizeUrdu(input, {
    stripDiacritics: true,
    stripZwnj: true,
    collapseWhitespace: true,
  }).toLowerCase();
}
