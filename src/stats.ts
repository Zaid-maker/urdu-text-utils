import {
  ANY_DIGIT_RE_G,
  DIACRITICS_RE,
  SENTENCE_SPLIT_RE,
  WORD_SPLIT_RE,
} from "./chars.js";
import { urduRatio } from "./detect.js";

/** Words in the text. Splits on whitespace and punctuation, so `ہے۔` counts once. */
export function countWords(input: string): number {
  return splitWords(input).length;
}

/** The word list behind {@link countWords}. Useful for tokenizing before search or indexing. */
export function splitWords(input: string): string[] {
  if (!input) return [];
  return input
    .split(WORD_SPLIT_RE)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/** Sentences, split on ۔ ؟ ! . and ellipsis. */
export function countSentences(input: string): number {
  return splitSentences(input).length;
}

export function splitSentences(input: string): string[] {
  if (!input) return [];
  return input
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface UrduStats {
  /** Every codepoint, including spaces and diacritics. */
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  /** Whitespace-delimited blocks separated by a blank line. */
  paragraphs: number;
  /** Share of Arabic-script letters among all letters, 0-100, rounded. */
  urduPercentage: number;
  diacritics: number;
  digits: number;
  averageWordsPerSentence: number;
  /** At 180 Urdu words per minute — slower than English because the script is denser. */
  readingTimeMinutes: number;
}

/**
 * Character, word, sentence and script statistics for a block of text.
 *
 * @example
 * analyzeUrdu("پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی زیادہ ہے۔")
 */
export function analyzeUrdu(input: string): UrduStats {
  const text = input ?? "";
  const characters = [...text].length;
  const charactersNoSpaces = [...text.replace(/\s/gu, "")].length;
  const words = countWords(text);
  const sentences = countSentences(text);
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    urduPercentage: Math.round(urduRatio(text) * 100),
    diacritics: (text.match(DIACRITICS_RE) ?? []).length,
    digits: (text.match(ANY_DIGIT_RE_G) ?? []).length,
    averageWordsPerSentence: sentences === 0 ? 0 : Math.round((words / sentences) * 10) / 10,
    readingTimeMinutes: Math.round((words / 180) * 10) / 10,
  };
}
