<!--
The one thing CI will not forgive: generated-file drift.
If src/ changed, php/data/tables.json and php/tests/fixtures/ may change
with it — regenerate and commit those diffs:

  npm run build
  node scripts/generate-php-tables.mjs
  node scripts/generate-php-fixtures.mjs
-->

## What and why

<!-- One or two sentences. What behavior changes, for whom (JS, PHP, or both)? -->

## Which side

- [ ] TypeScript (`src/`) — behavior change
- [ ] PHP port (`php/src/`) — port fix only, no intended behavior change
- [ ] Generated files (`php/data/`, `php/tests/fixtures/`) — included in this PR
- [ ] Docs / docs site only

## Parity checklist

- [ ] `npm test` passes locally
- [ ] `npm run typecheck` passes
- [ ] `composer test` passes in `php/` (536 parity tests)
- [ ] If `src/` changed: tables + fixtures regenerated and the diffs are committed
- [ ] New TS behavior has TS test cases; new PHP-only semantics have fixture + PHPUnit coverage
- [ ] Fixtures stay deterministic (no wall-clock times; components or fixed offsets)

## Notes for reviewers

<!-- Anything subtle: PHP/JS semantic gaps you hit (ints vs floats, byte vs
codepoint offsets, PCRE vs JS regex), why an edge case is covered, or what
you deliberately left out. -->
