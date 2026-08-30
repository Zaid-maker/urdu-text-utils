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
  type DigitStyle,
} from "./numbers.js";

export { isUrdu, urduRatio, hasUrduSpecificLetters, type IsUrduOptions } from "./detect.js";

export {
  countWords,
  countSentences,
  splitWords,
  splitSentences,
  analyzeUrdu,
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
  romanToUrdu,
  urduSlug,
  type SlugOptions,
} from "./transliterate.js";

export {
  formatUrduDate,
  timeAgoUrdu,
  getUrduMonthName,
  getUrduWeekdayName,
  URDU_MONTHS_GREGORIAN,
  URDU_MONTHS_HIJRI,
  URDU_WEEKDAYS,
  type FormatUrduDateOptions,
  type TimeAgoOptions,
} from "./date.js";

export {
  stemUrdu,
  stemUrduText,
  getAffixes,
  URDU_PREFIXES,
  URDU_SUFFIXES,
  type StemmerOptions,
  type AffixBreakdown,
} from "./stemmer.js";
