# Changelog

## 0.1.10

- Expand transliteration `ROMAN_VARIANTS` with 200+ new entries covering common verb conjugations, nouns, food, body parts, nature, religion, and modern vocabulary.
- Add real-time npm download stats (weekly/monthly) to docs homepage.
- Add Use Cases & Recipes guide page with real-world integration examples: search autocomplete, CMS processing, form validation, URL slugs, sorting, text analysis, date formatting, stop words, and number conversion.
- Merge `release.yml` and `prerelease.yml` into a single workflow that handles both stable and pre-release tags, fixing npm Trusted Publishing which only allows one workflow per publisher.
- Add `.freebuff/` to `.gitignore`.

## 0.1.9

- Add rule-based Urdu Stemmer module (`stemUrdu`, `stemUrduText`, `getAffixes`).
- Add morphological restorations for feminine plurals (*لڑکیاں* → *لڑکی*), hamza plurals (*دعاؤں* → *دعا*), and Arabic/sound plurals (*تعلیمات* → *تعلیم*).
- Add canonical prefix and suffix stripping with short root protection and exception handling.
- Add canonical constants `URDU_PREFIXES` and `URDU_SUFFIXES`.

## 0.1.8

- Fix jsDelivr monthly hit badge in README to use shields.io SVG endpoint.
- Update CDN documentation and package metadata.

## 0.1.7

- Add Urdu date & time formatting module (`formatUrduDate`, `timeAgoUrdu`, `getUrduMonthName`, `getUrduWeekdayName`).
- Add pattern token replacement (`YYYY`, `MMMM`, `DD`, `dddd`, `hh:mm A`) with automatic Urdu numerals and day period indicators (`صبح`, `دوپہر`, `شام`, `رات`).
- Add localized natural relative time formatting for past and future dates (*"ابھی"*, *"۵ منٹ پہلے"*, *"۳ گھنٹے پہلے"*, *"کل"*, *"پرسوں"*, *"۲ ہفتے بعد"*).
- Add canonical constants `URDU_MONTHS_GREGORIAN`, `URDU_MONTHS_HIJRI`, and `URDU_WEEKDAYS`.

## 0.1.6

- Add dedicated minified IIFE browser bundle (`dist/index.iife.js`) exposing `window.UrduTextUtils` for seamless jsDelivr and unpkg CDN usage without a bundler.
- Add `jsdelivr` and `unpkg` fields and `browser` export condition in `package.json`.

## 0.1.5

- Expand transliteration dictionary to 1,700+ entries across classical/poetic register, commerce & digital terminology, law & governance, geography, and rich verbal inflections.
- Expand `ROMAN_VARIANTS` with popular Roman Urdu texting and chat conventions (`kidhr`, `thek`, `sahi`, `behtareen`, `mashaallah`, `jazakallah`, etc.).
- Add automated sitemap generation, OpenGraph metadata, and JSON-LD structured data for docs.

## 0.1.4

- Add Urdu stop words module (`URDU_STOP_WORDS`, `isStopWord`, `filterStopWords`, `removeStopWords`) with a curated set of 130+ canonical functional words.
- Enhance sentence segmentation in `splitSentences` and `countSentences` with abbreviation & honorific protection (e.g. `ڈاکٹر.`, `پروفیسر.`, `صاحب.`), numeric decimal protection, and optional `preserveTerminators` option.

## 0.1.3

- Significantly expand transliteration dictionary coverage across pronouns & oblique forms (`مجھے`, `ہمیں`, `انہیں`, `اسے`, `جسے`), everyday verbs and inflections, calendar & weekdays, numbers & ordinals, food, household objects, health, geography, and common Pakistani names.
- Expanded Roman Urdu variants (`ROMAN_VARIANTS`) for common texting and phonetically ambiguous spellings (`mjhe`, `humein`, `unhein`, `isay`, `chahye`, etc.).
- Enhanced dictionary normalization and clean token mapping for slug generation and reverse transliteration.

## 0.1.2

- Dictionary grows to ~650 entries: news and public-life vocabulary (the densest register in Urdu media), technology, education, health, colours, animals, extended family, food and place names.
- Rule fallback reads `ی` by position — `e` inside a word (`کھیل` → `khel`), `i` at the end (`پڑھی` → `parhi`) — and recognises the final `یں` plural ending (`سڑکیں` → `sarkein`, previously `sarkin`).
- `مارنا` transliterates as `maarna` so it no longer collapses into `مرنا` in the reverse direction.

## 0.1.1

- Expand the transliteration dictionary to ~450 entries: high-frequency vocabulary, oblique infinitives (`کرنے`, `رہنے`), English loanwords (`سکول`, `کمپیوٹر`) and common Roman spelling variants. The dictionary moved to `src/dictionary.ts`.
- Improve the rule fallback for words outside the dictionary: word-initial `و`/`ی` transliterate as consonants (`والا` → `wala`), word-final `ہ` as `-a` (`کمرہ` → `kamra`), and a schwa is inserted after an initial consonant cluster so output stays pronounceable (`رہنے` → `rehne` instead of `rhne`).
- `romanToUrdu("school")` now returns `سکول` instead of `سچول`.
- Releases publish through npm Trusted Publishing (OIDC); no npm token is stored in the repository.

## 0.1.0

First release: normalization, script detection, digit conversion, diacritic removal, Urdu collation, diacritic-insensitive search with highlighting, text statistics, and experimental transliteration and slugs.
