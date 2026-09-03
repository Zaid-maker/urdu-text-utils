/**
 * Urdu name transliteration for Pakistani names.
 *
 * Handles common first names, family names, honorifics, and name prefixes.
 * Designed for forms, shipping labels, databases, and any context where
 * Urdu names need to appear in English (and vice versa).
 *
 * Uses a dictionary of ~300 common Pakistani names for accuracy, with
 * rule-based fallback for unknown names.
 */
import { removeDiacritics, normalizeUrdu } from "./normalize.js";

// ============================================================================
// NAME DICTIONARIES
// ============================================================================

/** Common Urdu first names mapped to their standard English spellings. */
export const URDU_FIRST_NAMES: Record<string, string> = {
  // Male names
  "محمد": "Muhammad",
  "احمد": "Ahmed",
  "علی": "Ali",
  "عمر": "Umar",
  "عثمان": "Usman",
  "ابوبکر": "Abubakar",
  "یوسف": "Yusuf",
  "یعقوب": "Yaquob",
  "اسماعیل": "Ismail",
  "ابراہیم": "Ibrahim",
  "اسحاق": "Ishaq",
  "حسین": "Hussain",
  "حسن": "Hasan",
  "زید": "Zaid",
  "حمزہ": "Hamza",
  "سلمان": "Salman",
  "فرحان": "Farhan",
  "ادنان": "Adnan",
  "بلال": "Bilal",
  "طارق": "Tariq",
  "جاوید": "Javed",
  "عرفان": "Irfan",
  "کاشف": "Kashif",
  "ندیم": "Nadeem",
  "یاسر": "Yasir",
  "رضوان": "Rizwan",
  "فیصل": "Faisal",
  "خالد": "Khalid",
  "راشد": "Rashid",
  "شاہد": "Shahid",
  "سعید": "Saeed",
  "نعیم": "Naeem",
  "وسیم": "Waseem",
  "رفیق": "Rafiq",
  "جمیل": "Jamil",
  "زبیر": "Zubair",
  "طاہر": "Tahir",
  "عارف": "Arif",
  "نعمان": "Noman",
  "ثاقب": "Saqib",
  "عدیل": "Adeel",
  "عمران": "Imran",
  "فواد": "Fawad",
  "آصف": "Asif",
  "شعیب": "Shoaib",
  "زاہد": "Zahid",
  "عامر": "Amer",
  "مجید": "Majid",
  "سرفراز": "Sarfraz",
  "حمید": "Hamid",
  "نظیر": "Nazir",
  "قیصر": "Qaiser",
  "لطیف": "Latif",
  "تنویر": "Tanveer",
  "سلیمان": "Suleman",
  "افتخار": "Iftikhar",
  "شبیر": "Shabbir",
  "ساجد": "Sajid",
  "منصور": "Mansoor",
  "سلطان": "Sultan",
  "نصیر": "Nasir",
  "حبیب": "Habib",
  "مقصود": "Maqsood",
  "مسعود": "Masood",
  "سہیل": "Sohail",
  "اشرف": "Ashraf",
  "مبارک": "Mubarak",
  "فہد": "Fahad",
  "اظہر": "Azhar",
  "وکیل": "Wakeel",
  "رؤف": "Rauf",
  "دانیال": "Daniyal",
  "ذیشان": "Zeeshan",
  "مصطفی": "Mustafa",

  // Female names
  "فاطمہ": "Fatima",
  "عائشہ": "Ayesha",
  "خدیجہ": "Khadija",
  "حسنا": "Husna",
  "زینب": "Zainab",
  "آمنہ": "Amina",
  "سارا": "Sara",
  "ادیہ": "Adia",
  "نور": "Noor",
  "حرا": "Hira",
  "اقصی": "Aqsa",
  "ماہم": "Maham",
  "ایمان": "Iman",
  "لائبہ": "Laiba",
  "ہانیہ": "Hania",
  "رمشہ": "Rimsha",
  "میمونہ": "Memoona",
  "ثنا": "Sana",
  "حنا": "Hina",
  "اقرا": "Iqra",
  "فیزا": "Fiza",
  "فضہ": "Fizza",
  "سدرہ": "Sidra",
  "ردا": "Rida",
  "ندا": "Nida",
  "مومینہ": "Momina",
  "ثوبیہ": "Sobia",
  "نائلہ": "Naila",
  "بشری": "Bushra",
  "رخسانہ": "Rukhsana",
  "شازیہ": "Shazia",
  "ناہید": "Naheed",
  "پروین": "Parveen",
  "فرزانہ": "Farzana",
  "نازیہ": "Nazia",
  "صبیحہ": "Sabiha",
  "رباب": "Rubab",
  "صائمہ": "Saima",
  "مہرین": "Mehreen",
  "عنبرین": "Ambreen",
  "کائنات": "Kainat",
  "طاہرہ": "Tahira",
  "سمیعہ": "Samia",
  "سامیہ": "Samiya",
  "سلمی": "Salma",
  "روزینہ": "Rozina",
  "مریم": "Maryam",
  "رابعہ": "Rabia",
  "تسلیم": "Tasleem",
  "اسماء": "Asma",
  "ارم": "Iram",
  "ناز": "Naaz",
  "فرح": "Farah",
  "نادیہ": "Nadia",
  "سیما": "Seema",
  "ہما": "Huma",
  "نزہت": "Nuzhat",
  "عظمی": "Uzma",
  "کرن": "Kiran",
  "سمیرا": "Sumaira",
  "فرخندہ": "Farkhanda",
  "تسنیم": "Tasneem",
  "زبیدہ": "Zubaida",
  "جویریہ": "Javeria",
  "مہوش": "Mehwish",
  "عالیہ": "Alia",
};

/** Common Urdu family/last names mapped to their standard English spellings. */
export const URDU_FAMILY_NAMES: Record<string, string> = {
  "خان": "Khan",
  "شاہ": "Shah",
  "چوہدری": "Chaudhry",
  "ملک": "Malik",
  "شیخ": "Sheikh",
  "قریشی": "Qureshi",
  "سید": "Syed",
  "نیازی": "Niazi",
  "جدون": "Jadoon",
  "سواتی": "Swati",
  "کھٹک": "Khattak",
  "یوسفزئی": "Yusufzai",
  "کھوسہ": "Khosa",
  "تالپور": "Talpur",
  "جونیجو": "Junejo",
  "بھٹی": "Bhatti",
  "راجپوت": "Rajput",
  "سومرو": "Soomro",
  "دہار": "Dahar",
  "گیلانی": "Gillani",
  "ٹواناس": "Tiwanas",
  "ٹوانہ": "Tiwana",
  "دولتانی": "Doltani",
  "دالتانی": "Daltani",
  "گورچانی": "Gurchani",
  "رند": "Rind",
  "بگٹی": "Bugti",
  "مری": "Marri",
  "بزینجو": "Bizenjo",
  "مینگل": "Mengal",
  "زرداری": "Zardari",
  "بھٹو": "Bhutto",
  "شریف": "Sharif",
};

/** Honorific titles used in Urdu names. */
export const HONORIFICS: Record<string, string> = {
  "جناب": "Janab",
  "صاحب": "Sahib",
  "استاد": "Ustad",
  "حکیم": "Hakim",
  "ڈاکٹر": "Dr.",
  "پروفیسر": "Prof.",
  "انجینئر": "Eng.",
  "ایڈووکیٹ": "Adv.",
  "ریٹائرڈ": "Retd.",
  "شہید": "Shaheed",
};

/** Name prefixes that are kept in both languages. */
export const NAME_PREFIXES: Record<string, string> = {
  "سید": "Syed",
  "شیخ": "Sheikh",
  "چوہدری": "Chowdhury",
  "ملک": "Malik",
  "میاں": "Mian",
  "خان": "Khan",
  "بیگم": "Begum",
  "صاحب": "Sahib",
};

/**
 * English → Urdu lookup derived from the forward name tables above.
 *
 * Built rather than hand-maintained so the two directions can never drift: a
 * canonical English spelling maps back to exactly the Urdu word it came from.
 * Alternate spellings that are not forward-table values are pinned separately.
 */
const ENGLISH_TO_URDU = new Map<string, string>();
for (const table of [HONORIFICS, URDU_FIRST_NAMES, URDU_FAMILY_NAMES, NAME_PREFIXES]) {
  for (const [urduWord, englishWord] of Object.entries(table)) {
    ENGLISH_TO_URDU.set(englishWord.toLowerCase(), urduWord);
  }
}

/**
 * Alternate English spellings of names already in the forward tables
 * (e.g. `Omar` for عمر, canonically spelled `Umar` in English).
 */
const ENGLISH_NAME_ALIASES: Record<string, string> = {
  hassan: "حسن", // vs. canonical Hasan
  omar: "عمر", // vs. canonical Umar
  omer: "عمر", // vs. canonical Umar
  yaqoob: "یعقوب", // vs. canonical Yaquob
  jameel: "جمیل", // vs. canonical Jamil
  majeed: "مجید", // vs. canonical Majid
  amna: "آمنہ", // vs. canonical Amina
  gilani: "گیلانی", // vs. canonical Gillani
  sahab: "صاحب", // vs. canonical Sahib
  doctor: "ڈاکٹر", // vs. canonical Dr.
  professor: "پروفیسر", // vs. canonical Prof.
  engineer: "انجینئر", // vs. canonical Eng.
  advocate: "ایڈووکیٹ", // vs. canonical Adv.
  retd: "ریٹائرڈ", // vs. canonical Retd.
};

// ============================================================================
// NAME TRANSLITERATION RULES
// ============================================================================

/**
 * Transliterate a single Urdu name to English.
 * Handles names with optional honorifics and prefixes.
 */
function transliterateSingleName(urduName: string): string {
  const normalized = removeDiacritics(normalizeUrdu(urduName));
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);

  const result: string[] = [];

  for (const word of words) {
    // Check if it's an honorific
    const honorific = HONORIFICS[word];
    if (honorific) {
      result.push(honorific);
      continue;
    }

    // Check if it's a known first name
    const firstName = URDU_FIRST_NAMES[word];
    if (firstName) {
      result.push(firstName);
      continue;
    }

    // Check if it's a known family name
    const familyName = URDU_FAMILY_NAMES[word];
    if (familyName) {
      result.push(familyName);
      continue;
    }

    // Check if it's a known prefix
    const prefix = NAME_PREFIXES[word];
    if (prefix) {
      result.push(prefix);
      continue;
    }

    // Rule-based fallback for unknown names
    result.push(transliterateNameWord(word));
  }

  return result.join(" ");
}

/**
 * Rule-based transliteration for individual name words.
 */
function transliterateNameWord(word: string): string {
  if (!word) return "";

  // Common Urdu letter patterns in names
  const consonants: Record<string, string> = {
    "ب": "b",
    "پ": "p",
    "ت": "t",
    "ٹ": "t",
    "ج": "j",
    "چ": "ch",
    "ح": "h",
    "خ": "kh",
    "د": "d",
    "ڈ": "d",
    "ر": "r",
    "ڑ": "r",
    "ز": "z",
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
    "و": "w",
    "ہ": "h",
    "ھ": "h",
    "ی": "y",
  };

  let result = "";
  const chars = [...word];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];

    // Handle digraphs (consonant + ھ)
    if (next === "ھ" && consonants[ch]) {
      const base = consonants[ch];
      result += base + "h";
      i++; // Skip the ھ
      continue;
    }

    // Handle special cases
    if (ch === "آ") {
      result += "Aa";
      continue;
    }
    if (ch === "ا" && i === 0) {
      result += "A";
      continue;
    }
    if (ch === "ا") {
      result += "a";
      continue;
    }
    if (ch === "ی" && i === chars.length - 1) {
      result += "i";
      continue;
    }
    if (ch === "ی" && next === "ں") {
      result += "ain";
      i++; // Skip the ں
      continue;
    }
    if (ch === "و" && i === 0) {
      result += "W";
      continue;
    }
    if (ch === "و") {
      result += "o";
      continue;
    }

    // Regular consonant
    if (consonants[ch]) {
      result += consonants[ch];
      continue;
    }

    // Unknown character - keep as is
    result += ch;
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface NameTransliterationOptions {
  /** Preserve the original case of the English name. Default: true (capitalized). */
  preserveCase?: boolean;
  /** Include honorifics in the output. Default: true. */
  includeHonorifics?: boolean;
}

/**
 * Transliterate an Urdu name to English.
 *
 * @example
 * transliterateNameToEnglish("محمد علی") // "Muhammad Ali"
 * transliterateNameToEnglish("جناب خان صاحب") // "Janab Khan Sahib"
 */
export function transliterateNameToEnglish(
  urduName: string,
  options: NameTransliterationOptions = {},
): string {
  if (!urduName) return "";

  const { preserveCase = true, includeHonorifics = true } = options;

  const result = transliterateSingleName(urduName);

  if (!includeHonorifics) {
    // Remove honorifics from result
    return result
      .split(/\s+/)
      .filter((word) => !Object.values(HONORIFICS).includes(word))
      .join(" ");
  }

  return preserveCase ? result : result.toLowerCase();
}

/**
 * Transliterate an English name to Urdu script.
 *
 * @example
 * transliterateNameToUrdu("Muhammad Ali") // "محمد علی"
 * transliterateNameToUrdu("Janab Khan Sahib") // "جناب خان صاحب"
 */
export function transliterateNameToUrdu(englishName: string): string {
  if (!englishName) return "";

  const words = englishName.split(/\s+/).filter((w) => w.length > 0);
  // Every canonical English spelling resolves through the derived dictionary, so
  // a word only falls through when it is an alternate spelling or an unknown name.
  return words.map((word) => reverseTransliterateName(word)).join(" ");
}

/**
 * Reverse name lookup: the derived English → Urdu dictionary first, then the
 * pinned alternate spellings, then the word unchanged. Reverse transliteration
 * is deliberately not rule-based — Roman Urdu carries too little information to
 * guess reliably.
 */
function reverseTransliterateName(englishName: string): string {
  const lower = englishName.toLowerCase();
  return ENGLISH_TO_URDU.get(lower) ?? ENGLISH_NAME_ALIASES[lower] ?? englishName;
}

/**
 * Extract name parts from a full Urdu name.
 *
 * @example
 * extractNameParts("جناب محمد علی خان صاحب")
 * // { honorific: "جناب", firstName: "محمد علی", familyName: "خان", suffix: "صاحب" }
 */
export function extractNameParts(fullName: string): {
  honorific?: string;
  firstName: string;
  familyName?: string;
  suffix?: string;
} {
  const normalized = removeDiacritics(normalizeUrdu(fullName));
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);

  const honorifics = Object.keys(HONORIFICS);
  const suffixes = ["sahib", "sahab", "بیگم", "begum"];

  let honorific: string | undefined;
  let suffix: string | undefined;
  const nameWords: string[] = [];

  for (const word of words) {
    // Check honorifics first (includes صاحب)
    if (honorifics.includes(word)) {
      // Only set honorific if not already set (first honorific wins)
      if (!honorific) {
        honorific = word;
      } else {
        // Second honorific becomes suffix
        suffix = word;
      }
    } else if (suffixes.includes(word)) {
      suffix = word;
    } else {
      nameWords.push(word);
    }
  }

  // Assume last word is family name if there are multiple words
  const familyName =
    nameWords.length > 1 ? nameWords[nameWords.length - 1] : undefined;
  const firstName =
    nameWords.length > 1
      ? nameWords.slice(0, -1).join(" ")
      : nameWords[0] || "";

  return { honorific, firstName, familyName, suffix };
}
