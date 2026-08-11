# Changelog

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
