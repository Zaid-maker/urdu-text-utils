/**
 * Verify the BUILT docs site, not merely that the build exited zero.
 *
 * `npm run docs:build` exits 0 even when a page's frontmatter is malformed. It
 * happened: adding <DownloadStats /> put a `---` fence between `hero:` and
 * `features:`, which closed the frontmatter early. The feature entries and the
 * `#` icon-rationale lines were then ordinary page body: Markdown rendered them
 * as three <h1>s and a raw `features:` YAML block, and because VitePress takes
 * the first <h1> as the page title, the site's homepage <title> became
 * "VitePress renders a string icon with v-html...". The deploy was green, the
 * page was broken, and every page kept its correct-looking green build.
 *
 * So this reads the rendered HTML and asserts the invariants a visitor and a
 * search engine actually depend on:
 *
 *   1. title shape  - every page title ends with the configured titleTemplate
 *                     suffix and has a non-empty leading segment
 *   2. headings     - at most one <h1> per page (more than one is the signature
 *                     of prose that escaped the frontmatter)
 *   3. leaked YAML  - no frontmatter key left sitting in the body text
 *   4. block scalars- no `icon: |`-style YAML marker in the body text
 *   5. delimiters   - no stray `---` rendered as page text
 *   6. unrendered   - no `{{ }}` placeholder reached the output
 *
 * Fenced code blocks are stripped before the text checks, because the docs
 * legitimately show frontmatter examples inside them.
 *
 * Scope note: check 1 enforces the title's SHAPE. A title made of stray prose
 * still has a valid shape, so what actually catches that is checks 2-4 (the
 * corruption had 4 <h1>s and leaked `features:`), which is why they are here.
 *
 * Usage: node scripts/check-docs-output.mjs [--verbose]
 *        (run `npm run docs:build` first — this reads the build output)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "docs", ".vitepress", "dist");
const verbose = process.argv.includes("--verbose");

// ---------------------------------------------------------------------------
// Expected title shape, read from the live config so it cannot go stale
// ---------------------------------------------------------------------------

let suffix = "";
try {
  const config = readFileSync(join(root, "docs", ".vitepress", "config.mts"), "utf8");
  const template = /titleTemplate:\s*"([^"]*)"/u.exec(config);
  if (template) suffix = template[1].replace(":title", "").trim();
} catch {
  console.error("check-docs-output: could not read docs/.vitepress/config.mts");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Frontmatter keys whose appearance as rendered body text means the block broke
// ---------------------------------------------------------------------------

const FRONTMATTER_KEYS = new Set([
  "actions", "aside", "badge", "description", "details", "editLink", "features",
  "footer", "head", "hero", "home", "icon", "image", "imageAlt", "items", "lang",
  "lastUpdated", "layout", "link", "linkText", "name", "nav", "outline",
  "pageClass", "prev", "next", "search", "sidebar", "sitemap", "tagline",
  "text", "theme", "title", "titleTemplate", "type",
]);

/**
 * A page's own title is a heading, not a sentence. The corruption that
 * motivated this check put a 76-character running sentence in that slot, so a
 * segment longer than a heading gets flagged. The longest legitimate segment in
 * this site is 43 characters.
 */
const MAX_TITLE_SEGMENT = 70;

/** `features:` / `layout:` etc. at the start of a line of body text. */
const YAML_KEY_LINE = /^([A-Za-z][A-Za-z0-9_-]{0,30}):(?:\s|$)/u;
/** A YAML block scalar marker, e.g. `icon: |` — never valid body prose. */
const YAML_BLOCK_SCALAR = /^[A-Za-z][A-Za-z0-9_-]{0,30}:\s*[|>][-+]?\s*$/u;

// ---------------------------------------------------------------------------
// HTML -> visible text (code, scripts, styles and SVGs removed)
// ---------------------------------------------------------------------------

const BLOCK_TAGS = /<\/?(?:address|article|aside|blockquote|br|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)[^>]*>/giu;

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
};

function decodeEntities(text) {
  return text
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash|hellip);/gu, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/gu, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/giu, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)));
}

/** Rendered text a reader sees, one block per line. */
function visibleText(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    // Code samples may legitimately contain `---`, `icon: |` and frontmatter.
    .replace(/<pre[\s\S]*?<\/pre>/giu, " ")
    .replace(/<code[\s\S]*?<\/code>/giu, " ")
    .replace(/<svg[\s\S]*?<\/svg>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ");
  return decodeEntities(stripped.replace(BLOCK_TAGS, "\n").replace(/<[^>]+>/gu, ""));
}

function textLines(html) {
  return visibleText(html)
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Collect built pages
// ---------------------------------------------------------------------------

function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) found.push(full);
  }
  return found.sort();
}

function tagAttribute(tag, name) {
  const value = new RegExp(`\\b${name}=["']([^"']*)["']`, "iu").exec(tag);
  return value?.[1] ?? "";
}

function matchingMetaTags(html, attribute, value) {
  return [...html.matchAll(/<meta\b[^>]*>/giu)]
    .map(([tag]) => tag)
    .filter((tag) => tagAttribute(tag, attribute) === value);
}

let files;
try {
  files = htmlFiles(distDir);
} catch {
  console.error(
    `check-docs-output: no build output at ${relative(root, distDir)}\n` +
      "Run `npm run docs:build` first.",
  );
  process.exit(2);
}

// Scanning nothing must fail: a missing or empty build is not a pass.
if (files.length === 0) {
  console.error(`check-docs-output: found no .html files under ${relative(root, distDir)}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/** @returns {string[]} problems found on this page */
function checkPage(html, page) {
  const problems = [];
  const pageText = textLines(html);

  // 1. Title shape.
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(html);
  if (!titleMatch) {
    problems.push("no <title> element");
  } else {
    const title = decodeEntities(titleMatch[1]).trim();
    if (title === "") problems.push("<title> is empty");
    if (/[\r\n]/u.test(title)) problems.push("<title> contains a line break");
    if (/\{\{|\}\}/u.test(title)) problems.push(`<title> has an unrendered placeholder: ${title}`);
    if (/<!--|-->/u.test(title)) problems.push(`<title> contains an HTML comment marker: ${title}`);
    if (suffix !== "") {
      if (!title.endsWith(suffix)) {
        problems.push(`<title> does not end with the configured suffix ${JSON.stringify(suffix)}: ${title}`);
      } else {
        const own = title.slice(0, title.length - suffix.length).trim();
        if (own === "") {
          problems.push(`<title> has an empty leading segment before the suffix: ${title}`);
        } else if (own.length > MAX_TITLE_SEGMENT) {
          problems.push(
            `page title segment is ${own.length} characters (> ${MAX_TITLE_SEGMENT}), which usually means prose leaked in: ${own}`,
          );
        }
      }
    }
  }

  // 2. Heading count: more than one <h1> means prose escaped the frontmatter.
  const h1Count = (html.match(/<h1[\s>]/giu) ?? []).length;
  if (h1Count > 1) problems.push(`more than one <h1>: ${h1Count}`);

  // 3-5. YAML that reached the page.
  const leakedKeys = [];
  const leakedScalars = [];
  const strayDelimiters = [];
  for (const line of pageText) {
    const key = YAML_KEY_LINE.exec(line);
    if (key && FRONTMATTER_KEYS.has(key[1])) {
      leakedKeys.push(line.slice(0, 90));
      continue;
    }
    if (YAML_BLOCK_SCALAR.test(line)) leakedScalars.push(line.slice(0, 60));
    if (line === "---") strayDelimiters.push("---");
  }
  if (leakedKeys.length > 0) {
    problems.push(`frontmatter key rendered as body text (${leakedKeys.length}): ${leakedKeys.slice(0, 3).join(" | ")}`);
  }
  if (leakedScalars.length > 0) {
    problems.push(`YAML block scalar rendered as body text (${leakedScalars.length}): ${leakedScalars.slice(0, 3).join(" | ")}`);
  }
  if (strayDelimiters.length > 0) {
    problems.push(`stray frontmatter delimiter rendered as body text (${strayDelimiters.length})`);
  }

  // 6. Unrendered template placeholders.
  const mustache = pageText.find((line) => /\{\{|\}\}/u.test(line));
  if (mustache) problems.push(`unrendered placeholder in body text: ${mustache.slice(0, 90)}`);

  // Page-level SEO metadata must point to the page itself rather than repeat
  // the homepage URL and description on every route. VitePress generates its
  // own 404 page without passing it through transformPageData.
  if (page === "404.html") return { problems, canonical: "", description: "", keywords: "" };

  const canonicalTags = [...html.matchAll(/<link\b[^>]*>/giu)]
    .map(([tag]) => tag)
    .filter((tag) => tagAttribute(tag, "rel") === "canonical");
  const canonical = canonicalTags.length === 1 ? tagAttribute(canonicalTags[0], "href") : "";
  if (canonicalTags.length !== 1 || canonical === "") {
    problems.push(`expected one non-empty canonical URL, found ${canonicalTags.length}`);
  }

  const descriptions = matchingMetaTags(html, "name", "description");
  const description =
    descriptions.length === 1 ? tagAttribute(descriptions[0], "content") : "";
  if (descriptions.length !== 1 || description === "") {
    problems.push(`expected one non-empty page description, found ${descriptions.length}`);
  }

  const ogUrls = matchingMetaTags(html, "property", "og:url");
  const ogUrl = ogUrls.length === 1 ? tagAttribute(ogUrls[0], "content") : "";
  if (ogUrls.length !== 1 || ogUrl === "" || ogUrl !== canonical) {
    problems.push("expected one og:url matching the canonical URL");
  }

  const ogTitles = matchingMetaTags(html, "property", "og:title");
  if (ogTitles.length !== 1 || tagAttribute(ogTitles[0], "content") === "") {
    problems.push(`expected one non-empty og:title, found ${ogTitles.length}`);
  }

  const ogDescriptions = matchingMetaTags(html, "property", "og:description");
  if (
    ogDescriptions.length !== 1 ||
    tagAttribute(ogDescriptions[0], "content") !== description
  ) {
    problems.push("expected one og:description matching the page description");
  }

  const keywordTags = matchingMetaTags(html, "name", "keywords");
  const keywords = keywordTags.length === 1 ? tagAttribute(keywordTags[0], "content") : "";
  if (keywordTags.length !== 1 || keywords === "") {
    problems.push(`expected one non-empty page keyword list, found ${keywordTags.length}`);
  } else {
    const terms = keywords.split(",").map((term) => term.trim().toLocaleLowerCase("en"));
    if (terms.length > 8) problems.push(`page keyword list is too long (${terms.length} terms; maximum 8)`);
    if (new Set(terms).size !== terms.length) problems.push("page keyword list contains duplicate terms");
  }

  return { problems, canonical, description, keywords };
}

const failures = [];
const canonicalOwners = new Map();
const descriptionOwners = new Map();
const keywordOwners = new Map();
let checked = 0;
for (const file of files) {
  const html = readFileSync(file, "utf8");
  checked++;
  const page = relative(distDir, file);
  const { problems, canonical, description, keywords } = checkPage(html, page);
  if (canonical) {
    const owner = canonicalOwners.get(canonical);
    if (owner) problems.push(`canonical URL is duplicated by ${owner}: ${canonical}`);
    else canonicalOwners.set(canonical, page);
  }
  if (description) {
    const owner = descriptionOwners.get(description);
    if (owner) problems.push(`page description is duplicated by ${owner}`);
    else descriptionOwners.set(description, page);
  }
  if (keywords) {
    const owner = keywordOwners.get(keywords);
    if (owner) problems.push(`page keyword list is duplicated by ${owner}`);
    else keywordOwners.set(keywords, page);
  }
  if (problems.length > 0) failures.push({ file: page, problems });
  else if (verbose) console.log(`  ok  ${page}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("Docs output check (rendered HTML)");
console.log(`  pages checked  ${checked}`);
console.log(`  title suffix   ${JSON.stringify(suffix)}`);
console.log(`  unique canonicals  ${canonicalOwners.size}`);
console.log(`  unique descriptions  ${descriptionOwners.size}`);
console.log(`  unique keyword lists  ${keywordOwners.size}`);

if (failures.length === 0) {
  console.log(`\nAll ${checked} built pages passed.`);
  process.exit(0);
}

const total = failures.reduce((n, f) => n + f.problems.length, 0);
console.log(`\n${total} problem${total === 1 ? "" : "s"} on ${failures.length} page${failures.length === 1 ? "" : "s"}:`);
for (const failure of failures) {
  console.log(`\n  ${failure.file}`);
  for (const problem of failure.problems) console.log(`    - ${problem}`);
}
console.log(
  "\nThe usual cause is a frontmatter fence in the wrong place: a `---` inside the block\n" +
    "closes it early and everything after it renders as page content. See docs/index.md.",
);
process.exit(1);
