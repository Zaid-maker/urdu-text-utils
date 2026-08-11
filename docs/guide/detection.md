# Detection

```ts
import { isUrdu, urduRatio, hasUrduSpecificLetters } from "urdu-text-utils";

isUrdu("آپ کیسے ہیں؟"); // true
isUrdu("hello world"); // false
```

## It is a ratio, not a contains-check

```ts
isUrdu("The word پاکستان appears in this English sentence");
// false — only a small share of the letters are Urdu

isUrdu("The word پاکستان appears", { threshold: 0.1 });
// true
```

The default threshold is `0.5`: more than half of the letters must be Arabic-script. Digits, punctuation, spaces and emoji are ignored entirely, so `"12345 !!!"` is not Urdu and not English either — it returns `false`.

```ts
isUrdu(text, {
  threshold: 0.5, // share of letters that must be Arabic-script
  minLetters: 1,  // require at least this many Arabic-script letters
});
```

## Raw ratio

```ts
urduRatio("پاکستان Pakistan"); // 0.47
urduRatio("پاکستان");          // 1
urduRatio("12345");            // 0 — no letters at all
```

Useful for ranking mixed content, or for a "this post looks mostly English" warning in a CMS.

## Urdu versus Arabic

`isUrdu` measures **script**, not language. Arabic, Persian, Pashto, Sindhi and Urdu share the Arabic script, so no ratio can separate them.

What can separate them is the alphabet itself — Urdu has letters Arabic does not:

```ts
hasUrduSpecificLetters("لڑکی");      // true  — ڑ
hasUrduSpecificLetters("پاکستان");   // true  — پ, ک
hasUrduSpecificLetters("كتاب مدرسة"); // false — pure Arabic letters
```

The signals are `ٹ ڈ ڑ ں ے ۓ ہ ھ ک گ چ پ ژ ی`. Note this is shared with Persian for some letters (`پ چ گ ژ`), so a `true` means "not Arabic" rather than "definitely Urdu". Combining it with a short stopword check (`ہے`, `اور`, `کی`) gets you the rest of the way if you need it.

## Try it

<Playground />
