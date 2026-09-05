// Generates the urduify Python dictionary module from src/dictionary.ts,
// so the data can never drift from the source of truth.
// Usage: node scripts/generate-urdu-dict.mjs > path/to/urdu_to_roman_dict.py
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/dictionary.ts", import.meta.url), "utf8");
const start = src.indexOf("export const WORD_DICTIONARY");
const end = src.indexOf("};", start);
if (start < 0 || end < 0) throw new Error("WORD_DICTIONARY block not found");
const block = src.slice(start, end);

const entries = [];
for (const m of block.matchAll(/^\s*"([^"]+)":\s*"([^"]+)",?\s*$/gm)) {
  entries.push([m[1], m[2]]);
}
if (entries.length === 0) throw new Error("no entries parsed");

const esc = (s) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

const lines = entries.map(([k, v]) => `    "${esc(k)}": "${esc(v)}",`);
const body = lines.join("\n");

process.stdout.write(`# -*- coding: utf-8 -*-
"""Urdu -> Roman Urdu word dictionary.

Mechanically generated from urdu-text-utils \`src/dictionary.ts\`
(https://github.com/Zaid-maker/urdu-text-utils, MIT License), so the data can
never drift from the source of truth. Do not edit by hand -- regenerate with:

    node scripts/generate-urdu-dict.mjs > application/urdu_to_roman_dict.py

Urdu script omits short vowels, so a rule engine cannot know that کتاب is
"kitaab" rather than "kutub"; this dictionary carries the vowels for common
words and the rule engine handles everything that falls through.
"""

URDU_TO_ROMAN = {
${body}
}
`);