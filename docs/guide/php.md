# PHP

The same toolkit ships as a native PHP package:
[`urdu-text-utils/urdu-text-utils`](https://packagist.org/packages/urdu-text-utils/urdu-text-utils) on Packagist.
Every module of this JavaScript library — normalization, collation,
transliteration, numbers, search, detection, statistics, stop words,
stemming, dates and name transliteration — is ported, with **no required
PHP extensions** (`ext-intl` is used for true Unicode NFKC/NFC when present;
otherwise a generated presentation-form fallback applies).

## Install

::: code-group

```bash [Composer]
composer require urdu-text-utils/urdu-text-utils
```

:::

Requires PHP 8.1 or newer. Zero dependencies beyond PHP itself.

## Use it

```php
use UrduTextUtils\Normalizer;
use UrduTextUtils\Search;
use UrduTextUtils\Collator;
use UrduTextUtils\Words;

Normalizer::normalizeUrdu("كيا حال ہے");
// "کیا حال ہے"

Search::searchUrdu("محمد", ["مُحَمَّد علی", "احمد", "محمد خان"]);
// ["مُحَمَّد علی", "محمد خان"]

Collator::sortUrdu(["گل", "آم", "بادام"]);
// ["آم", "بادام", "گل"]

Words::analyze("پاکستان ایک خوبصورت ملک ہے۔")["words"];
// 5
```

## Module map

Each PHP class mirrors the equivalently named TypeScript module:

| PHP class | TypeScript equivalent | What it covers |
| --- | --- | --- |
| `Normalizer` | `normalize.ts` | Arabic→Urdu letter folding, NFKC, diacritics, tatweel, bidi controls |
| `Detect` | `detect.ts` | `urduRatio`, `isUrdu`, `hasUrduSpecificLetters` |
| `Words` | `stats.ts` | word/sentence tokenization (abbreviation-aware), `analyze` |
| `StopWords` | `stopwords.ts` | 224-word default list, filtering, removal |
| `Numbers` | `numbers.ts` | digit conversion, `parseUrduNumber`, `numberToUrduWords` |
| `Collator` | `collate.ts` | explicit Urdu alphabet collation, `sortUrdu`, `compareUrdu` |
| `Search` | `search.ts` | folding search, fuzzy, ranked results, highlighting |
| `Transliterator` | `transliterate.ts` | `romanize`, `romanToUrdu`, `urduSlug` (`@experimental` parity) |
| `Stemmer` | `stemmer.ts` | affix tables, morphological restoration, `stemText` |
| `Date` | `date.ts` | `formatUrduDate` token engine, `timeAgoUrdu` ladder |
| `Names` | `names.ts` | Urdu ⇄ English name transliteration, name-part extraction |

## Why the output matches, by construction

The PHP port is not a re-implementation from memory — it cannot drift from
this library:

- **One source of truth.** The TypeScript source is canonical. A generator
  script compiles shared tables (letters, dictionary, stop words, stemmer
  affixes, date names, honorifics) into `php/data/tables.json`, which the PHP
  classes read at runtime.
- **Generated fixtures.** `tests/fixtures/*.json` are produced by running the
  real TypeScript build; the PHPUnit suite asserts the PHP output is
  identical, case by case.
- **CI drift gate.** On every push, the `php-parity` job regenerates the
  tables and fixtures and fails if anything differs. The parity suite runs on
  PHP 8.1, 8.2 and 8.3 — with and without `ext-intl`.

The full development workflow lives in
[`php/README.md`](https://github.com/Zaid-maker/urdu-text-utils/blob/main/php/README.md).
