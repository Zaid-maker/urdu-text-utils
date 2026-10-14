---
title: One Urdu toolkit, two languages, parity-tested output
published: false
description: urdu-text-utils now ships for PHP — 11 classes, 693 fixture-parity tests, randomized differential testing, and a CI drift gate that makes divergence between the JavaScript and PHP implementations impossible.
tags: php, javascript, i18n, showdev
---

# One Urdu toolkit, two languages, parity-tested output

Urdu breaks the assumptions most string code makes. The same word has several Unicode spellings — text from Arabic keyboards uses `ك` and `ي` where Urdu uses `ک` and `ی`, so `"کتاب" === "كتاب"` is `false`. Diacritics are optional, so `مُحَمَّد` and `محمد` are the same name to a reader and different strings to a computer. Urdu has two digit systems in two different Unicode blocks. And `localeCompare("ur")` doesn't give Urdu alphabetical order in most runtimes — it silently falls back to Arabic root collation, which misorders `ک گ ٹ ڈ ڑ ں ے`.

[urdu-text-utils](https://github.com/Zaid-maker/urdu-text-utils) has solved this for JavaScript and TypeScript since 0.1.0: normalization, transliteration, search, collation, numbers, dates, stemming, statistics — zero dependencies, ~11 kB min+gzip, for Node, Deno, Bun and the browser.

But a lot of Urdu software is Laravel or WordPress on the backend. Those teams had two options: call a JS runtime from PHP, or rebuild the library and accept that the two implementations would slowly drift apart. As of v0.3.1 there is a third option: **the same toolkit as a native PHP package, whose output is guaranteed to match the TypeScript implementation byte for byte.**

## The problem with a second implementation

A port that is "inspired by" the original is a fork waiting to happen. Someone fixes a collation edge case in TypeScript and the PHP sort order quietly disagrees. Someone tweaks a normalization rule and a slug generated in the browser no longer matches the one the PHP backend stored. In Urdu text processing, where the whole point is making *the same word compare equal*, drift isn't a cosmetic bug — it breaks deduplication, search and IDs across your stack.

So the port is not a rewrite. It is a verification system.

## Same input, same output — asserted

```ts
// TypeScript — npm install urdu-text-utils
import { normalizeUrdu, sortUrdu, searchUrdu, timeAgoUrdu } from "urdu-text-utils";

normalizeUrdu("كيا حال ہے");          // "کیا حال ہے"
sortUrdu(["گل", "آم", "بادام"]);      // ["آم", "بادام", "گل"]
searchUrdu("محمد", ["مُحَمَّد علی"]);  // ["مُحَمَّد علی"]
timeAgoUrdu(Date.now() - 300_000);    // "۵ منٹ پہلے"
formatUrduNumber(1234567);            // "۱۲٬۳۴٬۵۶۷"  (lakh/crore pairing, not thousands)
toUrduOrdinal(100);                   // "سواں"
parseUrduDate("۲۲ اگست ۲۰۲۶")?.getDate(); // 22
```

```php
// PHP — composer require urdu-text-utils/urdu-text-utils
use UrduTextUtils\{ Normalizer, Collator, Search, Date, Numbers };

Normalizer::normalizeUrdu("كيا حال ہے");       // "کیا حال ہے"
Collator::sortUrdu(["گل", "آم", "بادام"]);     // ["آم", "بادام", "گل"]
Search::searchUrdu("محمد", ["مُحَمَّد علی"]);   // ["مُحَمَّد علی"]
Date::timeAgoUrdu(time() - 300);               // "۵ منٹ پہلے"
Numbers::formatUrduNumber(1234567);            // "۱۲٬۳۴٬۵۶۷"
Numbers::toUrduOrdinal(100);                   // "سواں"
Date::parseUrduDate("۲۲ اگست ۲۰۲۶");           // DateTime, 22 August 2026
```

Those aren't examples that *happen* to agree. They agree because the test suite demands it.

## The parity architecture

The TypeScript source is the single source of truth. Nothing in PHP is hand-copied from it:

```text
TypeScript source (src/*.ts)  ← the single source of truth
        │
        ├──► generate-php-tables.mjs ──► php/data/tables.json
        │        (letters, dictionary, stop words, stemmer affixes,
        │          date names, honorifics — one shared data file)
        │
        └──► generate-php-fixtures.mjs ─► php/tests/fixtures/*.json
                 (expected outputs, produced by running the REAL TS build)

PHPUnit asserts PHP output === fixtures, case by case  (693 tests)

differential harness: same seeded random inputs through both real
implementations ──► any disagreement fails the build  (npm run diff:php)

CI drift gate: regenerate both on every push; any diff fails the build
```

Two consequences worth spelling out:

- **The two languages cannot drift silently.** If you change a normalization rule in TypeScript, the next CI run regenerates `tables.json` and the fixtures; the PHP suite then fails until the port is updated — or, more often, needs no update at all, because the data flowed through.
- **The fixtures are real outputs, not wishes.** They are recorded from the actual published build, so "what the test expects" and "what the library does" are the same thing by construction.

A third consequence is newer, and it exists precisely because the first two were not enough:

- **The fixtures only cover inputs someone thought to write down.** A green suite is not the same thing as a correct implementation. So the two implementations are now also run *against each other*: `npm run diff:php` generates thousands of Urdu number and date cases from a seeded PRNG, executes them through the real TypeScript build and the real PHP classes, and fails on any disagreement — including disagreement about which inputs to reject. It is deterministic, so a seed reproduces a failure exactly. Crucially it is not a re-implementation of the PHP in JavaScript: a mirror like that validates intent rather than behaviour, and ours passed 300 cases while every `parseUrduDate` call was returning `null`.

The PHP side is 11 public classes mirroring the TS modules — `Normalizer`, `Detect`, `Words`, `StopWords`, `Numbers`, `Collator`, `Search`, `Transliterator`, `Stemmer`, `Date`, `Names` — pure PHP 8.1+, zero dependencies, **no required extensions**. When `ext-intl` is present it is used for true Unicode NFKC/NFC; without it, a generated presentation-form fallback applies (that path is fully green too).

## Five bugs that only surface when you demand identical output

Porting code that must produce *byte-identical* results across two runtimes is a great bug generator. Five favorites:

**1. `1` is not `1.0`.** JavaScript has one number type, and `JSON.stringify(1.0)` writes `"1"`. PHP's `round()` returns a float, so PHP computed `1.0` where the fixture recorded `1` — and PHPUnit's `assertSame` is type-strict. Five tests failed in CI on whole-number ratios (`urduRatio` returning exactly `1`). The fix: int-ify integral values at the port boundary. We hit the same class of bug twice before it fully sank in.

**2. Fixtures that quietly depend on the timezone.** `formatUrduDate` cases originally stored ISO timestamps. The generator ran at UTC+5, CI at UTC — so regenerating fixtures in CI would rewrite them with shifted wall-clock times and fail the drift gate. A fixture encoding an *absolute instant* is not stable across timezones. The fix: date cases store wall-clock components (interpreted in each runner's own zone), and relative-time cases store fixed epoch offsets, since "5 minutes ago" depends only on the difference.

**3. Two regex dialects.** The TypeScript uses Unicode-aware patterns with `\u{...}` escapes; PHP needs PCRE with the `/u` flag and `\x{...}` escapes. The generated tables ship regex sources translated per language, so both consume the same semantic content.

**4. Bytes vs codepoints.** Urdu letters are two bytes each in UTF-8, and PHP's `substr`/`strlen` are byte-based. Affix stripping with byte offsets cuts straight through the middle of letters and produces mojibake. The port does codepoint-exact string operations mirroring JS `slice`/`length` semantics, so `لڑکیاں` loses its suffix and stays `لڑکی` instead of becoming garbage.

**5. The date parser that silently returned nothing.** `DateTime::createFromFormat` requires *exactly* two digits for the `i` and `s` tokens, so building a timestamp as `0:0:0` makes the call return `false` outright — and every date that wasn't a plain numeric string parsed to `null`. Two lessons came out of it. The fixture suite caught it the instant PHP actually ran; and the JavaScript mirror of the PHP logic — the kind of check that claims to verify parity without executing PHP — passed every one of its 300 cases while the port was broken for every input. If a test never runs the real code, a green result tells you almost nothing.

## One tag, two registries

Publishing is a single command (`npm run release -- patch`) that pushes one annotated tag, and two workflows take it from there:

- **npm** (`release.yml`): verifies the tag matches `package.json`, smoke-tests the tarball, publishes with `--provenance` via npm Trusted Publishing over OIDC — there is no npm token anywhere in the repository — then creates the GitHub Release.
- **Packagist** (`packagist.yml`): a PHP 8.1/8.2/8.3 matrix that regenerates the tables (failing on drift), runs `composer validate --strict`, executes the full parity suite, and then notifies Packagist's update API with a `username:token` credential.

One honest note from that setup: packagist.org has **no OIDC trusted publishing** — that's a Private Packagist (the commercial product) feature. On packagist.org, the code always comes from your git repository and a git tag *is* the release, so the workflow notifies Packagist to re-read the repo. And its update API recently changed shape: the legacy `{"repository_url": ...}` payload now returns `406 Missing or invalid payload`; the current body is `{"repository": "<url>"}` with Bearer auth. Our first CI run found that out the hard way, so you don't have to.

## Try it

```bash
composer require urdu-text-utils/urdu-text-utils   # PHP 8.1+
npm install urdu-text-utils                        # Node 18+, browsers, Deno, Bun
```

- GitHub: <https://github.com/Zaid-maker/urdu-text-utils>
- Docs and live playground: <https://zaid-maker.github.io/urdu-text-utils/>
- Packagist: <https://packagist.org/packages/urdu-text-utils/urdu-text-utils>
- npm: <https://www.npmjs.com/package/urdu-text-utils>
- PHP API reference: [`php/README.md`](https://github.com/Zaid-maker/urdu-text-utils/blob/main/php/README.md)

## What's next — and what to avoid today

The one soft spot is transliteration. Urdu script omits short vowels, so `کتب` is *kitab* or *kutub* depending on context, and Roman Urdu has no standard orthography (`hai`/`hay`/`he` all occur). `romanize` and `romanToUrdu` are marked `@experimental` at roughly 70% word accuracy: a dictionary of ~650 high-frequency words plus a rule fallback. Dictionary hits are reliable; rule output is an approximation. If you need lossless slugs, use `urduSlug($text, preserveUrdu: true)`. A real lexicon plus a statistical model is the planned next milestone — and it's deliberately not faked today.

Everything else — normalization, detection, tokenization, stop words, stemming, collation, search, numbers, dates, name transliteration — is stable, tested, and identical in both languages. If you build Urdu software on a mixed JS/PHP stack, you can now normalize on the way in, on either side, and trust the other side to agree.

Issues and PRs welcome — especially parity bug reports. If the PHP output ever disagrees with the TypeScript output, that's a bug in the most important sense this project has.
