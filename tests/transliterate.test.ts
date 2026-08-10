import { describe, expect, it } from "vitest";
import { romanToUrdu, romanize, urduSlug } from "../src/transliterate.js";

describe("romanize", () => {
  it("transliterates dictionary words", () => {
    expect(romanize("آپ کیسے ہیں")).toBe("aap kaisay hain");
    expect(romanize("آپ کیسے ہیں", { capitalize: true })).toBe("Aap kaisay hain");
  });

  it("falls back to rules outside the dictionary", () => {
    // Rule output is approximate by design — assert only that it is Latin and non-empty.
    const out = romanize("سائنسدان");
    expect(out).toMatch(/^[a-z' ]+$/u);
  });

  it("handles aspirated consonants as digraphs", () => {
    expect(romanize("بھائی")).toContain("bh");
    expect(romanize("چھوٹا")).toContain("chh");
  });

  it("ignores diacritics and preserves spacing", () => {
    expect(romanize("مُحَمَّد")).toBe(romanize("محمد"));
    expect(romanize("")).toBe("");
  });
});

describe("romanToUrdu", () => {
  it("converts dictionary phrases", () => {
    expect(romanToUrdu("mera naam zaid hai")).toBe("میرا نام زید ہے");
  });

  it("accepts alternate Roman spellings of the same word", () => {
    expect(romanToUrdu("hai")).toBe(romanToUrdu("hay"));
    expect(romanToUrdu("aap")).toBe(romanToUrdu("ap"));
  });

  it("is case-insensitive and keeps spacing", () => {
    expect(romanToUrdu("Mera Naam")).toBe("میرا نام");
    expect(romanToUrdu("")).toBe("");
  });
});

describe("urduSlug", () => {
  it("produces a Latin slug", () => {
    expect(urduSlug("میرا پہلا مضمون")).toBe("mera-pehla-mazmoon");
  });

  it("drops punctuation and collapses separators", () => {
    expect(urduSlug("آپ کیسے ہیں؟")).toBe("aap-kaisay-hain");
  });

  it("can keep the Urdu script instead", () => {
    expect(urduSlug("میرا پہلا مضمون", { preserveUrdu: true })).toBe("میرا-پہلا-مضمون");
  });

  it("honours separator and maxLength, cutting at a word boundary", () => {
    expect(urduSlug("میرا پہلا مضمون", { separator: "_" })).toBe("mera_pehla_mazmoon");
    expect(urduSlug("میرا پہلا مضمون", { maxLength: 12 })).toBe("mera-pehla");
  });

  it("returns empty for empty input", () => {
    expect(urduSlug("")).toBe("");
  });
});
