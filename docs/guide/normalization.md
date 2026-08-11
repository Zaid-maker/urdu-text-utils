# Normalization

```ts
import { normalizeUrdu, removeDiacritics, foldUrdu } from "urdu-text-utils";

normalizeUrdu("كيا حال ہے");
// "کیا حال ہے"
```

## What it changes

| Input | Output | Why |
| --- | --- | --- |
| `ي` U+064A, `ى` U+0649 | `ی` U+06CC | Urdu uses farsi yeh |
| `ك` U+0643, `ڪ` | `ک` U+06A9 | Urdu uses keheh |
| `ه` U+0647, `ۀ`, `ة`, `ۃ`, `ە` | `ہ` U+06C1 | Urdu uses heh goal |
| `أ` `إ` `ٱ` `ٲ` `ٳ` | `ا` | Hamza carriers collapse to plain alef |
| `ۆ` `ۇ` `ۋ` | `و` | Non-Urdu waw variants |
| `ﻻ` `ﮐ` and other presentation forms | `لا` `ک` | NFKC |
| Tatweel `ـ` | removed | Display padding, never meaning |
| BOM, bidi controls, ZWJ | removed | Invisible, breaks comparisons |

Letters that are genuinely distinct in Urdu are **preserved**: `آ` (alef madda), `ھ` (do-chashmi heh — `بھ` is not `بہ`), `ے` (bari ye), `ؤ`, `ئ`, `ۓ`.

::: warning A common mistake
Several Urdu snippets on the web map `ہ → ه`, i.e. Urdu heh goal to Arabic heh. That is backwards and will corrupt correctly-spelled text. This library maps toward the Urdu forms.
:::

## Options

```ts
normalizeUrdu(text, {
  compatibility: true,      // NFKC; folds presentation forms
  stripDiacritics: false,   // remove harakat and quranic marks
  stripTatweel: true,       // remove kashida padding
  stripZwnj: false,         // U+200C can be meaningful, so off by default
  collapseWhitespace: true, // collapse runs, trim
  digits: "preserve",       // "urdu" | "english" | "arabic"
  urduPunctuation: false,   // , ; ? → ، ؛ ؟
});
```

```ts
normalizeUrdu("سال 2024", { digits: "urdu" });
// "سال ۲۰۲۴"

normalizeUrdu("کیا?", { urduPunctuation: true });
// "کیا؟"

normalizeUrdu("  کیا   حال  ", { collapseWhitespace: false });
// "  کیا   حال  "
```

## Diacritics

```ts
removeDiacritics("مُحَمَّد");
// "محمد"
```

Strips harakat (U+064B–U+065F), quranic annotation marks (U+06D6–U+06ED), the honorific marks (U+0610–U+061A) and superscript alef (U+0670).

It deliberately keeps `۔` (U+06D4), `ے` (U+06D2) and `ۓ` (U+06D3), which sit near those ranges but are punctuation and letters. A hand-rolled regex like `/[ً-ۭ]/g` deletes them and quietly destroys your text.

## foldUrdu

```ts
foldUrdu("مُحَمَّد") === foldUrdu("محمد"); // true
foldUrdu("كيا") === foldUrdu("کیا"); // true
```

The comparison key: normalized, diacritic-free, ZWNJ-free, lowercased. [`searchUrdu`](/guide/search) and [`sortUrdu`](/guide/sorting) both run on it, so matching and ordering agree with each other by construction.

Store it next to your records and you get a working unique constraint and a working search index at the same time.

## Try it

<Playground />
