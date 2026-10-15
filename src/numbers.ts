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

  const normalized = toEnglishDigits(input).replace(/\s+/gu, "");
  const ascii = normalized.replace(/[٬]/gu, ",").replace(/٫/gu, ".");
  if (ascii === "" || ascii.split(".").length > 2) return NaN;

  const sign = ascii.startsWith("+") || ascii.startsWith("-") ? ascii[0]! : "";
  const unsigned = sign ? ascii.slice(1) : ascii;
  const [wholePart = "", fractionPart = ""] = unsigned.split(".");

  if (fractionPart.includes(".")) return NaN;
  if (fractionPart && !/^\d+$/u.test(fractionPart)) return NaN;
  if (wholePart === "" && fractionPart === "") return NaN;

  if (!wholePart.includes(",")) {
    const integerText = wholePart || "0";
    if (!/^\d+$/u.test(integerText)) return NaN;
    return Number(`${sign}${integerText}${fractionPart ? `.${fractionPart}` : ""}`);
  }

  const groups = wholePart.split(",");
  if (groups.some((group) => group.length === 0 || !/^\d+$/u.test(group))) return NaN;

  const westernValid =
    groups.length > 1 &&
    groups[0]!.length >= 1 &&
    groups[0]!.length <= 3 &&
    groups.slice(1).every((group) => group.length === 3);

  const indianValid =
    groups.length > 1 &&
    groups[0]!.length >= 1 &&
    groups[0]!.length <= 3 &&
    ((groups.length === 2 && [groups[1]!.length].every((len) => len === 2 || len === 3)) ||
      (groups.length > 2 &&
        groups.slice(1, -1).every((group) => group.length === 2) &&
        groups[groups.length - 1]!.length === 3));

  if (!westernValid && !indianValid) return NaN;

  const value = `${sign}${groups.join("")}${fractionPart ? `.${fractionPart}` : ""}`;
  return Number(value);
}

/**
 * Separator characters for formatted numbers. The Urdu pair (٬ thousands,
 * ٫ decimal) comes from the Arabic-extended block that Urdu digits also live
 * in; English output uses the ASCII pair so it stays copy-pasteable.
 */
const SEPARATORS = {
  urdu: { group: "٬", decimal: "٫" },
  english: { group: ",", decimal: "." },
} as const;

// ---------------------------------------------------------------------------
// Word tables
//
// These are exported so scripts/generate-php-tables.mjs can flow them into
// php/data/tables.json — the PHP port reads the same data instead of keeping a
// hand-copied second set of number words.
// ---------------------------------------------------------------------------

/** Cardinal words for 0-9. Index 0 is empty: `0` is spelled `صفر` separately. */
export const URDU_ONES: readonly string[] = [
  "",
  "ایک",
  "دو",
  "تین",
  "چار",
  "پانچ",
  "چھ",
  "سات",
  "آٹھ",
  "نو",
];

/** Words for 10-20 plus every multiple of ten through 100. */
export const URDU_TEENS_AND_TENS: Readonly<Record<number, string>> = {
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
 * The 21-99 values that are irregular: Urdu does not compose them as
 * "twenty-one", each unit has its own word. Every non-multiple of ten from 21
 * to 99 appears here exactly once.
 *
 * A few of these spellings have documented variants (`26` also appears as
 * `چھببیس`; `92` as `بیانوے`). This table follows the standard textbook forms.
 */
export const URDU_TENS_UNITS: Readonly<Record<number, string>> = {
  21: "اکیس",
  22: "بائیس",
  23: "تئیس",
  24: "چوبیس",
  25: "پچیس",
  26: "چھبیس",
  27: "ستائیس",
  28: "اٹھائیس",
  29: "انتیس",
  31: "اکتیس",
  32: "بتیس",
  33: "تینتیس",
  34: "چونتیس",
  35: "پینتیس",
  36: "چھتیس",
  37: "سینتیس",
  38: "اڑتیس",
  39: "انتالیس",
  41: "اکتالیس",
  42: "بیالیس",
  43: "تینتالیس",
  44: "چوالیس",
  45: "پینتالیس",
  46: "چھیالیس",
  47: "سینتالیس",
  48: "اڑتالیس",
  49: "انچاس",
  51: "اکیاون",
  52: "باون",
  53: "ترپن",
  54: "چون",
  55: "پچپن",
  56: "چھپن",
  57: "ستاون",
  58: "اٹھاون",
  59: "انسٹھ",
  61: "اکسٹھ",
  62: "باسٹھ",
  63: "ترسٹھ",
  64: "چونسٹھ",
  65: "پینسٹھ",
  66: "چھیاسٹھ",
  67: "سڑسٹھ",
  68: "اڑسٹھ",
  69: "انہتر",
  71: "اکہتر",
  72: "بہتر",
  73: "تہتر",
  74: "چوہتر",
  75: "پچہتر",
  76: "چھہتر",
  77: "ستتر",
  78: "اٹھہتر",
  79: "اناسی",
  81: "اکیاسی",
  82: "بیاسی",
  83: "تراسی",
  84: "چوراسی",
  85: "پچاسی",
  86: "چھیاسی",
  87: "ستاسی",
  88: "اٹھاسی",
  89: "نواسی",
  91: "اکانوے",
  92: "بانوے",
  93: "ترانوے",
  94: "چورانوے",
  95: "پچانوے",
  96: "چھیانوے",
  97: "ستانوے",
  98: "اٹھانوے",
  99: "نانوے",
};

/**
 * The South Asian scale, largest first. `کھرب` is 10^11 and `ارب` is 10^9 —
 * note they are not the western billion/trillion, and each step below `کروڑ`
 * is two orders of magnitude, not three.
 */
export const URDU_SCALES: ReadonlyArray<readonly [number, string]> = [
  [100_000_000_000, "کھرب"],
  [1_000_000_000, "ارب"],
  [10_000_000, "کروڑ"],
  [100_000, "لاکھ"],
  [1_000, "ہزار"],
  [100, "سو"],
];

/**
 * Ordinals 1-6 are irregular; every larger ordinal is the last word of the
 * cardinal with `واں` (masculine) or `ویں` (feminine) attached.
 */
export const URDU_ORDINAL_IRREGULARS: Readonly<
  Record<number, { masculine: string; feminine: string }>
> = {
  1: { masculine: "پہلا", feminine: "پہلی" },
  2: { masculine: "دوسرا", feminine: "دوسری" },
  3: { masculine: "تیسرا", feminine: "تیسری" },
  4: { masculine: "چوتھا", feminine: "چوتھی" },
  5: { masculine: "پانچواں", feminine: "پانچویں" },
  6: { masculine: "چھٹا", feminine: "چھٹی" },
};

/**
 * Spell a whole number in Urdu words, using the South Asian scale
 * (ہزار, لاکھ, کروڑ, ارب, کھرب) rather than the western million/billion scale.
 *
 * Every cardinal from 0 to 99 is a real irregular word — 21 is `اکیس`, not a
 * composed `بیس ایک` — and the scale words are exact up to 10^15, beyond which
 * JavaScript's own floating-point representation loses precision.
 *
 * @experimental The irregular 21-99 word table is transcribed from standard
 * textbook forms; a handful of those words have recognised variant spellings.
 *
 * @example
 * numberToUrduWords(1234567) // "بارہ لاکھ چونتیس ہزار پانچ سو سڑسٹھ"
 * numberToUrduWords(1e9)     // "ایک ارب"
 */
export function numberToUrduWords(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (!Number.isInteger(value)) throw new TypeError("numberToUrduWords expects an integer");
  if (value < 0) return `منفی ${numberToUrduWords(-value)}`;
  if (value === 0) return "صفر";

  const parts: string[] = [];
  let rest = value;
  for (const [size, name] of URDU_SCALES) {
    if (rest >= size) {
      const count = Math.floor(rest / size);
      rest %= size;
      parts.push(`${numberToUrduWords(count)} ${name}`);
    }
  }
  if (rest > 0) {
    const irregular = URDU_TENS_UNITS[rest];
    if (irregular !== undefined) {
      parts.push(irregular);
    } else if (URDU_TEENS_AND_TENS[rest]) {
      parts.push(URDU_TEENS_AND_TENS[rest]!);
    } else if (rest < 10) {
      parts.push(URDU_ONES[rest]!);
    } else {
      // Unreachable while URDU_TENS_UNITS is complete; kept as a safety net so
      // a gap in the table degrades to composed words instead of throwing.
      const tens = Math.floor(rest / 10) * 10;
      parts.push(`${URDU_TEENS_AND_TENS[tens] ?? ""} ${URDU_ONES[rest % 10] ?? ""}`.trim());
    }
  }
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

export interface FormatUrduNumberOptions {
  /**
   * Digit block to emit. The separators follow it: Urdu digits pair with ٬/٫,
   * English digits with `,`/`.`.
   * @default "urdu"
   */
  digits?: "urdu" | "english";
  /**
   * `"southAsian"` groups as lakh/crore (12٬34٬567), `"western"` as thousands
   * (1٬234٬567), `"none"` emits no separators.
   * @default "southAsian"
   */
  grouping?: "southAsian" | "western" | "none";
  /**
   * Fraction digits, rounded half-up. Trailing zeros are dropped, so a whole
   * number never grows a decimal separator.
   *
   * Rounding is applied to the binary double, not to its decimal spelling, and
   * both language ports do the arithmetic identically. That keeps output
   * byte-identical between them, and it means values whose decimal form is not
   * exactly representable (2.675, 1.005) can round down rather than up. Asking
   * for many digits exposes the representation itself: 1234567.891 at
   * `decimals: 15` ends in the double's real binary noise. Keep this at 6 or
   * below for display; `decimalPlaces`-style rounding of exact decimals is out
   * of scope.
   * @default 2
   */
  decimals?: number;
}

/**
 * `String(n)` switches to exponential notation at 1e21, which would reach the
 * output as `1e+21` — and the grouping pass would then insert a separator into
 * the exponent itself (`1e,+21`). Grouping needs digits, so expand the
 * exponent into a plain integer string.
 */
function toDigitString(n: number): string {
  const plain = String(n);
  const exponential = /^(\d)(?:\.(\d+))?e\+(\d+)$/u.exec(plain);
  if (!exponential) return plain;
  const lead = exponential[1]!;
  const fraction = exponential[2] ?? "";
  const zeros = Number(exponential[3]) - fraction.length;
  return `${lead}${fraction}${"0".repeat(zeros)}`;
}

/** `1234567` -> `12٬34٬567`. See {@link FormatUrduNumberOptions}. */
function groupDigits(intStr: string, grouping: FormatUrduNumberOptions["grouping"], separator: string): string {
  if (grouping === "none" || separator === "") return intStr;
  if (grouping === "western") {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/gu, separator);
  }
  // South Asian: the last three digits form one group, then pairs.
  const lastThree = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest === "" ? lastThree : `${rest.replace(/\B(?=(\d{2})+(?!\d))/gu, separator)}${separator}${lastThree}`;
}

/**
 * Format a number the way Urdu software prints numbers, with South Asian
 * digit grouping and Urdu digits by default.
 *
 * Returns `""` for `NaN` and infinities, matching `formatUrduDate`.
 *
 * A very large magnitude prints the shortest decimal that represents the
 * double, so beyond 2^53 the digits are the value the number really holds.
 *
 * @example
 * formatUrduNumber(1234567)                        // "۱۲٬۳۴٬۵۶۷"
 * formatUrduNumber(1234567, { grouping: "western" }) // "۱٬۲۳۴٬۵۶۷"
 * formatUrduNumber(1234, { digits: "english" })       // "1,234"
 * formatUrduNumber(-3.14159, { decimals: 3 })        // "-۳٫۱۴۲"
 */
export function formatUrduNumber(value: number, options: FormatUrduNumberOptions = {}): string {
  if (!Number.isFinite(value)) return "";

  const digits = options.digits ?? "urdu";
  const grouping = options.grouping ?? "southAsian";
  const decimals = Math.min(15, Math.max(0, Math.floor(options.decimals ?? 2)));
  const separators = SEPARATORS[digits];

  const negative = value < 0;
  const abs = Math.abs(value);
  const scale = 10 ** decimals;

  // Split the integer and fraction parts in double arithmetic before any
  // string handling, and round the fraction with floor(x + 0.5) — the same
  // operation the PHP port performs, so both languages round identically.
  let intPart = Math.floor(abs);
  let scaledFraction = Math.floor((abs - intPart) * scale + 0.5);
  if (scaledFraction >= scale) {
    intPart += 1;
    scaledFraction -= scale;
  }

  const intStr = groupDigits(toDigitString(intPart), grouping, separators.group);
  const fraction = String(scaledFraction).padStart(decimals, "0").replace(/0+$/u, "");
  const body = fraction === "" ? intStr : `${intStr}${separators.decimal}${fraction}`;
  const sign = negative ? "-" : "";

  return digits === "urdu" ? `${sign}${toUrduDigits(body)}` : `${sign}${body}`;
}

export interface FormatUrduCurrencyOptions extends FormatUrduNumberOptions {
  /**
   * `"digits"` prints the amount as a formatted number, `"words"` spells it out.
   * @default "digits"
   */
  style?: "digits" | "words";
  /** Unit used for every amount except exactly one. @default "روپے" */
  unit?: string;
  /** Unit used for an amount of exactly one. @default "روپیہ" */
  singularUnit?: string;
}

/**
 * Format a money amount with the right Urdu unit for the quantity.
 *
 * @experimental The `"words"` style inherits the note on
 * {@link numberToUrduWords}, and like it requires a whole amount.
 *
 * @example
 * formatUrduCurrency(1500)                    // "۱٬۵۰۰ روپے"
 * formatUrduCurrency(1)                       // "۱ روپیہ"
 * formatUrduCurrency(1500, { style: "words" }) // "ایک ہزار پانچ سو روپے"
 * formatUrduCurrency(2.5, { unit: "ڈالر", singularUnit: "ڈالر" }) // "۲٫۵ ڈالر"
 */
export function formatUrduCurrency(value: number, options: FormatUrduCurrencyOptions = {}): string {
  if (!Number.isFinite(value)) return "";

  const style = options.style ?? "digits";
  const unit = options.unit ?? "روپے";
  const singularUnit = options.singularUnit ?? "روپیہ";

  const amount = style === "words" ? numberToUrduWords(value) : formatUrduNumber(value, options);
  if (amount === "") return "";

  return `${amount} ${Math.abs(value) === 1 ? singularUnit : unit}`;
}

export interface UrduOrdinalOptions {
  /**
   * Urdu ordinals inflect for gender: `پہلا` (masculine) vs `پہلی` (feminine).
   * @default "masculine"
   */
  gender?: "masculine" | "feminine";
}

/**
 * Spell an ordinal in Urdu — `پہلا`, `دوسرا`, `اکیسواں`, `سواں`.
 *
 * 1-6 are irregular and come from a table; everything else is the last word of
 * the cardinal with the ordinal suffix, so `اکیس` becomes `اکیسواں` and `نوے`
 * becomes `نوےواں`. A word-final `و` contracts instead of doubling, which is
 * why `نو` becomes `نواں` (not `نوواں`) and `سو` becomes `سواں`.
 *
 * `0` returns `صفر`, since "zeroth" has no Urdu ordinal form. Returns `""` for
 * non-finite input and throws for fractions, like {@link numberToUrduWords}.
 *
 * @experimental Inherits the note on {@link numberToUrduWords}.
 *
 * @example
 * toUrduOrdinal(1)                            // "پہلا"
 * toUrduOrdinal(1, { gender: "feminine" })    // "پہلی"
 * toUrduOrdinal(9)                            // "نواں"
 * toUrduOrdinal(21)                           // "اکیسواں"
 * toUrduOrdinal(100)                          // "سواں"
 * toUrduOrdinal(1100, { gender: "feminine" }) // "ایک ہزار ایک سویں"
 */
export function toUrduOrdinal(value: number, options: UrduOrdinalOptions = {}): string {
  if (!Number.isFinite(value)) return "";
  if (!Number.isInteger(value)) throw new TypeError("toUrduOrdinal expects an integer");

  const gender = options.gender ?? "masculine";
  if (value < 0) return `منفی ${toUrduOrdinal(-value, options)}`;
  if (value === 0) return "صفر";

  const irregular = URDU_ORDINAL_IRREGULARS[value];
  if (irregular) return irregular[gender];

  const words = numberToUrduWords(value).split(" ");
  const last = words.pop()!;
  // A final و contracts rather than doubling: نو -> نواں, سو -> سواں.
  const stem = last.endsWith("و") ? last.slice(0, -1) : last;
  const ordinated = `${stem}${gender === "feminine" ? "ویں" : "واں"}`;

  // An exact scale value drops its `ایک`: 100th is `سواں`, not `ایک سواں`, and
  // 1000th is `ہزارواں`. A compound keeps it (1100th is `ایک ہزار ایک سواں`).
  const prefix = words.length === 1 && words[0] === "ایک" ? [] : words;

  return [...prefix, ordinated].join(" ");
}
