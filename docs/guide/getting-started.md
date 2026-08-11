# Getting started

## Install

::: code-group

```bash [npm]
npm install urdu-text-utils
```

```bash [pnpm]
pnpm add urdu-text-utils
```

```bash [yarn]
yarn add urdu-text-utils
```

```bash [bun]
bun add urdu-text-utils
```

:::

Node 18 or newer. No runtime dependencies.

## Use it

```ts
import { normalizeUrdu, searchUrdu, sortUrdu, analyzeUrdu } from "urdu-text-utils";

normalizeUrdu("كيا حال ہے");
// "کیا حال ہے"

searchUrdu("محمد", ["مُحَمَّد علی", "احمد", "محمد خان"]);
// ["مُحَمَّد علی", "محمد خان"]

sortUrdu(["گل", "آم", "بادام"]);
// ["آم", "بادام", "گل"]

analyzeUrdu("پاکستان ایک خوبصورت ملک ہے۔").words;
// 5
```

CommonJS works too:

```js
const { normalizeUrdu } = require("urdu-text-utils");
```

## Where each function fits

| You are building | Reach for |
| --- | --- |
| A search box over Urdu records | [`searchUrdu`](/guide/search), [`highlightUrdu`](/guide/search) |
| An A-Z index or a sorted dropdown | [`sortUrdu`](/guide/sorting) |
| Storage or deduplication of user input | [`normalizeUrdu`](/guide/normalization) |
| A word-count or reading-time widget | [`analyzeUrdu`](/guide/statistics) |
| Dates, prices, phone numbers | [`toUrduDigits`, `parseUrduNumber`](/guide/numbers) |
| URL slugs for Urdu article titles | [`urduSlug`](/guide/transliteration) |
| Filtering out non-Urdu submissions | [`isUrdu`](/guide/detection) |

## One rule worth adopting early

Normalize on the way in, not on the way out.

```ts
// When a record is created or updated
const stored = normalizeUrdu(userInput);

// Index this alongside it for search and dedupe
const key = foldUrdu(userInput);
```

Storing raw input and normalizing at query time means every comparison, every unique constraint and every `GROUP BY` sees a different spelling of the same word. Normalizing at write time makes the problem disappear once.

## Everything is pure

Every export is synchronous, side-effect free and returns a new value. Nothing mutates its arguments, nothing reads globals, nothing touches the network. Safe in a request handler, a worker or a build script.
