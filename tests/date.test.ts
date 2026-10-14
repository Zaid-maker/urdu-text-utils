import { describe, expect, it } from "vitest";
import {
  URDU_MONTHS_GREGORIAN,
  URDU_MONTHS_HIJRI,
  URDU_WEEKDAYS,
  formatUrduDate,
  getUrduMonthName,
  getUrduWeekdayName,
  parseUrduDate,
  timeAgoUrdu,
} from "../src/date.js";

describe("URDU_MONTHS & URDU_WEEKDAYS constants", () => {
  it("contains all 12 Gregorian months in Urdu", () => {
    expect(URDU_MONTHS_GREGORIAN).toHaveLength(12);
    expect(URDU_MONTHS_GREGORIAN[0]).toBe("جنوری");
    expect(URDU_MONTHS_GREGORIAN[7]).toBe("اگست");
    expect(URDU_MONTHS_GREGORIAN[11]).toBe("دسمبر");
  });

  it("contains all 12 Hijri months in Urdu", () => {
    expect(URDU_MONTHS_HIJRI).toHaveLength(12);
    expect(URDU_MONTHS_HIJRI[0]).toBe("محرم");
    expect(URDU_MONTHS_HIJRI[8]).toBe("رمضان المبارک");
    expect(URDU_MONTHS_HIJRI[9]).toBe("شوال");
  });

  it("contains all 7 days of the week in Urdu", () => {
    expect(URDU_WEEKDAYS).toHaveLength(7);
    expect(URDU_WEEKDAYS[0]).toBe("اتوار");
    expect(URDU_WEEKDAYS[1]).toBe("پیر");
    expect(URDU_WEEKDAYS[5]).toBe("جمعہ");
    expect(URDU_WEEKDAYS[6]).toBe("ہفتہ");
  });

  it("retrieves month and weekday names safely with wrap-around", () => {
    expect(getUrduMonthName(0)).toBe("جنوری");
    expect(getUrduMonthName(7)).toBe("اگست");
    expect(getUrduMonthName(8, "hijri")).toBe("رمضان المبارک");
    expect(getUrduWeekdayName(0)).toBe("اتوار");
    expect(getUrduWeekdayName(5)).toBe("جمعہ");
  });

  it("wraps indices beyond the array bounds", () => {
    expect(getUrduMonthName(12)).toBe("جنوری");
    expect(getUrduMonthName(-1)).toBe("دسمبر");
    expect(getUrduWeekdayName(7)).toBe("اتوار");
    expect(getUrduWeekdayName(-1)).toBe("ہفتہ");
  });
});

describe("formatUrduDate", () => {
  it("formats dates with default pattern (DD MMMM YYYY) and Urdu numerals", () => {
    // 22 August 2026
    const d = new Date(2026, 7, 22, 10, 0, 0);
    expect(formatUrduDate(d)).toBe("۲۲ اگست ۲۰۲۶");
  });

  it("supports string dates and numeric timestamps", () => {
    const d = new Date(2026, 0, 15);
    expect(formatUrduDate(d.toISOString())).toBe("۱۵ جنوری ۲۰۲۶");
    expect(formatUrduDate(d.getTime())).toBe("۱۵ جنوری ۲۰۲۶");
  });

  it("supports English digits option", () => {
    const d = new Date(2026, 7, 22);
    expect(formatUrduDate(d, "DD MMMM YYYY", { digits: "english" })).toBe("22 اگست 2026");
  });

  it("formats full date-time patterns with weekday and day period", () => {
    // Saturday, 22 August 2026 at 14:30
    const d = new Date(2026, 7, 22, 14, 30, 45);
    const formatted = formatUrduDate(d, "dddd، D MMMM YYYY، hh:mm A");
    expect(formatted).toBe("ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر");
  });

  it("formats morning, afternoon, evening, and night periods correctly", () => {
    expect(formatUrduDate(new Date(2026, 7, 22, 9, 0), "hh:mm A")).toBe("۰۹:۰۰ صبح");
    expect(formatUrduDate(new Date(2026, 7, 22, 13, 0), "hh:mm A")).toBe("۰۱:۰۰ دوپہر");
    expect(formatUrduDate(new Date(2026, 7, 22, 18, 0), "hh:mm A")).toBe("۰۶:۰۰ شام");
    expect(formatUrduDate(new Date(2026, 7, 22, 23, 0), "hh:mm A")).toBe("۱۱:۰۰ رات");
  });

  it("supports 24-hour time tokens HH and H", () => {
    const d = new Date(2026, 7, 22, 5, 7, 9);
    expect(formatUrduDate(d, "HH:mm:ss")).toBe("۰۵:۰۷:۰۹");
    expect(formatUrduDate(d, "H:m:s")).toBe("۵:۷:۹");
  });

  it("formats the two-digit year token and unpadded month tokens", () => {
    expect(formatUrduDate(new Date(2026, 7, 22), "YY")).toBe("۲۶");
    expect(formatUrduDate(new Date(2026, 7, 5), "M/MM")).toBe("۸/۰۸");
  });

  it("uses English digits everywhere in the pattern", () => {
    expect(
      formatUrduDate(new Date(2026, 7, 22, 14, 30), "dddd D MMMM YYYY hh:mm", {
        digits: "english",
      }),
    ).toBe("ہفتہ 22 اگست 2026 02:30");
  });

  it("supports Hijri calendar option for month token", () => {
    // 9th month index (month 8, 0-indexed) -> Ramadan
    const d = new Date(2026, 8, 1);
    expect(formatUrduDate(d, "MMMM", { calendar: "hijri" })).toBe("رمضان المبارک");
  });

  it("returns empty string for invalid dates", () => {
    expect(formatUrduDate("invalid-date")).toBe("");
    expect(formatUrduDate(new Date(NaN))).toBe("");
  });
});

describe("timeAgoUrdu", () => {
  const baseTime = new Date(2026, 7, 22, 12, 0, 0).getTime();

  it("formats very recent timestamps (< 45s) as 'ابھی'", () => {
    const past = new Date(baseTime - 20 * 1000);
    expect(timeAgoUrdu(past, baseTime)).toBe("ابھی");
  });

  it("formats minute differences", () => {
    const oneMinAgo = new Date(baseTime - 60 * 1000);
    expect(timeAgoUrdu(oneMinAgo, baseTime)).toBe("ایک منٹ پہلے");

    const fiveMinsAgo = new Date(baseTime - 5 * 60 * 1000);
    expect(timeAgoUrdu(fiveMinsAgo, baseTime)).toBe("۵ منٹ پہلے");
    expect(timeAgoUrdu(fiveMinsAgo, baseTime, { digits: "english" })).toBe("5 منٹ پہلے");
  });

  it("formats hour differences", () => {
    const oneHourAgo = new Date(baseTime - 60 * 60 * 1000);
    expect(timeAgoUrdu(oneHourAgo, baseTime)).toBe("ایک گھنٹہ پہلے");

    const threeHoursAgo = new Date(baseTime - 3 * 60 * 60 * 1000);
    expect(timeAgoUrdu(threeHoursAgo, baseTime)).toBe("۳ گھنٹے پہلے");
  });

  it("formats day differences including yesterday and day-before-yesterday", () => {
    const yesterday = new Date(baseTime - 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(yesterday, baseTime)).toBe("کل");

    const dayBeforeYesterday = new Date(baseTime - 48 * 60 * 60 * 1000);
    expect(timeAgoUrdu(dayBeforeYesterday, baseTime)).toBe("پرسوں");

    const fourDaysAgo = new Date(baseTime - 4 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(fourDaysAgo, baseTime)).toBe("۴ دن پہلے");
  });

  it("formats weeks, months, and years", () => {
    const oneWeekAgo = new Date(baseTime - 7 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(oneWeekAgo, baseTime)).toBe("ایک ہفتہ پہلے");

    const twoWeeksAgo = new Date(baseTime - 14 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(twoWeeksAgo, baseTime)).toBe("۲ ہفتے پہلے");

    const oneMonthAgo = new Date(baseTime - 30 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(oneMonthAgo, baseTime)).toBe("ایک ماہ پہلے");

    const sixMonthsAgo = new Date(baseTime - 180 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(sixMonthsAgo, baseTime)).toBe("۶ ماہ پہلے");

    const oneYearAgo = new Date(baseTime - 365 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(oneYearAgo, baseTime)).toBe("ایک سال پہلے");

    const threeYearsAgo = new Date(baseTime - 3 * 365 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(threeYearsAgo, baseTime)).toBe("۳ سال پہلے");
  });

  it("formats future timestamps with 'بعد'", () => {
    const inTenSecs = new Date(baseTime + 10 * 1000);
    expect(timeAgoUrdu(inTenSecs, baseTime)).toBe("چند لمحے بعد");

    const inFiveMins = new Date(baseTime + 5 * 60 * 1000);
    expect(timeAgoUrdu(inFiveMins, baseTime)).toBe("۵ منٹ بعد");

    const inTwoHours = new Date(baseTime + 2 * 60 * 60 * 1000);
    expect(timeAgoUrdu(inTwoHours, baseTime)).toBe("۲ گھنٹے بعد");

    const inTwoWeeks = new Date(baseTime + 14 * 24 * 60 * 60 * 1000);
    expect(timeAgoUrdu(inTwoWeeks, baseTime)).toBe("۲ ہفتے بعد");
  });

  it("supports addSuffix: false option", () => {
    const fiveMinsAgo = new Date(baseTime - 5 * 60 * 1000);
    expect(timeAgoUrdu(fiveMinsAgo, baseTime, { addSuffix: false })).toBe("۵ منٹ");

    const twoHoursAgo = new Date(baseTime - 2 * 60 * 60 * 1000);
    expect(timeAgoUrdu(twoHoursAgo, baseTime, { addSuffix: false })).toBe("۲ گھنٹے");
  });

  it("returns empty string for invalid inputs", () => {
    expect(timeAgoUrdu("invalid", baseTime)).toBe("");
  });

  it("treats exactly 45 seconds as one minute", () => {
    const fortyFiveSecs = new Date(baseTime - 45 * 1000);
    expect(timeAgoUrdu(fortyFiveSecs, baseTime)).toBe("ایک منٹ پہلے");
  });

  it("handles future singular units and addSuffix false", () => {
    const inOneMin = new Date(baseTime + 60 * 1000);
    expect(timeAgoUrdu(inOneMin, baseTime)).toBe("ایک منٹ بعد");
    expect(timeAgoUrdu(inOneMin, baseTime, { addSuffix: false })).toBe("ایک منٹ");
  });
});

describe("parseUrduDate", () => {
  const parts = (d: Date | null) =>
    d === null ? null : [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];

  it("parses Urdu and English month names", () => {
    expect(parts(parseUrduDate("۲۲ اگست ۲۰۲۶"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("22 اگست 2026"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("22 August 2026"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("Aug 22, 2026"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("۱۲ مارچ ۲۰۲۶"))).toEqual([2026, 2, 12, 0, 0, 0]);
  });

  it("parses numeric dates day-first, matching Pakistani convention", () => {
    expect(parts(parseUrduDate("۲۲/۰۸/۲۰۲۶"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("22-08-2026"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("22/08/26"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("22/08/2026 14:30"))).toEqual([2026, 7, 22, 14, 30, 0]);
  });

  it("parses ISO dates but refuses absolute instants", () => {
    expect(parts(parseUrduDate("2026-08-22"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("2026-08-22T14:30"))).toEqual([2026, 7, 22, 14, 30, 0]);
    expect(parts(parseUrduDate("2026-08-22T14:30:45"))).toEqual([2026, 7, 22, 14, 30, 45]);
    // A trailing Z or offset would need a timezone conversion this never does.
    expect(parseUrduDate("2026-08-22T14:30:00Z")).toBeNull();
    expect(parseUrduDate("2026-08-22T14:30:00+05:00")).toBeNull();
  });

  it("reads the day-period words, including the split رات window", () => {
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۰۹:۱۵ صبح")?.getHours()).toBe(9);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۰۲:۰۰ دوپہر")?.getHours()).toBe(14);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۰۶:۰۰ شام")?.getHours()).toBe(18);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۱۱:۰۰ رات")?.getHours()).toBe(23);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۱۲:۰۰ رات")?.getHours()).toBe(0);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۱۱:۳۰ pm")?.getHours()).toBe(23);
    expect(parseUrduDate("۲۲ اگست ۲۰۲۶ ۱۲:۳۰ am")?.getHours()).toBe(0);
  });

  it("ignores a leading weekday and tolerates decoration", () => {
    expect(parts(parseUrduDate("ہفتہ، ۲۲ اگست ۲۰۲۶"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("بتاریخ ۲۲ اگست ۲۰۲۶"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("(۲۲) اگست ۲۰۲۶"))).toEqual([2026, 7, 22, 0, 0, 0]);
    expect(parts(parseUrduDate("۲۰۲۶ اگست ۲۲"))).toEqual([2026, 7, 22, 0, 0, 0]);
  });

  it("resolves a missing or month-only year", () => {
    expect(parts(parseUrduDate("5 جنوری", { defaultYear: 1999 }))).toEqual([1999, 0, 5, 0, 0, 0]);
    expect(parts(parseUrduDate("5 جنوری ۲۰۲۶"))).toEqual([2026, 0, 5, 0, 0, 0]);
    // Month precision resolves to the first of that month.
    expect(parts(parseUrduDate("جنوری ۲۰۲۶"))).toEqual([2026, 0, 1, 0, 0, 0]);
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseUrduDate("۳۱ فروری ۲۰۲۶")).toBeNull();
    expect(parseUrduDate("2026-02-30")).toBeNull();
    expect(parseUrduDate("2026-13-01")).toBeNull();
  });

  it("rejects Hijri month names, since صفر is also the word for zero", () => {
    expect(parseUrduDate("۱ رمضان المبارک ۱۴۴۷")).toBeNull();
  });

  it("returns null for input it cannot read", () => {
    expect(parseUrduDate("")).toBeNull();
    expect(parseUrduDate("پاکستان")).toBeNull();
    expect(parseUrduDate("اگست")).toBeNull();
    // Object.prototype members must not be mistaken for month or period names.
    expect(parseUrduDate("constructor")).toBeNull();
    expect(parseUrduDate("toString 22 اگست ۲۰۲۶")).toEqual(expect.any(Date));
  });

  it("round-trips every hour of a fully formatted date back to the same moment", () => {
    for (let hours = 0; hours < 24; hours++) {
      const d = new Date(2026, 7, 22, hours, 30, 15);
      const text = formatUrduDate(d, "dddd، D MMMM YYYY، hh:mm:ss A");
      expect(parseUrduDate(text)?.getTime(), `${text} should round-trip`).toBe(d.getTime());
    }
  });

  it("round-trips the default and 24-hour patterns", () => {
    const d = new Date(2026, 7, 22, 10, 0, 0);
    expect(parseUrduDate(formatUrduDate(d))?.getTime()).toBe(new Date(2026, 7, 22).getTime());

    const withTime = new Date(2026, 0, 15, 5, 7, 9);
    const text = formatUrduDate(withTime, "DD MMMM YYYY HH:mm:ss");
    expect(parseUrduDate(text)?.getTime()).toBe(withTime.getTime());
  });
});
