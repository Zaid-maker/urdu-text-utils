# Numbers

```ts
import {
  convertNumbers,
  toUrduDigits,
  toEnglishDigits,
  toArabicIndicDigits,
  parseUrduNumber,
  numberToUrduWords,
} from "urdu-text-utils";
```

## Two digit systems, not one

| System | Digits | Block |
| --- | --- | --- |
| Urdu / extended Arabic-Indic | `۰۱۲۳۴۵۶۷۸۹` | U+06F0 |
| Arabic-Indic | `٠١٢٣٤٥٦٧٨٩` | U+0660 |
| ASCII | `0123456789` | U+0030 |

Urdu content uses the first. Content copied from Arabic sources uses the second. They render similarly and compare as completely different characters, so a phone number or an invoice total can arrive in either.

Every function here accepts all three as input.

## Converting

```ts
convertNumbers("12345");            // "۱۲۳۴۵"
convertNumbers("۱۲۳۴۵", "english"); // "12345"

toUrduDigits("١٢٣");        // "۱۲۳" — Arabic-Indic in, Urdu out
toEnglishDigits("۳۱-۱۲-۲۰۲۴"); // "31-12-2024"
toArabicIndicDigits("123"); // "١٢٣"
```

Non-digits pass through untouched, so it is safe on whole sentences:

```ts
toUrduDigits("سال 2024ء میں"); // "سال ۲۰۲۴ء میں"
```

Prefer the named functions over `convertNumbers(text, style)` in new code — they are typed without a magic string and tree-shake individually.

## Parsing

`Number("۱۲۳")` is `NaN`. Use:

```ts
parseUrduNumber("۱۲۳۴۵"); // 12345
parseUrduNumber("۱٬۲۳۴");  // 1234 — ٬ is the thousands separator
parseUrduNumber("۳٫۱۴");   // 3.14 — ٫ is the decimal separator
parseUrduNumber("پاکستان"); // NaN
```

Note `٫` (U+066B) and `٬` (U+066C) are not the ASCII `.` and `,`. Both are handled, along with ASCII separators and surrounding whitespace.

## Numbers in words

```ts
numberToUrduWords(5);        // "پانچ"
numberToUrduWords(100);      // "ایک سو"
numberToUrduWords(100000);   // "ایک لاکھ"
numberToUrduWords(10000000); // "ایک کروڑ"
numberToUrduWords(-5);       // "منفی پانچ"
```

It uses the South Asian scale — ہزار, لاکھ, کروڑ, ارب — rather than thousand/million/billion, which is what Urdu readers expect for prices and populations.

::: warning Experimental
Compound numbers between 21 and 99 are irregular in Urdu (`اکیس`, `بیالیس`, `چھیاسٹھ` are not composed from their parts). Multiples of ten and the teens are correct; other values fall back to a composed form that reads awkwardly. Fine for approximate labels, not for legal or financial text.
:::

## Try it

<Playground />
