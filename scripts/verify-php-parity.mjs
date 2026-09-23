/**
 * Local (no-PHP) verification: re-implements the PHP port's algorithms in JS,
 * faithfully mirroring the PHP code paths (including where they differ from
 * the TS source), and asserts the results against the generated fixtures.
 *
 * This is a dev-only smoke check for when PHP is unavailable locally;
 * php/tests remains the real parity gate.
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
  if (input === "") return 0.0;
  let letters = 0;
  let urdu = 0;
  for (const ch of chars(input)) {
    if (anyLetterRe.test(ch)) {
      letters++;
      if (arabicLetterRe.test(ch)) urdu++;
    }
  }
  return letters === 0 ? 0.0 : urdu / letters;
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

console.log(`${total - failures}/${total} fixture cases match the PHP-mirrored algorithms`);
if (failures > 0) process.exit(1);
