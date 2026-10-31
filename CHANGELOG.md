# Changelog

## 0.4.3

- Improve the Roman Urdu guide with clearer API choices, normalization examples, custom aliases, mixed-language cautions, and cross-script search limitations.


## 0.4.2

- Add normalizeRomanUrdu to canonicalize known Roman Urdu spelling variants without translation, with custom overrides.
- Document the new API and add regression tests.


## 0.4.1

- Fix Urdu and PHP number parsing for valid grouped decimals and reject malformed separators.
- Add a morphological analysis card and stemming deep-dive guide; improve docs metadata and rendered-output validation.


## 0.4.0

### Added

- Add `formatUrduNumber`, which formats numbers with South Asian lakh/crore digit grouping (`1234567` -> `۱۲٬۳۴٬۵۶۷`) and Urdu digits by default, plus western and no-grouping modes and a `decimals` cap. Rounding is applied to the binary double identically in both ports, so JS and PHP stay byte-identical rather than diverging at ties.
- Add `formatUrduCurrency`, which picks `روپیہ` for exactly one and `روپے` otherwise, or spells the amount out with `style: "words"`.
- Add `toUrduOrdinal`, which spells ordinals and inflects for gender (`پہلا`/`پہلی`). 1-6 come from a table; larger ordinals suffix the last word of the cardinal, a word-final `و` contracts (`نواں`, `سواں`), and an exact scale value drops its `ایک` (`1000` -> `ہزارواں`).
- Add `parseUrduDate`, the inverse of `formatUrduDate`. It reads Urdu and English month names, Urdu/Arabic-Indic/ASCII digits, day-first numeric dates, ISO dates and day-period times, and returns the same wall-clock moment `formatUrduDate` formatted — verified over all 24 hours.
- Export the number word tables (`URDU_ONES`, `URDU_TEENS_AND_TENS`, `URDU_TENS_UNITS`, `URDU_SCALES`, `URDU_ORDINAL_IRREGULARS`) from the package root.
- Extend `scripts/verify-php-parity.mjs` to mirror `Numbers.php` and `Date.php`, so the no-PHP check covers 300 fixture cases instead of 89.
- Add `npm run diff:php` (`scripts/diff-php.mjs` with `php/tools/diff-runner.php`), which runs the same seeded randomized number and date inputs through the real TypeScript build and the real PHP port and fails on any disagreement. Unlike the fixtures it can cover inputs nobody wrote down, and unlike the parity mirror it executes PHP rather than re-describing it, so it observes PHP's own behaviour. Errors are compared too, so both languages must reject the same inputs.

### Changed

- `numberToUrduWords` now spells 21-99 with the real irregular Urdu words instead of a composed `بیس ایک`-style fallback. `21` is `اکیس` and `1234567` is `بارہ لاکھ چونتیس ہزار پانچ سو سڑسٹھ`; every cardinal from 0 to 99 is now a single correct word, covered by a completeness test.
- Complete the South Asian scale with `ارب` (10^9) and `کھرب` (10^11), which the docstring had promised but the scale table did not implement. Values below 10^8 are unchanged.
- Flow the number word tables through `php/data/tables.json`, generated from `src/numbers.ts`, so `Numbers.php` no longer keeps a hand-copied second set of cardinals.

### Fixed

- `formatUrduNumber` no longer emits exponential notation for large magnitudes. `String(1e21)` is `"1e+21"` in JavaScript, which reached the output verbatim — and digit grouping then inserted its separator inside the exponent (`۱e,+۲۱`, with western grouping `1e,+21`). Anything at or above 10^21 now prints as digits, matching the PHP port.
- Fix the PHP port so `parseUrduDate` works at all. `DateTime::createFromFormat` requires exactly two digits for the `i` and `s` tokens, so the single-digit minute and second the port built (`0:0:0`) made it return `false`, and every non-numeric date parsed to `null`.

## 0.3.1

- Publish the PHP port to Packagist. A root composer.json (Packagist reads repo-root manifests only) exposes php/src/UrduTextUtils via PSR-4 autoload, with export-ignore rules in .gitattributes for a clean dist archive. The new Packagist workflow runs on the same version tags as the npm Release: a PHP 8.1-8.3 matrix re-verifies table sync, strict manifest validation and the 536-test parity suite, then notifies packagist.org's update API so every tag publishes to both registries. v0.3.1 is the first version indexed on Packagist (composer require urdu-text-utils/urdu-text-utils).


## 0.3.0

- Complete the PHP port (stages 0.2-0.4): add Detect.php, StopWords.php, Words.php sentence/statistics APIs, Stemmer.php, Date.php and Names.php with full fixture parity against the TypeScript source
- Flow every shared table (stop words, sentence abbreviations, stemmer affixes, date names, name tables) through the generated php/data/tables.json
- Export PROTECTED_WORDS and ENGLISH_NAME_ALIASES from the TypeScript source and re-export them from the package root
- Add 360 PHP parity fixtures (536 PHPUnit tests) that pass with and without ext-intl
- Add scripts/verify-php-parity.mjs, a no-PHP smoke check mirroring the PHP algorithms in Node
- Use timezone-stable date fixtures so CI regeneration can never drift from locally generated fixtures


## 0.2.3

- Add Complementary libraries section
- Keep the UMD build out of bundler ESM resolution


## 0.2.2

- Smoke-test the release tarball before and after publish
- Add one-command release script


## 0.2.1

- Add Urdu name transliteration with part extraction (`transliterateNameToEnglish`, `transliterateNameToUrdu`, `extractNameParts`), covering honorifics, family names, and prefixes.
- Fix corrupted dictionary keys that silently degraded transliteration: foreign-script lookalikes (`अपनी`→`اپنی`), mixed Latin/Urdu garbage (`عclave`, `لیbla`, `فiza`, ` nazia`), and Gurmukhi/Devanagari impostors in the word and name tables.
- Correct ~30 Pakistani name spellings verified against Urdu name references (e.g. `بشرا`→`بشری` Bushra, `رکشنا`→`رخسانہ` Rukhsana, `سیدرہ`→`سدرہ` Sidra, `قوریشی`→`قریشی` Qureshi) and add common missing names (Daniyal, Zeeshan, Mustafa, Javeria, Mehwish, Alia, Memoona, Samiya).
- Derive the English→Urdu name lookup from the forward name tables so both directions can never drift; alternate Roman spellings (`Omar`, `Hassan`, …) remain supported via a small alias list.
- Centralize the Urdu letter inventory in a single `URDU_LETTERS` table shared by normalization, collation, and transliteration instead of three hand-maintained maps.
- Add data-integrity tests that fail CI on foreign-script keys, stray whitespace, or name spellings that no longer round-trip in both directions.

## 0.2.0

- Add automated performance benchmarks workflow that runs on every push to main and release tags.
- Add Performance Benchmarks documentation page with real-world benchmark results for all major functions.
- Benchmark script now supports `--json` output for automation and programmatic access.
- Add automated benchmark results to GitHub Release notes on new releases.

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
