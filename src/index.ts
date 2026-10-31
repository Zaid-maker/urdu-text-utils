export {
  normalizeUrdu,
  removeDiacritics,
  foldUrdu,
  type NormalizeOptions,
} from "./normalize.js";

export {
  convertNumbers,
  toUrduDigits,
  toEnglishDigits,
  toArabicIndicDigits,
  parseUrduNumber,
  numberToUrduWords,
  formatUrduNumber,
  formatUrduCurrency,
  toUrduOrdinal,
  URDU_ONES,
  URDU_TEENS_AND_TENS,
  URDU_TENS_UNITS,
  URDU_SCALES,
  URDU_ORDINAL_IRREGULARS,
  type DigitStyle,
  type FormatUrduNumberOptions,
  type FormatUrduCurrencyOptions,
  type UrduOrdinalOptions,
} from "./numbers.js";

export { isUrdu, urduRatio, hasUrduSpecificLetters, type IsUrduOptions } from "./detect.js";

export {
  countWords,
  countSentences,
  splitWords,
  splitSentences,
  analyzeUrdu,
  SENTENCE_ABBREVIATIONS,
  type UrduStats,
  type SplitSentenceOptions,
} from "./stats.js";

export {
  URDU_STOP_WORDS,
  isStopWord,
  filterStopWords,
  removeStopWords,
} from "./stopwords.js";

export { sortUrdu, compareUrdu, type SortOptions } from "./collate.js";

export {
  searchUrdu,
  searchUrduRanked,
  highlightUrdu,
  editDistance,
  type SearchOptions,
  type SearchResult,
} from "./search.js";

export {
  romanize,
  normalizeRomanUrdu,
  romanToUrdu,
  urduSlug,
  type SlugOptions,
  type NormalizeRomanUrduOptions,
} from "./transliterate.js";

export {
  formatUrduDate,
  parseUrduDate,
  timeAgoUrdu,
  getUrduMonthName,
  getUrduWeekdayName,
  URDU_MONTHS_GREGORIAN,
  URDU_MONTHS_HIJRI,
  URDU_WEEKDAYS,
  type FormatUrduDateOptions,
  type TimeAgoOptions,
  type ParseUrduDateOptions,
} from "./date.js";

export {
  stemUrdu,
  stemUrduText,
  getAffixes,
  URDU_PREFIXES,
  URDU_SUFFIXES,
  PROTECTED_WORDS,
  type StemmerOptions,
  type AffixBreakdown,
} from "./stemmer.js";

export {
  transliterateNameToEnglish,
  transliterateNameToUrdu,
  extractNameParts,
  URDU_FIRST_NAMES,
  URDU_FAMILY_NAMES,
  HONORIFICS,
  NAME_PREFIXES,
  ENGLISH_NAME_ALIASES,
  type NameTransliterationOptions,
} from "./names.js";
