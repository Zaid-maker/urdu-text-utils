#!/usr/bin/env node
/**
 * Verifies that an installed copy of urdu-text-utils is actually usable:
 *
 *   1. the package contains exactly the intended files (no src/tests leaking in)
 *   2. both the ESM and CJS entry points resolve and expose the full public API
 *   3. the exported API matches the locally built dist/ (drift guard)
 *   4. representative functions behave correctly
 *   5. consumer TypeScript can resolve the bundled type declarations
 *
 * Run it against the tarball that npm publish will upload (before publishing)
 * and again against the registry copy (after publishing):
 *
 *   node smoke-package.mjs /path/to/urdu-text-utils-0.2.1.tgz
 *   node smoke-package.mjs urdu-text-utils@0.2.1
 *
 * Failures exit non-zero; the throwaway consumer lives under node_modules/
 * (gitignored) and is always removed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const SPEC = process.argv[2];
if (!SPEC) {
  console.error("Usage: node smoke-package.mjs <pkg.tgz | name@version>");
  process.exit(2);
}
// npm treats a bare relative *.tgz as a GitHub shorthand (owner/repo), so
// resolve tarball paths to absolute before handing them to npm install.
const INSTALL_SPEC = SPEC.endsWith(".tgz") ? path.resolve(REPO_ROOT, SPEC) : SPEC;

const repoPkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
const failures = [];
const pass = (msg) => console.log(`  \u2713 ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.error(`  \u2717 ${msg}`);
};
const assert = (cond, msg) => (cond ? pass(msg) : fail(msg));

// ---------------------------------------------------------------------------
// 1. Set up a throwaway consumer project and install the package
// ---------------------------------------------------------------------------
// On Windows npm is a .cmd shim that needs a shell; on POSIX exec it directly.
const consumer = mkdtempSync(path.join(REPO_ROOT, "node_modules", ".smoke-"));
const run = (bin, args, opts = {}) =>
  execFileSync(bin, args, { stdio: "pipe", encoding: "utf8", timeout: 180_000, ...opts });
const runNpm = (args, opts = {}) =>
  process.platform === "win32"
    ? run("npm.cmd", args, { ...opts, shell: true })
    : run("npm", args, opts);

try {
  writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ name: "smoke-consumer", private: true, type: "module" }, null, 2),
  );

  console.log(`Installing ${SPEC} into a clean consumer...`);
  runNpm(["install", INSTALL_SPEC, "--no-audit", "--no-fund", "--loglevel", "error"], { cwd: consumer });
  pass(`npm install ${SPEC}`);

  // -------------------------------------------------------------------------
  // 2. Shipped file list — only what package.json "files" intends (npm always
  //    adds package.json, README, and LICENSE on top of the allowlist)
  // -------------------------------------------------------------------------
  const pkgDir = path.join(consumer, "node_modules", "urdu-text-utils");
  const allowed = new Set(["package.json", "README.md", "CHANGELOG.md", "LICENSE", "dist"]);
  const shipped = readdirSync(pkgDir);
  assert(
    shipped.every((f) => allowed.has(f)),
    `tarball ships only intended top-level files (got: ${shipped.join(", ")})`,
  );
  assert(
    ["package.json", "README.md", "CHANGELOG.md", "dist"].every((f) => shipped.includes(f)),
    "tarball ships README, CHANGELOG, and dist",
  );

  const distFiles = readdirSync(path.join(pkgDir, "dist"));
  for (const f of ["index.js", "index.cjs", "index.iife.js", "index.d.ts"]) {
    assert(distFiles.includes(f), `dist/${f} present`);
  }

  const installedPkg = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  assert(
    installedPkg.version === repoPkg.version,
    `installed version ${installedPkg.version} matches package.json ${repoPkg.version}`,
  );

  // -------------------------------------------------------------------------
  // 3. Expected API surface — parity with the locally built dist when present,
  //    otherwise a baseline of representative exports
  // -------------------------------------------------------------------------
  const BASELINE = [
    "normalizeUrdu", "removeDiacritics", "foldUrdu",
    "convertNumbers", "toUrduDigits", "toEnglishDigits", "toArabicIndicDigits",
    "parseUrduNumber", "numberToUrduWords",
    "isUrdu", "urduRatio", "hasUrduSpecificLetters",
    "countWords", "countSentences", "splitWords", "splitSentences", "analyzeUrdu",
    "URDU_STOP_WORDS", "isStopWord", "filterStopWords", "removeStopWords",
    "sortUrdu", "compareUrdu",
    "searchUrdu", "searchUrduRanked", "highlightUrdu", "editDistance",
    "romanize", "romanToUrdu", "urduSlug",
    "formatUrduDate", "timeAgoUrdu", "getUrduMonthName", "getUrduWeekdayName",
    "URDU_MONTHS_GREGORIAN", "URDU_MONTHS_HIJRI", "URDU_WEEKDAYS",
    "stemUrdu", "stemUrduText", "getAffixes", "URDU_PREFIXES", "URDU_SUFFIXES",
    "transliterateNameToEnglish", "transliterateNameToUrdu", "extractNameParts",
  ];

  let expectedKeys = BASELINE;
  let exactParity = false;
  const localDist = path.join(REPO_ROOT, "dist", "index.js");
  if (existsSync(localDist)) {
    const local = await import(pathToFileURL(localDist).href);
    expectedKeys = Object.keys(local);
    exactParity = true;
    pass("export parity baseline: locally built dist/");
  } else {
    console.log("  (no local dist/ found — checking baseline exports only)");
  }

  // -------------------------------------------------------------------------
  // 4. ESM + CJS consumer checks
  // -------------------------------------------------------------------------
  const FUNCTIONAL = `
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
assert(u.normalizeUrdu("كيا") === "کیا", "normalizeUrdu folds Arabic-keyboard variants");
assert(u.isUrdu("پاکستان") === true, "isUrdu detects Urdu text");
assert(u.transliterateNameToEnglish("محمد علی") === "Muhammad Ali", "name transliteration works");
assert(Array.isArray(u.sortUrdu(["علی", "احمد"])), "sortUrdu returns an array");
assert(typeof u.romanToUrdu === "function", "romanToUrdu is exported");
console.log("ok");`;

  const guard = exactParity
    ? `const missing = expected.filter((k) => !(k in u));
if (missing.length) throw new Error("missing exports: " + missing.join(", "));
const extra = Object.keys(u).filter((k) => !expected.includes(k));
if (extra.length) throw new Error("unexpected exports: " + extra.join(", "));`
    : `const missing = expected.filter((k) => !(k in u));
if (missing.length) throw new Error("missing exports: " + missing.join(", "));`;

  const body = `const expected = ${JSON.stringify(expectedKeys)};
${guard}
${FUNCTIONAL}`;

  for (const [ext, prologue] of [
    ["mjs", `import * as u from "urdu-text-utils";\n`],
    ["cjs", `const u = require("urdu-text-utils");\n`],
  ]) {
    const file = path.join(consumer, `check.${ext}`);
    writeFileSync(file, prologue + body);
    try {
      run(process.execPath, [file], { cwd: consumer, timeout: 60_000 });
      pass(`${ext === "mjs" ? "ESM" : "CJS"} entry resolves and exports match`);
    } catch (e) {
      fail(`${ext === "mjs" ? "ESM" : "CJS"} entry failed: ${String(e.stdout || e.stderr || e.message).trim()}`);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Consumer TypeScript resolution against the bundled declarations
  // -------------------------------------------------------------------------
  const tsDir = path.join(REPO_ROOT, "node_modules", "typescript");
  // The compiler lives at lib/tsc.js in TS 5.x (bin/ only ships shims).
  const tsc = ["lib", "bin"]
    .map((d) => path.join(tsDir, d, "tsc.js"))
    .find((p) => existsSync(p));
  if (tsc) {
    const tsFile = path.join(consumer, "check.mts");
    writeFileSync(
      tsFile,
      `import { normalizeUrdu, sortUrdu, romanToUrdu, transliterateNameToUrdu } from "urdu-text-utils";
const a: string = normalizeUrdu("علی");
const b: string[] = sortUrdu(["علی", "احمد"]);
const c: string = romanToUrdu("pakistan");
const d: string = transliterateNameToUrdu("Ali");
console.log(a, b.length, c, d);`,
    );
    try {
      run(
        process.execPath,
        [tsc, "--noEmit", "--strict", "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", tsFile],
        { cwd: consumer, timeout: 90_000 },
      );
      pass("consumer TypeScript typechecks against the bundled d.ts");
    } catch (e) {
      fail(`consumer TypeScript failed: ${String(e.stdout || e.stderr || e.message).trim()}`);
    }
  } else {
    console.log("  (no local typescript found — skipping the d.ts consumer check)");
  }
} catch (e) {
  fail(`setup failed: ${String(e.stdout || e.stderr || e.message).trim()}`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\nsmoke-package: ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nsmoke-package: all checks passed for ${SPEC}`);
