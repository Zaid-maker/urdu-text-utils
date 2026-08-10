import { ARABIC_INDIC_DIGITS, ASCII_DIGITS, URDU_DIGITS } from "./chars.js";

const SETS = {
  urdu: URDU_DIGITS,
  english: ASCII_DIGITS,
  arabic: ARABIC_INDIC_DIGITS,
} as const;

export type DigitStyle = keyof typeof SETS;

const VALUE_OF = new Map<string, number>();
for (const set of Object.values(SETS)) {
  for (let i = 0; i < 10; i++) VALUE_OF.set(set[i]!, i);
}

function convert(input: string, target: DigitStyle): string {
  if (!input) return "";
  const digits = SETS[target];
  let out = "";
  for (const ch of input) {
    const value = VALUE_OF.get(ch);
    out += value === undefined ? ch : digits[value];
  }
  return out;
}

/** `12345` -> `۱۲۳۴۵`. Accepts Arabic-Indic digits as input too. */
export function toUrduDigits(input: string): string {
  return convert(input, "urdu");
}

/** `۱۲۳۴۵` -> `12345`. Safe to feed into `Number()` afterwards. */
export function toEnglishDigits(input: string): string {
  return convert(input, "english");
}

/** `۱۲۳۴۵` -> `١٢٣٤٥` (Arabic-Indic, U+0660 block — a different block from Urdu's). */
export function toArabicIndicDigits(input: string): string {
  return convert(input, "arabic");
}

/**
 * Rewrite every digit in `input` to one style.
 *
 * @example
 * convertNumbers("12345")            // "۱۲۳۴۵"
 * convertNumbers("۱۲۳۴۵", "english") // "12345"
 */
export function convertNumbers(input: string, to: DigitStyle = "urdu"): string {
  return convert(input, to);
}

/**
 * Parse a number written with Urdu or Arabic-Indic digits.
 * Handles the Urdu decimal separator ٫ and thousands separator ٬.
 * Returns `NaN` when the string is not a number.
 */
export function parseUrduNumber(input: string): number {
  if (!input) return NaN;
  const ascii = toEnglishDigits(input)
    .replace(/[٬,\s]/gu, "")
    .replace(/٫/gu, ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/u.test(ascii)) return NaN;
  return Number(ascii);
}

const ONES = ["", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو"];
const TEENS_AND_TENS: Record<number, string> = {
  10: "دس",
  11: "گیارہ",
  12: "بارہ",
  13: "تیرہ",
  14: "چودہ",
  15: "پندرہ",
  16: "سولہ",
  17: "سترہ",
  18: "اٹھارہ",
  19: "انیس",
  20: "بیس",
  30: "تیس",
  40: "چالیس",
  50: "پچاس",
  60: "ساٹھ",
  70: "ستر",
  80: "اسی",
  90: "نوے",
  100: "سو",
};

/**
 * Spell a whole number in Urdu words, using the South Asian scale
 * (ہزار, لاکھ, کروڑ, ارب) rather than the western million/billion scale.
 *
 * Coverage note: 21-99 that are not multiples of ten are written compositionally
 * (`اکیس` etc. are irregular in real Urdu, so this returns `بیس ایک`-style forms
 * only as a fallback). Marked experimental for that reason.
 *
 * @experimental
 */
export function numberToUrduWords(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (!Number.isInteger(value)) throw new TypeError("numberToUrduWords expects an integer");
  if (value < 0) return `منفی ${numberToUrduWords(-value)}`;
  if (value === 0) return "صفر";

  const scales: Array<[number, string]> = [
    [10_000_000, "کروڑ"],
    [100_000, "لاکھ"],
    [1_000, "ہزار"],
    [100, "سو"],
  ];

  const parts: string[] = [];
  let rest = value;
  for (const [size, name] of scales) {
    if (rest >= size) {
      const count = Math.floor(rest / size);
      rest %= size;
      parts.push(`${numberToUrduWords(count)} ${name}`);
    }
  }
  if (rest > 0) {
    if (TEENS_AND_TENS[rest]) {
      parts.push(TEENS_AND_TENS[rest]!);
    } else if (rest < 10) {
      parts.push(ONES[rest]!);
    } else {
      const tens = Math.floor(rest / 10) * 10;
      parts.push(`${TEENS_AND_TENS[tens] ?? ""} ${ONES[rest % 10] ?? ""}`.trim());
    }
  }
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}
