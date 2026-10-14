import { toEnglishDigits, toUrduDigits } from "./numbers.js";

/**
 * Gregorian month names in Urdu (standard literary transliterations).
 * Index 0 corresponds to January (جنوری).
 */
export const URDU_MONTHS_GREGORIAN = [
  "جنوری",
  "فروری",
  "مارچ",
  "اپریل",
  "مئی",
  "جون",
  "جولائی",
  "اگست",
  "ستمبر",
  "اکتوبر",
  "نومبر",
  "دسمبر",
] as const;

/**
 * Islamic (Hijri) month names in Urdu.
 * Index 0 corresponds to Muharram (محرم).
 */
export const URDU_MONTHS_HIJRI = [
  "محرم",
  "صفر",
  "ربیع الاول",
  "ربیع الثانی",
  "جمادی الاول",
  "جمادی الثانی",
  "رجب",
  "شعبان",
  "رمضان المبارک",
  "شوال",
  "ذی القعدہ",
  "ذی الحجہ",
] as const;

/**
 * Days of the week in Urdu.
 * Index 0 corresponds to Sunday (اتوار).
 */
export const URDU_WEEKDAYS = [
  "اتوار",
  "پیر",
  "منگل",
  "بدھ",
  "جمعرات",
  "جمعہ",
  "ہفتہ",
] as const;

export interface FormatUrduDateOptions {
  /**
   * Digit style to use for numeric tokens (e.g. YYYY, MM, DD, HH, mm, ss).
   * @default "urdu"
   */
  digits?: "urdu" | "english";
  /**
   * Calendar month naming scheme to use for `MMMM` and `MMM`.
   * @default "gregorian"
   */
  calendar?: "gregorian" | "hijri";
}

export interface TimeAgoOptions {
  /**
   * Digit style to use for counts (e.g. "۵ منٹ پہلے" vs "5 منٹ پہلے").
   * @default "urdu"
   */
  digits?: "urdu" | "english";
  /**
   * Whether to include the relative suffix/prefix ("پہلے" or "بعد").
   * When `false`, returns only the duration string (e.g. "۵ منٹ", "ایک گھنٹہ").
   * @default true
   */
  addSuffix?: boolean;
}

function parseDateInput(input: Date | string | number): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns the Urdu name for a given month index (0 to 11).
 *
 * @param monthIndex - 0 for January / Muharram, 11 for December / Dhul Hijjah.
 * @param calendar - "gregorian" or "hijri". Default is "gregorian".
 */
export function getUrduMonthName(
  monthIndex: number,
  calendar: "gregorian" | "hijri" = "gregorian"
): string {
  const normalizedIndex = Math.floor(monthIndex) % 12;
  const idx = normalizedIndex < 0 ? normalizedIndex + 12 : normalizedIndex;
  return calendar === "hijri" ? URDU_MONTHS_HIJRI[idx]! : URDU_MONTHS_GREGORIAN[idx]!;
}

/**
 * Returns the Urdu name for a day of the week (0 = Sunday, 6 = Saturday).
 */
export function getUrduWeekdayName(dayIndex: number): string {
  const normalizedIndex = Math.floor(dayIndex) % 7;
  const idx = normalizedIndex < 0 ? normalizedIndex + 7 : normalizedIndex;
  return URDU_WEEKDAYS[idx]!;
}

/**
 * Formats a Date object or timestamp into an Urdu formatted date string.
 *
 * Supported formatting tokens:
 * - `YYYY`: Full year (e.g. "۲۰۲۶")
 * - `YY`: Two-digit year (e.g. "۲۶")
 * - `MMMM`: Full Urdu month name (e.g. "اگست")
 * - `MMM`: Full Urdu month name (e.g. "اگست")
 * - `MM`: 2-digit month with leading zero (e.g. "۰۸")
 * - `M`: 1-digit month (e.g. "۸")
 * - `DD`: 2-digit day of month with leading zero (e.g. "۰۵")
 * - `D`: 1-digit day of month (e.g. "۵")
 * - `dddd`: Full day of the week (e.g. "ہفتہ", "جمعہ")
 * - `ddd`: Short day of the week (same in Urdu)
 * - `HH`: 24-hour hour with leading zero (00-23)
 * - `H`: 24-hour hour (0-23)
 * - `hh`: 12-hour hour with leading zero (01-12)
 * - `h`: 12-hour hour (1-12)
 * - `mm`: Minute with leading zero (00-59)
 * - `m`: Minute (0-59)
 * - `ss`: Second with leading zero (00-59)
 * - `s`: Second (0-59)
 * - `A`: Day period indicator in Urdu ("صبح", "دوپہر", "شام", "رات")
 * - `a`: Concise period indicator ("صبح", "شام")
 *
 * @example
 * formatUrduDate(new Date(2026, 7, 22), "DD MMMM YYYY")
 * // "۲۲ اگست ۲۰۲۶"
 *
 * formatUrduDate(new Date(2026, 7, 22, 14, 30), "dddd، D MMMM YYYY، hh:mm A")
 * // "ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"
 */
export function formatUrduDate(
  date: Date | string | number,
  pattern: string = "DD MMMM YYYY",
  options: FormatUrduDateOptions = {}
): string {
  const d = parseDateInput(date);
  if (!d) return "";

  const digits = options.digits ?? "urdu";
  const calendar = options.calendar ?? "gregorian";

  const year = d.getFullYear();
  const month = d.getMonth();
  const dayOfMonth = d.getDate();
  const dayOfWeek = d.getDay();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Day period calculation
  let periodDetailed: string;
  let periodSimple: string;
  if (hours24 >= 4 && hours24 < 12) {
    periodDetailed = "صبح";
    periodSimple = "صبح";
  } else if (hours24 >= 12 && hours24 < 16) {
    periodDetailed = "دوپہر";
    periodSimple = "شام";
  } else if (hours24 >= 16 && hours24 < 20) {
    periodDetailed = "شام";
    periodSimple = "شام";
  } else {
    periodDetailed = "رات";
    periodSimple = "رات";
  }

  const tokenValues: Record<string, string> = {
    YYYY: `${year}`,
    YY: `${year}`.slice(-2),
    MMMM: getUrduMonthName(month, calendar),
    MMM: getUrduMonthName(month, calendar),
    MM: pad(month + 1),
    M: `${month + 1}`,
    DD: pad(dayOfMonth),
    D: `${dayOfMonth}`,
    dddd: getUrduWeekdayName(dayOfWeek),
    ddd: getUrduWeekdayName(dayOfWeek),
    HH: pad(hours24),
    H: `${hours24}`,
    hh: pad(hours12),
    h: `${hours12}`,
    mm: pad(minutes),
    m: `${minutes}`,
    ss: pad(seconds),
    s: `${seconds}`,
    A: periodDetailed,
    a: periodSimple,
  };

  // Replace tokens by matching largest token keys first
  const regex = /YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a/g;

  const result = pattern.replace(regex, (match) => {
    const val = tokenValues[match];
    if (val === undefined) return match;
    if (digits === "urdu" && /^\d+$/.test(val)) {
      return toUrduDigits(val);
    }
    return val;
  });

  return result;
}

/**
 * Returns a human-friendly relative time string in Urdu.
 *
 * @example
 * timeAgoUrdu(Date.now() - 30 * 1000)       // "ابھی"
 * timeAgoUrdu(Date.now() - 5 * 60 * 1000)   // "۵ منٹ پہلے"
 * timeAgoUrdu(Date.now() - 3 * 3600 * 1000) // "۳ گھنٹے پہلے"
 * timeAgoUrdu(Date.now() - 86400 * 1000)    // "کل"
 * timeAgoUrdu(Date.now() + 5 * 60 * 1000)   // "۵ منٹ بعد"
 */
export function timeAgoUrdu(
  date: Date | string | number,
  relativeTo: Date | string | number = new Date(),
  options: TimeAgoOptions = {}
): string {
  const d = parseDateInput(date);
  const now = parseDateInput(relativeTo);
  if (!d || !now) return "";

  const digits = options.digits ?? "urdu";
  const addSuffix = options.addSuffix ?? true;

  const formatNum = (num: number): string => {
    const s = `${num}`;
    return digits === "urdu" ? toUrduDigits(s) : s;
  };

  const diffMs = now.getTime() - d.getTime();
  const isPast = diffMs >= 0;
  const absDiffSeconds = Math.round(Math.abs(diffMs) / 1000);

  // Less than 45 seconds
  if (absDiffSeconds < 45) {
    return isPast ? "ابھی" : "چند لمحے بعد";
  }

  // Minutes (45s to 45m)
  const minutes = Math.round(absDiffSeconds / 60);
  if (minutes <= 45) {
    if (minutes === 1) {
      if (!addSuffix) return "ایک منٹ";
      return isPast ? "ایک منٹ پہلے" : "ایک منٹ بعد";
    }
    const count = formatNum(minutes);
    if (!addSuffix) return `${count} منٹ`;
    return isPast ? `${count} منٹ پہلے` : `${count} منٹ بعد`;
  }

  // Hours (45m to 22 hours)
  const hours = Math.round(minutes / 60);
  if (hours <= 22) {
    if (hours === 1) {
      if (!addSuffix) return "ایک گھنٹہ";
      return isPast ? "ایک گھنٹہ پہلے" : "ایک گھنٹہ بعد";
    }
    const count = formatNum(hours);
    if (!addSuffix) return `${count} گھنٹے`;
    return isPast ? `${count} گھنٹے پہلے` : `${count} گھنٹے بعد`;
  }

  // Days (22 hours to 6 days)
  const days = Math.round(hours / 24);
  if (days === 1) {
    return isPast ? "کل" : "کل";
  }
  if (days === 2) {
    return isPast ? "پرسوں" : "پرسوں";
  }
  if (days <= 6) {
    const count = formatNum(days);
    if (!addSuffix) return `${count} دن`;
    return isPast ? `${count} دن پہلے` : `${count} دن بعد`;
  }

  // Weeks (7 days to 28 days)
  const weeks = Math.round(days / 7);
  if (days <= 28) {
    if (weeks === 1) {
      if (!addSuffix) return "ایک ہفتہ";
      return isPast ? "ایک ہفتہ پہلے" : "ایک ہفتہ بعد";
    }
    const count = formatNum(weeks);
    if (!addSuffix) return `${count} ہفتے`;
    return isPast ? `${count} ہفتے پہلے` : `${count} ہفتے بعد`;
  }

  // Months (29 days to 320 days)
  const months = Math.round(days / 30.44);
  if (days <= 320) {
    if (months <= 1) {
      if (!addSuffix) return "ایک ماہ";
      return isPast ? "ایک ماہ پہلے" : "ایک ماہ بعد";
    }
    const count = formatNum(months);
    if (!addSuffix) return `${count} ماہ`;
    return isPast ? `${count} ماہ پہلے` : `${count} ماہ بعد`;
  }

  // Years (> 320 days)
  const years = Math.round(days / 365.25);
  if (years <= 1) {
    if (!addSuffix) return "ایک سال";
    return isPast ? "ایک سال پہلے" : "ایک سال بعد";
  }
  const count = formatNum(years);
  if (!addSuffix) return `${count} سال`;
  return isPast ? `${count} سال پہلے` : `${count} سال بعد`;
}

const ENGLISH_MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const ENGLISH_WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Recognised month spellings -> month index. Only Gregorian names are
 * accepted: Hijri names include صفر, which is also the Urdu word for zero and
 * would make a bare `صفر` genuinely ambiguous.
 */
const MONTH_LOOKUP: Record<string, number> = (() => {
  // Prototype-free: a token like "constructor" must look up as undefined, not
  // as an inherited Object.prototype member.
  const lookup: Record<string, number> = Object.create(null) as Record<string, number>;
  URDU_MONTHS_GREGORIAN.forEach((name, index) => {
    lookup[name] = index;
  });
  ENGLISH_MONTH_NAMES.forEach((name, index) => {
    lookup[name] = index;
    lookup[name.slice(0, 3)] = index;
  });
  return lookup;
})();

/** Weekday names are recognised only so they can be skipped, never used. */
const WEEKDAY_TOKENS = new Set<string>();
for (const name of URDU_WEEKDAYS) WEEKDAY_TOKENS.add(name);
for (const name of ENGLISH_WEEKDAY_NAMES) {
  WEEKDAY_TOKENS.add(name);
  WEEKDAY_TOKENS.add(name.slice(0, 3));
}

/**
 * The day-period words `formatUrduDate` emits, and the 12-hour window each one
 * covers, so parsing can invert formatting exactly.
 *
 * `رات` is the awkward one: it spans 20:00-03:59, which `hh` renders as 08-11
 * and 12, 1, 2, 3 respectively. Both halves therefore have to be resolved back.
 */
const URDU_PERIODS: Record<string, "morning" | "afternoon" | "evening" | "night"> = Object.assign(
  Object.create(null) as Record<string, "morning" | "afternoon" | "evening" | "night">,
  {
    صبح: "morning",
    دوپہر: "afternoon",
    شام: "evening",
    رات: "night",
  },
);

type PeriodHint = "am" | "pm" | "morning" | "afternoon" | "evening" | "night";

/** Resolve a 12-hour clock reading plus its period word to a 24-hour hour. */
function resolveHour(hour: number, period: PeriodHint | undefined): number {
  switch (period) {
    case "am":
    case "morning":
      return hour === 12 ? 0 : hour;
    case "pm":
    case "afternoon":
    case "evening":
      return hour < 12 ? hour + 12 : hour;
    case "night":
      if (hour === 12) return 0;
      // 20:00-23:59 formats as hh 08-11 with رات; 00:00-03:59 as 12, 1, 2, 3.
      return hour >= 8 && hour <= 11 ? hour + 12 : hour;
    default:
      return hour;
  }
}

/** Build a Date from wall-clock components, rejecting overflowed dates. */
function buildLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  if (!Number.isInteger(year) || year < 100) return null;
  if (!Number.isInteger(month) || month < 0 || month > 11) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (!Number.isInteger(second) || second < 0 || second > 59) return null;

  const date = new Date(year, month, day, hour, minute, second);
  // A rolled-over date (31 فروری) must not silently become March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour
  ) {
    return null;
  }
  return date;
}

/** Expand a two-digit year the way date libraries conventionally do. */
function expandYear(year: number): number {
  if (year >= 100) return year;
  return year < 70 ? 2000 + year : 1900 + year;
}

const INVISIBLE_CHARS_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/gu;

/** Numeric date form, day-first (Pakistani convention) or ISO with a 4-digit lead. */
function parseNumericDate(input: string): Date | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/u.exec(input);
  if (iso) {
    return buildLocalDate(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      iso[4] === undefined ? 0 : Number(iso[4]),
      iso[5] === undefined ? 0 : Number(iso[5]),
      iso[6] === undefined ? 0 : Number(iso[6]),
    );
  }

  const dayFirst = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/u.exec(input);
  if (dayFirst) {
    return buildLocalDate(
      expandYear(Number(dayFirst[3])),
      Number(dayFirst[2]) - 1,
      Number(dayFirst[1]),
      dayFirst[4] === undefined ? 0 : Number(dayFirst[4]),
      dayFirst[5] === undefined ? 0 : Number(dayFirst[5]),
      dayFirst[6] === undefined ? 0 : Number(dayFirst[6]),
    );
  }

  return null;
}

export interface ParseUrduDateOptions {
  /**
   * Year assumed when the input carries no year, e.g. `۲۲ اگست`.
   * @default the current year
   */
  defaultYear?: number;
}

/**
 * Parse a date written with Urdu or English month names, Urdu or ASCII digits,
 * into a `Date`. This is the inverse of {@link formatUrduDate}, so anything
 * that function can produce parses back to the same wall-clock moment:
 *
 * ```ts
 * const d = new Date(2026, 7, 22, 14, 30);
 * const text = formatUrduDate(d, "dddd، D MMMM YYYY، hh:mm A"); // "ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"
 * parseUrduDate(text)?.getHours();                            // 14
 * ```
 *
 * Accepted input:
 * - `۲۲ اگست ۲۰۲۶`, `22 August 2026`, `Aug 22, 2026` (Urdu or English month name)
 * - `۲۲/۰۸/۲۰۲۶` — day-first, matching Pakistani convention
 * - `2026-08-22` and `2026-08-22T14:30` — ISO, `` `T` `` form, no timezone offset
 * - an optional preceding weekday name (ignored) and an optional time with
 *   `صبح دوپہر شام رات` or `am`/`pm`, e.g. `۰۲:۳۰ دوپہر`
 *
 * Deliberately rejected, returning `null`: absolute instants carrying a `Z` or
 * numeric offset (this function never does timezone conversion — it builds the
 * wall-clock time in the runtime's own zone, exactly as `formatUrduDate`
 * reads it), Hijri month names, and dates that do not exist (`۳۱ فروری`).
 * A two-digit year expands as `00-69` -> `20xx` and `70-99` -> `19xx`.
 *
 * @example
 * parseUrduDate("۲۲ اگست ۲۰۲۶")                    // Date(2026, 7, 22)
 * parseUrduDate("۵ جنوری ۲۰۲۶، ۰۹:۱۵ صبح")?.getHours() // 9
 * parseUrduDate("5 جنوری")                         // Date(currentYear, 0, 5)
 * parseUrduDate("۳۱ فروری ۲۰۲۶")                   // null
 */
export function parseUrduDate(input: string, options: ParseUrduDateOptions = {}): Date | null {
  if (!input) return null;

  const normalized = toEnglishDigits(input)
    .replace(INVISIBLE_CHARS_RE, "")
    .replace(/[،۔]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (normalized === "") return null;

  const numeric = parseNumericDate(normalized);
  if (numeric) return numeric;

  let month: number | null = null;
  let hour: number | null = null;
  let minute = 0;
  let second = 0;
  let period: PeriodHint | undefined;
  const numbers: number[] = [];

  for (const rawToken of normalized.split(" ")) {
    // Strip punctuation hugging a token ("۲۰۲۶،" is already spaced out, but
    // "2026." and "(۲۰۲۶)" are not).
    const token = rawToken.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
    if (token === "") continue;

    const urduPeriod = URDU_PERIODS[token];
    if (urduPeriod) {
      period = urduPeriod;
      continue;
    }

    const lower = token.toLowerCase();
    if (lower === "am" || lower === "pm") {
      period = lower;
      continue;
    }

    if (WEEKDAY_TOKENS.has(token) || WEEKDAY_TOKENS.has(lower)) continue;

    const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/u.exec(token);
    if (time) {
      hour = Number(time[1]);
      minute = Number(time[2]);
      second = time[3] === undefined ? 0 : Number(time[3]);
      continue;
    }

    const monthIndex = MONTH_LOOKUP[token] ?? MONTH_LOOKUP[lower];
    if (monthIndex !== undefined) {
      month = monthIndex;
      continue;
    }

    if (/^\d+$/u.test(token)) numbers.push(Number(token));
    // Anything else ("بتاریخ", stray words) is ignored rather than fatal, so a
    // decorated date string still parses.
  }

  if (month === null || numbers.length === 0) return null;

  let day: number;
  let year: number;
  if (numbers.length === 1) {
    const only = numbers[0]!;
    if (only > 31) {
      // "جنوری ۲۰۲۶" — month precision, resolved to the first of the month.
      day = 1;
      year = only;
    } else {
      day = only;
      year = options.defaultYear ?? new Date().getFullYear();
    }
  } else {
    const first = numbers[0]!;
    const last = numbers[numbers.length - 1]!;
    // Day-first, but tolerate a year that leads ("۲۰۲۶ اگست ۲۲").
    if (first > 31 && last <= 31) {
      day = last;
      year = first;
    } else {
      day = first;
      year = last;
    }
  }

  return buildLocalDate(
    expandYear(year),
    month,
    day,
    hour === null ? 0 : resolveHour(hour, period),
    minute,
    second,
  );
}
