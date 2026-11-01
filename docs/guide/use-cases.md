# Use Cases & Recipes

Real-world examples showing how to integrate `urdu-text-utils` into your applications.

These recipes are starting points, not a replacement for your app's database,
validation policy or rendering framework. Keep original user input when you need
an audit trail, and normalize a separate value for consistent matching.

## Search Autocomplete

Build a search input that handles Urdu text normalization, diacritics, and fuzzy matching:

```ts
// docs-check
import { searchUrdu } from "urdu-text-utils";

// Your data source (e.g., from an API or database)
const articles = [
  { id: 1, title: "کتاب خانہ", category: "تعلیم" },
  { id: 2, title: "کراچی میں بارش", category: "موسم" },
  { id: 3, title: "پاکستان کا خوبصورت ملک", category: "جغرافیہ" },
];

// User types with Arabic characters (common on mobile keyboards)
const query = "كتاب"; // Arabic ك instead of Urdu ک

// searchUrdu handles normalization automatically
const results = searchUrdu(query, articles, {
  getText: (item) => item.title,
  limit: 5,
});

if (results.length !== 1 || results[0] !== articles[0]) {
  throw new Error("Arabic letter forms should match the Urdu title");
}
```

**With fuzzy matching for typo tolerance:**

```ts
// docs-check
import { searchUrdu } from "urdu-text-utils";

const articles = [
  { id: 1, title: "کتاب خانہ" },
  { id: 2, title: "پاکستان کا خوبصورت ملک" },
];

const results = searchUrdu("پکستان", articles, {
  getText: (item) => item.title,
  fuzzy: true,
  limit: 5,
});

if (results.length !== 1 || results[0] !== articles[1]) {
  throw new Error("Fuzzy search should match a one-character typo");
}
```

### Rank results and highlight the original text

Use the ranked API when the UI should show the strongest matches first. Search
folds Arabic/Urdu letter variants and diacritics for comparison, while
`highlightUrdu` keeps the source spelling in its result:

```ts
// docs-check
import { foldUrdu, highlightUrdu, searchUrduRanked } from "urdu-text-utils";

const articles = [
  { id: 1, title: "مُحَمَّد علی کی کہانی", category: "ادب" },
  { id: 2, title: "کراچی میں بارش", category: "موسم" },
];

const searchable = articles.map((article) => ({
  ...article,
  searchKey: foldUrdu(`${article.title} ${article.category}`),
}));

const results = searchUrduRanked("محمد", searchable, {
  getText: (article) => article.searchKey,
  limit: 5,
});

if (results[0]?.item.id !== 1) {
  throw new Error("The matching article should rank first");
}

const highlightedTitle = highlightUrdu(results[0].item.title, "محمد");
if (!highlightedTitle.includes("<mark>مُحَمَّد</mark>")) {
  throw new Error("Highlighting should retain the original diacritics");
}
```

For a database-backed search box, persist `foldUrdu(title)` in a separate
search-key column and query that column using your database's indexing strategy.
The package does not connect to databases or provide a network autocomplete
endpoint. Debounce requests, cap result counts, and keep the original title for
display.

`highlightUrdu` returns an HTML string by default. It does not sanitize HTML:
don't insert output based on user-authored text with `innerHTML` or an equivalent
unsafe HTML API. Render text safely with your UI framework, or escape and build
highlight elements using your framework's DOM APIs.

## CMS Text Processing

Keep submitted text, a normalized display value and a comparison key as distinct
values. Normalization preserves diacritics by default; the comparison key folds
them for matching without replacing the text shown to readers.

```ts
// docs-check
import {
  foldUrdu,
  normalizeUrdu,
  analyzeUrdu,
} from "urdu-text-utils";

const rawContent = "مُحَمَّد ﷺ نے فرمایا: علم بہترین ہے۔";
const normalizedContent = normalizeUrdu(rawContent);

const record = {
  rawContent,
  normalizedContent,
  searchKey: foldUrdu(normalizedContent),
  stats: analyzeUrdu(normalizedContent),
};

if (record.searchKey !== foldUrdu(rawContent)) {
  throw new Error("Equivalent spellings should produce the same search key");
}
```

Use `normalizedContent` for consistent display only if that matches your
product's editorial policy. Keep `rawContent` when exact submitted text matters,
and keep numbers in their numeric form in the database; localize digits at the
presentation layer when appropriate.

## Form Validation

Validate the requirements of a specific field, and return the normalized value
so callers don't accidentally validate one string but store another:

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
  normalized?: string;
  error?: string;
}

function validateUrduName(name: string): ValidationResult {
  const normalized = normalizeUrdu(name);
  if (!normalized) {
    return { valid: false, error: "براہ کرم اپنا نام درج کریں" };
  }

  if (!isUrdu(normalized)) {
    return { valid: false, error: "براہ کرم اردو میں لکھیں" };
  }

  const ratio = urduRatio(normalized);
  if (ratio < 0.8) {
    return { valid: false, error: "نام میں اردو کا حصہ زیادہ ہونا چاہیے" };
  }

  const wordCount = countWords(normalized);
  if (wordCount < 2) {
    return { valid: false, error: "نام میں کم از کم دو الفاظ ہونے چاہیں" };
  }

  return { valid: true, normalized };
}

const result = validateUrduName("محمد علی");
if (result.valid) {
  // Persist result.normalized after the rest of your server-side checks.
}
```

`isUrdu` measures the share of Arabic-script letters; it cannot tell Urdu from
Arabic, Persian or other languages that use the script. Tune the threshold for
the field, and don't use a script check as a substitute for authorization,
abuse prevention or server-side validation.

## URL Slug Generation

Create a readable URL segment from a title:

```ts
import { urduSlug, normalizeUrdu } from "urdu-text-utils";

// Romanized slug (default; transliteration is approximate)
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
  return urduSlug(title, {
    maxLength: 60,
    preserveUrdu: true,
  });
}
```

Generate a slug once when the record is created, check that it is unique, and
store it. Don't silently change existing URLs when titles are edited; retain old
slugs with redirects. Roman transliteration can be ambiguous, so choose the Urdu
form when preserving the source spelling matters.

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

Build an editor summary from the returned statistics. For exploratory word
counts, stemming can group some inflected forms; it is heuristic and should not
replace the original text or be treated as a linguistic analysis:

```ts
import {
  analyzeUrdu,
  splitWords,
  stemUrduText,
} from "urdu-text-utils";

function analyzeDocument(text: string) {
  const stats = analyzeUrdu(text);

  // Get unique words (after stemming)
  const stemmed = stemUrduText(text);
  const uniqueWords = new Set(splitWords(stemmed));

  return {
    ...stats,
    uniqueWords: uniqueWords.size,
    diacriticCount: stats.diacritics,
  };
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

## Stop Words for a bag-of-words index

Stop-word removal can reduce noise in keyword extraction or a bag-of-words
index. It is not always right for phrase search, names or exact matching, so
keep the original text and apply it only to the derived index:

```ts
import { filterStopWords, normalizeUrdu, splitWords } from "urdu-text-utils";

function indexForSearch(text: string): string[] {
  return filterStopWords(splitWords(normalizeUrdu(text)));
}

const content = "پاکستان ایک خوبصورت ملک ہے";
const keywords = indexForSearch(content);
```

## Number Conversion in UI

Display numbers in Urdu throughout your application:

```ts
import {
  formatUrduCurrency,
  parseUrduNumber,
  numberToUrduWords,
} from "urdu-text-utils";

// Parse Urdu number string to JavaScript number
const amount = parseUrduNumber("۱٬۲۵۰");
// 1250

// Keep amounts numeric for calculations and format only for display
const displayPrice = formatUrduCurrency(amount);
// "۱٬۲۵۰ روپے"

// Spell out numbers in Urdu (for formal writing)
const words = numberToUrduWords(1250);
// "ایک ہزار دو سو پچاس"
```
