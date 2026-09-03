/**
 * Shared Unicode building blocks for the Arabic script as used by Urdu.
 *
 * Blocks worth remembering:
 *   U+0600-U+06FF  Arabic (Urdu letters live here, plus the U+06Ax-U+06Dx extras)
 *   U+0750-U+077F  Arabic Supplement
 *   U+08A0-U+08FF  Arabic Extended-A
 *   U+FB50-U+FDFF  Arabic Presentation Forms-A
 *   U+FE70-U+FEFC  Arabic Presentation Forms-B
 *
 * Every class below is written with \u escapes on purpose: these characters are
 * invisible or shape-shifting in an editor, and a silently wrong literal is the
 * single easiest way to break an Urdu pipeline.
 */

/**
 * Combining marks: harakat (ً-ٟ), quranic annotation (ۖ-ۭ),
 * superscript alef (ٰ) and the ؐ-ؚ honorific marks.
 * Deliberately excludes U+06D4 (Urdu full stop ۔), U+06D2 (ے) and U+06D3 (ۓ).
 */
export const DIACRITIC_RANGES = "\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED";

export const DIACRITICS_RE = new RegExp(`[${DIACRITIC_RANGES}]`, "gu");

/** Tatweel / kashida U+0640 — display padding, never meaning. */
export const TATWEEL_RE = /ـ/gu;

/** Bidi controls, joiners and BOM that leak in from copy-paste. ZWNJ is handled separately. */
export const INVISIBLE_RE = /[​‍-‏‪-‮⁠-⁤⁦-⁩﻿]/gu;

/** Zero-width non-joiner U+200C: occasionally meaningful, so stripped only on request. */
export const ZWNJ_RE = /‌/gu;

const ARABIC_SCRIPT_RANGES = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFC";

/** Any Arabic-script character: letters, marks, punctuation, digits, presentation forms. */
export const ARABIC_SCRIPT_RE = new RegExp(`[${ARABIC_SCRIPT_RANGES}]`, "u");

/**
 * Whole-string match for a single Urdu word (dictionary keys and values):
 * Arabic-script characters plus ZWNJ/ZWJ — the joiners are meaningful inside
 * words such as جزاک‌اللہ — and nothing else. Rejects whitespace and
 * foreign-script lookalikes (Devanagari, Gurmukhi, Latin) that would silently
 * break lookups, so data-table integrity tests can share one definition.
 */
export const ARABIC_WORD_RE = new RegExp(`^[${ARABIC_SCRIPT_RANGES}\\u200C\\u200D]+$`, "u");

const ARABIC_LETTER_RANGES =
  "\\u0620-\\u063F\\u0641-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06EE\\u06EF\\u06FA-\\u06FF" +
  "\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFC";

/** Arabic-script letters only — no marks, no digits, no punctuation, no tatweel. */
export const ARABIC_LETTER_RE = new RegExp(`[${ARABIC_LETTER_RANGES}]`, "u");
export const ARABIC_LETTER_RE_G = new RegExp(`[${ARABIC_LETTER_RANGES}]`, "gu");

/** Letters of any script — the denominator when measuring "how Urdu is this text". */
export const ANY_LETTER_RE = /\p{L}/u;
export const ANY_LETTER_RE_G = /\p{L}/gu;

/** Urdu digits ۰-۹ (U+06F0) and Arabic-Indic digits ٠-٩ (U+0660) are two distinct blocks. */
export const URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const ASCII_DIGITS = "0123456789";

export const ANY_DIGIT_RE_G = new RegExp(`[${ASCII_DIGITS}${URDU_DIGITS}${ARABIC_INDIC_DIGITS}]`, "gu");

/** Sentence terminators: Urdu full stop ۔, Arabic question mark ؟, ASCII . ! ? and ellipsis. */
export const SENTENCE_SPLIT_RE = /[۔؟?!.…]+/u;

/** Word separators: whitespace plus punctuation that cannot occur inside an Urdu word. */
export const WORD_SPLIT_RE =
  /[\s،؛؟۔٫٬…!-\/:-@\[-`{-~‐-‧«»‘’“”]+/u;

// ---------------------------------------------------------------------------
// Canonical Urdu letter inventory
// ---------------------------------------------------------------------------

// Unlike the regex ranges above, letters here are written as literals: they are
// data keys, not patterns, and several are referenced from normalize.ts,
// collate.ts and transliterate.ts. Non-obvious codepoints carry comments.

export interface UrduLetter {
  /** The canonical Urdu letter. */
  ch: string;
  /** Default Roman Urdu value, used when no positional rule applies. */
  roman: string;
  /** The letter carries a vowel in Roman output (drives the schwa rule). */
  vowel?: boolean;
  /** Alternate spellings in the wild that normalizeUrdu folds to this letter. */
  aliases?: string[];
  /** Hamza-carrying letter: collates as its base letter with a secondary tiebreaker. */
  variantOf?: string;
}

/**
 * The canonical Urdu alphabet (حروف تہجی) in alphabetical order — the single
 * source of truth for the letter inventory shared by normalization, collation
 * and transliteration:
 *
 * - {@link URDU_LETTERS} order defines collation (primary letters only;
 *   hamza variants carry {@link UrduLetter.variantOf});
 * - {@link UrduLetter.roman} and {@link UrduLetter.vowel} feed transliteration;
 * - {@link UrduLetter.aliases} are the Arabic-keyboard and historical spellings
 *   that normalization folds onto the canonical letter.
 *
 * Keeping one table means adding a letter updates all three consumers at once
 * instead of three hand-maintained maps drifting apart.
 */
export const URDU_LETTERS: readonly UrduLetter[] = [
  { ch: "ا", roman: "a", vowel: true, aliases: ["أ", "إ", "ٱ", "ٲ", "ٳ"] }, // alef + hamza/wasla forms
  { ch: "آ", roman: "aa", vowel: true }, // alef madda — a real Urdu letter
  { ch: "ب", roman: "b" },
  { ch: "پ", roman: "p" },
  { ch: "ت", roman: "t" },
  { ch: "ٹ", roman: "t" },
  { ch: "ث", roman: "s" },
  { ch: "ج", roman: "j" },
  { ch: "چ", roman: "ch" },
  { ch: "ح", roman: "h" },
  { ch: "خ", roman: "kh" },
  { ch: "د", roman: "d" },
  { ch: "ڈ", roman: "d" },
  { ch: "ذ", roman: "z" },
  { ch: "ر", roman: "r" },
  { ch: "ڑ", roman: "r" },
  { ch: "ز", roman: "z" },
  { ch: "ژ", roman: "zh" },
  { ch: "س", roman: "s" },
  { ch: "ش", roman: "sh" },
  { ch: "ص", roman: "s" },
  { ch: "ض", roman: "z" },
  { ch: "ط", roman: "t" },
  { ch: "ظ", roman: "z" },
  { ch: "ع", roman: "a", vowel: true },
  { ch: "غ", roman: "gh" },
  { ch: "ف", roman: "f" },
  { ch: "ق", roman: "q" },
  { ch: "ک", roman: "k", aliases: ["ك", "ڪ"] }, // arabic kaf, swash kaf
  { ch: "گ", roman: "g" },
  { ch: "ل", roman: "l" },
  { ch: "م", roman: "m" },
  { ch: "ن", roman: "n" },
  { ch: "ں", roman: "n" }, // noon ghunna
  { ch: "و", roman: "o", vowel: true, aliases: ["ۋ", "ۆ", "ۇ"] }, // ve, oe, u
  { ch: "ؤ", roman: "o", vowel: true, variantOf: "و" }, // waw with hamza — kept, hamza is meaningful
  { ch: "ہ", roman: "h", aliases: ["ه", "ۀ", "ة", "ۃ", "ە"] }, // arabic heh, heh-yeh-above, teh marbuta, ae
  { ch: "ۂ", roman: "h", vowel: true, variantOf: "ہ" }, // heh goal with hamza above
  { ch: "ھ", roman: "h" }, // do-chashmi heh — distinct letter, aspirates the consonant before it
  { ch: "ء", roman: "" }, // hamza
  { ch: "ی", roman: "i", vowel: true, aliases: ["ي", "ى", "ۍ", "ې", "ؠ"] }, // arabic yeh, alef maksura, yeh-with-tail, pashto e, kashmiri yeh
  { ch: "ئ", roman: "i", vowel: true, variantOf: "ی" }, // yeh with hamza above
  { ch: "ے", roman: "e", vowel: true }, // bari ye — distinct letter
  { ch: "ۓ", roman: "e", vowel: true, variantOf: "ے" }, // bari ye with hamza
];
