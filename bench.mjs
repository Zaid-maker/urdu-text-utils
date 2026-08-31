import {
  normalizeUrdu,
  removeDiacritics,
  foldUrdu,
  romanize,
  romanToUrdu,
  searchUrdu,
  sortUrdu,
  countWords,
  countSentences,
  analyzeUrdu,
  isUrdu,
  urduRatio,
  convertNumbers,
  stemUrdu,
  stemUrduText,
  formatUrduDate,
  timeAgoUrdu,
  splitWords,
  splitSentences,
} from "./src/index.ts";

// Test data
const shortText = "پاکستان ایک خوبصورت ملک ہے۔";
const mediumText =
  "پاکستان جنوبی ایشیا میں واقع ایک خوبصورت ملک ہے۔ اس کی آبادی دو کروڑ سے زیادہ ہے۔ یہ مکمل طور پر جمہوریت پر مبنی حکومت ہے۔ اسلام آباد اس کا دارالحکومت ہے جبکہ کراچی سب سے بڑا شہر ہے۔";
const longText = mediumText.repeat(5);
const diacriticText = "مُحَمَّد ﷺ نے فرمایا: اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ";

const urduWords = [
  "کتاب", "قلم", "گھر", " پانی", " دودھ", " دہی", " دھنیا",
  " کراچی", " لاہور", " پشاور", "کراچی", "لاہور", " پشاور",
  "اسلام آباد", "کراچی", "لاہور", " پشاور", "اسلام آباد", " کراچی", " لاہور",
];

const searchCorpus = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  title: ` Article ${i}: ${mediumText.slice(0, 50)}`,
}));

// Benchmark helper
function benchmark(name, fn, iterations = 1000) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const end = performance.now();
  const totalMs = end - start;
  const perOp = totalMs / iterations;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);

  return { name, totalMs: +totalMs.toFixed(1), perOp: +perOp.toFixed(3), opsPerSec };
}

const results = [];

// Normalization
results.push(benchmark("normalizeUrdu (short)", () => normalizeUrdu(shortText)));
results.push(benchmark("normalizeUrdu (medium)", () => normalizeUrdu(mediumText)));
results.push(benchmark("normalizeUrdu (long)", () => normalizeUrdu(longText)));
results.push(benchmark("removeDiacritics (short)", () => removeDiacritics(shortText)));
results.push(benchmark("removeDiacritics (diacritics)", () => removeDiacritics(diacriticText)));
results.push(benchmark("foldUrdu (short)", () => foldUrdu(shortText)));

// Transliteration
results.push(benchmark("romanize (short)", () => romanize(shortText)));
results.push(benchmark("romanize (medium)", () => romanize(mediumText)));
results.push(benchmark("romanToUrdu (short)", () => romanToUrdu("pakistan")));
results.push(benchmark("romanToUrdu (medium)", () => romanToUrdu("pakistan ek khoobsurat mulk hai")));

// Search
results.push(benchmark("searchUrdu (100 items, exact)", () => searchUrdu("کراچی", searchCorpus, { getText: (r) => r.title, limit: 10 })));
results.push(benchmark("searchUrdu (100 items, fuzzy)", () => searchUrdu("کراچی", searchCorpus, { getText: (r) => r.title, fuzzy: true, limit: 10 })));

// Sorting
results.push(benchmark("sortUrdu (20 words)", () => sortUrdu([...urduWords])));

// Stats
results.push(benchmark("countWords (medium)", () => countWords(mediumText)));
results.push(benchmark("countSentences (medium)", () => countSentences(mediumText)));
results.push(benchmark("analyzeUrdu (medium)", () => analyzeUrdu(mediumText)));
results.push(benchmark("splitWords (medium)", () => splitWords(mediumText)));
results.push(benchmark("splitSentences (medium)", () => splitSentences(mediumText)));

// Detection
results.push(benchmark("isUrdu (Urdu text)", () => isUrdu(mediumText)));
results.push(benchmark("urduRatio (Urdu text)", () => urduRatio(mediumText)));

// Numbers
results.push(benchmark("convertNumbers (short)", () => convertNumbers("1234567890")));

// Stemming
results.push(benchmark("stemUrdu (single word)", () => stemUrdu("کتابیں")));
results.push(benchmark("stemUrduText (medium)", () => stemUrduText(mediumText)));

// Date
results.push(benchmark("formatUrduDate (now)", () => formatUrduDate(new Date())));
results.push(benchmark("timeAgoUrdu (2 hours ago)", () => timeAgoUrdu(Date.now() - 2 * 3600 * 1000)));

// Check for --json flag
const isJson = process.argv.includes("--json");

if (isJson) {
  console.log(JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
} else {
  console.log("Running benchmarks...\n");
  console.log("Function".padEnd(40) + "Ops/sec".padStart(10) + "  " + "per op".padStart(10));
  console.log("-".repeat(62));
  for (const r of results) {
    console.log(
      r.name.padEnd(40) + r.opsPerSec.toString().padStart(10) + "  " + (r.perOp + " ms").padStart(10)
    );
  }
}
