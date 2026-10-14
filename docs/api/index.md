# API reference

Every export is pure, synchronous and side-effect free. Nothing mutates its arguments.

```ts
import { /* … */ } from "urdu-text-utils";
```

## Normalization

### `normalizeUrdu(input, options?)`

Folds Arabic letter forms to Urdu, applies NFKC, strips tatweel and invisible controls, collapses whitespace. Returns `string`.

```ts
normalizeUrdu("كيا حال ہے"); // "کیا حال ہے"
```

| Option | Type | Default |
| --- | --- | --- |
| `compatibility` | `boolean` | `true` |
| `stripDiacritics` | `boolean` | `false` |
| `stripTatweel` | `boolean` | `true` |
| `stripZwnj` | `boolean` | `false` |
| `collapseWhitespace` | `boolean` | `true` |
| `digits` | `"urdu" \| "english" \| "arabic" \| "preserve"` | `"preserve"` |
| `urduPunctuation` | `boolean` | `false` |

### `removeDiacritics(input)`

Strips harakat, quranic annotation and superscript alef. Keeps `۔ ے ۓ`. Returns `string`.

### `foldUrdu(input)`

Normalized + diacritic-free + lowercased comparison key. Returns `string`. Used internally by search and sort.

## Detection

### `isUrdu(input, options?)`

Returns `boolean`. Options: `threshold` (default `0.5`), `minLetters` (default `1`).

### `urduRatio(input)`

Share of Arabic-script letters among all letters, `0`–`1`. Returns `0` when there are no letters.

### `hasUrduSpecificLetters(input)`

`true` when the text contains a letter Arabic does not use (`ٹ ڈ ڑ ں ے ک گ چ پ ژ ی ہ ھ`). Returns `boolean`.

## Numbers

### `convertNumbers(input, to?)`

Rewrites every digit. `to` is `"urdu"` (default), `"english"` or `"arabic"`. Returns `string`.

### `toUrduDigits(input)` · `toEnglishDigits(input)` · `toArabicIndicDigits(input)`

Typed shorthands for the above. Accept all three digit systems as input.

### `parseUrduNumber(input)`

Parses Urdu or Arabic-Indic digits, including `٫` decimal and `٬` thousands separators. Returns `number`, or `NaN`.

### `numberToUrduWords(value)` <Badge type="warning" text="experimental" />

Spells a whole number using the South Asian scale (ہزار, لاکھ, کروڑ, ارب, کھرب). Every cardinal from 0 to 99 is a real word — `21` is `اکیس`, not `بیس ایک`. Throws `TypeError` on a non-integer. Returns `string`.

### `formatUrduNumber(value, options?)`

Formats a number with South Asian digit grouping and Urdu digits by default. Returns `string`, or `""` for `NaN`/`Infinity`. Large magnitudes print as digits, never in exponential notation (`1e21` is `۱٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰۰`).

```ts
formatUrduNumber(1234567);                          // "۱۲٬۳۴٬۵۶۷"
formatUrduNumber(1234567, { grouping: "western" });  // "۱٬۲۳۴٬۵۶۷"
formatUrduNumber(1234, { digits: "english" });       // "1,234"
```

| Option | Type | Default |
| --- | --- | --- |
| `digits` | `"urdu" \| "english"` | `"urdu"` |
| `grouping` | `"southAsian" \| "western" \| "none"` | `"southAsian"` |
| `decimals` | `number` | `2` |

### `formatUrduCurrency(value, options?)`

Formats an amount with `روپیہ` for exactly one and `روپے` otherwise, or spells it out with `style: "words"`. Accepts every `formatUrduNumber` option plus `style`, `unit` and `singularUnit`. `style: "words"` throws `TypeError` on a fractional amount.

```ts
formatUrduCurrency(1500);                     // "۱٬۵۰۰ روپے"
formatUrduCurrency(1);                        // "۱ روپیہ"
formatUrduCurrency(1500, { style: "words" }); // "ایک ہزار پانچ سو روپے"
```

### `toUrduOrdinal(value, options?)` <Badge type="warning" text="experimental" />

Spells an ordinal, inflecting for `gender` (`"masculine"` by default). 1–6 are irregular (`پہلا`, `چھٹا`); larger ordinals suffix the last word of the cardinal, with a final `و` contracting (`نواں`, `سواں`). Throws `TypeError` on a non-integer.

```ts
toUrduOrdinal(1);                        // "پہلا"
toUrduOrdinal(1, { gender: "feminine" }); // "پہلی"
toUrduOrdinal(100);                      // "سواں"
```

### Constants

- `URDU_ONES`, `URDU_TEENS_AND_TENS`, `URDU_TENS_UNITS`: the cardinal word tables.
- `URDU_SCALES`: the South Asian scale pairs, largest first.
- `URDU_ORDINAL_IRREGULARS`: the 1–6 ordinal forms in both genders.

## Statistics & Tokenization

### `countWords(input)` · `countSentences(input, options?)`

Return `number`. Split on Urdu punctuation as well as ASCII, while protecting abbreviations and numbers.

### `splitWords(input)` · `splitSentences(input, options?)`

Return `string[]`.

`splitSentences` accepts `options`:
- `preserveTerminators` (`boolean`, default `false`): preserves sentence-ending punctuation (۔ ؟ ! . …) with each sentence.

### `analyzeUrdu(input)`

Returns `UrduStats`:

| Field | Type |
| --- | --- |
| `characters` | `number` |
| `charactersNoSpaces` | `number` |
| `words` | `number` |
| `sentences` | `number` |
| `paragraphs` | `number` |
| `urduPercentage` | `number` (0–100) |
| `diacritics` | `number` |
| `digits` | `number` |
| `averageWordsPerSentence` | `number` |
| `readingTimeMinutes` | `number` |

## Stop words

### `isStopWord(word, customStopWords?)`

Checks if a word is in the Urdu stop words dictionary (or a custom list). Returns `boolean`.

```ts
isStopWord("اور"); // true
isStopWord("کتاب"); // false
```

### `filterStopWords(words, customStopWords?)`

Filters stop words out of an array of tokens. Returns `string[]`.

```ts
filterStopWords(["یہ", "ایک", "بہترین", "کتاب", "ہے"]);
// ["بہترین", "کتاب"]
```

### `removeStopWords(text, customStopWords?)`

Removes stop words from an Urdu text string. Returns `string`.

```ts
removeStopWords("پاکستان ایک خوبصورت ملک ہے");
// "پاکستان خوبصورت ملک"
```

### `URDU_STOP_WORDS`

Canonical `Set<string>` containing high-frequency Urdu functional words, pronouns, postpositions, auxiliaries, and conjunctions.

## Sorting

### `sortUrdu(items, options?)`

Returns a new sorted array. Options: `descending` (default `false`), `getText` for objects.

### `compareUrdu(a, b)`

Comparator for `Array.prototype.sort`. Returns `number`.

## Search

### `searchUrdu(query, items, options?)`

Diacritic-insensitive search. Returns the matching items.

| Option | Type | Default |
| --- | --- | --- |
| `getText` | `(item: T) => string` | `String(item)` |
| `fuzzy` | `boolean` | `false` |
| `maxDistance` | `number` | `1` |
| `limit` | `number` | — |
| `sortByScore` | `boolean` | `true` |

### `searchUrduRanked(query, items, options?)`

Same, but returns `Array<{ item, score }>`. Score: `1` exact, `0.9` prefix, `0.8` substring, below `0.7` fuzzy.

### `highlightUrdu(text, query, wrap?)`

Wraps matches while preserving the original spelling and diacritics. `wrap` defaults to `(m) => \`<mark>${m}</mark>\``. Returns `string`.

### `editDistance(a, b, limit?)`

Levenshtein distance with early exit past `limit`. Returns `number`.

## Transliteration

### `romanize(input, options?)` <Badge type="warning" text="experimental" />

Urdu script to Roman Urdu. Option: `capitalize` (default `false`). Returns `string`.

### `romanToUrdu(input)` <Badge type="warning" text="experimental" />

Roman Urdu to Urdu script. Returns `string`.

### `urduSlug(input, options?)` <Badge type="warning" text="experimental" />

URL slug from an Urdu title.

| Option | Type | Default |
| --- | --- | --- |
| `separator` | `string` | `"-"` |
| `maxLength` | `number` | — |
| `preserveUrdu` | `boolean` | `false` |

`preserveUrdu: true` is lossless and stable across versions. See [the caveats](/guide/transliteration#which-mode-for-permanent-urls).

## Date & Time

### `formatUrduDate(date, pattern?, options?)`

Formats any `Date`, string timestamp, or numeric timestamp into an Urdu formatted string.

```ts
formatUrduDate(new Date(2026, 7, 22), "DD MMMM YYYY");
// "۲۲ اگست ۲۰۲۶"

formatUrduDate(new Date(2026, 7, 22, 14, 30), "dddd، D MMMM YYYY، hh:mm A");
// "ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"
```

| Option | Type | Default |
| --- | --- | --- |
| `digits` | `"urdu" \| "english"` | `"urdu"` |
| `calendar` | `"gregorian" \| "hijri"` | `"gregorian"` |

### `parseUrduDate(input, options?)`

The inverse of `formatUrduDate`: parses Urdu or English month names, Urdu/Arabic-Indic/ASCII digits, day-first numeric dates, ISO dates and optional day-period times into a `Date`, or `null`.

```ts
parseUrduDate("۲۲ اگست ۲۰۲۶");                        // Date(2026, 7, 22)
parseUrduDate("22 August 2026");
parseUrduDate("۲۲/۰۸/۲۰۲۶");                          // day-first
parseUrduDate("2026-08-22T14:30");
parseUrduDate("ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر");    // 14:30
parseUrduDate("5 جنوری", { defaultYear: 1999 });
```

| Option | Type | Default |
| --- | --- | --- |
| `defaultYear` | `number` | current year |

Returns `null` for absolute instants (a `Z` or numeric offset), Hijri month names, and dates that do not exist (`۳۱ فروری`). See [the dates guide](/guide/date-time) for why.

### `timeAgoUrdu(date, relativeTo?, options?)`

Returns localized relative time in Urdu (e.g. *"ابھی"*, *"۵ منٹ پہلے"*, *"۳ گھنٹے پہلے"*, *"کل"*, *"پرسوں"*, *"۲ ہفتے بعد"*).

```ts
timeAgoUrdu(Date.now() - 5 * 60 * 1000); // "۵ منٹ پہلے"
timeAgoUrdu(Date.now() + 10 * 60 * 1000); // "۱۰ منٹ بعد"
```

### `getUrduMonthName(monthIndex, calendar?)` · `getUrduWeekdayName(dayIndex)`

Returns month name or weekday name in Urdu.

### Constants

- `URDU_MONTHS_GREGORIAN`: Array of 12 Gregorian month names in Urdu (`جنوری` to `دسمبر`).
- `URDU_MONTHS_HIJRI`: Array of 12 Islamic (Hijri) month names in Urdu (`محرم` to `ذی الحجہ`).
- `URDU_WEEKDAYS`: Array of 7 day names in Urdu (`اتوار` to `ہفتہ`).

## Stemmer

### `stemUrdu(word, options?)`

Reduces an Urdu word to its morphological root/stem by stripping prefixes, suffixes, plurals, and tense markers with morphological restoration rules.

```ts
stemUrdu("کتابیں");   // "کتاب"
stemUrdu("لڑکیاں");   // "لڑکی" (restores final ی)
stemUrdu("دعاؤں");    // "دعا"
stemUrdu("بےوقوف");   // "وقوف"
stemUrdu("نااہل");    // "اہل"
stemUrdu("دکاندار");  // "دکان"
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `stripPrefixes` | `boolean` | `true` | Whether to strip prefixes (e.g. بے-, نا-) |
| `stripSuffixes` | `boolean` | `true` | Whether to strip suffixes (e.g. -وں, -یں) |
| `minStemLength` | `number` | `2` | Minimum character length of the remaining stem |
| `customPrefixes` | `string[]` | — | Custom prefixes list |
| `customSuffixes` | `string[]` | — | Custom suffixes list |
| `exceptions` | `Record<string, string>` | — | Word-to-stem overrides |

### `stemUrduText(text, options?)`

Stems all words within a block of text, preserving layout, punctuation, and whitespace.

```ts
stemUrduText("طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔");
// "طلباء کتاب پڑھ ہیں اور کہانی سن ہیں۔"
```

### `getAffixes(word, options?)`

Breaks a word into `{ prefix, stem, suffix }`.

```ts
getAffixes("بےوقوف"); // { prefix: "بے", stem: "وقوف", suffix: undefined }
getAffixes("کتابیں"); // { prefix: undefined, stem: "کتاب", suffix: "یں" }
```

### Constants

- `URDU_PREFIXES`: Canonical list of Urdu prefixes (`غیر`, `خود`, `اہل`, `بے`, `نا`, `لا`, `بد`, `کم`, `ان`, `ہم`, `با`, `پُر`).
- `URDU_SUFFIXES`: Canonical list of Urdu suffixes and inflections.

## Types

```ts
import type {
  NormalizeOptions,
  IsUrduOptions,
  DigitStyle,
  UrduStats,
  SplitSentenceOptions,
  SortOptions,
  SearchOptions,
  SearchResult,
  SlugOptions,
  FormatUrduDateOptions,
  TimeAgoOptions,
  StemmerOptions,
  AffixBreakdown,
} from "urdu-text-utils";
```
