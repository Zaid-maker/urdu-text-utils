# Use Cases & Recipes

Real-world examples showing how to integrate `urdu-text-utils` into your applications.

## Search Autocomplete

Build a search input that handles Urdu text normalization, diacritics, and fuzzy matching:

```ts
import { searchUrdu, normalizeUrdu } from "urdu-text-utils";

// Your data source (e.g., from an API or database)
const articles = [
  { id: 1, title: "پاکستان کا خوبصورت ملک", category: "جغرافیہ" },
  { id: 2, title: "کراچی میں بارش", category: "موسم" },
  { id: 3, title: "اسلام آباد کی سرکاری عمارتیں", category: "شہر" },
];

// User types with Arabic characters (common on mobile keyboards)
const query = "كتاب"; // Arabic ك instead of Urdu ک

// searchUrdu handles normalization automatically
const results = searchUrdu(query, articles, {
  getText: (item) => item.title,
  limit: 5,
});
// Returns: [{ id: 1, title: "پاکستان کا خوبصورت ملک", ... }]
// Because "کتاب" matches after normalization
```

**With fuzzy matching for typo tolerance:**

```ts
const results = searchUrdu("پاکستان", articles, {
  getText: (item) => item.title,
  fuzzy: true, //允许 1 edit distance
  limit: 5,
});
// "پاکستان" (missing alif) still matches "پاکستان"
```

## CMS Text Processing

Process Urdu content in a CMS — normalize, count words, and extract statistics:

```ts
import {
  normalizeUrdu,
  countWords,
  analyzeUrdu,
  removeDiacritics,
  convertNumbers,
} from "urdu-text-utils";

// User submits content from a WYSIWYG editor
const rawContent = "مُحَمَّد ﷺ نے فرمایا: کتب العلم بہترین ہے۔";

// Step 1: Normalize for storage
const normalized = normalizeUrdu(rawContent);
// "محمد ﷺ نے فرمایا: کتب العلم بہترین ہے۔"

// Step 2: Get statistics for the editor UI
const stats = analyzeUrdu(normalized);
// {
//   words: 8,
//   sentences: 1,
//   characters: 45,
//   readingTimeMinutes: 0.03,
//   ...
// }

// Step 3: Create a search-friendly version (no diacritics)
const searchIndex = removeDiacritics(normalized);
// "محمد ﷺ نے فرمایا: کتب العلم بہترين ہے۔"

// Step 4: Convert any mixed digits to Urdu
const displayContent = convertNumbers(normalized, "urdu");
```

## Form Validation

Validate Urdu input fields with proper error messages:

```ts
import {
  isUrdu,
  urduRatio,
  hasUrduSpecificLetters,
  countWords,
  normalizeUrdu,
} from "urdu-text-utils";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateUrduName(name: string): ValidationResult {
  // Check if input contains Urdu script
  if (!isUrdu(name)) {
    return { valid: false, error: "براہ کرم اردو میں لکھیں" };
  }

  // Ensure it's mostly Urdu (not mixed with English)
  const ratio = urduRatio(name);
  if (ratio < 0.8) {
    return { valid: false, error: "نام میں اردو کا حصہ زیادہ ہونا چاہیے" };
  }

  // Check minimum length
  const wordCount = countWords(name);
  if (wordCount < 2) {
    return { valid: false, error: "نام میں کم از کم دو الفاظ ہونے چاہیں" };
  }

  // Normalize for consistent storage
  const normalized = normalizeUrdu(name);

  return { valid: true };
}

// Usage
const result = validateUrduName("محمد علی");
// { valid: true }

const result2 = validateUrduName("Ali");
// { valid: false, error: "براہ کرم اردو میں لکھیں" }
```

## URL Slug Generation

Create SEO-friendly slugs from Urdu titles:

```ts
import { urduSlug, normalizeUrdu } from "urdu-text-utils";

// Romanized slug (default)
const slug1 = urduSlug("میرا پہلا مضمون");
// "mera-pehla-mazmoon"

// Urdu slug (for Urdu-language sites)
const slug2 = urduSlug("میرا پہلا مضمون", { preserveUrdu: true });
// "میرا-پہلا-مضمون" (URL-encoded in browser)

// Custom separator and max length
const slug3 = urduSlug("پاکستان ایک خوبصورت ملک ہے جس کی آبادی زیادہ ہے", {
  separator: "_",
  maxLength: 30,
});
// "پاکستان_ایک_خوبصورت"

// In a CMS slug field
function generateSlug(title: string): string {
  return urduSlug(normalizeUrdu(title), {
    maxLength: 60,
    preserveUrdu: true,
  });
}
```

## Sorting Urdu Lists

Sort lists of Urdu names, places, or items correctly:

```ts
import { sortUrdu, compareUrdu } from "urdu-text-utils";

// Sort an array of Urdu strings
const fruits = ["کیلا", "آم", "سیب", "انگور"];
const sorted = sortUrdu(fruits);
// ["آم", "انگور", "سیب", "کیلا"] — proper Urdu alphabetical order

// Sort objects by a property
const users = [
  { name: "zia", age: 30 },
  { name: "علی", age: 25 },
  { name: "احمد", age: 35 },
];

const sortedUsers = sortUrdu(users, {
  getText: (user) => user.name,
  descending: false,
});
// Sorted by Urdu alphabetical order

// Use as a comparator in Array.prototype.sort()
const names = ["ٹماٹر", "تربوز", "پپیتا"];
names.sort(compareUrdu);
// ["پپیتا", "تربوز", "ٹماٹر"]
```

## Text Analysis Dashboard

Build a text analysis tool for Urdu content:

```ts
import {
  analyzeUrdu,
  removeDiacritics,
  countSentences,
  splitWords,
  stemUrduText,
} from "urdu-text-utils";

function analyzeDocument(text: string) {
  const stats = analyzeUrdu(text);

  // Get unique words (after stemming)
  const stemmed = stemUrduText(text);
  const uniqueWords = new Set(splitWords(stemmed));

  // Count diacritics (for readability analysis)
  const withDiacritics = text.length - removeDiacritics(text).length;

  return {
    ...stats,
    uniqueWords: uniqueWords.size,
    diacriticCount: withDiacritics,
    readabilityScore: calculateReadability(stats),
  };
}

function calculateReadability(stats: {
  words: number;
  sentences: number;
}): number {
  // Simple readability heuristic
  const avgWordsPerSentence = stats.words / Math.max(stats.sentences, 1);
  // Lower is easier to read
  return Math.min(100, Math.round(avgWordsPerSentence * 10));
}

// Usage
const analysis = analyzeDocument(
  "پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی دو کروڑ سے زیادہ ہے۔ یہ جنوبی ایشیا میں واقع ہے۔"
);
```

## Date Formatting for Urdu UIs

Display dates in Urdu for localization:

```ts
import { formatUrduDate, timeAgoUrdu } from "urdu-text-utils";

// Format a date in Urdu
const now = new Date();
const formatted = formatUrduDate(now, "DD MMMM YYYY");
// "۳۱ اگست ۲۰۲۶"

// Full date with time
const full = formatUrduDate(now, "dddd، D MMMM YYYY، hh:mm A");
// "ہفتہ، ۳۱ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"

// Relative time ("time ago")
const postTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
const relative = timeAgoUrdu(postTime);
// "۲ گھنٹے پہلے"

// In a social media feed
function formatPostTime(timestamp: number): string {
  const diff = Date.now() - timestamp;

  // For very recent posts, show exact time
  if (diff < 60 * 1000) {
    return "ابھی";
  }

  // Otherwise use relative time
  return timeAgoUrdu(timestamp);
}
```

## Stop Words for Search Indexing

Remove common Urdu stop words for better search indexing:

```ts
import { removeStopWords, isStopWord, filterStopWords } from "urdu-text-utils";

// Index content for search (remove stop words)
function indexForSearch(text: string): string[] {
  const words = text.split(/\s+/);
  return words.filter((word) => !isStopWord(word));
}

// Example
const content = "پاکستان ایک خوبصورت ملک ہے";
const keywords = indexForSearch(content);
// ["پاکستان", "خوبصورت", "ملک"] — removed "ایک", "ہے"

// Or batch process
const tokens = ["یہ", "ایک", "بہترین", "کتاب", "ہے"];
const meaningful = filterStopWords(tokens);
// ["بہترین", "کتاب"]
```

## Number Conversion in UI

Display numbers in Urdu throughout your application:

```ts
import {
  convertNumbers,
  parseUrduNumber,
  numberToUrduWords,
} from "urdu-text-utils";

// Convert English digits to Urdu
const price = convertNumbers("1250", "urdu");
// "۱۲۵۰"

// Parse Urdu number string to JavaScript number
const amount = parseUrduNumber("۱٬۲۵۰");
// 1250

// Spell out numbers in Urdu (for formal writing)
const words = numberToUrduWords(1250);
// "ایک ہزار دو سو پچاس"

// In an e-commerce UI
function formatPrice(amount: number): string {
  const urduDigits = convertNumbers(amount.toLocaleString("en-IN"), "urdu");
  return `Rs. ${urduDigits}`;
}
// formatPrice(1250) → "Rs. ۱٬۲۵۰"
```
