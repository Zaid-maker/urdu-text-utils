import { foldUrdu, normalizeUrdu } from "./normalize.js";
import { splitWords } from "./stats.js";

export interface SearchOptions<T> {
  /** Read the searchable text out of each item, for searching objects. */
  getText?: (item: T) => string;
  /**
   * Allow small spelling differences via edit distance on individual words.
   * Costs O(query x item) per candidate word, so it runs only after the exact
   * substring pass fails. Default `false`.
   */
  fuzzy?: boolean;
  /** Maximum edit distance per word when `fuzzy` is on. Default `1`. */
  maxDistance?: number;
  /** Cap the number of results. */
  limit?: number;
  /** Return matches ordered by score (best first) instead of input order. Default `true`. */
  sortByScore?: boolean;
}

export interface SearchResult<T> {
  item: T;
  /** 1 = exact fold match, 0.9 = prefix, 0.8 = substring, lower = fuzzy word match. */
  score: number;
}

/** Levenshtein distance with early exit once the limit is exceeded. */
export function editDistance(a: string, b: string, limit = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = current[0]!;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
      rowMin = Math.min(rowMin, current[j]!);
    }
    if (rowMin > limit) return limit + 1;
    [previous, current] = [current, previous];
  }
  return previous[b.length]!;
}

function scoreOf(query: string, text: string, options: { fuzzy: boolean; maxDistance: number }): number {
  if (!query) return 0;
  if (text === query) return 1;
  if (text.startsWith(query)) return 0.9;
  if (text.includes(query)) return 0.8;

  if (!options.fuzzy) return 0;

  // Compare word by word: a one-letter typo inside a long sentence should still hit.
  const queryWords = splitWords(query);
  const textWords = splitWords(text);
  if (queryWords.length === 0 || textWords.length === 0) return 0;

  let matched = 0;
  for (const qw of queryWords) {
    const limit = Math.min(options.maxDistance, Math.max(1, Math.floor(qw.length / 3)));
    const hit = textWords.some(
      (tw) => tw.includes(qw) || editDistance(qw, tw, limit) <= limit,
    );
    if (hit) matched++;
  }
  if (matched === 0) return 0;
  return (matched / queryWords.length) * 0.7;
}

/**
 * Search a list of Urdu strings, ignoring diacritics and Unicode variant spellings.
 *
 * Both sides are folded with {@link foldUrdu} first, so `محمد` matches `مُحَمَّد`
 * and Arabic-keyboard `محمد` (with ه/ي) matches Urdu-keyboard `محمد`.
 *
 * @example
 * searchUrdu("محمد", ["مُحَمَّد علی", "احمد", "محمد خان"])
 * // ["مُحَمَّد علی", "محمد خان"]
 */
export function searchUrdu<T = string>(
  query: string,
  items: readonly T[],
  options: SearchOptions<T> = {},
): T[] {
  return searchUrduRanked(query, items, options).map((r) => r.item);
}

/** Same as {@link searchUrdu} but keeps the match scores. */
export function searchUrduRanked<T = string>(
  query: string,
  items: readonly T[],
  options: SearchOptions<T> = {},
): Array<SearchResult<T>> {
  const { getText, fuzzy = false, maxDistance = 1, limit, sortByScore = true } = options;
  const read = getText ?? ((item: T) => String(item));

  const folded = foldUrdu(query);
  if (!folded) return [];

  const results: Array<SearchResult<T>> = [];
  for (const item of items) {
    const score = scoreOf(folded, foldUrdu(read(item)), { fuzzy, maxDistance });
    if (score > 0) results.push({ item, score });
  }

  if (sortByScore) results.sort((a, b) => b.score - a.score);
  return limit === undefined ? results : results.slice(0, limit);
}

/**
 * Highlight every occurrence of `query` in `text` by wrapping it.
 * Matching is diacritic-insensitive, but the returned string keeps the original
 * spelling and diacritics intact — offsets are mapped back to the source.
 */
export function highlightUrdu(
  text: string,
  query: string,
  wrap: (match: string) => string = (m) => `<mark>${m}</mark>`,
): string {
  const foldedQuery = foldUrdu(query);
  if (!foldedQuery || !text) return text;

  // Fold character by character so folded offsets map back to source offsets.
  const sourceChars = [...text];
  const foldedChars: string[] = [];
  const sourceIndexOf: number[] = [];
  sourceChars.forEach((ch, i) => {
    // Per-character folding must keep whitespace, otherwise multi-word queries
    // could never match: foldUrdu() trims, and a lone space would fold to "".
    const folded = normalizeUrdu(ch, {
      stripDiacritics: true,
      stripZwnj: true,
      collapseWhitespace: false,
    }).toLowerCase();
    for (const f of folded) {
      foldedChars.push(f);
      sourceIndexOf.push(i);
    }
  });

  const haystack = foldedChars.join("");
  let out = "";
  let cursor = 0; // index into sourceChars
  let from = 0; // index into haystack

  for (;;) {
    const hit = haystack.indexOf(foldedQuery, from);
    if (hit === -1) break;
    const startSource = sourceIndexOf[hit]!;
    const endSource = (sourceIndexOf[hit + foldedQuery.length - 1] ?? startSource) + 1;
    out += sourceChars.slice(cursor, startSource).join("");
    out += wrap(sourceChars.slice(startSource, endSource).join(""));
    cursor = endSource;
    from = hit + foldedQuery.length;
  }

  out += sourceChars.slice(cursor).join("");
  return out;
}
