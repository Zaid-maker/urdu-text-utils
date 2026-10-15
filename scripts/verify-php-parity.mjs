/**
 * Local (no-PHP) verification: re-implements the PHP port's algorithms in JS,
 * faithfully mirroring the PHP code paths (including where they differ from
 * the TS source), and asserts the results against the generated fixtures.
 *
 * This is a dev-only smoke check for when PHP is unavailable locally;
 * php/tests remains the real parity gate.
 *
 * It CANNOT catch PHP runtime/API semantics, because it re-implements the
 * algorithms rather than executing them — a case that passed here once still
 * shipped a real bug (DateTime::createFromFormat needs two digits for i and s,
 * so "0:0:0" returns false and every parseUrduDate call returned null). Treat a
 * pass here as necessary, never sufficient: run `composer test` in php/.
 *
 * Usage: node scripts/verify-php-parity.mjs   (after generate-php-fixtures.mjs)
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const tables = load("php/data/tables.json");

// The PHP port's Normalizer is itself fixture-verified against the TS
// normalizeUrdu, so calling the TS build here faithfully mirrors what the PHP
// class does inside StopWords.
let normalizeUrdu;
try {
  ({ normalizeUrdu } = await import(`file:///${root.replace(/\\/g, "/")}/dist/index.js`));
} catch {
  console.error("dist/index.js not found — run `npm run build` first.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// PHP-semantics helpers
// ---------------------------------------------------------------------------

/** preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY) — UTF-8 codepoint split. */
const chars = (s) => [...s];

/** preg_quote($w, '#') — escape PCRE metacharacters (backslash-first). */
const pregQuote = (w) =>
  w.replace(/[.\\+*?\[^\]$(){}=!<>|:\-#\/]/g, "\\$&");

/** PHP str_replace on plain strings (no regex). */
const strReplace = (pairs, s) => pairs.reduce((acc, [from, to]) => acc.split(from).join(to), s);

/** PHP trim() — strips NUL and the standard whitespace set, both ends. */
const phpTrim = (s) => s.replace(/^[\0\x0B\f \t\n\r\x0B]+/u, "").replace(/[\0\x0B\f \t\n\r\x0B]+$/u, "");

/** \uXXXX or \u{...} -> \u{XXXX} so the pattern is valid in a JS RegExp with /u. */
const jsPattern = (jsSource) => jsSource.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, "\\u{$1$2}");

const jsRe = (name, flags) => new RegExp(jsPattern(tables.regex[name]), flags);

const wordSplitRe = jsRe("wordSplit", "gu");
const sentenceSplitRe = jsRe("sentenceSplit", "gu");
const anyLetterRe = jsRe("anyLetter", "u");
const arabicLetterRe = jsRe("arabicLetter", "u");
const diacriticsRe = jsRe("diacritics", "gu");
const anyDigitRe = jsRe("anyDigit", "gu");

/** round(x*10)/10 — JS already serializes whole floats as JSON ints, like PHP's jsonNumber(). */
const jsonNumber = (x) => x;

// ---------------------------------------------------------------------------
// Words.php (stats)
// ---------------------------------------------------------------------------

const abbrevPattern = new RegExp(
  `(?:${tables.sentenceAbbreviations.map(pregQuote).join("|")})[.۔]`,
  "gu"
);

const PROTECTED_DOT = "\uE000";
const PROTECTED_URDU_FULL_STOP = "\uE001";

function splitSentences(input, options = {}) {
  if (input === "") return [];
  const preserveTerminators = options.preserveTerminators ?? false;

  let sanitized = input.replace(/(\d)\.(\d)/gu, `$1${PROTECTED_DOT}$2`);
  sanitized = sanitized.replace(abbrevPattern, (m) =>
    strReplace(
      [
        ["۔", PROTECTED_URDU_FULL_STOP],
        [".", PROTECTED_DOT],
      ],
      m
    )
  );

  const restore = (s) =>
    strReplace(
      [
        [PROTECTED_DOT, "."],
        [PROTECTED_URDU_FULL_STOP, "۔"],
      ],
      s
    );

  const push = (out, s) => {
    const t = phpTrim(restore(s));
    if (t !== "") out.push(t);
  };

  const out = [];
  if (preserveTerminators) {
    // preg_match_all('/[^۔؟?!.…]+[۔؟?!.…]+|[^۔؟?!.…]+$/u')
    const re = /[^۔؟?!.…]+[۔؟?!.…]+|[^۔؟?!.…]+$/gu;
    for (const m of sanitized.match(re) ?? []) push(out, m);
    return out;
  }
  for (const s of sanitized.split(sentenceSplitRe)) push(out, s);
  return out;
}

function splitWords(input) {
  if (input === "") return [];
  const out = [];
  for (const w of input.split(wordSplitRe)) {
    const t = phpTrim(w);
    if (t !== "") out.push(t);
  }
  return out;
}

function analyze(input) {
  const characters = chars(input).length;
  const charactersNoSpaces = chars(input.replace(/\s+/gu, "")).length;
  const words = splitWords(input).length;
  const sentences = splitSentences(input).length;
  let paragraphs = 0;
  for (const p of input.split(/\n\s*\n/u)) if (phpTrim(p) !== "") paragraphs++;
  const diacritics = (input.match(diacriticsRe) ?? []).length;
  const digits = (input.match(anyDigitRe) ?? []).length;
  const urduPercentage = Math.round(ratioOf(input) * 100);
  const avg = sentences === 0 ? 0 : Math.round((words / sentences) * 10) / 10;
  const reading = Math.round((words / 180) * 10) / 10;
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    urduPercentage,
    diacritics,
    digits,
    averageWordsPerSentence: jsonNumber(avg),
    readingTimeMinutes: jsonNumber(reading),
  };
}

// ---------------------------------------------------------------------------
// Detect.php
// ---------------------------------------------------------------------------

function ratioOf(input) {
  if (input === "") return 0;
  let letters = 0;
  let urdu = 0;
  for (const ch of chars(input)) {
    if (anyLetterRe.test(ch)) {
      letters++;
      if (arabicLetterRe.test(ch)) urdu++;
    }
  }
  if (letters === 0) return 0;
  const ratio = urdu / letters;
  // PHP port int-ifies integral results so assertSame matches the JSON fixtures.
  return Math.floor(ratio) === ratio ? Math.trunc(ratio) : ratio;
}

function isUrdu(input, options = {}) {
  const threshold = options.threshold ?? 0.5;
  const minLetters = options.minLetters ?? 1;
  if (input === "") return false;
  let letters = 0;
  let urdu = 0;
  for (const ch of chars(input)) {
    if (anyLetterRe.test(ch)) {
      letters++;
      if (arabicLetterRe.test(ch)) urdu++;
    }
  }
  if (urdu < minLetters) return false;
  return letters > 0 && urdu / letters >= threshold;
}

const URDU_ONLY = ["ٹ", "ڈ", "ڑ", "ں", "ے", "ۓ", "ہ", "ھ", "ک", "گ", "چ", "پ", "ژ", "ی"];

const hasUrduSpecificLetters = (input) =>
  chars(input).some((ch) => URDU_ONLY.includes(ch));

// ---------------------------------------------------------------------------
// StopWords.php
// ---------------------------------------------------------------------------

const stopSet = (custom) => {
  if (custom === undefined) {
    const set = {};
    for (const w of tables.stopWords) set[w] = true;
    return set;
  }
  // PHP: normalizeUrdu(trim($w)), skipping entries that normalize to empty.
  const set = {};
  for (const w of custom) {
    const n = normalizeUrdu(phpTrim(w));
    if (n !== "") set[n] = true;
  }
  return set;
};

const isStopWord = (word, custom) => {
  if (word === "") return false;
  const n = normalizeUrdu(phpTrim(word));
  if (n === "") return false;
  return stopSet(custom)[n] ?? false;
};

const filterStopWords = (words, custom) => {
  if (words.length === 0) return [];
  const set = stopSet(custom);
  const out = [];
  for (const w of words) {
    const n = normalizeUrdu(phpTrim(w));
    if (n !== "" && !(set[n] ?? false)) out.push(w);
  }
  return out;
};

const removeStopWords = (text, custom) => {
  if (text === "") return "";
  return filterStopWords(splitWords(text), custom).join(" ");
};

// ---------------------------------------------------------------------------
// Numbers.php
// ---------------------------------------------------------------------------

const numberTables = tables.numbers;

const digitSets = {
  urdu: tables.digits.urdu,
  english: tables.digits.english,
  arabic: tables.digits.arabic,
};

const digitValue = new Map();
for (const set of Object.values(digitSets)) {
  chars(set).forEach((ch, i) => digitValue.set(ch, i));
}

/** Tables::chars() splits codepoints, so convert per codepoint like the PHP port. */
const convertDigits = (input, target) => {
  if (input === "") return "";
  const digits = chars(digitSets[target]);
  let out = "";
  for (const ch of chars(input)) {
    const value = digitValue.get(ch);
    out += value === undefined ? ch : digits[value];
  }
  return out;
};

const phpToUrduDigits = (s) => convertDigits(s, "urdu");
const phpToEnglishDigits = (s) => convertDigits(s, "english");
const phpToArabicIndicDigits = (s) => convertDigits(s, "arabic");
const phpConvertNumbers = (s, to = "urdu") => convertDigits(s, to);

const phpParseUrduNumber = (input) => {
  if (input === "") return NaN;
  const ascii = strReplace([["٬", ","], ["٫", "."]], phpToEnglishDigits(input)).replace(/\s+/gu, "");
  if (ascii === "" || ascii.split(".").length > 2) return NaN;

  const sign = ascii.startsWith("+") || ascii.startsWith("-") ? ascii[0] : "";
  const unsigned = sign ? ascii.slice(1) : ascii;
  const [wholePart = "", fractionPart = ""] = unsigned.split(".");

  if ((fractionPart !== "" && !/^\d+$/u.test(fractionPart)) || (wholePart === "" && fractionPart === "")) {
    return NaN;
  }

  if (!wholePart.includes(",")) {
    const integerText = wholePart || "0";
    if (!/^\d+$/u.test(integerText)) return NaN;
    return Number(`${sign}${integerText}${fractionPart ? `.${fractionPart}` : ""}`);
  }

  const groups = wholePart.split(",");
  if (groups.some((group) => group.length === 0 || !/^\d+$/u.test(group))) return NaN;

  const westernValid =
    groups.length > 1 &&
    groups[0].length >= 1 &&
    groups[0].length <= 3 &&
    groups.slice(1).every((group) => group.length === 3);
  const indianValid =
    groups.length > 1 &&
    groups[0].length >= 1 &&
    groups[0].length <= 3 &&
    ((groups.length === 2 && (groups[1].length === 2 || groups[1].length === 3)) ||
      (groups.length > 2 &&
        groups.slice(1, -1).every((group) => group.length === 2) &&
        groups[groups.length - 1].length === 3));
  if (!westernValid && !indianValid) return NaN;

  return Number(`${sign}${groups.join("")}${fractionPart ? `.${fractionPart}` : ""}`);
};

const phpNumberToUrduWords = (value) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";
  if (v !== Math.floor(v)) throw new TypeError("expects an integer");
  let n = v;
  if (n < 0) return "منفی " + phpNumberToUrduWords(-n);
  if (n === 0) return "صفر";

  const parts = [];
  let rest = n;
  for (const [size, name] of numberTables.scales) {
    if (rest >= size) {
      const count = Math.floor(rest / size);
      rest = rest % size;
      parts.push(phpNumberToUrduWords(count) + " " + name);
    }
  }
  if (rest > 0) {
    if (numberTables.tensUnits[rest] !== undefined) {
      parts.push(numberTables.tensUnits[rest]);
    } else if (numberTables.teensAndTens[rest] !== undefined) {
      parts.push(numberTables.teensAndTens[rest]);
    } else if (rest < 10) {
      parts.push(numberTables.ones[rest]);
    } else {
      const tens = Math.floor(rest / 10) * 10;
      parts.push(phpTrim(((numberTables.teensAndTens[tens] ?? "") + " " + (numberTables.ones[rest % 10] ?? "")).replace(/^\s+|\s+$/gu, "")));
    }
  }
  return phpTrim(parts.join(" ").replace(/\s+/gu, " "));
};

/** groupDigits(): ASCII digits only, so byte-oriented substr is safe here. */
const phpGroupDigits = (intStr, grouping, separator) => {
  if (grouping === "none" || separator === "") return intStr;
  if (grouping === "western") return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const lastThree = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  if (rest === "") return lastThree;
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, separator) + separator + lastThree;
};

/** sprintf('%.0F', $float) for an integral float: plain digits, never exponent. */
const phpFixedZero = (value) => BigInt(value).toString();

const phpFormatUrduNumber = (value, options = {}) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";

  const digits = options.digits ?? "urdu";
  const grouping = options.grouping ?? "southAsian";
  const decimals = Math.max(0, Math.min(15, Math.trunc(options.decimals ?? 2)));
  const separators = digits === "urdu" ? { group: "٬", decimal: "٫" } : { group: ",", decimal: "." };

  const negative = v < 0;
  const abs = Math.abs(v);
  const scale = 10 ** decimals;

  let intPart = Math.floor(abs);
  let scaledFraction = Math.floor((abs - intPart) * scale + 0.5);
  if (scaledFraction >= scale) {
    intPart += 1;
    scaledFraction -= scale;
  }

  const intStr = phpGroupDigits(phpFixedZero(intPart), grouping, separators.group);
  const fraction = String(scaledFraction).padStart(decimals, "0").replace(/0+$/gu, "");
  const body = fraction === "" ? intStr : intStr + separators.decimal + fraction;
  const sign = negative ? "-" : "";

  return digits === "urdu" ? sign + phpToUrduDigits(body) : sign + body;
};

const phpFormatUrduCurrency = (value, options = {}) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";

  const style = options.style ?? "digits";
  const unit = options.unit ?? "روپے";
  const singularUnit = options.singularUnit ?? "روپیہ";

  const amount = style === "words" ? phpNumberToUrduWords(v) : phpFormatUrduNumber(v, options);
  if (amount === "") return "";

  return amount + " " + (Math.abs(v) === 1 ? singularUnit : unit);
};

const phpToUrduOrdinal = (value, options = {}) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";
  if (v !== Math.floor(v)) throw new TypeError("expects an integer");

  const gender = options.gender ?? "masculine";
  const n = v;
  if (n < 0) return "منفی " + phpToUrduOrdinal(-n, options);
  if (n === 0) return "صفر";

  const irregulars = numberTables.ordinalIrregulars;
  if (irregulars[n] !== undefined) return irregulars[n][gender];

  const words = phpNumberToUrduWords(n).split(" ");
  const last = words.pop();
  // PHP strips the trailing و by BYTE length, which is the correct codepoint
  // removal here; slice(0, -1) mirrors that on a JS string.
  const stem = last.endsWith("و") ? last.slice(0, -1) : last;
  const ordinated = stem + (gender === "feminine" ? "ویں" : "واں");

  const prefix = words.length === 1 && words[0] === "ایک" ? [] : words;

  return prefix.concat([ordinated]).join(" ");
};

// ---------------------------------------------------------------------------
// Date.php
// ---------------------------------------------------------------------------

const phpMonthNames = (calendar) =>
  calendar === "hijri" ? tables.date.monthsHijri : tables.date.monthsGregorian;

const phpGetUrduMonthName = (monthIndex, calendar = "gregorian") => {
  const normalized = Math.trunc(Math.floor(monthIndex)) % 12;
  const idx = normalized < 0 ? normalized + 12 : normalized;
  return phpMonthNames(calendar)[idx];
};

const phpGetUrduWeekdayName = (dayIndex) => {
  const normalized = Math.trunc(dayIndex) % 7;
  const idx = normalized < 0 ? normalized + 7 : normalized;
  return tables.date.weekdays[idx];
};

const PHP_ENGLISH_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const PHP_ENGLISH_WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];
const PHP_URDU_PERIODS = { صبح: "morning", دوپہر: "afternoon", شام: "evening", رات: "night" };

const phpMonthLookup = (() => {
  const lookup = {};
  tables.date.monthsGregorian.forEach((name, index) => {
    lookup[name] = index;
  });
  PHP_ENGLISH_MONTHS.forEach((name, index) => {
    lookup[name] = index;
    lookup[name.slice(0, 3)] = index;
  });
  return lookup;
})();

const phpWeekdayTokens = (() => {
  const tokens = {};
  for (const name of tables.date.weekdays) tokens[name] = true;
  for (const name of PHP_ENGLISH_WEEKDAYS) {
    tokens[name] = true;
    tokens[name.slice(0, 3)] = true;
  }
  return tokens;
})();

const phpResolveHour = (hour, period) => {
  switch (period) {
    case "am":
    case "morning":
      return hour === 12 ? 0 : hour;
    case "pm":
    case "afternoon":
    case "evening":
      return hour < 12 ? hour + 12 : hour;
    case "night":
      if (hour === 12) return 0;
      return hour >= 8 && hour <= 11 ? hour + 12 : hour;
    default:
      return hour;
  }
};

const phpExpandYear = (year) => (year >= 100 ? year : year < 70 ? 2000 + year : 1900 + year);

const phpBuildLocalDate = (year, month, day, hour, minute, second) => {
  if (year < 100 || month < 0 || month > 11 || day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  const date = new Date(year, month, day, hour, minute, second);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
    || date.getHours() !== hour
  ) {
    return null;
  }
  return date;
};

const phpParseNumericDate = (input) => {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(input);
  if (iso) {
    return phpBuildLocalDate(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      iso[4] ? Number(iso[4]) : 0,
      iso[5] ? Number(iso[5]) : 0,
      iso[6] ? Number(iso[6]) : 0
    );
  }

  const dayFirst = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(input);
  if (dayFirst) {
    return phpBuildLocalDate(
      phpExpandYear(Number(dayFirst[3])),
      Number(dayFirst[2]) - 1,
      Number(dayFirst[1]),
      dayFirst[4] ? Number(dayFirst[4]) : 0,
      dayFirst[5] ? Number(dayFirst[5]) : 0,
      dayFirst[6] ? Number(dayFirst[6]) : 0
    );
  }

  return null;
};

const phpParseUrduDate = (input, options = {}) => {
  if (input === "") return null;

  let normalized = phpToEnglishDigits(input);
  normalized = normalized.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/gu, "");
  normalized = strReplace([["،", " "], ["۔", " "]], normalized);
  normalized = phpTrim(normalized.replace(/\s+/gu, " "));
  if (normalized === "") return null;

  const numeric = phpParseNumericDate(normalized);
  if (numeric !== null) return numeric;

  let month = null;
  let hour = null;
  let minute = 0;
  let second = 0;
  let period = null;
  const numbers = [];

  for (const rawToken of normalized.split(" ")) {
    // preg_replace('/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/u', '') — both anchors are
    // replaced in one global pass, matching the PCRE behaviour.
    const token = rawToken
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .replace(/[^\p{L}\p{N}]+$/u, "");
    if (token === "") continue;

    const urduPeriod = PHP_URDU_PERIODS[token];
    if (urduPeriod !== undefined) {
      period = urduPeriod;
      continue;
    }

    const lower = token.toLowerCase();
    if (lower === "am" || lower === "pm") {
      period = lower;
      continue;
    }

    if (phpWeekdayTokens[token] || phpWeekdayTokens[lower]) continue;

    const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(token);
    if (time) {
      hour = Number(time[1]);
      minute = Number(time[2]);
      second = time[3] ? Number(time[3]) : 0;
      continue;
    }

    const monthIndex = phpMonthLookup[token] ?? phpMonthLookup[lower];
    if (monthIndex !== undefined) {
      month = monthIndex;
      continue;
    }

    if (/^\d+$/.test(token)) numbers.push(Number(token));
  }

  if (month === null || numbers.length === 0) return null;

  let day;
  let year;
  if (numbers.length === 1) {
    const only = numbers[0];
    if (only > 31) {
      day = 1;
      year = only;
    } else {
      day = only;
      year = options.defaultYear ?? new Date().getFullYear();
    }
  } else {
    const first = numbers[0];
    const last = numbers[numbers.length - 1];
    if (first > 31 && last <= 31) {
      day = last;
      year = first;
    } else {
      day = first;
      year = last;
    }
  }

  return phpBuildLocalDate(
    phpExpandYear(year),
    month,
    day,
    hour === null ? 0 : phpResolveHour(hour, period),
    minute,
    second
  );
};

// ---------------------------------------------------------------------------
// Run every fixture through the PHP-mirrored implementation
// ---------------------------------------------------------------------------

let failures = 0;
let total = 0;
const fail = (file, c, detail) => {
  failures++;
  console.error(`FAIL ${file} ${c.fn} ${JSON.stringify(c.args)}\n  expected ${JSON.stringify(c.expected)}\n  actual   ${JSON.stringify(detail)}`);
};

for (const c of load("php/tests/fixtures/stats.json")) {
  total++;
  let actual;
  if (c.fn === "splitWords") actual = splitWords(c.args[0]);
  else if (c.fn === "countWords") actual = splitWords(c.args[0]).length;
  else if (c.fn === "splitSentences") actual = splitSentences(c.args[0], c.options);
  else if (c.fn === "countSentences") actual = splitSentences(c.args[0], c.options).length;
  else if (c.fn === "analyzeUrdu") actual = analyze(c.args[0]);
  if (JSON.stringify(actual) !== JSON.stringify(c.expected)) fail("stats.json", c, actual);
}

for (const c of load("php/tests/fixtures/detect.json")) {
  total++;
  let actual;
  if (c.fn === "isUrdu") actual = isUrdu(c.args[0], c.options);
  else if (c.fn === "urduRatio") actual = ratioOf(c.args[0]);
  else if (c.fn === "hasUrduSpecificLetters") actual = hasUrduSpecificLetters(c.args[0]);
  if (JSON.stringify(actual) !== JSON.stringify(c.expected)) fail("detect.json", c, actual);
}

for (const c of load("php/tests/fixtures/stopwords.json")) {
  total++;
  const [a, b] = c.args;
  let actual;
  if (c.fn === "isStopWord") actual = isStopWord(a, b);
  else if (c.fn === "filterStopWords") actual = filterStopWords(a, b);
  else if (c.fn === "removeStopWords") actual = removeStopWords(a, b);
  if (JSON.stringify(actual) !== JSON.stringify(c.expected)) fail("stopwords.json", c, actual);
}

/** Fixture args spell NaN/Infinity out for JSON. */
const numericArg = (value) => {
  if (value === "NAN") return NaN;
  if (value === "INF") return Infinity;
  return Number(value);
};

for (const c of load("php/tests/fixtures/numbers.json")) {
  total++;
  const a = c.args[0];
  let actual;
  if (c.fn === "toUrduDigits") actual = phpToUrduDigits(a);
  else if (c.fn === "toEnglishDigits") actual = phpToEnglishDigits(a);
  else if (c.fn === "toArabicIndicDigits") actual = phpToArabicIndicDigits(a);
  else if (c.fn === "convertNumbers") actual = phpConvertNumbers(a, c.args[1] ?? "urdu");
  else if (c.fn === "parseUrduNumber") actual = phpParseUrduNumber(a);
  else if (c.fn === "numberToUrduWords") actual = phpNumberToUrduWords(numericArg(a));
  else if (c.fn === "formatUrduNumber") actual = phpFormatUrduNumber(numericArg(a), c.options);
  else if (c.fn === "formatUrduCurrency") actual = phpFormatUrduCurrency(numericArg(a), c.options);
  else if (c.fn === "toUrduOrdinal") actual = phpToUrduOrdinal(numericArg(a), c.options);

  if (c.expected === "NAN") {
    if (!Number.isNaN(actual)) fail("numbers.json", c, actual);
    continue;
  }
  if (c.fn === "parseUrduNumber") {
    if (actual !== c.expected) fail("numbers.json", c, actual);
    continue;
  }
  if (actual !== c.expected) fail("numbers.json", c, actual);
}

/** parseUrduDate expectations are wall-clock components, so compare components. */
const dateParts = (d) =>
  d === null
    ? null
    : [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
const fixtureParts = (comps) =>
  comps === null ? null : [comps.y, comps.m, comps.d, comps.hh, comps.mm, comps.ss];

for (const c of load("php/tests/fixtures/date.json")) {
  total++;
  let actual;
  let expected;
  if (c.fn === "getUrduMonthName") {
    actual = phpGetUrduMonthName(c.args[0], c.args[1] ?? "gregorian");
    expected = c.expected;
  } else if (c.fn === "getUrduWeekdayName") {
    actual = phpGetUrduWeekdayName(c.args[0]);
    expected = c.expected;
  } else if (c.fn === "parseUrduDate") {
    actual = dateParts(phpParseUrduDate(c.args[0], c.options));
    expected = fixtureParts(c.expected);
  } else {
    // formatUrduDate / timeAgoUrdu exercise pre-existing PHP code; the real
    // PHPUnit suite covers them, and the no-PHP check stays scoped to the
    // functions this script mirrors.
    total--;
    continue;
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("date.json", c, actual);
}

console.log(`${total - failures}/${total} fixture cases match the PHP-mirrored algorithms`);
if (failures > 0) process.exit(1);
