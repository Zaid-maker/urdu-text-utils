import { toUrduDigits } from "./numbers.js";

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
