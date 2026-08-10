# urdu-text-utils

Urdu text processing toolkit for JavaScript and TypeScript. Normalization, detection, digits, diacritics, collation, search, statistics and transliteration.

Zero runtime dependencies. ESM + CJS. Ships its own types.

```bash
npm install urdu-text-utils
```

```ts
import {
  normalizeUrdu,
  isUrdu,
  countWords,
  convertNumbers,
  removeDiacritics,
  sortUrdu,
  searchUrdu,
  analyzeUrdu,
} from "urdu-text-utils";
```

## Why

Urdu breaks the assumptions most JS string code makes:

- The same word has several Unicode spellings. Text from Arabic keyboards, old CMSes or Windows-1256 conversions uses `ك` (U+0643) and `ي` (U+064A) where Urdu uses `ک` (U+06A9) and `ی` (U+06CC). `"کتاب" === "كتاب"` is `false`.
- Diacritics are optional, so `مُحَمَّد` and `محمد` are the same name to a reader and different strings to a computer.
- Urdu has two digit systems, in two different Unicode blocks: `۰-۹` (U+06F0) and Arabic-Indic `٠-٩` (U+0660).
- `localeCompare("ur")` does not give Urdu alphabetical order in most runtimes — it falls back to Arabic root collation, which orders `ک گ ٹ ڈ ڑ ں ے` by codepoint.

## Text normalization

```ts
normalizeUrdu("كيا حال ہے");
// "کیا حال ہے"
```

Folds Arabic letter forms to Urdu ones (`ي ى → ی`, `ك ڪ → ک`, `ه ۀ ة ۃ → ہ`, `أ إ ٱ → ا`), applies NFKC so presentation forms like `ﻻ` become real letters, and strips tatweel, bidi controls and BOM. Letters that are genuinely distinct in Urdu — `آ`, `ھ`, `ے`, `ؤ`, `ئ` — are preserved.

| Option | Default | Effect |
| --- | --- | --- |
| `compatibility` | `true` | NFKC instead of NFC; folds presentation forms |
| `stripDiacritics` | `false` | Remove harakat and quranic marks |
| `stripTatweel` | `true` | Remove kashida padding |
| `stripZwnj` | `false` | Remove U+200C (can be meaningful) |
| `collapseWhitespace` | `true` | Collapse runs, trim |
| `digits` | `"preserve"` | `"urdu"` \| `"english"` \| `"arabic"` |
| `urduPunctuation` | `false` | `, ; ?` → `، ؛ ؟` |

`foldUrdu(text)` returns the aggressive comparison key (normalized + diacritic-free + lowercased) used internally by search and sort.

## Urdu detection

```ts
isUrdu("آپ کیسے ہیں؟"); // true
isUrdu("hello world"); // false
isUrdu("The word پاکستان appears in this English sentence"); // false — ratio based
urduRatio("پاکستان Pakistan"); // 0.47
```

The Arabic script is shared by Urdu, Arabic, Persian and Pashto, so `isUrdu` measures script, not language. When you need to tell Urdu from Arabic:

```ts
hasUrduSpecificLetters("لڑکی"); // true  — ڑ does not exist in Arabic
hasUrduSpecificLetters("كتاب مدرسة"); // false
```

## Word and sentence counting

```ts
countWords("پاکستان ایک خوبصورت ملک ہے"); // 5
countWords("آپ کیسے ہیں؟"); // 3 — attached punctuation is not a word
countSentences("یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔"); // 2
splitWords(text); // string[]
splitSentences(text); // string[]
```

## Urdu numbers

```ts
convertNumbers("12345"); // "۱۲۳۴۵"
convertNumbers("۱۲۳۴۵", "english"); // "12345"

toUrduDigits("١٢٣"); // "۱۲۳" — accepts Arabic-Indic input
toEnglishDigits("۳۱-۱۲-۲۰۲۴"); // "31-12-2024"
toArabicIndicDigits("123"); // "١٢٣"

parseUrduNumber("۱٬۲۳۴"); // 1234 — handles ٬ and ٫
parseUrduNumber("۳٫۱۴"); // 3.14
numberToUrduWords(100000); // "ایک لاکھ" — South Asian scale, @experimental
```

## Diacritics

```ts
removeDiacritics("مُحَمَّد"); // "محمد"
```

Strips harakat (U+064B–U+065F), quranic annotation (U+06D6–U+06ED) and superscript alef. Keeps `۔ ے ۓ`, which are punctuation and letters rather than marks.

## Search

```ts
searchUrdu("محمد", ["مُحَمَّد علی", "احمد", "محمد خان"]);
// ["مُحَمَّد علی", "محمد خان"]
```

Both sides are folded first, so a query typed with Arabic `ك`/`ي` finds Urdu-spelled records and diacritics never block a match.

```ts
searchUrdu("پاکستاں", ["پاکستان"], { fuzzy: true }); // ["پاکستان"] — 1 edit
searchUrdu("محمد", rows, { getText: (r) => r.title, limit: 10 });
searchUrduRanked("محمد", names); // [{ item, score }] — 1 exact, 0.9 prefix, 0.8 substring

highlightUrdu("مُحَمَّد علی", "محمد");
// "<mark>مُحَمَّد</mark> علی" — original diacritics intact
```

Fuzzy matching runs only after the exact pass fails, so the common case stays cheap. `editDistance(a, b, limit)` is exported for your own ranking.

## Sorting

```ts
sortUrdu(["گل", "آم", "بادام"]); // ["آم", "بادام", "گل"]
sortUrdu(["ٹماٹر", "تربوز", "پپیتا"]); // ["پپیتا", "تربوز", "ٹماٹر"]
sortUrdu(rows, { getText: (r) => r.name, descending: true });
compareUrdu(a, b); // comparator for Array.prototype.sort
```

Uses an explicit Urdu alphabet table (`ا آ ب پ ت ٹ ث …`), not `Intl`. Variant letters (`ؤ ئ ۂ ۓ`) sort next to their base letter. Diacritics are ignored.

## Statistics

```ts
analyzeUrdu("پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی زیادہ ہے۔");
// {
//   characters: 49,
//   charactersNoSpaces: 40,
//   words: 10,
//   sentences: 2,
//   paragraphs: 1,
//   urduPercentage: 100,
//   diacritics: 0,
//   digits: 0,
//   averageWordsPerSentence: 5,
//   readingTimeMinutes: 0.1
// }
```

## Transliteration and slugs — `@experimental`

Read this before putting it in front of users.

Urdu script omits short vowels, so the mapping is genuinely ambiguous: `کتب` is `kitab` or `kutub` depending on context and no rule table can decide which. The reverse direction is worse, because Roman Urdu has no standard orthography (`hai` / `hay` / `he` all occur). These functions use a dictionary of common words with a rule fallback — expect roughly 70% word accuracy on ordinary prose, and do not build anything irreversible on the output. A real lexicon plus a statistical model is planned; it is not faked here.

```ts
romanize("آپ کیسے ہیں"); // "aap kaisay hain"
romanize("آپ کیسے ہیں", { capitalize: true }); // "Aap kaisay hain"
romanToUrdu("mera naam zaid hai"); // "میرا نام زید ہے"

urduSlug("میرا پہلا مضمون"); // "mera-pehla-mazmoon"
urduSlug("میرا پہلا مضمون", { separator: "_", maxLength: 40 });
urduSlug("میرا پہلا مضمون", { preserveUrdu: true }); // "میرا-پہلا-مضمون" — lossless
```

For permanent URLs prefer `preserveUrdu: true` (percent-encoded but readable and exact), or store the slug you generate once rather than recomputing it — a dictionary improvement in a later version would otherwise change existing URLs.

## Notes on scope

Every function is pure, synchronous and side-effect free. Nothing here does word segmentation of run-together text, stemming, POS tagging or spell correction; those need a lexicon and are out of scope for this version.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Releasing

Publishing is automated and tag-driven. CI runs tests on Node 18/20/22 for every push and PR; nothing reaches npm until a version tag exists.

```bash
npm version patch   # or minor / major — commits and tags
git push --follow-tags
```

The `Release` workflow then verifies the tag matches `package.json`, re-runs typecheck/tests/build, publishes with `--provenance`, and opens a GitHub Release with generated notes.

Authentication is npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) over OIDC — no npm token exists in this repository and none needs to be rotated. npm trusts `Zaid-maker/urdu-text-utils` publishing from `release.yml` specifically, so renaming that workflow file breaks releases until the trusted publisher is updated on npm.

## License

MIT
