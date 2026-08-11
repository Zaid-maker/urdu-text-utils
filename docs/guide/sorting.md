# Sorting

```ts
import { sortUrdu, compareUrdu } from "urdu-text-utils";

sortUrdu(["گل", "آم", "بادام"]);
// ["آم", "بادام", "گل"]
```

## Why not `Intl`

```ts
["ٹماٹر", "تربوز", "پپیتا"].sort();
// wrong — ٹ (U+0679) sorts nowhere near ت (U+062A)

["ٹماٹر", "تربوز", "پپیتا"].sort((a, b) => a.localeCompare(b, "ur"));
// still wrong in most runtimes
```

The `ur` locale is not implemented as its own collation in most JavaScript engines; it falls back to Arabic root collation. Arabic has no ٹ, ڈ, ڑ, ں, ے, ک or گ in its alphabet, so their relative order is undefined rather than correct.

This library ships the alphabet explicitly:

```
ا آ ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ
ع غ ف ق ک گ ل م ن ں و ہ ھ ء ی ے
```

## Behaviour

```ts
sortUrdu(["گھر", "کتاب"]); // ["کتاب", "گھر"]  — ک before گ
sortUrdu(["ماں", "مان"]);   // ["مان", "ماں"]   — ن before ں
sortUrdu(["کتابیں", "کتاب"]); // ["کتاب", "کتابیں"] — prefix first
```

Diacritics and Unicode variants are folded before comparison, so `مُحَمَّد` sorts exactly where `محمد` would, and Arabic-spelled input sorts with its Urdu equivalent:

```ts
compareUrdu("كتاب", "کتاب"); // 0
```

Variant letters sort next to their base rather than at the end of the alphabet: `ؤ` with `و`, `ئ` with `ی`, `ۂ` with `ہ`, `ۓ` with `ے`. A secondary weight keeps them stable and distinct.

Spaces sort before letters, so `ابو بکر` comes before `ابوبکر`. Characters outside the alphabet — Latin, digits, punctuation — sort after every Urdu letter, ordered by codepoint.

## Options

```ts
sortUrdu(rows, {
  getText: (row) => row.name,
  descending: true,
});
```

`sortUrdu` never mutates its input; it returns a new array. Use `compareUrdu` directly when you need the comparator itself:

```ts
rows.sort((a, b) => compareUrdu(a.name, b.name));
```

## Try it

<Playground />
