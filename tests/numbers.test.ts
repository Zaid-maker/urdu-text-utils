import { describe, expect, it } from "vitest";
import {
  convertNumbers,
  numberToUrduWords,
  parseUrduNumber,
  toArabicIndicDigits,
  toEnglishDigits,
  toUrduDigits,
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

  it("spells tens and hundreds compositionally", () => {
    expect(numberToUrduWords(90)).toBe("نوے");
    expect(numberToUrduWords(21)).toBe("بیس ایک");
    expect(numberToUrduWords(200)).toBe("دو سو");
    expect(numberToUrduWords(1005)).toBe("ایک ہزار پانچ");
  });

  it("spells the South Asian scales in combination", () => {
    expect(numberToUrduWords(1234)).toBe("ایک ہزار دو سو تیس چار");
    expect(numberToUrduWords(1000000)).toBe("دس لاکھ");
    expect(numberToUrduWords(1234567)).toBe("بارہ لاکھ تیس چار ہزار پانچ سو ساٹھ سات");
    expect(numberToUrduWords(100000000)).toBe("دس کروڑ");
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
