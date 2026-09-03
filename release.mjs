#!/usr/bin/env node
/**
 * One-command release script.
 *
 *   npm run release -- patch             # bump 0.2.1 -> 0.2.2
 *   npm run release -- minor             # bump 0.2.1 -> 0.3.0
 *   npm run release -- major             # bump 0.2.1 -> 1.0.0
 *   npm run release -- 0.3.0             # explicit version (incl. pre-releases)
 *
 * Does everything that used to be manual:
 *   1. bumps package.json and package-lock.json
 *   2. writes a CHANGELOG section generated from the commits since the last tag
 *   3. commits "chore: release vX.Y.Z", tags vX.Y.Z, and pushes both
 *      (the tag push is what triggers the CI Release workflow that publishes)
 *
 * Flags:  --yes (skip confirmation)  --no-push (commit + tag locally only)
 *         --dry-run (show the plan, change nothing)  --notes "text" (override
 *         the generated changelog section; use \n between bullet lines)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const git = (args, opts = {}) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const runGit = (args) => execFileSync("git", args, { cwd: ROOT, stdio: "inherit" });
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opts = { notes: null, dryRun: false, noPush: false, yes: false };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry-run") opts.dryRun = true;
  else if (a === "--no-push") opts.noPush = true;
  else if (a === "--yes") opts.yes = true;
  else if (a.startsWith("--notes=")) opts.notes = a.slice("--notes=".length);
  else if (a === "--notes") opts.notes = argv[++i];
  else positional.push(a);
}
if (opts.notes === undefined) fail("--notes requires a value");
const bump = positional[0] ?? "patch";

const pkgPath = path.join(ROOT, "package.json");
const lockPath = path.join(ROOT, "package-lock.json");
const changelogPath = path.join(ROOT, "CHANGELOG.md");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const current = pkg.version;

// ---------------------------------------------------------------------------
// Version arithmetic
// ---------------------------------------------------------------------------
const VER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;
const version = (() => {
  if (VER_RE.test(bump)) return bump; // explicit version
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(current);
  if (!m) fail(`cannot auto-bump from non-semver "${current}" — pass an explicit version`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "major") return `${maj + 1}.0.0`;
  fail(`unknown bump "${bump}" — use patch, minor, major, or an explicit version`);
})();
const tag = `v${version}`;

// ---------------------------------------------------------------------------
// CHANGELOG bullets from the commits since the last tag
// ---------------------------------------------------------------------------
let lastTag = null;
try {
  lastTag = git(["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"]);
} catch {
  /* no tags yet — use the whole history */
}
const commitRange = lastTag ? `${lastTag}..HEAD` : "HEAD";
const rawLog = git(["log", "--format=%s", commitRange]);
// Git lists newest first; the changelog reads oldest -> newest.
const generatedBullets = rawLog
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .reverse()
  .filter((s) => !/^chore:/i.test(s) && !/^Merge /.test(s) && s !== "sync")
  .map((s) => {
    const noPrefix = s.replace(/^[a-z]+:\s*/i, "");
    return "- " + noPrefix.charAt(0).toUpperCase() + noPrefix.slice(1);
  });
const bullets =
  opts.notes !== null
    ? opts.notes.split("\\n").map((b) => `- ${b.replace(/^- /, "")}`)
    : generatedBullets.length
      ? generatedBullets
      : ["- Version bump with no user-facing changes."];

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------
const porcelain = git(["status", "--porcelain"]);
if (porcelain) fail(`working tree is not clean — commit or stash first:\n${porcelain}`);

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (!opts.dryRun && !opts.noPush) {
  try {
    git(["remote", "get-url", "origin"]);
  } catch {
    fail("no git remote named 'origin' — cannot push");
  }
  git(["fetch", "origin", branch]);
  const behind = Number(git(["rev-list", "--count", `HEAD..origin/${branch}`]));
  if (behind > 0) fail(`local ${branch} is ${behind} commit(s) behind origin/${branch} — pull first`);
}

try {
  git(["rev-parse", "--verify", `refs/tags/${tag}`]);
  fail(`tag ${tag} already exists`);
} catch {
  /* tag is free */
}

const changelog = readFileSync(changelogPath, "utf8");
if (new RegExp(`(^|\\n)## ${esc(version)}\\n`, "m").test(changelog)) {
  fail(`CHANGELOG.md already has an entry for ${version}`);
}
const older = version.localeCompare(current, "en", { numeric: true }) < 0;
if (older) fail(`version ${version} is older than current ${current}`);

// ---------------------------------------------------------------------------
// Plan + confirmation
// ---------------------------------------------------------------------------
console.log(`release ${current} -> ${version} (${bump === version ? "explicit" : bump})`);
console.log(`  branch:  ${branch}`);
console.log(`  commits: ${commitRange === "HEAD" ? "full history" : commitRange} (${generatedBullets.length} changelog bullet${generatedBullets.length === 1 ? "" : "s"})`);
console.log(`  tag:     ${tag}${opts.noPush || opts.dryRun ? " (local only)" : " (pushed)"}`);
console.log(`  CHANGELOG ${version} section:`);
for (const b of bullets) console.log(`    ${b}`);

if (opts.dryRun) {
  console.log("\n(dry run — nothing changed)");
  process.exit(0);
}

if (!opts.yes) {
  if (!process.stdin.isTTY) fail("run with --yes for non-interactive use");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\nBump to ${version}, tag ${tag}, and push to origin/${branch}? This triggers the CI npm publish. [y/N] `,
  );
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("aborted");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Apply: bump files -> changelog -> commit -> tag -> push
// ---------------------------------------------------------------------------
const bumpVersionIn = (filePath) => {
  const raw = readFileSync(filePath, "utf8");
  const re = new RegExp(`"version": "${esc(current)}"`, "g");
  if (!re.test(raw)) fail(`${filePath} does not contain version ${current}`);
  writeFileSync(filePath, raw.replace(re, `"version": "${version}"`));
};
bumpVersionIn(pkgPath);
bumpVersionIn(lockPath);

writeFileSync(changelogPath, changelog.replace("# Changelog\n", `# Changelog\n\n## ${version}\n\n${bullets.join("\n")}\n\n`));

runGit(["add", "package.json", "package-lock.json", "CHANGELOG.md"]);
runGit(["commit", "-m", `chore: release v${version}`]);
runGit(["tag", "-a", tag, "-m", tag]);

if (!opts.noPush) {
  runGit(["push", "origin", branch]);
  runGit(["push", "origin", tag]);
  const host = pkg.homepage?.replace(/^https?:\/\/([^/]+)\/.*$/, "$1") ?? "github.com";
  console.log(`\npushed ${tag}. The Release workflow is now publishing urdu-text-utils@${version}:`);
  console.log(`  https://${host}/${pkg.repository?.url?.match(/github\.com[/:]([^/]+\/[^/.]+)/)?.[1] ?? ""}/actions`);
} else {
  console.log(`\ncreated ${tag} locally (not pushed). Push when ready:`);
  console.log(`  git push origin ${branch}`);
  console.log(`  git push origin ${tag}`);
}
