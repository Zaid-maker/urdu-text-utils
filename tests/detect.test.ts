import { describe, expect, it } from "vitest";
import { hasUrduSpecificLetters, isUrdu, urduRatio } from "../src/detect.js";

describe("isUrdu", () => {
  it("accepts Urdu text", () => {
    expect(isUrdu("آپ کیسے ہیں؟")).toBe(true);
    expect(isUrdu("پاکستان")).toBe(true);
  });

  it("rejects English and empty input", () => {
    expect(isUrdu("hello world")).toBe(false);
    expect(isUrdu("")).toBe(false);
  });

  it("rejects text with no letters at all", () => {
    expect(isUrdu("12345 !!! ---")).toBe(false);
  });

  it("uses a ratio, so one Urdu word in English prose is not Urdu", () => {
    expect(isUrdu("The word پاکستان appears in this English sentence")).toBe(false);
    expect(isUrdu("The word پاکستان appears", { threshold: 0.1 })).toBe(true);
  });

  it("counts mixed text above the threshold as Urdu", () => {
    expect(isUrdu("پاکستان ایک خوبصورت ملک ہے (Pakistan)")).toBe(true);
  });
});

describe("urduRatio", () => {
  it("is 1 for pure Urdu and 0 for pure English", () => {
    expect(urduRatio("پاکستان")).toBe(1);
    expect(urduRatio("Pakistan")).toBe(0);
    expect(urduRatio("12345")).toBe(0);
  });
});

describe("hasUrduSpecificLetters", () => {
  it("separates Urdu from Arabic", () => {
    expect(hasUrduSpecificLetters("پاکستان")).toBe(true); // پ, ک
    expect(hasUrduSpecificLetters("لڑکی")).toBe(true); // ڑ
    expect(hasUrduSpecificLetters("كتاب مدرسة")).toBe(false); // Arabic-only letters
  });

  it("flags common Urdu words via ہ and ی", () => {
    expect(hasUrduSpecificLetters("سلام علیکم")).toBe(true); // ہ
    expect(hasUrduSpecificLetters("کتاب")).toBe(true); // ک
  });

  it("returns false for empty input", () => {
    expect(hasUrduSpecificLetters("")).toBe(false);
  });
});

describe("isUrdu options", () => {
  it("enforces minLetters", () => {
    expect(isUrdu("پاکستان پاکستان hello", { minLetters: 5, threshold: 0.4 })).toBe(true);
    expect(isUrdu("پاکستان hello world foo bar", { minLetters: 5, threshold: 0.4 })).toBe(false);
  });

  it("requires the letter ratio to clear the threshold", () => {
    expect(isUrdu("پاکستان pakistan", { threshold: 0.5 })).toBe(false); // 7/15 < 0.5
    expect(isUrdu("پاکستان pakistan", { threshold: 0.4 })).toBe(true);
  });
});

describe("script-based limits", () => {
  it("accepts Arabic text as Urdu by script, but flags it via specific letters", () => {
    // Arabic shares the script, so isUrdu cannot tell the languages apart —
    // hasUrduSpecificLetters is the documented way to do that.
    expect(isUrdu("كتاب مدرسة")).toBe(true);
    expect(hasUrduSpecificLetters("كتاب مدرسة")).toBe(false);
  });

  it("measures a partial share for mixed text", () => {
    const ratio = urduRatio("پاکستان! (Pakistan)");
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
    expect(urduRatio("")).toBe(0);
  });
});
