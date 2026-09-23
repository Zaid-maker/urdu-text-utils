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
};

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

for (const [name, cases] of Object.entries(fixtures)) {
  const file = join(outDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(cases, null, 1));
  console.log(`wrote ${file} (${cases.length} cases)`);
}
