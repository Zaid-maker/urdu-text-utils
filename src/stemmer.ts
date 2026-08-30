import { normalizeUrdu, removeDiacritics } from "./normalize.js";

/**
 * Canonical Urdu prefixes (سابقے) ordered by descending length.
 */
export const URDU_PREFIXES = [
  "غیر",
  "خود",
  "اہل",
  "بے",
  "نا",
  "لا",
  "بد",
  "کم",
  "ان",
  "ہم",
  "با",
  "پُر",
] as const;

/**
 * Canonical Urdu suffixes (لاحقے) ordered by descending length.
 */
export const URDU_SUFFIXES = [
  // Compound / multi-syllable suffixes
  "یںگے",
  "ینگے",
  "ےگا",
  "ےگی",
  "ینگی",
  "داری",
  "گاری",
  "کاری",
  "سازی",
  "بازی",
  "مندی",
  "ترین",
  "ستان",
  "خانہ",
  "نامہ",
  "جات",
  "گان",
  // Adjectival / nominal / agentive suffixes
  "دار",
  "گار",
  "کار",
  "ساز",
  "باز",
  "مند",
  "ناک",
  "وار",
  "دان",
  "زار",
  "یت",
  "پن",
  "ائی",
  "تر",
  // Plural & verbal inflections
  "یاں",
  "ئیں",
  "ؤں",
  "یوں",
  "وں",
  "یں",
  "ات",
  "ہا",
  "ین",
  "تیں",
  "تا",
  "تی",
  "تے",
  "نا",
] as const;

/**
 * Irreducible base words that must not have prefixes or suffixes stripped falsely.
 */
const PROTECTED_WORDS = new Set<string>([
  "ہم",
  "نا",
  "لا",
  "بے",
  "یا",
  "تو",
  "پر",
  "سے",
  "کو",
  "کا",
  "کی",
  "کے",
  "میں",
  "نے",
  "ہے",
  "ہیں",
  "ہو",
  "تھا",
  "تھی",
  "تھے",
  "تھیں",
  "باغ",
  "نام",
  "سفر",
  "ہوا",
  "دل",
  "سر",
  "لب",
  "دست",
  "کار",
  "بار",
  "بال",
  "بان",
  "شام",
  "کام",
  "دام",
  "جام",
  "عام",
  "رام",
  "گام",
  "تار",
  "یار",
  "مار",
  "نار",
  "دار",
  "ہار",
  "زار",
  "غار",
  "رات",
  "بات",
  "مات",
  "ذات",
  "ہاتھ",
  "ساتھ",
  "دین",
  "تین",
  "چین",
  "بین",
  "زمین",
  "انسان",
  "احسان",
  "ایمان",
  "اسلام",
  "اعلان",
  "امکان",
  "ارمان",
  "افغان",
  "ایران",
  "عمران",
  "عثمان",
  "سلمان",
  "عرفان",
  "قرآن",
  "طوفان",
  "پہچان",
  "دکان",
  "مکان",
  "اسمان",
  "آسمان",
  "مہمان",
  "نقصان",
]);

export interface StemmerOptions {
  /**
   * Whether to strip canonical Urdu prefixes (e.g. بے-, نا-, غیر-, لا-).
   * @default true
   */
  stripPrefixes?: boolean;

  /**
   * Whether to strip canonical Urdu suffixes (e.g. -وں, -یں, -یاں, -دار, -تے).
   * @default true
   */
  stripSuffixes?: boolean;

  /**
   * Minimum character length of the remaining root word.
   * Prevents over-stemming of short roots.
   * @default 2
   */
  minStemLength?: number;

  /**
   * Custom list of prefixes to strip in addition to or in place of defaults.
   */
  customPrefixes?: string[];

  /**
   * Custom list of suffixes to strip in addition to or in place of defaults.
   */
  customSuffixes?: string[];

  /**
   * Map of exact exception words to their canonical stems.
   */
  exceptions?: Record<string, string>;
}

export interface AffixBreakdown {
  /** The stripped prefix, if any */
  prefix?: string;
  /** The stemmed base root */
  stem: string;
  /** The stripped suffix, if any */
  suffix?: string;
}

/**
 * Strips a suffix from an Urdu word while applying morphological restoration rules:
 * - `لڑکیاں` -> `لڑکی` (restoring final `ی` after `-یاں`)
 * - `لڑکیوں` -> `لڑکی` (restoring final `ی` after `-یوں`)
 * - `دعائیں` -> `دعا` (restoring base before `-ئیں`)
 * - `دعاؤں` -> `دعا` (restoring base before `-ؤں`)
 * - `خوشبوئیں` -> `خوشبو` (restoring `و` before `-ئیں`)
 * - `خوشبوؤں` -> `خوشبو` (restoring `و` before `-ؤں`)
 */
function applySuffixStripping(
  word: string,
  suffixes: readonly string[],
  minLen: number
): { stem: string; suffix?: string } {
  if (word.length <= minLen) return { stem: word };

  // Special morphological restorations:
  // 1. Plurals ending in -یاں (e.g. لڑکیاں -> لڑکی, کہانیاں -> کہانی, تبدیلیاں -> تبدیلی)
  if (word.endsWith("یاں") && word.length - 3 >= minLen) {
    const base = word.slice(0, -3);
    return { stem: `${base}ی`, suffix: "یاں" };
  }

  // 2. Plurals ending in -یوں (e.g. لڑکیوں -> لڑکی, گاڑیوں -> گاڑی, صدیوں -> صدی)
  if (word.endsWith("یوں") && word.length - 3 >= minLen) {
    const base = word.slice(0, -3);
    return { stem: `${base}ی`, suffix: "یوں" };
  }

  // 3. Plurals ending in -ئیں (3 chars: ئ + ی + ں) -> e.g. دعائیں -> دعا, ہوائیں -> ہوا, خوشبوئیں -> خوشبو
  if (word.endsWith("ئیں") && word.length - 3 >= minLen) {
    const base = word.slice(0, -3);
    return { stem: base, suffix: "ئیں" };
  }

  // 4. Plurals ending in -ؤں (2 chars: ؤ + ں) -> e.g. دعاؤں -> دعا, ہواؤں -> ہوا, خوشبوؤں -> خوشبو
  if (word.endsWith("ؤں") && word.length - 2 >= minLen) {
    const base = word.slice(0, -2);
    return { stem: base, suffix: "ؤں" };
  }

  for (const suf of suffixes) {
    if (word.endsWith(suf)) {
      const remainder = word.slice(0, -suf.length).replace(/[\s\u200C\u200D]+$/, "");
      if (remainder.length >= minLen && !PROTECTED_WORDS.has(word)) {
        return { stem: remainder, suffix: suf };
      }
    }
  }

  return { stem: word };
}

/**
 * Strips a prefix from an Urdu word with protected length and root checks.
 */
function applyPrefixStripping(
  word: string,
  prefixes: readonly string[],
  minLen: number
): { stem: string; prefix?: string } {
  if (word.length <= minLen) return { stem: word };

  for (const pref of prefixes) {
    if (word.startsWith(pref)) {
      const remainder = word.slice(pref.length).replace(/^[\s\u200C\u200D]+/, "");
      if (remainder.length >= minLen && !PROTECTED_WORDS.has(word)) {
        return { stem: remainder, prefix: pref };
      }
    }
  }

  return { stem: word };
}

/**
 * Analyzes an Urdu word and extracts its prefix, stem, and suffix.
 *
 * @example
 * getAffixes("بےوقوف")
 * // { prefix: "بے", stem: "وقوف" }
 *
 * getAffixes("کتابیں")
 * // { stem: "کتاب", suffix: "یں" }
 *
 * getAffixes("نااہلی")
 * // { prefix: "نا", stem: "اہل", suffix: "ی" }
 */
export function getAffixes(
  input: string,
  options: StemmerOptions = {}
): AffixBreakdown {
  if (!input || typeof input !== "string") {
    return { stem: "" };
  }

  const clean = removeDiacritics(normalizeUrdu(input.trim()));
  if (!clean) return { stem: "" };

  if (options.exceptions && options.exceptions[clean]) {
    return { stem: options.exceptions[clean]! };
  }

  if (PROTECTED_WORDS.has(clean)) {
    return { stem: clean };
  }

  const minLen = options.minStemLength ?? 2;
  const doSuffixes = options.stripSuffixes ?? true;
  const doPrefixes = options.stripPrefixes ?? true;

  const suffixes = options.customSuffixes ?? URDU_SUFFIXES;
  const prefixes = options.customPrefixes ?? URDU_PREFIXES;

  let current = clean;
  let detectedSuffix: string | undefined;
  let detectedPrefix: string | undefined;

  // 1. Suffix stripping
  if (doSuffixes) {
    const sRes = applySuffixStripping(current, suffixes, minLen);
    current = sRes.stem;
    detectedSuffix = sRes.suffix;
  }

  // 2. Prefix stripping
  if (doPrefixes) {
    const pRes = applyPrefixStripping(current, prefixes, minLen);
    current = pRes.stem;
    detectedPrefix = pRes.prefix;
  }

  return {
    prefix: detectedPrefix,
    stem: current,
    suffix: detectedSuffix,
  };
}

/**
 * Reduces an Urdu word to its morphological root/stem by stripping common prefixes,
 * plurals, tense inflections, and adjectival/nominal suffixes.
 *
 * @example
 * stemUrdu("کتابیں")     // "کتاب"
 * stemUrdu("لڑکیاں")     // "لڑکی"
 * stemUrdu("دعاؤں")      // "دعا"
 * stemUrdu("بےوقوف")     // "وقوف"
 * stemUrdu("نااہل")      // "اہل"
 * stemUrdu("خوبصورت ترین") // "خوبصورت"
 */
export function stemUrdu(word: string, options: StemmerOptions = {}): string {
  return getAffixes(word, options).stem;
}

/**
 * Stems all words within a block of Urdu text while preserving punctuation,
 * whitespaces, and document formatting.
 *
 * Ideal for search engine indexing, TF-IDF scoring, and AI/LLM embeddings preprocessing.
 *
 * @example
 * stemUrduText("طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔")
 * // "طلباء کتاب پڑھ ہیں اور کہانی سن ہیں۔"
 */
export function stemUrduText(text: string, options: StemmerOptions = {}): string {
  if (!text || typeof text !== "string") return "";

  // Split on word boundaries while keeping delimiters intact
  const tokens = text.split(/([\s\p{P}\p{S}]+)/u);

  return tokens
    .map((token) => {
      // If token contains Urdu letters, stem it; otherwise leave as is
      if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(token)) {
        return stemUrdu(token, options);
      }
      return token;
    })
    .join("");
}
