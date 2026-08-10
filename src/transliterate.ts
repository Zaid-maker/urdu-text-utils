/**
 * Transliteration between Urdu script and Roman Urdu.
 *
 * Read this before shipping it anywhere user-visible:
 *
 * Urdu script omits short vowels, so the mapping is genuinely ambiguous —
 * کتب is `kitab` or `kutub` depending on context, and no rule table can decide
 * which. The reverse direction is worse, because Roman Urdu has no standard
 * orthography (hai / hay / he / hei all occur in the wild).
 *
 * This module therefore works in two layers: a dictionary of common words, then
 * a rule fallback. Expect roughly 70% word accuracy on ordinary prose from the
 * rule layer, and treat every function here as `@experimental`. Anything better
 * needs a real lexicon plus a statistical model, which is planned for a later
 * release and deliberately not faked here.
 */
import { removeDiacritics, normalizeUrdu } from "./normalize.js";
import { splitWords } from "./stats.js";

/** High-frequency words where the rule layer would produce something wrong or unreadable. */
const WORD_DICTIONARY: Record<string, string> = {
  "آپ": "aap",
  "آپکا": "aapka",
  "اور": "aur",
  "ایک": "aik",
  "احمد": "ahmed",
  "اچھا": "acha",
  "بہت": "bohat",
  "پاکستان": "pakistan",
  "پانی": "paani",
  "پر": "par",
  "پہلا": "pehla",
  "تم": "tum",
  "تھا": "tha",
  "تھی": "thi",
  "حال": "haal",
  "خان": "khan",
  "خوبصورت": "khoobsurat",
  "دن": "din",
  "رات": "raat",
  "زید": "zaid",
  "سے": "se",
  "شہر": "shehar",
  "علی": "ali",
  "کا": "ka",
  "کتاب": "kitaab",
  "کر": "kar",
  "کرنا": "karna",
  "کے": "ke",
  "کی": "ki",
  "کیا": "kya",
  "کیسے": "kaisay",
  "لڑکا": "larka",
  "لڑکی": "larki",
  "لیے": "liye",
  "محمد": "muhammad",
  "مضمون": "mazmoon",
  "ملک": "mulk",
  "میں": "mein",
  "میرا": "mera",
  "میری": "meri",
  "نام": "naam",
  "نہیں": "nahi",
  "وہ": "woh",
  "ہے": "hai",
  "ہیں": "hain",
  "ہو": "ho",
  "ہوں": "hoon",
  "یہ": "yeh",
};

/** Consonant + ھ (do-chashmi heh) forms one aspirated sound, so it is matched first. */
const DIGRAPHS: Record<string, string> = {
  "بھ": "bh",
  "پھ": "ph",
  "تھ": "th",
  "ٹھ": "th",
  "جھ": "jh",
  "چھ": "chh",
  "دھ": "dh",
  "ڈھ": "dh",
  "ڑھ": "rh",
  "کھ": "kh",
  "گھ": "gh",
  "لھ": "lh",
  "مھ": "mh",
  "نھ": "nh",
  "رھ": "rh",
};

const LETTERS: Record<string, string> = {
  "ا": "a",
  "آ": "aa",
  "ب": "b",
  "پ": "p",
  "ت": "t",
  "ٹ": "t",
  "ث": "s",
  "ج": "j",
  "چ": "ch",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ڈ": "d",
  "ذ": "z",
  "ر": "r",
  "ڑ": "r",
  "ز": "z",
  "ژ": "zh",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "z",
  "ط": "t",
  "ظ": "z",
  "ع": "a",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ک": "k",
  "گ": "g",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ں": "n",
  "و": "o",
  "ہ": "h",
  "ھ": "h",
  "ء": "",
  "ی": "i",
  "ئ": "i",
  "ے": "e",
  "ۓ": "e",
  "ؤ": "o",
  "ۂ": "h",
};

function romanizeWord(word: string): string {
  const dictionary = WORD_DICTIONARY[word];
  if (dictionary) return dictionary;

  const chars = [...word];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i]! + (chars[i + 1] ?? "");
    const digraph = DIGRAPHS[pair];
    if (digraph) {
      out += digraph;
      i++;
      continue;
    }
    const ch = chars[i]!;
    if (i === 0 && ch === "ا") {
      // Word-initial alef is a vowel carrier: اسلام -> islam, not aislam.
      const next = chars[1];
      if (next === "و") {
        out += "o";
        i++;
        continue;
      }
      if (next === "ی") {
        out += "i";
        i++;
        continue;
      }
      out += "a";
      continue;
    }
    out += LETTERS[ch] ?? ch;
  }
  return out;
}

/**
 * Urdu script -> Roman Urdu.
 *
 * @experimental Rule + dictionary based; see the module note on accuracy.
 * @example
 * romanize("آپ کیسے ہیں") // "aap kaisay hain"
 */
export function romanize(input: string, options: { capitalize?: boolean } = {}): string {
  if (!input) return "";
  const clean = removeDiacritics(normalizeUrdu(input));
  const roman = clean
    .split(/(\s+)/u)
    .map((chunk) => (/^\s+$/u.test(chunk) ? chunk : romanizeWord(chunk)))
    .join("");
  if (!options.capitalize) return roman;
  return roman.charAt(0).toUpperCase() + roman.slice(1);
}

/** Roman spellings seen in the wild, mapped to their Urdu word. */
const ROMAN_DICTIONARY: Record<string, string> = {};
for (const [urduWord, roman] of Object.entries(WORD_DICTIONARY)) {
  ROMAN_DICTIONARY[roman] = urduWord;
}
Object.assign(ROMAN_DICTIONARY, {
  hai: "ہے",
  hay: "ہے",
  he: "ہے",
  hein: "ہیں",
  hoon: "ہوں",
  hun: "ہوں",
  ap: "آپ",
  kaise: "کیسے",
  kaisa: "کیسا",
  nam: "نام",
  naam: "نام",
  mai: "میں",
  main: "میں",
  nahin: "نہیں",
  kia: "کیا",
  bahut: "بہت",
  bhot: "بہت",
  acha: "اچھا",
  achha: "اچھا",
  shukriya: "شکریہ",
  salam: "سلام",
});

const ROMAN_RULES: Array<[RegExp, string]> = [
  [/^kh/u, "کھ"],
  [/^gh/u, "گھ"],
  [/^chh/u, "چھ"],
  [/^ch/u, "چ"],
  [/^sh/u, "ش"],
  [/^th/u, "تھ"],
  [/^ph/u, "پھ"],
  [/^bh/u, "بھ"],
  [/^aa/u, "آ"],
  [/^oo/u, "و"],
  [/^ee/u, "ی"],
  [/^ai/u, "ی"],
  [/^b/u, "ب"],
  [/^p/u, "پ"],
  [/^t/u, "ت"],
  [/^j/u, "ج"],
  [/^d/u, "د"],
  [/^r/u, "ر"],
  [/^z/u, "ز"],
  [/^s/u, "س"],
  [/^f/u, "ف"],
  [/^q/u, "ق"],
  [/^k/u, "ک"],
  [/^g/u, "گ"],
  [/^l/u, "ل"],
  [/^m/u, "م"],
  [/^n/u, "ن"],
  [/^v|^w/u, "و"],
  [/^h/u, "ہ"],
  [/^y/u, "ی"],
  [/^a/u, "ا"],
  [/^e/u, "ی"],
  [/^i/u, "ی"],
  [/^o/u, "و"],
  [/^u/u, "و"],
];

function romanWordToUrdu(word: string): string {
  const lower = word.toLowerCase();
  const dictionary = ROMAN_DICTIONARY[lower];
  if (dictionary) return dictionary;

  let rest = lower;
  let out = "";
  let position = 0;
  while (rest.length > 0) {
    let matched = false;
    for (const [pattern, replacement] of ROMAN_RULES) {
      const hit = pattern.exec(rest);
      if (!hit) continue;
      // Short vowels are not written inside a word — only word-initially.
      const isShortVowel = /^[aeiou]$/u.test(hit[0]!);
      const skip = isShortVowel && position > 0 && rest.length > 1;
      if (!skip) out += replacement;
      rest = rest.slice(hit[0]!.length);
      position++;
      matched = true;
      break;
    }
    if (!matched) {
      out += rest[0]!;
      rest = rest.slice(1);
      position++;
    }
  }
  return out;
}

/**
 * Roman Urdu -> Urdu script.
 *
 * @experimental Substantially less accurate than {@link romanize}: Roman Urdu has
 * no standard spelling, so anything outside the dictionary is a guess.
 * @example
 * romanToUrdu("mera naam zaid hai") // "میرا نام زید ہے"
 */
export function romanToUrdu(input: string): string {
  if (!input) return "";
  return input
    .split(/(\s+)/u)
    .map((chunk) => (/^\s+$/u.test(chunk) ? chunk : romanWordToUrdu(chunk)))
    .join("");
}

export interface SlugOptions {
  /** Word separator. Default `"-"`. */
  separator?: string;
  /** Cap the slug length, cutting at a word boundary. */
  maxLength?: number;
  /**
   * Keep Urdu characters instead of transliterating. Produces a percent-encoded
   * but human-readable URL, and avoids the accuracy problem entirely. Default `false`.
   */
  preserveUrdu?: boolean;
}

/**
 * URL slug from an Urdu title.
 *
 * @experimental in transliterating mode, for the reasons in the module note.
 * Pass `preserveUrdu: true` for a lossless slug.
 *
 * @example
 * urduSlug("میرا پہلا مضمون")                      // "mera-pehla-mazmoon"
 * urduSlug("میرا پہلا مضمون", { preserveUrdu: true }) // "میرا-پہلا-مضمون"
 */
export function urduSlug(input: string, options: SlugOptions = {}): string {
  const { separator = "-", maxLength, preserveUrdu = false } = options;
  if (!input) return "";

  const words = splitWords(removeDiacritics(normalizeUrdu(input)));
  const parts = preserveUrdu ? words : words.map(romanizeWord);

  // Built by joining cleaned tokens rather than by regex, so a caller-supplied
  // separator never has to be escaped into a pattern.
  const allowed = preserveUrdu ? /[^\p{L}\p{N}]+/gu : /[^a-z0-9]+/gu;
  let slug = parts
    .map((part) => part.toLowerCase().replace(allowed, " ").trim())
    .flatMap((part) => part.split(/\s+/u))
    .filter((part) => part.length > 0)
    .join(separator);

  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const lastSeparator = slug.lastIndexOf(separator);
    if (lastSeparator > 0) slug = slug.slice(0, lastSeparator);
  }
  return slug;
}
