import { foldUrdu } from "./normalize.js";

/**
 * Urdu alphabetical order (حروف تہجی).
 *
 * `Intl.Collator("ur")` is not usable here: in most runtimes the `ur` locale
 * falls back to root Arabic collation, which orders ک/گ/ٹ/ڈ/ڑ/ں/ے by codepoint
 * instead of by their place in the Urdu alphabet. So the order is spelled out.
 *
 * Variant letters (ؤ, ئ, ۂ) are given the weight of their base letter plus a
 * tiebreaker, so `پاؤں` sorts next to `پاوں` rather than at the end of the list.
 */
const ALPHABET = [
  "ا",
  "آ",
  "ب",
  "پ",
  "ت",
  "ٹ",
  "ث",
  "ج",
  "چ",
  "ح",
  "خ",
  "د",
  "ڈ",
  "ذ",
  "ر",
  "ڑ",
  "ز",
  "ژ",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ک",
  "گ",
  "ل",
  "م",
  "ن",
  "ں",
  "و",
  "ہ",
  "ھ",
  "ء",
  "ی",
  "ے",
];

/** Letters that share a primary weight with a base letter, plus their secondary weight. */
const VARIANTS: Record<string, [base: string, secondary: number]> = {
  "ؤ": ["و", 1], // ؤ waw with hamza
  "ئ": ["ی", 1], // ئ yeh with hamza
  "ۂ": ["ہ", 1], // ۂ heh goal with hamza
  "ۓ": ["ے", 1], // ۓ bari ye with hamza
};

const WEIGHTS = new Map<string, [number, number]>();
ALPHABET.forEach((ch, index) => WEIGHTS.set(ch, [(index + 1) * 10, 0]));
for (const [ch, [base, secondary]] of Object.entries(VARIANTS)) {
  const baseWeight = WEIGHTS.get(base);
  if (baseWeight) WEIGHTS.set(ch, [baseWeight[0], secondary]);
}

/** Non-alphabet characters sort after every Urdu letter, ordered by codepoint. */
const NON_LETTER_BASE = (ALPHABET.length + 1) * 10;

function weightsOf(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const weight = WEIGHTS.get(ch);
    if (weight) {
      out.push(weight[0], weight[1]);
    } else if (ch === " ") {
      out.push(1, 0); // spaces sort before letters, so "ابو بکر" precedes "ابوبکر"
    } else {
      out.push(NON_LETTER_BASE + (ch.codePointAt(0) ?? 0), 0);
    }
  }
  return out;
}

/**
 * Comparator for Urdu strings, usable directly in `Array.prototype.sort`.
 * Diacritics and Unicode variants are folded first, so spelling noise does not
 * change the order.
 */
export function compareUrdu(a: string, b: string): number {
  const left = weightsOf(foldUrdu(a));
  const right = weightsOf(foldUrdu(b));
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = left[i]! - right[i]!;
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

export interface SortOptions<T> {
  /** Sort descending. Default `false`. */
  descending?: boolean;
  /** Read the sort key out of each item, for sorting objects. */
  getText?: (item: T) => string;
}

/**
 * Sort strings in Urdu alphabetical order.
 *
 * @example
 * sortUrdu(["گل", "آم", "بادام"]) // ["آم", "بادام", "گل"]
 */
export function sortUrdu<T>(items: readonly T[], options: SortOptions<T> = {}): T[] {
  const { descending = false, getText } = options;
  const key = getText ?? ((item: T) => String(item));
  const sorted = [...items].sort((a, b) => compareUrdu(key(a), key(b)));
  return descending ? sorted.reverse() : sorted;
}
