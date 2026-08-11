# Why this exists

Urdu breaks assumptions that ordinary JavaScript string code makes silently. Each of these is a real bug that ships to production regularly.

## The same word has several spellings

Text arriving from Arabic keyboards, Windows-1256 conversions, older CMSes and PDF extraction uses Arabic letter forms where Urdu uses its own:

```ts
"کتاب" === "كتاب"; // false
```

Those two look identical in most fonts. The first uses ک (U+06A9, keheh); the second uses ك (U+0643, Arabic kaf). Same for ی versus ي, and ہ versus ه.

The consequences are quiet: a duplicate row that a unique index did not catch, a search that returns nothing for a term the user can see on screen, a tag cloud with the same tag twice.

[`normalizeUrdu`](/guide/normalization) folds them together.

## Diacritics are optional

`مُحَمَّد` and `محمد` are the same name to a reader and different strings to a computer. Users type both. Names in older records carry marks; names typed on phones usually do not.

[`removeDiacritics`](/guide/normalization) and the diacritic-insensitive [`searchUrdu`](/guide/search) handle it.

## There are two digit systems

Urdu digits `۰۱۲۳۴۵۶۷۸۹` are U+06F0. Arabic-Indic digits `٠١٢٣٤٥٦٧٨٩` are U+0660. They look similar, sit in different blocks, and `Number("۱۲۳")` is `NaN` for both.

[`toEnglishDigits` and `parseUrduNumber`](/guide/numbers) convert and parse.

## Sorting is wrong out of the box

```ts
["گل", "آم", "بادام"].sort();
// ["آم", "بادام", "گل"] — right by luck

["ٹماٹر", "تربوز", "پپیتا"].sort();
// wrong: ٹ sorts by codepoint, far from ت where it belongs
```

`localeCompare("ur")` does not save you either — in most runtimes the `ur` locale falls back to Arabic root collation, which does not know that ٹ follows ت, or that ک comes before گ.

[`sortUrdu`](/guide/sorting) uses an explicit alphabet table.

## Word counting overcounts

Urdu punctuation is its own set — the full stop is ۔ (U+06D4), the question mark is ؟ (U+061F), the comma is ،. Splitting on `/\s+/` leaves `ہے۔` as one token and counts attached punctuation as part of the word; splitting on Latin punctuation misses these entirely.

[`countWords`](/guide/statistics) splits on both.

## What this library is not

It does not do stemming, part-of-speech tagging, spell correction or segmentation of run-together text. Those need a real lexicon and a model. The transliteration that is here is [explicitly marked experimental](/guide/transliteration) for the same reason: Urdu omits short vowels, so the mapping is ambiguous in principle, not just unimplemented.
