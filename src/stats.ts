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

export interface SplitSentenceOptions {
  /** If true, the sentence-ending punctuation (۔ ؟ ! . etc.) is preserved with each sentence. Default `false`. */
  preserveTerminators?: boolean;
}

/** Common Urdu abbreviations and honorifics that should not cause false sentence splits. */
const ABBREVIATIONS = [
  "ڈاکٹر",
  "پروفیسر",
  "انجینئر",
  "ایڈووکیٹ",
  "جناب",
  "صاحب",
  "صاحبہ",
  "محترم",
  "محترمہ",
  "مولانا",
  "مفتی",
  "علامہ",
  "بیگم",
  "وغیرہ",
  "رحمتہ",
  "رضی",
  "تعالی",
  "تعالیٰ",
  "علیہ",
  "السلام",
  "صلی",
  "وسلم",
];

const ABBREV_PATTERN = new RegExp(`(?:${ABBREVIATIONS.join("|")})[.۔]`, "gu");

/**
 * Sentences count, split on Urdu and standard terminators (۔ ؟ ! . …).
 * Protects common titles, abbreviations, and numeric decimals from false splits.
 */
export function countSentences(input: string, options?: SplitSentenceOptions): number {
  return splitSentences(input, options).length;
}

/**
 * Split text into sentences using Urdu punctuation rules.
 *
 * Handles Urdu full stop `۔`, Arabic question mark `؟`, exclamation `!`,
 * ASCII `.`, `?`, `!`, and ellipses `…`, while protecting abbreviations and numbers.
 *
 * @param input - Input text.
 * @param options - Options controlling termination preservation.
 *
 * @example
 * splitSentences("پاکستان ایک خوبصورت ملک ہے۔ اس کی تاریخ پرانی ہے۔")
 * // ["پاکستان ایک خوبصورت ملک ہے", "اس کی تاریخ پرانی ہے"]
 */
export function splitSentences(input: string, options: SplitSentenceOptions = {}): string[] {
  if (!input) return [];

  const { preserveTerminators = false } = options;

  // Placeholder for protected dots
  const PROTECTED_DOT = "\uE000";
  const PROTECTED_URDU_FULL_STOP = "\uE001";

  let sanitized = input
    // Protect decimal numbers (1.5, 3.14, ۱٫۵)
    .replace(/(\d)\.(\d)/gu, `$1${PROTECTED_DOT}$2`)
    // Protect abbreviations followed by dot or Urdu full stop
    .replace(ABBREV_PATTERN, (match) => {
      return match.replace(/\./g, PROTECTED_DOT).replace(/۔/g, PROTECTED_URDU_FULL_STOP);
    });

  if (preserveTerminators) {
    // Split keeping delimiter
    const matches = sanitized.match(/[^۔؟?!.…]+[۔؟?!.…]+|[^۔؟?!.…]+$/gu) ?? [];
    return matches
      .map((s) =>
        s
          .replace(new RegExp(PROTECTED_DOT, "gu"), ".")
          .replace(new RegExp(PROTECTED_URDU_FULL_STOP, "gu"), "۔")
          .trim(),
      )
      .filter((s) => s.length > 0);
  }

  return sanitized
    .split(SENTENCE_SPLIT_RE)
    .map((s) =>
      s
        .replace(new RegExp(PROTECTED_DOT, "gu"), ".")
        .replace(new RegExp(PROTECTED_URDU_FULL_STOP, "gu"), "۔")
        .trim(),
    )
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
