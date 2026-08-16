import { normalizeUrdu } from "./normalize.js";
import { splitWords } from "./stats.js";

/**
 * Standard list of Urdu stop words.
 *
 * Covers pronouns, postpositions, auxiliaries, conjunctions, particles,
 * and high-frequency functional words used across Urdu texts.
 * All keys are canonical normalized Urdu.
 */
export const URDU_STOP_WORDS = new Set([
  // Tense auxiliaries & copulas
  "ہے",
  "ہیں",
  "ہوں",
  "ہو",
  "تھا",
  "تھی",
  "تھے",
  "تھیں",
  "ہوگا",
  "ہوگی",
  "ہونگے",
  "ہوںگے",
  "ہونا",
  "ہونے",
  "ہوا",
  "ہوئی",
  "ہوئے",

  // Postpositions, relations & prepositions
  "کا",
  "کی",
  "کے",
  "کو",
  "نے",
  "سے",
  "پر",
  "تک",
  "میں",
  "لیے",
  "ساتھ",
  "بغیر",
  "طرح",
  "طرف",
  "بارے",
  "بعد",
  "پہلے",
  "دوران",
  "درمیان",
  "علاوہ",
  "سوائے",
  "سوا",
  "مطابق",
  "باعث",
  "ذریعے",
  "تحت",
  "اوپر",
  "نیچے",
  "آگے",
  "پیچھے",
  "اندر",
  "باہر",
  "پاس",
  "قریب",
  "نزدیک",

  // Conjunctions & discourse markers
  "اور",
  "یا",
  "اگر",
  "لیکن",
  "مگر",
  "تو",
  "بھی",
  "ہی",
  "نہ",
  "نہیں",
  "مت",
  "نا",
  "بلکہ",
  "حالانکہ",
  "چونکہ",
  "کیونکہ",
  "تاکہ",
  "ورنہ",
  "البتہ",
  "مثلاً",
  "یعنی",
  "خصوصاً",
  "عموماً",
  "چنانچہ",
  "خواہ",
  "چاہے",
  "گویا",
  "تاہم",
  "نیز",
  "حتی",
  "وغیرہ",
  "صرف",
  "محض",
  "فقط",

  // Pronouns, determiners & question words
  "ہم",
  "تم",
  "آپ",
  "وہ",
  "یہ",
  "میرا",
  "میری",
  "میرے",
  "ہمارا",
  "ہماری",
  "ہمارے",
  "تمہارا",
  "تمہاری",
  "تمہارے",
  "آپکا",
  "آپکی",
  "آپکے",
  "اس",
  "اسکا",
  "اسکی",
  "اسکے",
  "اسے",
  "ان",
  "انکا",
  "انکی",
  "انکے",
  "انہیں",
  "مجھے",
  "ہمیں",
  "تمہیں",
  "جس",
  "جسکا",
  "جسکی",
  "جسکے",
  "جسے",
  "جن",
  "جنکا",
  "جنکی",
  "جنکے",
  "جنہوں",
  "انہوں",
  "کس",
  "کسکا",
  "کسکی",
  "کسکے",
  "کسے",
  "کسکو",
  "کون",
  "کیا",
  "کہاں",
  "کدھر",
  "ادھر",
  "جدھر",
  "کب",
  "کیوں",
  "کیسے",
  "کیسا",
  "کیسی",
  "کتنا",
  "کتنی",
  "کتنے",
  "جو",
  "سب",
  "سبھی",
  "کوئی",
  "کچھ",
  "ہر",
  "ایک",
  "اپنا",
  "اپنی",
  "اپنے",
  "خود",

  // Common light/auxiliary verb forms
  "کرنا",
  "کرتا",
  "کرتی",
  "کرتے",
  "کریں",
  "کرو",
  "کر",
  "کرنے",
  "کیے",
  "جانا",
  "جاتا",
  "جاتی",
  "جاتے",
  "جائے",
  "جائیں",
  "جاؤ",
  "جا",
  "جانے",
  "گیا",
  "گئی",
  "گئے",
  "آنا",
  "آتا",
  "آتی",
  "آتے",
  "آئے",
  "آئیں",
  "آیا",
  "آئی",
  "آنے",
  "آؤ",
  "آ",
  "دینا",
  "دیتا",
  "دیتی",
  "دیتے",
  "دیا",
  "دیے",
  "دے",
  "دو",
  "دیں",
  "دینے",
  "لینا",
  "لیتا",
  "لیتی",
  "لیتے",
  "لیا",
  "لے",
  "لو",
  "لیں",
  "لینے",
  "رہنا",
  "رہا",
  "رہی",
  "رہے",
  "رہتا",
  "رہتی",
  "رہتے",
  "رہنے",
  "سکنا",
  "سکتا",
  "سکتی",
  "سکتے",
  "والا",
  "والی",
  "والے",
]);

function toStopWordSet(custom?: Set<string> | string[]): Set<string> {
  if (!custom) return URDU_STOP_WORDS;
  if (custom instanceof Set) return custom;
  return new Set(custom.map((w) => normalizeUrdu(w.trim())));
}

/**
 * Checks if a given Urdu word is a stop word.
 *
 * @param word - Word to test.
 * @param customStopWords - Optional custom stop words set or array. Defaults to {@link URDU_STOP_WORDS}.
 *
 * @example
 * isStopWord("اور") // true
 * isStopWord("کتاب") // false
 */
export function isStopWord(word: string, customStopWords?: Set<string> | string[]): boolean {
  if (!word) return false;
  const normalized = normalizeUrdu(word.trim());
  const stopSet = toStopWordSet(customStopWords);
  return stopSet.has(normalized);
}

/**
 * Filters out stop words from an array of words.
 *
 * @param words - Array of words to filter.
 * @param customStopWords - Optional custom stop words set or array.
 *
 * @example
 * filterStopWords(["یہ", "ایک", "اچھی", "کتاب", "ہے"]) // ["اچھی", "کتاب"]
 */
export function filterStopWords(
  words: string[],
  customStopWords?: Set<string> | string[],
): string[] {
  if (!words || words.length === 0) return [];
  const stopSet = toStopWordSet(customStopWords);
  return words.filter((w) => {
    const normalized = normalizeUrdu(w.trim());
    return normalized.length > 0 && !stopSet.has(normalized);
  });
}

/**
 * Removes stop words from an Urdu text string, returning the cleaned text.
 *
 * @param text - Input Urdu text.
 * @param customStopWords - Optional custom stop words set or array.
 *
 * @example
 * removeStopWords("یہ ایک بہترین کتاب ہے") // "بہترین کتاب"
 */
export function removeStopWords(text: string, customStopWords?: Set<string> | string[]): string {
  if (!text) return "";
  const words = splitWords(text);
  const filtered = filterStopWords(words, customStopWords);
  return filtered.join(" ");
}
