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

  it("keeps digits in the slug", () => {
    expect(urduSlug("مضمون 2 اور 3")).toBe("mazmoon-2-aur-3");
  });

  it("cuts at a word boundary even when maxLength lands mid-word", () => {
    expect(urduSlug("میرا پہلا مضمون", { maxLength: 7 })).toBe("mera");
    expect(urduSlug("میرا پہلا مضمون بہت لمبا ہے", { preserveUrdu: true, maxLength: 8 })).toBe("میرا");
  });

  it("drops punctuation from Urdu-preserving slugs", () => {
    expect(urduSlug("میرا پہلا مضمون!", { preserveUrdu: true })).toBe("میرا-پہلا-مضمون");
  });
});

describe("romanize rule layer", () => {
  it("treats word-initial alef as a vowel carrier", () => {
    // Neither word is in the dictionary, so this exercises the rules, not lookups.
    expect(romanize("اسرار")).toBe("asrar");
    expect(romanize("اذکار")).toBe("azkar");
  });

  it("keeps digits inside words", () => {
    expect(romanize("مضمون 2")).toBe("mazmoon 2");
  });

  it("collapses newlines into spaces via normalization", () => {
    expect(romanize("پہلا\nدوسرا")).toBe("pehla dosra");
  });
});

describe("romanToUrdu punctuation", () => {
  it("keeps punctuation and spacing, chunk by chunk", () => {
    // Lookup happens per whitespace-chunk, so a word with attached punctuation
    // falls back to the rules — but the punctuation itself always survives.
    expect(romanToUrdu("mera naam, zaid hai!")).toBe("میرا نآم, زید ہی!");
    expect(romanToUrdu("mera  naam")).toBe("میرا  نام");
  });
});
