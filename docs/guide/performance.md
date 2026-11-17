# Performance Benchmarks

`urdu-text-utils` is designed to be fast, lightweight, and zero-dependency. All functions are pure, synchronous, and side-effect free.

## Benchmark Results

These are indicative results from one local run on Node.js 22 (AMD Ryzen 5,
16GB RAM), not performance guarantees. The script warms each operation with 100
calls, then times 1,000 calls once; results vary with hardware, runtime, input
and system load. Higher ops/sec is better.

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

1. **Fastest functions** — `removeDiacritics`, `convertNumbers`, and `romanToUrdu` are the fastest in these measurements. Actual throughput depends on input and runtime.

2. **Normalization** — The short-string result may be adequate for per-keystroke UI use, but profile with representative input and devices.

3. **Search** — Fuzzy search is slower than exact search in this benchmark. For larger corpora, consider building an index with `foldUrdu` keys.

4. **Transliteration** — Costs vary by input; benchmark representative phrases if transliteration is on a performance-critical path.

5. **Zero runtime dependencies** — The package does not add third-party runtime dependencies.

## Bundle Size

Approximate sizes for the complete package entry points after minification and
gzip compression. Your application bundle may be smaller when a bundler removes
unused exports; results also depend on tool and compression versions.

| Format | Size (minified) | Size (min + gzip) |
|--------|-----------------|-------------------|
| ESM | 147 KB | 38 KB |
| CJS | 152 KB | 39 KB |
| IIFE | 147 KB | 38 KB |

## Running Benchmarks

To run benchmarks yourself:

```bash
npm run build
node bench.mjs
```

The benchmark script is in the repository root and reads the built package from
`dist/`. Results will vary based on your hardware and Node.js version.
