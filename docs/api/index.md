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

Spells a whole number using the South Asian scale (ہزار, لاکھ, کروڑ). Throws `TypeError` on a non-integer. Returns `string`.

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

## Types

```ts
import type {
  NormalizeOptions,
  IsUrduOptions,
  DigitStyle,
  UrduStats,
  SortOptions,
  SearchOptions,
  SearchResult,
  SlugOptions,
} from "urdu-text-utils";
```
