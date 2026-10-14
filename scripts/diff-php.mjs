/**
 * Differential testing: execute the SAME randomized cases through the real
 * TypeScript implementation (dist/index.js) and the real PHP port
 * (php/tools/diff-runner.php), then fail on any disagreement.
 *
 * Why this exists, given the two suites already in the repo:
 * - php/tests/fixtures only covers inputs somebody thought to write down.
 * - scripts/verify-php-parity.mjs re-implements the PHP algorithms in
 *   JavaScript, so it validates the intended semantics but cannot observe
 *   PHP's own behaviour. It passed while every parseUrduDate call was broken.
 *
 * This compares the two ACTUAL implementations over a large randomized input
 * space, which is what surfaces the disagreements neither of those can see.
 *
 * Determinism: one seeded PRNG generates every case, so a run is reproducible
 * from its seed alone — same seed, same cases, same verdict, on any machine.
 * The wall clock is never read (parseUrduDate always receives an explicit
 * defaultYear) so a run cannot drift with time of day.
 *
 * Timezone: both runtimes are pinned to UTC and each side asserts it, because
 * wall-clock components are only comparable when the zones agree.
 *
 * Numeric domain: values stay within |value| <= 1e15, the precision boundary
 * numberToUrduWords documents. Beyond roughly 2^53 the two languages format
 * large integers differently BY DESIGN, and the difference is not a defect:
 * JavaScript prints the shortest decimal that round-trips
 * (1234567890123456800) while PHP's sprintf('%.0F') prints the double's exact
 * value (1234567890123456768). Fuzzing that range would emit permanent false
 * alarms, so the domain stops at the documented boundary.
 *
 * Probing that boundary is what surfaced the exponential-notation leak in
 * formatUrduNumber: String(1e21) is "1e+21", which reached output as "1e,+21"
 * with the grouping separator sitting inside the exponent. That defect is fixed
 * and locked by a unit test and by generated fixtures; only the representational
 * difference above 2^53 stays out of the fuzzed domain.
 *
 * Interface note: PHP declares these parameters as int or float|int under
 * strict_types, so a fractional month index throws there while JavaScript
 * floors it. Arguments are kept to the declared types (the documented
 * interface) rather than probing loose-vs-strict argument handling.
 *
 * Usage (npm run build first):
 *   node scripts/diff-php.mjs
 *   node scripts/diff-php.mjs --seed 42 --count 800
 *   node scripts/diff-php.mjs --fn formatUrduNumber
 *   PHP_BIN=/path/to/php node scripts/diff-php.mjs
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Pin the zone before the first Date is constructed. The PHP runner asserts the
// same zone; comparing across zones would make every date case meaningless.
process.env.TZ = "UTC";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Environment checks
// ---------------------------------------------------------------------------

const jsOffsetMinutes = new Date(Date.UTC(2026, 0, 15, 12)).getTimezoneOffset();
if (jsOffsetMinutes !== 0) {
  console.error(
    `diff-php: could not pin the JS runtime to UTC (offset ${jsOffsetMinutes} minutes).\n` +
      "Run with TZ=UTC set in the environment; comparing components across zones proves nothing.",
  );
  process.exit(2);
}

/** Candidate PHP binaries: $PHP_BIN, PATH, then the usual Windows install roots. */
function phpCandidates() {
  const list = [];
  if (process.env.PHP_BIN) list.push(process.env.PHP_BIN);
  list.push("php", "php.exe");

  if (process.platform === "win32") {
    const homes = [process.env.USERPROFILE, process.env.HOME].filter(Boolean);
    const bases = [];
    for (const home of homes) {
      bases.push(join(home, "php"), join(home, "scoop", "shims"), join(home, "scoop", "apps", "php", "current"));
    }
    bases.push("C:\\php", "C:\\tools\\php", "C:\\xampp\\php", "C:\\laragon\\bin\\php", "C:\\wamp64\\bin\\php");
    for (const base of bases) {
      list.push(join(base, "php.exe"));
      // The official Windows zip unpacks one level deep: php/php83/php.exe.
      try {
        for (const entry of readdirSync(base)) list.push(join(base, entry, "php.exe"));
      } catch {
        // Not a directory; skip.
      }
    }
  }

  return [...new Set(list)];
}

/** First candidate that actually runs, with its version. */
function resolvePhp() {
  for (const bin of phpCandidates()) {
    const probe = spawnSync(bin, ["-r", "echo PHP_VERSION;"], { encoding: "utf8" });
    if (probe.status === 0 && (probe.stdout ?? "").trim() !== "") {
      return { bin, version: probe.stdout.trim() };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

/** Accepts both `--name value` and `--name=value`. */
const argValue = (name, fallback) => {
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline !== undefined) return inline.slice(name.length + 3);
  const index = argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const next = argv[index + 1];
  // A trailing flag with no value must not silently become `true`.
  return next === undefined || next.startsWith("--") ? true : next;
};

/** A numeric flag that is missing its value is an error, not a default. */
function numberArg(name, fallback) {
  const raw = argValue(name, undefined);
  if (raw === undefined) return fallback;
  if (raw === true) {
    console.error(`diff-php: --${name} needs a value (use --${name}=<number> or --${name} <number>).`);
    process.exit(2);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    console.error(`diff-php: --${name} must be a number, got ${JSON.stringify(raw)}.`);
    process.exit(2);
  }
  return parsed;
}

const seed = numberArg("seed", 20260822);
const perFn = numberArg("count", 300);
const onlyFn = argValue("fn", null);
const maxReport = numberArg("max-report", 15);

if (perFn < 1) {
  console.error("diff-php: --count must be at least 1.");
  process.exit(2);
}
if (onlyFn === true) {
  console.error("diff-php: --fn needs a function name.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Implementation under test
// ---------------------------------------------------------------------------

let lib;
try {
  lib = await import(pathToFileURL(join(root, "dist", "index.js")).href);
} catch {
  console.error("diff-php: dist/index.js not found — run `npm run build` first.");
  process.exit(2);
}

const rng = mulberry32(seed);
const rnd = () => rng();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const intBetween = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const chance = (p) => rnd() < p;

/** JSON cannot carry NaN or Infinity; the fixtures use the same spellings. */
function wire(value) {
  if (Number.isNaN(value)) return "NAN";
  if (value === Infinity) return "INF";
  if (value === -Infinity) return "-INF";
  // JSON has no -0 distinct from 0, so normalize it here rather than let the
  // two sides disagree about a sign neither can carry.
  return value === 0 ? 0 : value;
}

// ---------------------------------------------------------------------------
// Input generation — numbers
// ---------------------------------------------------------------------------

/** The documented precision boundary (see the header note). */
const MAX_MAGNITUDE = 1e15;

const MAGNITUDES = [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15];

const EDGE_NUMBERS = [
  0, 1, -1, 2, 9, 10, 11, 19, 20, 21, 99, 100, 101, 999, 1000, 1001,
  1e5, 1e5 - 1, 1e7, 1e7 - 1, 1e9, 1e11, 1e12, 1e15 - 1,
  1234567, 12345678, 99999999, 100000000,
  0.5, -0.5, 0.05, 0.005, 1.005, 2.675, 9.999, 99.995, 0.1, 0.3,
  1234567.891, -1234567.891,
  "NAN", "INF", "-INF",
];

function randomNumber() {
  if (chance(0.18)) return pick(EDGE_NUMBERS);
  const magnitude = pick(MAGNITUDES);
  let value = rnd() * magnitude;
  value = chance(0.5) ? Math.round(value) : Number(value.toFixed(intBetween(0, 4)));
  return chance(0.4) ? -value : value;
}

/** Integers only — for the functions that reject fractions. */
function randomInteger() {
  if (chance(0.2)) return pick(EDGE_NUMBERS.filter((v) => typeof v === "number" && Number.isInteger(v)));
  const magnitude = pick(MAGNITUDES);
  const value = Math.round(rnd() * magnitude);
  return chance(0.4) ? -value : value;
}

const DIGITS = ["urdu", "english"];
const GROUPINGS = ["southAsian", "western", "none"];

function numberOptions() {
  const options = {};
  if (chance(0.85)) options.digits = pick(DIGITS);
  if (chance(0.85)) options.grouping = pick(GROUPINGS);
  if (chance(0.85)) options.decimals = pick([0, 1, 2, 3, 4, 5, 6, 15]);
  return options;
}

const URDU_DIGITS = [..."۰۱۲۳۴۵۶۷۸۹"];
const ARABIC_DIGITS = [..."٠١٢٣٤٥٦٧٨٩"];

function styleDigits(text, style) {
  if (style === "english") return text;
  return text.replace(/\d/gu, (d) =>
    style === "urdu" ? URDU_DIGITS[Number(d)] : style === "arabic" ? ARABIC_DIGITS[Number(d)] : d,
  );
}

/** Digit strings that exercise the parser's separators, signs and rejects. */
const INVALID_NUMBER_STRINGS = [
  "", " ", "abc", "-", "+", ".", "٫", "٬", "1.2.3", "1٫2٫3", "1e5", "Infinity", "-Infinity",
  "NaN", "0x10", "1/2", "١٢٣abc", "abc۱۲۳", "1 2 3", "%", "₨ 12", "12 کلو", "--1", "+-1",
  "1٫", "٫5", "٬٬", "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹", "-0", "+0", "007", "0.0",
];

function randomNumberString() {
  if (chance(0.2)) return pick(INVALID_NUMBER_STRINGS);

  const integerDigits = chance(0.12) ? "" : String(intBetween(0, 999999999));
  const fraction = chance(0.45) ? `.${String(intBetween(0, 9999)).padStart(intBetween(1, 4), "0")}` : "";
  let text = `${integerDigits}${fraction}`;
  if (chance(0.25)) text = `+${text}`;
  if (chance(0.3)) text = `-${text}`;

  // Grouping separators the parser is expected to ignore.
  if (chance(0.35)) text = text.replace(/\B(?=(\d{3})+(?!\d))/gu, pick(["٬", ","]));
  if (chance(0.25)) text = ` ${text} `;

  const style = pick(["english", "urdu", "arabic", "mixed"]);
  if (style === "mixed") {
    const sets = [["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], URDU_DIGITS, ARABIC_DIGITS];
    return text.replace(/\d/gu, (d) => pick(sets)[Number(d)]);
  }
  return styleDigits(text, style);
}

// ---------------------------------------------------------------------------
// Input generation — dates
// ---------------------------------------------------------------------------

const EDGE_YEARS = [100, 101, 999, 1000, 1234, 1582, 1900, 1970, 1999, 2000, 2026, 2038, 2100, 9999];

function randomComponents() {
  const y = chance(0.12) ? pick(EDGE_YEARS) : intBetween(1900, 2100);
  return {
    y,
    m: intBetween(0, 11),
    // Days 29-31 land on short months on purpose: both runtimes must roll the
    // date over identically.
    d: intBetween(1, 31),
    hh: intBetween(0, 23),
    mm: intBetween(0, 59),
    ss: intBetween(0, 59),
  };
}

const TOKENS = [
  "YYYY", "YY", "MMMM", "MMM", "MM", "M", "DD", "D", "dddd", "ddd",
  "HH", "H", "hh", "h", "mm", "m", "ss", "s", "A", "a",
];
const TOKEN_SEPARATORS = [" ", "، ", "،", "/", "-", ":", ".", " [", "] ", "(", ")", "\u200c", ""];
const PATTERN_LITERALS = ["سال", "بتاریخ", "at", "T", "ق", "ھ", "Z", "+05:00", "'", '"'];

function randomPattern() {
  const length = intBetween(1, 6);
  let pattern = "";
  for (let i = 0; i < length; i++) {
    if (i > 0 && chance(0.85)) pattern += pick(TOKEN_SEPARATORS);
    pattern += pick(TOKENS);
  }
  if (chance(0.15)) pattern = `${pattern} ${pick(PATTERN_LITERALS)}`;
  return pattern;
}

const REALISTIC_PATTERNS = [
  "DD MMMM YYYY",
  "dddd، D MMMM YYYY، hh:mm A",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "hh:mm A",
  "HH:mm:ss",
  "D MMMM YYYY، hh:mm، A",
  "MMMM YYYY",
  "dddd D MMMM YYYY",
];

const ENGLISH_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const ENGLISH_WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PERIOD_WORDS = ["صبح", "دوپہر", "شام", "رات", "am", "pm", "AM", "PM", "Am"];
const JUNK_WORDS = ["بتاریخ", "بروز", "at", "on", "،", "۔", "(", ")", "·", "ق", "ھ"];

function randomDateText() {
  const y = intBetween(1900, 2100);
  const monthIndex = intBetween(0, 11);
  const day = intBetween(1, 31);
  const pad = (n) => String(n).padStart(2, "0");

  const monthName = pick([
    lib.URDU_MONTHS_GREGORIAN[monthIndex],
    ENGLISH_MONTHS[monthIndex],
    ENGLISH_MONTHS[monthIndex].slice(0, 3),
    ENGLISH_MONTHS[monthIndex].replace(/^./u, (c) => c.toUpperCase()),
  ]);
  const weekday = pick([
    ...lib.URDU_WEEKDAYS,
    ...ENGLISH_WEEKDAYS,
    ...ENGLISH_WEEKDAYS.map((w) => w.slice(0, 3)),
  ]);
  const time = `${intBetween(0, 23)}:${pad(intBetween(0, 59))}`;
  const period = pick(PERIOD_WORDS);
  const style = pick(["english", "urdu", "arabic", "mixed"]);

  let text;
  switch (intBetween(0, 10)) {
    case 0: text = `${day} ${monthName} ${y}`; break;
    case 1: text = `${monthName} ${day}, ${y}`; break;
    case 2: text = `${weekday}، ${day} ${monthName} ${y}`; break;
    case 3: text = `${monthName} ${y}`; break;
    case 4: text = `${day} ${monthName}`; break;
    case 5: text = `${y}-${pad(monthIndex + 1)}-${pad(day)}`; break;
    case 6: text = `${day}/${monthIndex + 1}/${y}`; break;
    case 7: text = `${day} ${monthName} ${y}، ${time} ${period}`; break;
    case 8: text = `${weekday}، ${day} ${monthName} ${y}، ${time} ${period}`; break;
    case 9: text = `${y} ${monthName} ${day}`; break;
    // Malformed on purpose: impossible fields and stray words.
    default: text = `${day} ${monthName} ${y} ${pick(JUNK_WORDS)} ${intBetween(0, 99)}:${pad(intBetween(0, 99))}`; break;
  }

  if (chance(0.2)) text = `${text} ${pick(JUNK_WORDS)}`;
  if (chance(0.12)) text = `  ${text} `;
  if (style === "mixed") {
    const sets = [["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], URDU_DIGITS, ARABIC_DIGITS];
    return text.replace(/\d/gu, (d) => pick(sets)[Number(d)]);
  }
  return styleDigits(text, style);
}

/** A string produced by the real TS formatter, to be parsed back by both. */
function roundTripText() {
  const comps = randomComponents();
  const pattern = chance(0.5) ? pick(REALISTIC_PATTERNS) : randomPattern();
  const digits = pick(DIGITS);
  const date = new Date(comps.y, comps.m, comps.d, comps.hh, comps.mm, comps.ss);
  return { text: lib.formatUrduDate(date, pattern, { digits }), pattern, digits };
}

const TIME_AGO_OFFSETS = [
  0, 1, -1, 44, -44, 45, -45, 60, -60, 2699, 2700, -2700, 2701, -2701,
  3600, -3600, 79200, -79200, 79201, -79201, 86400, -86400, 172800, -172800,
  6 * 86400, -6 * 86400, 7 * 86400, -7 * 86400, 28 * 86400, -28 * 86400,
  29 * 86400, -29 * 86400, 320 * 86400, -320 * 86400, 321 * 86400, -321 * 86400,
  365 * 86400, -365 * 86400, 366 * 86400, -366 * 86400, 10 * 365 * 86400, -10 * 365 * 86400,
];

const UTC_BASE_SEC = Date.UTC(2026, 7, 22, 12, 0, 0) / 1000;

function randomTimeAgoOffset() {
  if (chance(0.5)) return pick(TIME_AGO_OFFSETS);
  return intBetween(-10 * 365 * 86400, 10 * 365 * 86400);
}

// ---------------------------------------------------------------------------
// Case construction
// ---------------------------------------------------------------------------

const cases = [];
const add = (fn, args, options = {}) => {
  if (onlyFn && fn !== onlyFn) return;
  cases.push({ id: cases.length, fn, args, options });
};

for (let i = 0; i < perFn; i++) {
  add("formatUrduNumber", [wire(randomNumber())], numberOptions());
  add("parseUrduNumber", [randomNumberString()], {});
  add("numberToUrduWords", [wire(randomInteger())], {});
  add("formatUrduCurrency", [wire(randomNumber())], chance(0.3) ? { ...numberOptions(), style: "words" } : numberOptions());
  add("toUrduOrdinal", [wire(randomInteger())], chance(0.5) ? {} : { gender: pick(["masculine", "feminine"]) });
  add("toUrduDigits", [randomNumberString()], {});
  add("toEnglishDigits", [randomNumberString()], {});
  add("toArabicIndicDigits", [randomNumberString()], {});
  add("convertNumbers", [randomNumberString(), pick(["urdu", "english", "arabic"])], {});

  add("formatUrduDate", [randomComponents(), randomPattern()], chance(0.5) ? { digits: pick(DIGITS) } : { digits: pick(DIGITS), calendar: pick(["gregorian", "hijri"]) });
  add("formatUrduDate", [randomComponents(), pick(REALISTIC_PATTERNS)], { digits: pick(DIGITS) });
  const { text } = roundTripText();
  add("parseUrduDate", [text], { defaultYear: intBetween(1900, 2100) });
  add("parseUrduDate", [randomDateText()], { defaultYear: intBetween(1900, 2100) });
  add("timeAgoUrdu", [{ baseSec: UTC_BASE_SEC, offsetSeconds: randomTimeAgoOffset() }], chance(0.5) ? {} : { digits: pick(DIGITS), addSuffix: chance(0.7) });
  add("getUrduMonthName", [intBetween(-24, 35)], chance(0.5) ? {} : { calendar: pick(["gregorian", "hijri"]) });
  add("getUrduWeekdayName", [intBetween(-14, 20)], {});
}

/** Non-integer arguments: both languages must reject them identically. */
for (const value of [0.5, 2.5, -3.7, 1.25, 1e15 + 0.5, -0.5]) {
  add("numberToUrduWords", [wire(value)], {});
  add("toUrduOrdinal", [wire(value)], {});
}

/** Exhaustive small ordinals and cardinals: catches table transcription slips. */
for (let value = 0; value <= 130; value++) {
  add("numberToUrduWords", [wire(value)], {});
  add("toUrduOrdinal", [wire(value)], {});
  add("toUrduOrdinal", [wire(value)], { gender: "feminine" });
}

/** Scale boundaries and their neighbours, where compound words go wrong. */
for (const boundary of [100, 1000, 1e5, 1e7, 1e9, 1e11, 1e12]) {
  for (const delta of [-2, -1, 0, 1, 2]) {
    const value = boundary + delta;
    if (value >= 0 && value <= MAX_MAGNITUDE) {
      add("numberToUrduWords", [wire(value)], {});
      add("toUrduOrdinal", [wire(value)], {});
    }
  }
}

if (cases.length === 0) {
  console.error(onlyFn ? `diff-php: no cases generated for --fn ${onlyFn}.` : "diff-php: no cases generated.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// TypeScript results
// ---------------------------------------------------------------------------

const decodeNumber = (value) => (value === "NAN" ? NaN : value === "INF" ? Infinity : value === "-INF" ? -Infinity : value);

function tsRun(testCase) {
  const { fn, args, options } = testCase;
  switch (fn) {
    case "toUrduDigits": return lib.toUrduDigits(args[0]);
    case "toEnglishDigits": return lib.toEnglishDigits(args[0]);
    case "toArabicIndicDigits": return lib.toArabicIndicDigits(args[0]);
    case "convertNumbers": return lib.convertNumbers(args[0], args[1]);
    case "parseUrduNumber": {
      const result = lib.parseUrduNumber(args[0]);
      return Number.isNaN(result) ? "NAN" : result;
    }
    case "numberToUrduWords": return lib.numberToUrduWords(decodeNumber(args[0]));
    case "formatUrduNumber": return lib.formatUrduNumber(decodeNumber(args[0]), options);
    case "formatUrduCurrency": return lib.formatUrduCurrency(decodeNumber(args[0]), options);
    case "toUrduOrdinal": return lib.toUrduOrdinal(decodeNumber(args[0]), options);
    case "getUrduMonthName": return lib.getUrduMonthName(args[0], args[1] ?? "gregorian");
    case "getUrduWeekdayName": return lib.getUrduWeekdayName(args[0]);
    case "formatUrduDate": {
      const c = args[0];
      const date = new Date(c.y, c.m, c.d, c.hh ?? 0, c.mm ?? 0, c.ss ?? 0);
      return lib.formatUrduDate(date, args[1] ?? "DD MMMM YYYY", options);
    }
    case "parseUrduDate": {
      const parsed = lib.parseUrduDate(args[0], options);
      if (parsed === null) return null;
      return {
        y: parsed.getFullYear(),
        m: parsed.getMonth(),
        d: parsed.getDate(),
        hh: parsed.getHours(),
        mm: parsed.getMinutes(),
        ss: parsed.getSeconds(),
      };
    }
    case "timeAgoUrdu":
      return lib.timeAgoUrdu(
        new Date((args[0].baseSec + args[0].offsetSeconds) * 1000),
        new Date(args[0].baseSec * 1000),
        options,
      );
    default:
      throw new Error(`unknown case function ${fn}`);
  }
}

const tsResults = cases.map((testCase) => {
  try {
    return { value: tsRun(testCase) };
  } catch (error) {
    return { error: error?.constructor?.name ?? "Error" };
  }
});

// ---------------------------------------------------------------------------
// PHP results — one process for the whole batch
// ---------------------------------------------------------------------------

const php = resolvePhp();
if (php === null) {
  console.error(
    "diff-php: no PHP binary found.\n" +
      "Looked for $PHP_BIN, php on PATH, and the usual Windows install roots\n" +
      "(e.g. C:\\Users\\<you>\\php\\php83\\php.exe). Point PHP_BIN at one and re-run.",
  );
  process.exit(2);
}

const runner = join(root, "php", "tools", "diff-runner.php");
const run = spawnSync(php.bin, [runner], {
  input: JSON.stringify({ cases }),
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});

if (run.error) {
  console.error(`diff-php: could not run ${php.bin}: ${run.error.message}`);
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(run.stdout);
} catch {
  console.error(`diff-php: could not parse the PHP runner's output (exit ${run.status}).`);
  if (run.stderr) console.error(run.stderr.trim());
  if (run.stdout) console.error(`stdout began: ${run.stdout.slice(0, 400)}`);
  process.exit(2);
}

if (payload.timezone !== "UTC") {
  console.error(`diff-php: the PHP runner reported timezone ${payload.timezone}, expected UTC.`);
  process.exit(2);
}
if (!Array.isArray(payload.results) || payload.results.length !== cases.length) {
  console.error(
    `diff-php: the PHP runner returned ${payload.results?.length ?? "no"} results for ${cases.length} cases.`,
  );
  if (run.stderr) console.error(run.stderr.trim());
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** Structural equality, so key order in the component objects cannot matter. */
function sameValue(a, b) {
  const aObject = a !== null && typeof a === "object";
  const bObject = b !== null && typeof b === "object";
  if (!aObject || !bObject) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length || aKeys.some((k, i) => k !== bKeys[i])) return false;
  return aKeys.every((k) => sameValue(a[k], b[k]));
}

const mismatches = [];
for (let i = 0; i < cases.length; i++) {
  const ts = tsResults[i];
  const phpResult = payload.results[i];
  const tsThrew = "error" in ts;
  const phpThrew = "err" in phpResult;
  // Error parity is a property in its own right: both languages must reject the
  // same inputs, with the same error class.
  const agrees = tsThrew || phpThrew
    ? tsThrew && phpThrew && ts.error === phpResult.err
    : sameValue(ts.value, phpResult.v);
  if (!agrees) {
    mismatches.push({
      testCase: cases[i],
      ts: tsThrew ? { err: ts.error } : { v: ts.value },
      php: phpThrew ? { err: phpResult.err } : { v: phpResult.v },
    });
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const line = (s = "") => console.log(s);

line("Differential test: TypeScript (dist) vs PHP");
line(`  seed         ${seed}`);
line(`  cases        ${cases.length}${onlyFn ? `  (--fn ${onlyFn})` : ""}`);
line(`  php          ${php.bin} (${payload.php})`);
line(`  timezone     JS=UTC  PHP=${payload.timezone}`);

if (mismatches.length === 0) {
  line();
  line(`No disagreements across ${cases.length} randomized cases.`);
  process.exit(0);
}

const byFn = new Map();
for (const m of mismatches) byFn.set(m.testCase.fn, (byFn.get(m.testCase.fn) ?? 0) + 1);

line();
line(`${mismatches.length} disagreement${mismatches.length === 1 ? "" : "s"}:`);

/** `""` and `null` are legitimate results, so test for thrown instead of falsy. */
const show = (side) => ("err" in side ? `threw ${side.err}` : JSON.stringify(side.v));

for (const m of mismatches.slice(0, maxReport)) {
  line();
  line(`  ${m.testCase.fn}  args=${JSON.stringify(m.testCase.args)}  options=${JSON.stringify(m.testCase.options)}`);
  line(`    TS : ${show(m.ts)}`);
  line(`    PHP: ${show(m.php)}`);
  line(`    case: ${JSON.stringify(m.testCase)}`);
}
if (mismatches.length > maxReport) {
  line();
  line(`  ... ${mismatches.length - maxReport} more (raise --max-report to see them)`);
}

line();
line("disagreements by function:");
for (const [fn, count] of [...byFn.entries()].sort((a, b) => b[1] - a[1])) {
  line(`  ${fn.padEnd(22)} ${count}`);
}

line();
line(`reproduce: node scripts/diff-php.mjs --seed ${seed}${onlyFn ? ` --fn ${onlyFn}` : ""}`);

process.exit(1);
