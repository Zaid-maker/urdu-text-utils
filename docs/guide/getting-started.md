# Getting started

Install the package, import only the helpers you need, and keep display text
separate from comparison keys. This guide takes a few minutes and works with
Node.js, browser bundlers, and supported runtimes such as Deno and Bun.

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

```html [CDN (Script)]
<!-- Exposes global window.UrduTextUtils -->
<script src="https://cdn.jsdelivr.net/npm/urdu-text-utils/dist/index.iife.js"></script>
```

```html [CDN (ESM)]
<script type="module">
  import { normalizeUrdu } from "https://cdn.jsdelivr.net/npm/urdu-text-utils/+esm";
</script>
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

## Keep source text and comparison keys separate

Normalize equivalent spellings for consistent storage or display, but keep the
original submission if exact text matters. Use `foldUrdu` for a separate search
or deduplication key:

```ts
// docs-check
import { foldUrdu, normalizeUrdu } from "urdu-text-utils";

const rawInput = "كيا حال ہے";
const normalized = normalizeUrdu(rawInput);
const searchKey = foldUrdu(normalized);

if (normalized !== "کیا حال ہے" || searchKey !== foldUrdu("کیا حال ہے")) {
  throw new Error("Arabic and Urdu spellings should share the same search key");
}
```

Apply the same folding rules when creating and querying an index. Normalization
helps align Unicode spellings; it does not replace database constraints,
validation, or a search index.

## Everything is pure

Every export is synchronous, side-effect free and returns a new value. Nothing mutates its arguments, nothing reads globals, nothing touches the network. Safe in a request handler, a worker or a build script.

## PHP too

The whole toolkit is also available as a native PHP package on Packagist — same functions, same output, guaranteed by generated parity fixtures. See [PHP package](/guide/php).
