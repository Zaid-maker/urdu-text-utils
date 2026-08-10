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
});
