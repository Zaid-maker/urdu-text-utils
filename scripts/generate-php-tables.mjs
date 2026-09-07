/**
 * Regenerate php/data/tables.json from the canonical TypeScript sources.
 *
 * The TS library is the single source of truth for Urdu tables (letter
 * inventory, dictionary, variants). This script compiles chars.ts and
 * dictionary.ts to throwaway ESM modules and serializes their exports to one
 * JSON file that the PHP port consumes — so the two languages can never drift.
 *
 * Usage: node scripts/generate-php-tables.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "tsup";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(root, "node_modules", ".php-toolchain", "modules");
const phpData = join(root, "php", "data");

// 1. Compile the two table modules in isolation so their exports are importable.
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
await build({
  entry: ["src/chars.ts", "src/dictionary.ts"],
  format: ["esm"],
  dts: false,
  outDir: tmp,
  clean: true,
  silent: true,
});

// 2. Import them and read the exact data (plus regex .source patterns).
const chars = await import(pathToFileURL(join(tmp, "chars.js")).href);
const dict = await import(pathToFileURL(join(tmp, "dictionary.js")).href);

const source = (re) => re.source;

// NFKC-decompose the Arabic presentation-form blocks so PHP can fold ligatures
// and positional forms without ext-intl (which is optional on many hosts).
const presentation = {};
for (const start of [0xfb50, 0xfe70]) {
  const end = start === 0xfb50 ? 0xfdff : 0xfefc;
  for (let cp = start; cp <= end; cp++) {
    const s = String.fromCodePoint(cp);
    const decomposed = s.normalize("NFKC");
    if (decomposed !== s) presentation[cp.toString(16)] = decomposed;
  }
}

const tables = {
  /** Canonical letters, in collation order. Aliases/vowel/variantOf only when set. */
  letters: chars.URDU_LETTERS.map((l) => {
    const out = { ch: l.ch, roman: l.roman };
    if (l.vowel) out.vowel = true;
    if (l.aliases?.length) out.aliases = l.aliases;
    if (l.variantOf) out.variantOf = l.variantOf;
    return out;
  }),
  digits: {
    urdu: chars.URDU_DIGITS,
    english: chars.ASCII_DIGITS,
    arabic: chars.ARABIC_INDIC_DIGITS,
  },
  /** JS RegExp sources; the PHP loader converts \uXXXX escapes to PCRE \x{XXXX}. */
  regex: {
    diacritics: source(chars.DIACRITICS_RE),
    invisible: source(chars.INVISIBLE_RE),
    tatweel: source(chars.TATWEEL_RE),
    zwnj: source(chars.ZWNJ_RE),
    wordSplit: source(chars.WORD_SPLIT_RE),
    sentenceSplit: source(chars.SENTENCE_SPLIT_RE),
    anyLetter: source(chars.ANY_LETTER_RE),
    arabicLetter: source(chars.ARABIC_LETTER_RE),
  },
  dictionary: dict.WORD_DICTIONARY,
  romanVariants: dict.ROMAN_VARIANTS,
  /** Presentation forms whose NFKC decomposition differs (fallback when ext-intl is absent). */
  presentation: presentation,
};

mkdirSync(phpData, { recursive: true });
const out = join(phpData, "tables.json");
writeFileSync(out, JSON.stringify(tables));
console.log(`wrote ${out} (${tables.letters.length} letters, ${Object.keys(tables.dictionary).length} dict entries, ${Object.keys(tables.romanVariants).length} roman variants)`);
