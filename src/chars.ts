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
