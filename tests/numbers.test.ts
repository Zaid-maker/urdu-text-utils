import { describe, expect, it } from "vitest";
import {
  URDU_ONES,
  URDU_ORDINAL_IRREGULARS,
  URDU_SCALES,
  URDU_TEENS_AND_TENS,
  URDU_TENS_UNITS,
  convertNumbers,
  formatUrduCurrency,
  formatUrduNumber,
  numberToUrduWords,
  parseUrduNumber,
  toArabicIndicDigits,
  toEnglishDigits,
  toUrduDigits,
  toUrduOrdinal,
} from "../src/numbers.js";

describe("digit conversion", () => {
  it("converts English to Urdu digits", () => {
    expect(convertNumbers("12345")).toBe("۱۲۳۴۵");
    expect(toUrduDigits("0987654321")).toBe("۰۹۸۷۶۵۴۳۲۱");
  });

  it("converts Urdu to English digits", () => {
    expect(convertNumbers("۱۲۳۴۵", "english")).toBe("12345");
    expect(toEnglishDigits("۰۹۸۷۶۵۴۳۲۱")).toBe("0987654321");
  });

  it("accepts Arabic-Indic digits, which live in a different block", () => {
    expect(toEnglishDigits("١٢٣")).toBe("123");
    expect(toUrduDigits("١٢٣")).toBe("۱۲۳");
    expect(toArabicIndicDigits("123")).toBe("١٢٣");
  });

  it("leaves non-digits alone", () => {
    expect(toUrduDigits("سال 2024ء")).toBe("سال ۲۰۲۴ء");
  });

  it("round-trips", () => {
    expect(toEnglishDigits(toUrduDigits("31-12-2024"))).toBe("31-12-2024");
  });
});

describe("parseUrduNumber", () => {
  it("parses Urdu digits with Urdu separators", () => {
    expect(parseUrduNumber("۱۲۳۴۵")).toBe(12345);
    expect(parseUrduNumber("۱٬۲۳۴")).toBe(1234);
    expect(parseUrduNumber("۳٫۱۴")).toBeCloseTo(3.14);
  });

  it("returns NaN for non-numbers", () => {
    expect(parseUrduNumber("پاکستان")).toBeNaN();
    expect(parseUrduNumber("")).toBeNaN();
  });
});

describe("numberToUrduWords", () => {
  it("uses the South Asian scale", () => {
    expect(numberToUrduWords(0)).toBe("صفر");
    expect(numberToUrduWords(5)).toBe("پانچ");
    expect(numberToUrduWords(15)).toBe("پندرہ");
    expect(numberToUrduWords(100)).toBe("ایک سو");
    expect(numberToUrduWords(1000)).toBe("ایک ہزار");
    expect(numberToUrduWords(100000)).toBe("ایک لاکھ");
    expect(numberToUrduWords(10000000)).toBe("ایک کروڑ");
  });

  it("handles negatives and rejects fractions", () => {
    expect(numberToUrduWords(-5)).toBe("منفی پانچ");
    expect(() => numberToUrduWords(1.5)).toThrow(TypeError);
  });

  it("uses the real Urdu word for every ten, not composed digits", () => {
    expect(numberToUrduWords(90)).toBe("نوے");
    expect(numberToUrduWords(21)).toBe("اکیس");
    expect(numberToUrduWords(26)).toBe("چھبیس");
    expect(numberToUrduWords(200)).toBe("دو سو");
    expect(numberToUrduWords(1005)).toBe("ایک ہزار پانچ");
  });

  it("writes every irregular 21-99 as a single, composed-free word", () => {
    for (let n = 21; n <= 99; n++) {
      if (n % 10 === 0) continue;
      expect(numberToUrduWords(n), `numberToUrduWords(${n})`).not.toContain(" ");
    }
  });

  it("covers 21-99 exhaustively and agrees with the published tables", () => {
    const keys = Object.keys(URDU_TENS_UNITS).map(Number).sort((a, b) => a - b);
    const expectedKeys: number[] = [];
    for (let n = 21; n <= 99; n++) if (n % 10 !== 0) expectedKeys.push(n);
    expect(keys).toEqual(expectedKeys);
    expect(URDU_ONES).toHaveLength(10);
    expect(URDU_TEENS_AND_TENS[20]).toBe("بیس");
    expect(Object.keys(URDU_ORDINAL_IRREGULARS)).toHaveLength(6);
  });

  it("spells the South Asian scales in combination", () => {
    expect(numberToUrduWords(1234)).toBe("ایک ہزار دو سو چونتیس");
    expect(numberToUrduWords(1000000)).toBe("دس لاکھ");
    expect(numberToUrduWords(1234567)).toBe("بارہ لاکھ چونتیس ہزار پانچ سو سڑسٹھ");
    expect(numberToUrduWords(100000000)).toBe("دس کروڑ");
  });

  it("keeps going past کروڑ onto ارب and کھرب", () => {
    expect(numberToUrduWords(1_000_000_000)).toBe("ایک ارب");
    expect(numberToUrduWords(100_000_000_000)).toBe("ایک کھرب");
    expect(numberToUrduWords(1_000_000_000_000)).toBe("دس کھرب");
    expect(URDU_SCALES.map(([size]) => size)).toEqual([
      100_000_000_000, 1_000_000_000, 10_000_000, 100_000, 1000, 100,
    ]);
  });

  it("returns empty string for non-finite input", () => {
    expect(numberToUrduWords(Infinity)).toBe("");
    expect(numberToUrduWords(NaN)).toBe("");
  });
});

describe("Arabic-Indic conversion", () => {
  it("converts between all three digit blocks", () => {
    expect(toArabicIndicDigits("۱۲۳")).toBe("١٢٣");
    expect(toArabicIndicDigits("123")).toBe("١٢٣");
    expect(convertNumbers("۱۲۳", "arabic")).toBe("١٢٣");
    expect(toUrduDigits("١٢٣")).toBe("۱۲۳");
  });

  it("round-trips through every style", () => {
    for (const style of ["urdu", "english", "arabic"] as const) {
      expect(convertNumbers(convertNumbers("123", style), "english")).toBe("123");
    }
  });
});

describe("parseUrduNumber edge cases", () => {
  it("parses signs, decimals and thousands separators", () => {
    expect(parseUrduNumber("-۱۲۳")).toBe(-123);
    expect(parseUrduNumber("+۳٫۵")).toBe(3.5);
    expect(parseUrduNumber(".5")).toBe(0.5);
    expect(parseUrduNumber("1,234")).toBe(1234);
    expect(parseUrduNumber("۱۲۳٬۴۵۶٫۷۸")).toBe(123456.78);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseUrduNumber("  ۱۲۳  ")).toBe(123);
  });

  it("rejects malformed numbers", () => {
    expect(parseUrduNumber("12abc")).toBeNaN();
    expect(parseUrduNumber("1.2.3")).toBeNaN();
  });
});

describe("formatUrduNumber", () => {
  it("groups digits the South Asian way by default", () => {
    expect(formatUrduNumber(1234567)).toBe("۱۲٬۳۴٬۵۶۷");
    expect(formatUrduNumber(12345)).toBe("۱۲٬۳۴۵");
    expect(formatUrduNumber(999)).toBe("۹۹۹");
    expect(formatUrduNumber(0)).toBe("۰");
  });

  it("supports western grouping and no grouping", () => {
    expect(formatUrduNumber(1234567, { grouping: "western" })).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatUrduNumber(1234567, { grouping: "none" })).toBe("۱۲۳۴۵۶۷");
  });

  it("pairs English digits with ASCII separators", () => {
    expect(formatUrduNumber(1234, { digits: "english" })).toBe("1,234");
    expect(formatUrduNumber(1234567, { digits: "english", grouping: "western" })).toBe("1,234,567");
  });

  it("rounds to two fraction digits and drops trailing zeros", () => {
    expect(formatUrduNumber(3.14159)).toBe("۳٫۱۴");
    expect(formatUrduNumber(3.14159, { decimals: 3 })).toBe("۳٫۱۴۲");
    expect(formatUrduNumber(0.5)).toBe("۰٫۵");
    expect(formatUrduNumber(0.05)).toBe("۰٫۰۵");
    expect(formatUrduNumber(1234.4, { decimals: 0 })).toBe("۱٬۲۳۴");
    expect(formatUrduNumber(1234.5, { decimals: 0 })).toBe("۱٬۲۳۵");
  });

  it("carries a rounded fraction into the integer part", () => {
    expect(formatUrduNumber(1.999, { decimals: 2 })).toBe("۲");
  });

  it("signs negative values", () => {
    expect(formatUrduNumber(-1234)).toBe("-۱٬۲۳۴");
    expect(formatUrduNumber(-3.14159, { decimals: 3 })).toBe("-۳٫۱۴۲");
  });

  it("returns empty string for non-finite input", () => {
    expect(formatUrduNumber(NaN)).toBe("");
    expect(formatUrduNumber(Infinity)).toBe("");
  });

  it("round-trips through parseUrduNumber", () => {
    expect(parseUrduNumber(formatUrduNumber(1234567))).toBe(1234567);
    expect(parseUrduNumber(formatUrduNumber(-1234.5))).toBe(-1234.5);
  });

  it("prints large magnitudes as digits instead of exponential notation", () => {
    // String(1e21) is "1e+21". Grouping used to leak that verbatim — and the
    // separator regex even landed inside the exponent ("1e,+21").
    expect(formatUrduNumber(1e21)).toBe("۱٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰٬۰۰۰");
    expect(formatUrduNumber(1e21, { digits: "english" })).toBe("1,00,00,00,00,00,00,00,00,00,000");
    expect(formatUrduNumber(1e21, { digits: "english", grouping: "none" })).toBe("1000000000000000000000");
    expect(formatUrduNumber(1e21, { digits: "english", grouping: "western" })).toBe("1,000,000,000,000,000,000,000");
    expect(formatUrduNumber(1.5e21, { digits: "english" })).toBe("1,50,00,00,00,00,00,00,00,00,000");
  });
});

describe("formatUrduCurrency", () => {
  it("formats amounts with the plural unit", () => {
    expect(formatUrduCurrency(1500)).toBe("۱٬۵۰۰ روپے");
    expect(formatUrduCurrency(0)).toBe("۰ روپے");
    expect(formatUrduCurrency(1234567)).toBe("۱۲٬۳۴٬۵۶۷ روپے");
  });

  it("switches to the singular unit for exactly one", () => {
    expect(formatUrduCurrency(1)).toBe("۱ روپیہ");
    expect(formatUrduCurrency(-1)).toBe("-۱ روپیہ");
    expect(formatUrduCurrency(1.5)).toBe("۱٫۵ روپے");
  });

  it("spells the amount out in words on request", () => {
    expect(formatUrduCurrency(1500, { style: "words" })).toBe("ایک ہزار پانچ سو روپے");
    expect(formatUrduCurrency(21, { style: "words" })).toBe("اکیس روپے");
    expect(formatUrduCurrency(1, { style: "words" })).toBe("ایک روپیہ");
  });

  it("rejects a fractional amount in words style rather than truncating it", () => {
    expect(() => formatUrduCurrency(2.5, { style: "words" })).toThrow(TypeError);
  });

  it("accepts a different currency", () => {
    expect(formatUrduCurrency(2.5, { unit: "ڈالر", singularUnit: "ڈالر" })).toBe("۲٫۵ ڈالر");
    expect(formatUrduCurrency(1500, { digits: "english" })).toBe("1,500 روپے");
  });
});

describe("toUrduOrdinal", () => {
  it("uses the irregular forms for 1-6", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => toUrduOrdinal(n))).toEqual([
      "پہلا",
      "دوسرا",
      "تیسرا",
      "چوتھا",
      "پانچواں",
      "چھٹا",
    ]);
  });

  it("attaches the suffix to the final word of a compound", () => {
    expect(toUrduOrdinal(7)).toBe("ساتواں");
    expect(toUrduOrdinal(10)).toBe("دسواں");
    expect(toUrduOrdinal(20)).toBe("بیسواں");
    expect(toUrduOrdinal(21)).toBe("اکیسواں");
    expect(toUrduOrdinal(45)).toBe("پینتالیسواں");
    expect(toUrduOrdinal(90)).toBe("نوےواں");
  });

  it("contracts a word-final و instead of doubling it", () => {
    expect(toUrduOrdinal(9)).toBe("نواں");
    expect(toUrduOrdinal(9, { gender: "feminine" })).toBe("نویں");
    expect(toUrduOrdinal(100)).toBe("سواں");
    expect(toUrduOrdinal(100, { gender: "feminine" })).toBe("سویں");
  });

  it("drops ایک for an exact scale value but keeps it in a compound", () => {
    expect(toUrduOrdinal(1000)).toBe("ہزارواں");
    expect(toUrduOrdinal(100000)).toBe("لاکھواں");
    expect(toUrduOrdinal(1100)).toBe("ایک ہزار ایک سواں");
    expect(toUrduOrdinal(200)).toBe("دو سواں");
  });

  it("inflects for feminine gender", () => {
    expect(toUrduOrdinal(1, { gender: "feminine" })).toBe("پہلی");
    expect(toUrduOrdinal(6, { gender: "feminine" })).toBe("چھٹی");
    expect(toUrduOrdinal(21, { gender: "feminine" })).toBe("اکیسویں");
    expect(toUrduOrdinal(1100, { gender: "feminine" })).toBe("ایک ہزار ایک سویں");
  });

  it("handles zero, negatives, fractions and non-finite input", () => {
    expect(toUrduOrdinal(0)).toBe("صفر");
    expect(toUrduOrdinal(-3)).toBe("منفی تیسرا");
    expect(toUrduOrdinal(-3, { gender: "feminine" })).toBe("منفی تیسری");
    expect(toUrduOrdinal(Infinity)).toBe("");
    expect(() => toUrduOrdinal(2.5)).toThrow(TypeError);
  });
});
