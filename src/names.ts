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
const URDU_FIRST_NAMES: Record<string, string> = {
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
  "عہد": "Omer",
  "سلمان": "Salman",
  "فرحان": "Farhan",
  "ادنان": "Adnan",
  "بلال": "Bilal",
  "طارق": "Tariq",
  "جاوید": "Javed",
  "عرفان": "Irfan",
  "کاشف": "Kashif",
  "نذیم": "Nadeem",
  "یاسر": "Yasir",
  "رضوان": "Rizwan",
  "فیصل": "Faisal",
  "خلید": "Khalid",
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
  "ادیل": "Adeel",
  "عمران": "Imran",
  "فواد": "Fawad",
  "اسف": "Asif",
  "شعبیب": "Shoaib",
  "زاہد": "Zahid",
  "عامر": "Amer",
  "مجید": "Majid",
  "ثرفراز": "Sarfraz",
  "حمید": "Hamid",
  "نظر": "Nazir",
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
  "مسعود": "Maqsood",
  "سہیل": "Sohail",
  "اشرف": "Ashraf",
  "مبارک": "Mubarak",
  "فہد": "Fahad",
  "اظہر": "Azhar",
  "وکیل": "Wakeel",
  "روف": "Rauf",

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
  "ہرا": "Hira",
  "عclave": "Aqsa",
  "محام": "Maham",
  "ایمان": "Iman",
  "لیbla": "Laiba",
  "ہانیہ": "Hania",
  "رمشہ": "Rimsha",
  "میمو": "Memo",
  "ثنا": "Sana",
  "حنیہ": "Hina",
  "اقرا": "Iqra",
  "فiza": "Fizza",
  "سیدرہ": "Sidra",
  "رضا": "Rida",
  "ندا": "Nida",
  "مومینہ": "Momina",
  "ثوبیہ": "Sobia",
  "نیلہ": "Naila",
  "بشرا": "Bushra",
  "رکشنا": "Rukhsana",
  "شازیہ": "Shazia",
  "نہید": "Naheed",
  "پروین": "Parveen",
  "فرزانہ": "Farzana",
  " nazia": "Nazia",
  "صبیحہ": "Sabiha",
  "رباب": "Rubab",
  "صیمہ": "Saima",
  "محرین": "Mehreen",
  "امبرین": "Ambreen",
  "کائنات": "Kainat",
  "طاہرہ": "Tahira",
  "ثمریہ": "Samia",
  "سلمیٰ": "Salma",
  "روزینہ": "Rozina",
  "مریم": "Maryam",
  "ربیعہ": "Rabia",
  "تسلیم": "Tasleem",
  "اسماء": "Asma",
  "اطراف": "Iram",
  "ناز": "Naaz",
  "فرخ": "Farah",
  "نادیہ": "Nadia",
  "سیما": "Seema",
  "ہما": "Huma",
  "نذیحت": "Nuzhat",
  "عظمیٰ": "Uzma",
  "کران": "Kiran",
  "سمیرا": "Sumaira",
  "فرخندہ": "Farkhanda",
  "تਸنیم": "Tasneem",
  "زبیدہ": "Zubaida",
};

/** Common Urdu family/last names mapped to their standard English spellings. */
const URDU_FAMILY_NAMES: Record<string, string> = {
  "خان": "Khan",
  "شاہ": "Shah",
  "چوہدری": "Chaudhry",
  "ملک": "Malik",
  "شیخ": "Sheikh",
  "قوریشی": "Qureshi",
  "سید": "Syed",
  "نیازی": "Niazi",
  "جدوں": "Jadoon",
  "سواتی": "Swati",
  "کھٹک": "Khattak",
  "یوسفزئی": "Yusufzai",
  "خوسہ": "Khosa",
  "تھلپور": "Talpur",
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
const HONORIFICS: Record<string, string> = {
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
const NAME_PREFIXES: Record<string, string> = {
  "سید": "Syed",
  "شیخ": "Sheikh",
  "چوہدری": "Chowdhury",
  "ملک": "Malik",
  "میاں": "Mian",
  "خان": "Khan",
  "بیگم": "Begum",
  "صاحب": "Sahib",
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
  const result: string[] = [];

  for (const word of words) {
    const lower = word.toLowerCase();

    // Check if it's a known honorific
    const honorificEntry = Object.entries(HONORIFICS).find(
      ([, eng]) => eng.toLowerCase() === lower,
    );
    if (honorificEntry) {
      result.push(honorificEntry[0]);
      continue;
    }

    // Check if it's a known first name
    const firstNameEntry = Object.entries(URDU_FIRST_NAMES).find(
      ([, eng]) => eng.toLowerCase() === lower,
    );
    if (firstNameEntry) {
      result.push(firstNameEntry[0]);
      continue;
    }

    // Check if it's a known family name
    const familyNameEntry = Object.entries(URDU_FAMILY_NAMES).find(
      ([, eng]) => eng.toLowerCase() === lower,
    );
    if (familyNameEntry) {
      result.push(familyNameEntry[0]);
      continue;
    }

    // Check if it's a known prefix
    const prefixEntry = Object.entries(NAME_PREFIXES).find(
      ([, eng]) => eng.toLowerCase() === lower,
    );
    if (prefixEntry) {
      result.push(prefixEntry[0]);
      continue;
    }

    // Rule-based fallback
    result.push(reverseTransliterateName(word));
  }

  return result.join(" ");
}

/**
 * Rule-based reverse transliteration for name words.
 */
function reverseTransliterateName(englishName: string): string {
  const lower = englishName.toLowerCase();

  // Common English to Urdu mappings for names
  const REVERSE_MAP: Record<string, string> = {
    muhammad: "محمد",
    ahmed: "احمد",
    ali: "علی",
    umar: "عمر",
    usman: "عثمان",
    yusuf: "یوسف",
    ibrahim: "ابراہیم",
    ismail: "اسماعیل",
    hassan: "حسن",
    hussain: "حسین",
    zaid: "زید",
    hamza: "حمزہ",
    omar: "عمر",
    salman: "سلمان",
    farhan: "فرحان",
    adnan: "ادنان",
    bilal: "بلال",
    tariq: "طارق",
    javed: "جاوید",
    irfan: "عرفان",
    kashif: "کاشف",
    nadeem: "نذیم",
    yasir: "یاسر",
    rizwan: "رضوان",
    faisal: "فیصل",
    khalid: "خلید",
    rashid: "راشد",
    shahid: "شاہد",
    saeed: "سعید",
    naeem: "نعیم",
    waseem: "وسیم",
    rafiq: "رفیق",
    jamil: "جمیل",
    zubair: "زبیر",
    tahir: "طاہر",
    arif: "عارف",
    noman: "نعمان",
    saqib: "ثاقب",
    adeel: "ادیل",
    imran: "عمران",
    fawad: "فواد",
    asif: "اسف",
    shoaib: "شعبیب",
    zahid: "زاہد",
    amer: "عامر",
    majid: "مجید",
    sarfraz: "ثرفراز",
    hamid: "حمید",
    nazir: "نظر",
    qaiser: "قیصر",
    latif: "لطیف",
    tanveer: "تنویر",
    suleman: "سلیمان",
    iftikhar: "افتخار",
    shabbir: "شبیر",
    sajid: "ساجد",
    mansoor: "منصور",
    yaqoob: "یعقوب",
    sultan: "سلطان",
    jameel: "جمیل",
    nasir: "نصیر",
    habib: "حبیب",
    maqsood: "مسعود",
    sohail: "سہیل",
    ashraf: "اشرف",
    mubarak: "مبارک",
    fahad: "فہد",
    azhar: "اظہر",
    wakeel: "وکیل",
    rauf: "روف",
    majeed: "مجید",
    fatima: "فاطمہ",
    ayesha: "عائشہ",
    khadija: "خدیجہ",
    zainab: "زینب",
    amina: "آمنہ",
    sara: "سارا",
    adia: "ادیہ",
    noor: "نور",
    hira: "ہرا",
    aqsa: "عclave",
    maham: "محام",
    iman: "ایمان",
    laiba: "لیbla",
    amna: "آمنہ",
    hania: "ہانیہ",
    rimsha: "رمشہ",
    memo: "میمو",
    sana: "ثنا",
    hina: "حنیہ",
    iqra: "اقرا",
    fizza: "فiza",
    sidra: "سیدرہ",
    rida: "رضا",
    nida: "ندا",
    momina: "مومینہ",
    sobia: "ثوبیہ",
    naila: "نیلہ",
    bushra: "بشرا",
    rukhsana: "رکشنا",
    shazia: "شازیہ",
    naheed: "نہید",
    parveen: "پروین",
    farzana: "فرزانہ",
    nazia: " nazia",
    sabiha: "صبیحہ",
    rubab: "رباب",
    saima: "صیمہ",
    mehreen: "محرین",
    ambreen: "امبرین",
    kainat: "کائنات",
    tahira: "طاہرہ",
    samia: "ثمریہ",
    salma: "سلمیٰ",
    rozina: "روزینہ",
    maryam: "مریم",
    rabia: "ربیعہ",
    tasleem: "تسلیم",
    asma: "اسماء",
    iram: "اطراف",
    naaz: "ناز",
    farah: "فرخ",
    nadia: "نادیہ",
    seema: "سیما",
    huma: "ہما",
    nuzhat: "نذیحت",
    uzma: "عظمیٰ",
    kiran: "کران",
    sumaira: "سمیرا",
    farkhanda: "فرخندہ",
    tasneem: "تਸنیم",
    zubaida: "زبیدہ",
    khan: "خان",
    shah: "شاہ",
    chaudhry: "چوہدری",
    malik: "ملک",
    sheikh: "شیخ",
    qureshi: "قوریشی",
    syed: "سید",
    niazi: "نیازی",
    jadoon: "جدوں",
    swati: "سواتی",
    khattak: "کھٹک",
    yusufzai: "یوسفزئی",
    khosa: "خوسہ",
    talpur: "تھلپور",
    junejo: "جونیجو",
    bhatti: "بھٹی",
    rajput: "راجپوت",
    soomro: "سومرو",
    dahar: "دہار",
    gillani: "گیلانی",
    gilani: "گیلانی",
    tiwanas: "ٹواناس",
    tiwana: "ٹوانہ",
    doltani: "دولتانی",
    daltani: "دالتانی",
    gurchani: "گورچانی",
    rind: "رند",
    bugti: "بگٹی",
    marri: "مری",
    bizenjo: "بزینجو",
    mengal: "مینگل",
    zardari: "زرداری",
    bhutto: "بھٹو",
    sharif: "شریف",
    janab: "جناب",
    sahib: "صاحب",
    sahab: "صاحب",
    ustad: "استاد",
    hakim: "حکیم",
    doctor: "ڈاکٹر",
    professor: "پروفیسر",
    engineer: "انجینئر",
    advocate: "ایڈووکیٹ",
    retd: "ریٹائرڈ",
    shaheed: "شہید",
  };

  const urdu = REVERSE_MAP[lower];
  if (urdu) return urdu;

  // Fallback: return the original (unknown names)
  return englishName;
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
