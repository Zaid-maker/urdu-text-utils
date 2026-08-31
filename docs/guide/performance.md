# Performance Benchmarks

`urdu-text-utils` is designed to be fast, lightweight, and zero-dependency. All functions are pure, synchronous, and side-effect free.

## Benchmark Results

Measured on Node.js 22 (AMD Ryzen 5, 16GB RAM). Higher ops/sec is better.

### Normalization

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `normalizeUrdu` | Short (10 chars) | 81,000+ | 0.012 ms |
| `normalizeUrdu` | Medium (100 chars) | 21,000+ | 0.046 ms |
| `normalizeUrdu` | Long (500 chars) | 4,400+ | 0.225 ms |
| `removeDiacritics` | Short | 1,870,000+ | 0.001 ms |
| `removeDiacritics` | With diacritics | 365,000+ | 0.003 ms |
| `foldUrdu` | Short | 81,000+ | 0.012 ms |

### Transliteration

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `romanize` | Short (10 chars) | 60,000+ | 0.017 ms |
| `romanize` | Medium (100 chars) | 7,800+ | 0.128 ms |
| `romanToUrdu` | Single word | 436,000+ | 0.002 ms |
| `romanToUrdu` | Medium phrase | 43,000+ | 0.023 ms |

### Search

| Function | Corpus Size | Ops/sec | Time/op |
|----------|-------------|---------|---------|
| `searchUrdu` (exact) | 100 items | 600+ | 1.667 ms |
| `searchUrdu` (fuzzy) | 100 items | 355+ | 2.815 ms |

### Sorting

| Function | Items | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `sortUrdu` | 20 words | 2,700+ | 0.365 ms |

### Statistics

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `countWords` | Medium | 108,000+ | 0.009 ms |
| `countSentences` | Medium | 111,000+ | 0.009 ms |
| `analyzeUrdu` | Medium | 17,600+ | 0.057 ms |
| `splitWords` | Medium | 109,000+ | 0.009 ms |
| `splitSentences` | Medium | 137,000+ | 0.007 ms |

### Detection

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `isUrdu` | Medium | 39,000+ | 0.025 ms |
| `urduRatio` | Medium | 41,000+ | 0.024 ms |

### Numbers & Stemming

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `convertNumbers` | Short | 537,000+ | 0.002 ms |
| `stemUrdu` | Single word | 132,000+ | 0.008 ms |
| `stemUrduText` | Medium | 9,500+ | 0.105 ms |

### Date & Time

| Function | Input | Ops/sec | Time/op |
|----------|-------|---------|---------|
| `formatUrduDate` | Current date | 152,000+ | 0.007 ms |
| `timeAgoUrdu` | 2 hours ago | 376,000+ | 0.003 ms |

## Key Takeaways

1. **Fastest functions** — `removeDiacritics`, `convertNumbers`, and `romanToUrdu` run at 400K–1.8M ops/sec. These are essentially regex-based and have negligible overhead.

2. **Normalization** — Handles 80K+ short strings/sec, which is well above typical UI requirements (even for real-time search as the user types).

3. **Search** — Exact search over 100 items completes in ~1.7ms; fuzzy search adds ~1ms for edit distance calculation. For larger corpora, consider building an index with `foldUrdu` keys.

4. **Transliteration** — Dictionary lookups are near-instant (436K ops/sec). Rule-based fallback adds ~0.1ms per word, which is imperceptible in UI contexts.

5. **Zero dependencies** — No external libraries means smaller bundle size and no transitive dependency overhead.

## Bundle Size

| Format | Size (minified) | Size (min + gzip) |
|--------|-----------------|-------------------|
| ESM | 162 KB | ~11 KB |
| CJS | 163 KB | ~11 KB |
| IIFE | 128 KB | ~11 KB |

## Running Benchmarks

To run benchmarks yourself:

```bash
npx tsx bench.mjs
```

The benchmark script is in the repository root. Results will vary based on your hardware and Node.js version.
