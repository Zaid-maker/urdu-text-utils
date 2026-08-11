# Search

```ts
import { searchUrdu, searchUrduRanked, highlightUrdu, editDistance } from "urdu-text-utils";

searchUrdu("محمد", ["مُحَمَّد علی", "احمد", "محمد خان"]);
// ["مُحَمَّد علی", "محمد خان"]
```

## Why a plain `includes()` fails

Users do not type the spelling you stored. They omit diacritics, or their keyboard produces Arabic `ك` and `ي`. Both sides are folded with [`foldUrdu`](/guide/normalization) before comparison, so all of these match the same record:

| Query | Matches `مُحَمَّد علی` |
| --- | --- |
| `محمد` | yes — diacritics ignored |
| `مُحَمَّد` | yes |
| `محمد` typed with Arabic ه/ي | yes — letter forms folded |

## Objects and limits

```ts
searchUrdu("محمد", rows, {
  getText: (row) => row.title,
  limit: 10,
});
```

## Ranked results

```ts
searchUrduRanked("محمد", ["محمد خان", "محمد"]);
// [{ item: "محمد", score: 1 }, { item: "محمد خان", score: 0.8 }]
```

| Score | Meaning |
| --- | --- |
| `1` | Exact match after folding |
| `0.9` | Prefix match |
| `0.8` | Substring match |
| `< 0.7` | Fuzzy word match, scaled by how many query words hit |

Results are sorted best-first by default. Pass `sortByScore: false` to keep input order.

## Fuzzy matching

```ts
searchUrdu("پاکستاں", ["پاکستان"]);                 // [] — ں is not ن
searchUrdu("پاکستاں", ["پاکستان"], { fuzzy: true }); // ["پاکستان"]
```

Fuzzy runs **only after** the exact pass finds nothing, so the common case costs no extra work. The allowed edit distance scales with word length — roughly one edit per three characters, capped by `maxDistance` (default `1`).

`editDistance(a, b, limit)` is exported if you want to build your own ranking. It exits early once the limit is exceeded, so it is safe in a loop over many candidates.

## Highlighting

```ts
highlightUrdu("مُحَمَّد علی", "محمد");
// "<mark>مُحَمَّد</mark> علی"
```

The match is found on the folded text, but the returned string is the **original** — diacritics and all. Offsets are mapped back to the source, so nothing is normalized away in what the user sees.

Custom wrapper:

```ts
highlightUrdu(text, query, (match) => `<em class="hit">${match}</em>`);
```

Multi-word queries work across spaces:

```ts
highlightUrdu("محمد خان صاحب", "محمد خان");
// "<mark>محمد خان</mark> صاحب"
```

::: tip Server-side search
For a database, index `foldUrdu(text)` in a separate column and query against that. This library gives you the same folding in JS that your indexer used, so client and server agree.
:::

## Try it

<Playground />
