# Contributing to urdu-text-utils

Thank you for helping improve Urdu text processing. This guide explains the
one rule that makes this repository unusual — **the TypeScript source is the
single source of truth** — and the workflow that follows from it.

## The golden rule

Every feature exists in TypeScript first, and everything the PHP package
does is *verified against it*, not hand-copied:

- `php/data/tables.json` (letters, dictionary, stop words, stemmer affixes,
  date names, honorifics) is **generated** from the TS source.
- `php/tests/fixtures/*.json` are **generated** by running the real TS build.
- The PHPUnit suite asserts the PHP output matches those fixtures exactly.

If your change is in the generated layer, it belongs in the generator — or in
the TS source the generator reads from. Never edit `php/data/` or
`php/tests/fixtures/` by hand; CI regenerates them and will fail the build on
any drift.

## Where your change probably goes

| I want to… | Touch |
| --- | --- |
| Fix behavior in any function | `src/*.ts` (then regenerate — see below) |
| Fix a bug in PHP only (a port bug, not a behavior change) | `php/src/UrduTextUtils/*.php` |
| Add a new exported function | `src/`, then port it to `php/src/` and add fixtures |
| Expand a table (stop words, dictionary, affixes…) | the TS source of that table, then regenerate |

## Development setup

You need Node 18+ and PHP 8.1+ (with `mbstring`; `ext-intl` recommended —
CI tests both with and without it), plus Composer.

```bash
npm install                 # TS toolchain
npm test                    # 245+ vitest tests
npm run typecheck

cd php && composer install
composer test               # 536-test parity suite
```

### Regenerating tables and fixtures

After any change to `src/`, run from the repo root:

```bash
npm run build
node scripts/generate-php-tables.mjs
node scripts/generate-php-fixtures.mjs
```

If these produce diffs in `php/data/` or `php/tests/fixtures/`, **commit
them** — that is the parity pipeline doing its job. The updated fixtures are
the record of what changed, and CI re-runs the same generation and fails if
you forgot.

### Local parity smoke check (no PHP needed)

`node scripts/verify-php-parity.mjs` mirrors the PHP algorithms in Node and
asserts them against the same fixtures. It is a convenience, not a gate —
the real check is PHPUnit.

## Writing tests

- TS changes: add cases to the matching `tests/*.test.ts` file.
- The fixture generator picks up behaviors from the TS suites; new PHP-side
  behaviors (like PHP-only semantics) need entries in
  `scripts/generate-php-fixtures.mjs` plus a matching PHPUnit test.
- Determinism matters for fixtures: no wall-clock `Date.now()` in generated
  cases — store components or fixed offsets (see `timeAgoUrdu` cases).

## Submitting

1. Branch from `main`, keep the change focused.
2. Run `npm test`, `npm run typecheck`, and `composer test` (in `php/`).
3. If you regenerated tables/fixtures, include those diffs.
4. Open a PR against `main` using the template. CI runs the TS matrix
   (Node 18/20/22), the PHP parity job, benchmarks, and the docs build.

## Releasing (maintainers)

Releases are tag-driven; see the "Releasing" section of the root README.

## Reporting transliteration issues

`romanize` / `romanToUrdu` are `@experimental` (~70% word accuracy by design,
pending the lexicon milestone). Wrong romanization of a *specific word* is a
known limitation, not a bug — but if you found a dictionary word that maps
wrong, or a rule that corrupts input, please open an issue with the
transliteration template. Those reports feed directly into the lexicon.
