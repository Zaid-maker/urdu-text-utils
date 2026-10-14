# Numbers

```ts
import {
  convertNumbers,
  toUrduDigits,
  toEnglishDigits,
  toArabicIndicDigits,
  parseUrduNumber,
  numberToUrduWords,
  formatUrduNumber,
  formatUrduCurrency,
  toUrduOrdinal,
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

## Formatting

`formatUrduNumber` goes the other way, and defaults to the grouping Urdu readers expect: the last three digits form one group and everything above them groups in **pairs**, so `1234567` is `12٬34٬567` — not the western `1,234,567`.

```ts
formatUrduNumber(1234567);                        // "۱۲٬۳۴٬۵۶۷"
formatUrduNumber(12345);                          // "۱۲٬۳۴۵"
formatUrduNumber(1234567, { grouping: "western" }); // "۱٬۲۳۴٬۵۶۷"
formatUrduNumber(1234567, { grouping: "none" });    // "۱۲۳۴۵۶۷"
formatUrduNumber(1234, { digits: "english" });       // "1,234"
formatUrduNumber(3.14159);                           // "۳٫۱۴"
formatUrduNumber(3.14159, { decimals: 3 });          // "۳٫۱۴۲"
formatUrduNumber(-1234);                             // "-۱٬۲۳۴"
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `digits` | `"urdu" \| "english"` | `"urdu"` | Digit block; separators follow it (`٬`/`٫` vs `,`/`.`) |
| `grouping` | `"southAsian" \| "western" \| "none"` | `"southAsian"` | Lakh/crore pairs, thousands, or no separators |
| `decimals` | `number` | `2` | Fraction digits, rounded half-up; trailing zeros dropped |

`NaN` and `Infinity` return `""`, matching `formatUrduDate`.

Very large magnitudes print as digits rather than in exponential notation: `1e21` is `۱٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰۰`, not `۱e+۲۱`. Beyond 2<sup>53</sup> the digits are the shortest decimal that represents the double, so they are the value the number actually holds rather than the one you typed.

::: warning Rounding works on the binary double
`decimals` rounds the value's floating-point representation rather than an exact decimal string, so values that cannot be represented exactly (`2.675`, `1.005`) can round down. Both the JavaScript and PHP implementations do the arithmetic identically, which keeps their output byte-identical. Keep `decimals` at 6 or below for display: asking for 15 digits prints the double's real binary noise.
:::

## Currency

`formatUrduCurrency` formats an amount and picks the right unit for the quantity — `روپیہ` for exactly one, `روپے` for everything else.

```ts
formatUrduCurrency(1500);                        // "۱٬۵۰۰ روپے"
formatUrduCurrency(1);                           // "۱ روپیہ"
formatUrduCurrency(0);                           // "۰ روپے"
formatUrduCurrency(1500, { style: "words" });    // "ایک ہزار پانچ سو روپے"
formatUrduCurrency(21, { style: "words" });      // "اکیس روپے"
formatUrduCurrency(1500, { digits: "english" }); // "1,500 روپے"
formatUrduCurrency(2.5, { unit: "ڈالر", singularUnit: "ڈالر" }); // "۲٫۵ ڈالر"
```

It accepts every `formatUrduNumber` option plus `style`, `unit` and `singularUnit`. The `style: "words"` path spells the amount out and, like `numberToUrduWords`, **throws** on a fractional amount rather than silently dropping the paisa.

## Numbers in words

```ts
numberToUrduWords(5);         // "پانچ"
numberToUrduWords(21);        // "اکیس"
numberToUrduWords(100);       // "ایک سو"
numberToUrduWords(100000);    // "ایک لاکھ"
numberToUrduWords(10000000);  // "ایک کروڑ"
numberToUrduWords(1e9);       // "ایک ارب"
numberToUrduWords(1234567);   // "بارہ لاکھ چونتیس ہزار پانچ سو سڑسٹھ"
numberToUrduWords(-5);        // "منفی پانچ"
```

It uses the South Asian scale — ہزار, لاکھ, کروڑ, ارب, کھرب — rather than thousand/million/billion, which is what Urdu readers expect for prices and populations. Note that `ارب` is 10⁹ and `کھرب` is 10¹¹: the steps below `کروڑ` are two orders of magnitude, not three.

Every cardinal from 0 to 99 is a real word. Urdu does not compose them, so `21` is `اکیس`, not `بیس ایک`.

::: warning Experimental
The 21–99 words are transcribed from standard textbook forms. A few have recognised variant spellings (`26` also appears as `چھببیس`, `92` as `بیانوے`); this library prints one canonical set and does not yet accept variants on input. Output is exact up to 10¹⁵, beyond which JavaScript's own number representation loses precision.
:::

## Ordinals

```ts
toUrduOrdinal(1);                          // "پہلا"
toUrduOrdinal(1, { gender: "feminine" });   // "پہلی"
toUrduOrdinal(6);                          // "چھٹا" — irregular
toUrduOrdinal(9);                          // "نواں" — final و contracts
toUrduOrdinal(21);                         // "اکیسواں"
toUrduOrdinal(100);                        // "سواں"
toUrduOrdinal(1000);                       // "ہزارواں"
toUrduOrdinal(1100);                       // "ایک ہزار ایک سواں"
```

Urdu ordinals inflect for gender, which is why `gender` exists. 1–6 are irregular and come from a table; everything else attaches `واں` (masculine) or `ویں` (feminine) to the **last** word of the cardinal. Two details follow from that:

- A word-final `و` contracts instead of doubling, so `نو` becomes `نواں` and `سو` becomes `سواں`.
- An exact scale value drops its `ایک`: 100th is `سواں`, not `ایک سواں`. A compound keeps it — 1100th is `ایک ہزار ایک سواں`.

`toUrduOrdinal(0)` returns `صفر`, since "zeroth" has no Urdu ordinal form. Like `numberToUrduWords`, it throws `TypeError` on a fraction and returns `""` for non-finite input.

## Try it

<Playground />
