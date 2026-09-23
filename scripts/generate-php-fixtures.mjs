/**
 * Generate php/tests/fixtures/*.json by running the REAL TypeScript
 * implementation from dist. Every expected value is therefore whatever the
 * shipped TS library produces — the PHP port's tests assert identical output,
 * which is what keeps the two languages honest.
 *
 * Usage: node scripts/generate-php-fixtures.mjs   (npm run build first)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = await import(`file:///${root.replace(/\\/g, "/")}/dist/index.js`);
const outDir = join(root, "php", "tests", "fixtures");
mkdirSync(outDir, { recursive: true });

const json = (value) => (Number.isNaN(value) ? "NAN" : value);
// Argument encoding: JSON has no NaN/Infinity, so spell them out.
const argNum = (value) => (Number.isNaN(value) ? "NAN" : value === Infinity ? "INF" : value);

const fixtures = {
  normalize: [],
  collate: [],
  transliterate: [],
  numbers: [],
  search: [],
  detect: [],
  stats: [],
  stopwords: [],
  stemmer: [],
  date: [],
  names: [],
};

/**
 * Date fixtures are timezone-stable by construction:
 *
 * - formatUrduDate cases store wall-clock COMPONENTS, never epochs. The TS
 *   generator builds `new Date(y, m, d, ...)` in its local zone and the PHP
 *   test builds a DateTime from the same components in its own default zone,
 *   so both format identical wall-clock dates wherever they run — regenerating
 *   fixtures in UTC CI cannot drift from fixtures generated in any local zone.
 * - timeAgoUrdu output depends only on the signed difference between two
 *   instants, so cases store fixed epoch SECONDS (Date.UTC constants) and a
 *   signed offsetSeconds; no wall-clock is ever observed.
 */
const utcBaseSec = Date.UTC(2026, 7, 22, 12, 0, 0) / 1000;

// ---- normalize -----------------------------------------------------------
for (const [input, options] of [
  ["كيا حال ہے"],
  ["ه"],
  ["ہ"],
  ["آ", { stripDiacritics: true }],
  ["ھ"],
  ["ے"],
  ["ؤ"],
  ["ۃ"],
  ["پاکـسـتان"],
  ["\u200B\u200C\u200D\uFEFFپاکستان\u200E\u200F"],
  ["  کیا   حال  "],
  ["  کیا   حال  ", { collapseWhitespace: false }],
  ["مُحَمَّد"],
  ["مُحَمَّد", { stripDiacritics: true }],
  ["سال 2024", { digits: "urdu" }],
  ["سال ۲۰۲۴", { digits: "english" }],
  ["سال 2024", { digits: "arabic" }],
  ["سال 2024"],
  ["کیا?", { urduPunctuation: true }],
  ["کیا?؛,", { urduPunctuation: true }],
  ["ﻻ"], // lam-alef ligature via NFKC
  ["\uFB90"], // presentation-form kaf
  ["\uFB90", { compatibility: false }],
  ["جزاک\u200Cاللہ"],
  ["جزاک\u200Cاللہ", { stripZwnj: true }],
  ["کیا\tحال\nہے"],
  ["اقصی\u0670"],
  ["مصطفی\u0670"],
  ["کتاب"],
]) {
  fixtures.normalize.push({
    fn: "normalizeUrdu",
    args: [input],
    options: options ?? {},
    expected: lib.normalizeUrdu(input, options),
  });
}

for (const input of ["مُحَمَّد", "ہے۔", "ۓ", "اقصی\u0670", "مصطفی\u0670", "کتاب", ""]) {
  fixtures.normalize.push({ fn: "removeDiacritics", args: [input], options: {}, expected: lib.removeDiacritics(input) });
}
for (const input of ["مُحَمَّد", "محمد", "كيا", "کیا", "ه", "ہ", "جزاک\u200Cاللہ", "کیا   حال", "كتاب", "کتاب", ""]) {
  fixtures.normalize.push({ fn: "foldUrdu", args: [input], options: {}, expected: lib.foldUrdu(input) });
}

// ---- collate --------------------------------------------------------------
for (const [a, b] of [
  ["گل", "آم"],
  ["ٹماٹر", "تربوز"],
  ["گھر", "کتاب"],
  ["ماں", "مان"],
  ["مُحَمَّد", "احمد"],
  ["كتاب", "کتاب"],
  ["کتابیں", "کتاب"],
  ["پاوں", "پاؤں"],
  ["ابوبکر", "ابو بکر"],
  ["اردو", "اردو"],
  ["", ""],
  ["گھر", "2 گھر"],
  ["ا", "آ"],
  ["آم", "بادام"],
  ["شریف", "صدیق"],
]) {
  fixtures.collate.push({
    fn: "compareUrdu",
    args: [a, b],
    options: {},
    expected: Math.sign(lib.compareUrdu(a, b)),
  });
}
for (const [input, options] of [
  [["گل", "آم", "بادام"]],
  [["ٹماٹر", "تربوز", "پپیتا"]],
  [["گھر", "کتاب"]],
  [["ماں", "مان"]],
  [["مُحَمَّد", "احمد"]],
  [["کتابیں", "کتاب"]],
  [["پاوں", "پاؤں", "پاک"]],
  [["ابوبکر", "ابو بکر"]],
  [["گھر", "2 گھر", "آم", "10 کتابیں"]],
  [["آم", "بادام"], { descending: true }],
]) {
  fixtures.collate.push({
    fn: "sortUrdu",
    args: [input],
    options: options ?? {},
    expected: lib.sortUrdu(input, options),
  });
}

// ---- transliterate --------------------------------------------------------
for (const [input, options] of [
  ["آپ کیسے ہیں"],
  ["آپ کیسے ہیں", { capitalize: true }],
  ["میرا دوست بہت اچھا انسان ہے"],
  ["سائنسدان"],
  ["بھائی"],
  ["چھوٹا"],
  ["مُحَمَّد"],
  ["محمد"],
  [""],
  ["میں پاکستان کا رہنے والا ہوں"],
  ["یہ کتاب بہت اچھی ہے"],
  ["وہ سکول جا رہا ہے"],
  ["کرکٹ"],
  ["ویسا"],
  ["یاد"],
  ["پرندہ"],
  ["کھیل"],
  ["پڑھی"],
  ["سڑکیں"],
  ["راتیں"],
  ["کراچی میں بارش کے بعد سڑکیں بند ہیں"],
  ["مضمون 2"],
  ["اسرار"],
  ["اذکار"],
  ["پہلا\nدوسرا"],
  ["طوطا مینا کی کہانی"],
]) {
  fixtures.transliterate.push({
    fn: "romanize",
    args: [input],
    options: options ?? {},
    expected: lib.romanize(input, options),
  });
}
for (const input of [
  "mera naam zaid hai",
  "Mera Naam",
  "hai",
  "hay",
  "aap",
  "ap",
  "mera naam, zaid hai!",
  "mera  naam",
  "bohot",
  "bahut",
  "bhot",
  "kaise",
  "kaisay",
  "chhota",
  "aam",
  "Pakistan",
  "ilm",
  "school",
  "main school ja raha hoon",
  "",
]) {
  fixtures.transliterate.push({ fn: "romanToUrdu", args: [input], options: {}, expected: lib.romanToUrdu(input) });
}
for (const [input, options] of [
  ["میرا پہلا مضمون"],
  ["آپ کیسے ہیں؟"],
  ["میرا پہلا مضمون", { preserveUrdu: true }],
  ["میرا پہلا مضمون", { separator: "_" }],
  ["میرا پہلا مضمون", { maxLength: 12 }],
  ["مضمون 2 اور 3"],
  ["میرا پہلا مضمون", { maxLength: 7 }],
  ["میرا پہلا مضمون بہت لمبا ہے", { preserveUrdu: true, maxLength: 8 }],
  ["میرا پہلا مضمون!", { preserveUrdu: true }],
  [""],
]) {
  fixtures.transliterate.push({
    fn: "urduSlug",
    args: [input],
    options: options ?? {},
    expected: lib.urduSlug(input, options),
  });
}

// ---- numbers ---------------------------------------------------------------
for (const [input, style] of [
  ["12345", undefined],
  ["0987654321", undefined],
  ["۱۲۳۴۵", "english"],
  ["۰۹۸۷۶۵۴۳۲۱", "english"],
  ["١٢٣", "english"],
  ["١٢٣", "urdu"],
  ["123", "arabic"],
  ["۱۲۳", "arabic"],
  ["سال 2024ء", "urdu"],
  ["31-12-2024", "urdu"],
]) {
  fixtures.numbers.push({
    fn: style === undefined ? "toUrduDigits" : "convertNumbers",
    args: [input, style].filter((v) => v !== undefined),
    options: {},
    expected: style === undefined ? lib.toUrduDigits(input) : lib.convertNumbers(input, style),
  });
}
for (const input of ["۱۲۳۴۵", "1,234", "1,234.5", "-۱۲۳", "+۳٫۵", ".5", " ۱۲۳ ", "12abc", "1.2.3", "", "پاکستان", "۱۲۳٬۴۵۶٫۷۸"]) {
  fixtures.numbers.push({ fn: "parseUrduNumber", args: [input], options: {}, expected: json(lib.parseUrduNumber(input)) });
}
for (const value of [0, 5, 15, 21, 25, 90, 100, 200, 1000, 1005, 1234, 100000, 1000000, 1234567, 10000000, 100000000, -5, Infinity, NaN]) {
  fixtures.numbers.push({ fn: "numberToUrduWords", args: [argNum(value)], options: {}, expected: lib.numberToUrduWords(value) });
}

// ---- search ----------------------------------------------------------------
for (const [query, items, options] of [
  ["محمد", ["مُحَمَّد علی", "احمد", "محمد خان"]],
  ["كتاب", ["کتاب", "قلم"]],
  ["قلم", ["کتاب"]],
  ["", ["کتاب"]],
  ["محمد", ["محمد خان", "محمد"]],
  ["محمد", ["محمد خان", "محمد"], { limit: 1 }],
  ["کتاب", ["کتابیں", "کتاب", "میز پر کتاب"]],
  ["محمد", ["محمد خان", "محمد"], { sortByScore: false }],
  ["محمد خان", ["محمد خان صاحب", "احمد خان"]],
  ["پاکستاں", ["پاکستان"]],
  ["پاکستاں", ["پاکستان"], { fuzzy: true }],
  ["پاکستان پاکستان", ["پاکستان"], { fuzzy: true, maxDistance: 2 }],
  ["محمد خان", ["محمد خان صاحب"], { fuzzy: true }],
]) {
  fixtures.search.push({
    fn: "searchUrduRanked",
    args: [query, items],
    options: options ?? {},
    expected: lib.searchUrduRanked(query, items, options).map((r) => ({ item: r.item, score: json(r.score) })),
  });
}
for (const [a, b, limit] of [
  ["کتاب", "کتاب"],
  ["کتاب", "کتب"],
  ["کتاب", "پاکستان", 1],
  ["", ""],
  ["", "کتاب"],
  ["کتاب", ""],
  ["کتاب", "کتبا"],
]) {
  fixtures.search.push({
    fn: "editDistance",
    args: limit === undefined ? [a, b] : [a, b, limit],
    options: {},
    expected: lib.editDistance(a, b, limit),
  });
}
for (const [text, query] of [
  ["مُحَمَّد علی", "محمد"],
  ["محمد اور محمد", "محمد"],
  ["احمد", "محمد"],
  ["محمد خان صاحب", "محمد خان"],
  ["محمد علی", "مُحَمَّد"],
  ["مُحَمَّد", "احمد"],
  ["احمد", ""],
]) {
  fixtures.search.push({ fn: "highlightUrdu", args: [text, query], options: {}, expected: lib.highlightUrdu(text, query) });
}

// ---- detect ----------------------------------------------------------------
for (const [input, options] of [
  ["آپ کیسے ہیں؟"],
  ["پاکستان"],
  ["hello world"],
  [""],
  ["12345 !!! ---"],
  ["The word پاکستان appears in this English sentence"],
  ["The word پاکستان appears", { threshold: 0.1 }],
  ["پاکستان ایک خوبصورت ملک ہے (Pakistan)"],
  ["پاکستان پاکستان hello", { minLetters: 5, threshold: 0.4 }],
  ["پاکستان hello world foo bar", { minLetters: 5, threshold: 0.4 }],
  ["پاکستان pakistan", { threshold: 0.5 }],
  ["پاکستان pakistan", { threshold: 0.4 }],
  ["كتاب مدرسة"],
  ["کیا حال ہے? ٹھیک ہوں."],
]) {
  fixtures.detect.push({
    fn: "isUrdu",
    args: [input],
    options: options ?? {},
    expected: lib.isUrdu(input, options),
  });
}
for (const input of ["پاکستان", "Pakistan", "12345", "", "پاکستان! (Pakistan)", "پاکستان Pakistan", "مُحَمَّد ۱۲۳ 45"]) {
  fixtures.detect.push({ fn: "urduRatio", args: [input], options: {}, expected: json(lib.urduRatio(input)) });
}
for (const input of ["پاکستان", "لڑکی", "كتاب مدرسة", "سلام علیکم", "کتاب", "", "دولت", "داروغہ"]) {
  fixtures.detect.push({ fn: "hasUrduSpecificLetters", args: [input], options: {}, expected: lib.hasUrduSpecificLetters(input) });
}

// ---- stats -------------------------------------------------------------------
for (const input of ["پاکستان ایک خوبصورت ملک ہے", "کیا، حال؛ ہے؟", "   ", "", "مضمون 2 اور 3"]) {
  fixtures.stats.push({ fn: "splitWords", args: [input], options: {}, expected: lib.splitWords(input) });
}
for (const input of ["پاکستان ایک خوبصورت ملک ہے", "پاکستان ایک خوبصورت ملک ہے۔", "آپ کیسے ہیں؟", "  کیا \n\n حال  ", ""]) {
  fixtures.stats.push({ fn: "countWords", args: [input], options: {}, expected: lib.countWords(input) });
}
for (const [input, options] of [
  ["یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔"],
  ["آپ کیسے ہیں؟ میں ٹھیک ہوں۔"],
  ["ایک جملہ۔"],
  [""],
  ["کیا آپ خیریت سے ہیں؟ جی ہاں، میں ٹھیک ہوں۔", { preserveTerminators: true }],
  ["ڈاکٹر. علامہ اقبال ہمارے قومی شاعر ہیں۔ وہ سیالکوٹ میں پیدا ہوئے۔"],
  ["پائی کی قیمت 3.14 ہے۔ یہ ایک مستقل عدد ہے۔"],
  ["پائی کی قیمت ۳٫۱۴ ہے۔ یہ ایک عدد ہے۔"],
  ["واہ! کیا بات ہے۔"],
  ["رکو… چلو۔"],
  ["کیا حال ہے? ٹھیک ہوں."],
  ["کیا حال ہے? ٹھیک ہوں.", { preserveTerminators: true }],
  ["مولانا علی علیہ السلام فرماتے ہیں۔ یہ ایک مثال ہے۔"],
  ["مضمون 2.5 اور 3.75 ہیں۔"],
]) {
  fixtures.stats.push({
    fn: "splitSentences",
    args: [input],
    options: options ?? {},
    expected: lib.splitSentences(input, options),
  });
}
for (const input of ["یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔", "آپ کیسے ہیں؟ میں ٹھیک ہوں۔", "ایک جملہ۔", "", "واہ! کیا بات ہے۔", "پائی کی قیمت 3.14 ہے۔ یہ ایک مستقل عدد ہے۔"]) {
  fixtures.stats.push({ fn: "countSentences", args: [input], options: {}, expected: lib.countSentences(input) });
}
for (const input of [
  "پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی بہت زیادہ ہے۔",
  "",
  "مُحَمَّد ۱۲۳ 45",
  "پاکستان Pakistan",
  "پہلا پیراگراف۔\n\nدوسرا پیراگراف۔\n\nتیسرا۔",
  "پاکستان! (Pakistan)",
  "دو جملے۔ تین الفاظ۔",
]) {
  fixtures.stats.push({ fn: "analyzeUrdu", args: [input], options: {}, expected: lib.analyzeUrdu(input) });
}

// ---- stopwords ---------------------------------------------------------------
for (const [word, custom] of [
  ["ہے", undefined],
  ["اور", undefined],
  ["میں", undefined],
  ["لیکن", undefined],
  ["فى", undefined],
  ["اور ", undefined],
  ["کتاب", undefined],
  ["پاکستان", undefined],
  ["خوبصورت", undefined],
  ["", undefined],
  ["خاص", ["خاص", "لفظ"]],
  ["ہے", ["خاص", "لفظ"]],
  ["لفظ", ["خاص", "لفظ"]],
  ["اور", ["اور "]],
]) {
  fixtures.stopwords.push({
    fn: "isStopWord",
    args: custom === undefined ? [word] : [word, custom],
    options: {},
    expected: lib.isStopWord(word, custom),
  });
}
for (const [words, custom] of [
  [["یہ", "ایک", "بہترین", "اور", "خوبصورت", "کتاب", "ہے"], undefined],
  [[], undefined],
  [["یہ", "ہے", "اور"], undefined],
  [["آم", "سیب", "کیلا"], ["سیب"]],
  [["آم", "سیب", "کیلا"], ["سیب", "کیلا"]],
]) {
  fixtures.stopwords.push({
    fn: "filterStopWords",
    args: custom === undefined ? [words] : [words, custom],
    options: {},
    expected: lib.filterStopWords(words, custom),
  });
}
for (const [text, custom] of [
  ["پاکستان ایک بہت خوبصورت ملک ہے اور اس کے لوگ اچھے ہیں", undefined],
  ["", undefined],
  ["آم میٹھا پھل ہے", ["میٹھا"]],
  ["یہ ایک اچھی کتاب ہے۔", undefined],
]) {
  fixtures.stopwords.push({
    fn: "removeStopWords",
    args: custom === undefined ? [text] : [text, custom],
    options: {},
    expected: lib.removeStopWords(text, custom),
  });
}

// ---- stemmer -------------------------------------------------------------
for (const [input, options] of [
  // plurals & morphological restorations
  ["کتابیں"], ["کتابوں"], ["شہروں"], ["خبریں"], ["تصویریں"], ["لوگوں"],
  ["لڑکیاں"], ["لڑکیوں"], ["کہانیاں"], ["روٹیاں"], ["گاڑیاں"], ["صدیوں"], ["تبدیلیاں"], ["خوبصورتیاں"],
  ["دعائیں"], ["دعاؤں"], ["ہوائیں"], ["ہواؤں"], ["فضائیں"], ["خوشبوئیں"], ["خوشبوؤں"],
  ["تعلیمات"], ["احساسات"], ["معلومات"], ["کاغذات"],
  // prefixes
  ["بےوقوف"], ["بےشک"], ["نااہل"], ["ناکام"], ["غیرملکی"], ["لاجواب"], ["ہمسفر"], ["ہمدرد"], ["بدنام"], ["کمزور"],
  // derivational & verbal suffixes
  ["دکاندار"], ["وفاداری"], ["مددگار"], ["خوفناک"], ["ضرورتمند"], ["امیدوار"], ["انسانیت"], ["پاگل پن"],
  ["پڑھتا"], ["پڑھتی"], ["پڑھتے"], ["کھاتے"], ["پڑھیںگے"], ["پڑھینگے"],
  // protection of irreducible roots
  ["ہم"], ["باغ"], ["نام"], ["ہوا"], ["دل"], ["سر"], ["رات"], ["بات"], ["ہے"], ["ہیں"], ["بے"],
  // trimming & normalization before stemming
  ["  کتابیں  "], ["لڑکِیاں"],
  // both affixes at once
  ["غیرملکیوں"],
  // options
  ["نااہلی", { minStemLength: 5 }],
  ["کتابیں", { customSuffixes: [] }],
  ["کتابیں", { customSuffixes: ["یں"] }],
  ["بےوقوف", { customPrefixes: [] }],
  ["بےوقوف", { stripPrefixes: false }],
  ["کتابیں", { stripSuffixes: false }],
  ["خصوصی", { exceptions: { خصوصی: "خاص" } }],
  [""],
]) {
  fixtures.stemmer.push({
    fn: "getAffixes",
    args: [input],
    options: options ?? {},
    expected: lib.getAffixes(input, options),
  });
}
for (const text of [
  "طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔",
  "میں کتابیں پڑھتا ہوں اور I read books",
  "مضمون 2 اور 3 کتابیں!",
  "",
]) {
  fixtures.stemmer.push({ fn: "stemUrduText", args: [text], options: {}, expected: lib.stemUrduText(text) });
}

// ---- date -------------------------------------------------------------------
for (const idx of [0, 7, 8, 11, 12, -1]) {
  fixtures.date.push({ fn: "getUrduMonthName", args: [idx], options: {}, expected: lib.getUrduMonthName(idx) });
  fixtures.date.push({ fn: "getUrduMonthName", args: [idx, "hijri"], options: {}, expected: lib.getUrduMonthName(idx, "hijri") });
}
for (const idx of [0, 5, 6, 7, -1]) {
  fixtures.date.push({ fn: "getUrduWeekdayName", args: [idx], options: {}, expected: lib.getUrduWeekdayName(idx) });
}

/**
 * formatUrduDate fixtures store wall-clock components; the TS generator builds
 * a Date from them in ITS local zone and the PHP test builds a DateTime from
 * the same components in its own default zone.
 */
const fmt = (comps, pattern, options) => {
  const d = new Date(comps.y, comps.m, comps.d, comps.hh ?? 0, comps.mm ?? 0, comps.ss ?? 0);
  fixtures.date.push({
    fn: "formatUrduDate",
    args: [comps, ...(pattern === undefined ? [] : [pattern])],
    options: options ?? {},
    expected: lib.formatUrduDate(d, pattern ?? "DD MMMM YYYY", options),
  });
};
fmt({ y: 2026, m: 7, d: 22, hh: 10 });
fmt({ y: 2026, m: 0, d: 15 });
fmt({ y: 2026, m: 7, d: 22 }, "DD MMMM YYYY", { digits: "english" });
fmt({ y: 2026, m: 7, d: 22, hh: 14, mm: 30, ss: 45 }, "dddd، D MMMM YYYY، hh:mm A");
fmt({ y: 2026, m: 7, d: 22, hh: 9 }, "hh:mm A");
fmt({ y: 2026, m: 7, d: 22, hh: 13 }, "hh:mm A");
fmt({ y: 2026, m: 7, d: 22, hh: 18 }, "hh:mm A");
fmt({ y: 2026, m: 7, d: 22, hh: 23 }, "hh:mm A");
fmt({ y: 2026, m: 7, d: 22, hh: 5, mm: 7, ss: 9 }, "HH:mm:ss");
fmt({ y: 2026, m: 7, d: 22, hh: 5, mm: 7, ss: 9 }, "H:m:s");
fmt({ y: 2026, m: 7, d: 22 }, "YY");
fmt({ y: 2026, m: 7, d: 5 }, "M/MM");
fmt({ y: 2026, m: 7, d: 22, hh: 14, mm: 30 }, "dddd D MMMM YYYY hh:mm", { digits: "english" });
fmt({ y: 2026, m: 8, d: 1 }, "MMMM", { calendar: "hijri" });
fmt({ y: 2026, m: 7, d: 22 }, "DD [MMMM] YYYY");
fmt({ y: 2026, m: 7, d: 22 }, "سال YYYY، مہینہ MMMM");

/**
 * timeAgoUrdu fixtures store a fixed epoch-seconds base plus a signed offset,
 * so the result never depends on the wall clock of the generating machine.
 */
const tAgo = (offsetSeconds, options) => {
  fixtures.date.push({
    fn: "timeAgoUrdu",
    args: [{ baseSec: utcBaseSec, offsetSeconds }],
    options: options ?? {},
    expected: lib.timeAgoUrdu(
      new Date((utcBaseSec + offsetSeconds) * 1000),
      new Date(utcBaseSec * 1000),
      options
    ),
  });
};
tAgo(-20);
tAgo(-60);
tAgo(-300);
tAgo(-300, { digits: "english" });
tAgo(-3600);
tAgo(-10800);
tAgo(-86400);
tAgo(-172800);
tAgo(-4 * 86400);
tAgo(-7 * 86400);
tAgo(-14 * 86400);
tAgo(-30 * 86400);
tAgo(-180 * 86400);
tAgo(-365 * 86400);
tAgo(-3 * 365 * 86400);
tAgo(10);
tAgo(300);
tAgo(7200);
tAgo(14 * 86400);
tAgo(-300, { addSuffix: false });
tAgo(-7200, { addSuffix: false });
tAgo(60);
tAgo(60, { addSuffix: false });
tAgo(-45);
tAgo(-2700);
tAgo(-79200);
tAgo(-8 * 86400);
tAgo(-330 * 86400);

// ---- names -----------------------------------------------------------------
for (const [input, options] of [
  // single names, full names, honorifics, family names
  ["محمد"], ["علی"], ["عمر"], ["خان"],
  ["محمد علی"], ["احمد خان"], ["فاطمہ عائشہ"],
  ["جناب خان"], ["محمد صاحب"], ["علی صاحب"],
  ["شریف"], ["بھٹو"], ["زرداری"],
  ["جناب محمد علی خان صاحب"],
  ["میاں محمد"],
  [""],
  // options
  ["جناب محمد علی", { includeHonorifics: false }],
  ["جناب ڈاکٹر محمد علی صاحب", { includeHonorifics: false }],
  ["محمد علی", { preserveCase: false }],
  // corrected spellings round-tripping both ways
  ["آصف"], ["خالد"], ["ندیم"], ["نظیر"], ["سرفراز"], ["مقصود"], ["مسعود"],
  ["اقصی"], ["لائبہ"], ["فیزا"], ["فضہ"], ["نازیہ"], ["تسنیم"], ["سلمی"], ["عظمی"],
  ["عدیل"], ["شعیب"], ["رؤف"], ["حرا"], ["ماہم"], ["حنا"], ["سدرہ"], ["ردا"],
  ["نائلہ"], ["بشری"], ["رخسانہ"], ["ناہید"], ["صائمہ"], ["مہرین"], ["عنبرین"],
  ["سمیعہ"], ["سامیہ"], ["رابعہ"], ["ارم"], ["فرح"], ["نزہت"], ["کرن"],
  ["قریشی"], ["جدون"], ["کھوسہ"], ["تالپور"],
  ["دانیال"], ["ذیشان"], ["مصطفی"], ["جویریہ"], ["مہوش"], ["عالیہ"], ["میمونہ"],
  // superscript-alef spellings normalize to the dictionary keys
  ["اقصیٰ"], ["سلمیٰ"], ["عظمیٰ"], ["بشریٰ"], ["مصطفیٰ"],
  // rule fallback keeps unknown names ASCII-clean
  ["ظفر"], ["غیور"], ["شاہین"],
]) {
  fixtures.names.push({
    fn: "transliterateNameToEnglish",
    args: [input],
    options: options ?? {},
    expected: lib.transliterateNameToEnglish(input, options),
  });
}
for (const input of [
  "Muhammad", "Ali", "Umar", "Khan",
  "Muhammad Ali", "Ahmed Khan", "Fatima Ayesha",
  "Janab Khan", "Muhammad Sahib",
  "Sharif", "Bhutto", "Zardari",
  "MUHAMMAD", "ali",
  // alternate Roman spellings
  "Hassan", "Omar", "Omer", "Yaqoob", "Jameel", "Majeed", "Amna", "Gilani", "Sahab",
  "Doctor", "Professor", "Engineer", "Advocate", "Retd",
  // prefixes
  "Mian", "Begum", "Syed", "Chowdhury",
  // unknown passes through
  "Zafar",
  "",
]) {
  fixtures.names.push({ fn: "transliterateNameToUrdu", args: [input], options: {}, expected: lib.transliterateNameToUrdu(input) });
}
for (const input of [
  "جناب محمد علی خان صاحب",
  "محمد علی خان",
  "محمد",
  "",
  "بیگم فاطمہ خان",
  "ڈاکٹر عالیہ",
]) {
  fixtures.names.push({ fn: "extractNameParts", args: [input], options: {}, expected: lib.extractNameParts(input) });
}

for (const [name, cases] of Object.entries(fixtures)) {
  const file = join(outDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(cases, null, 1));
  console.log(`wrote ${file} (${cases.length} cases)`);
}
