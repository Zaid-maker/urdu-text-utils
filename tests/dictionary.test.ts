import { describe, expect, it } from "vitest";
import { ROMAN_VARIANTS, WORD_DICTIONARY } from "../src/dictionary.js";
import { normalizeUrdu } from "../src/normalize.js";
import { romanToUrdu, romanize, urduSlug } from "../src/transliterate.js";

describe("dictionary integrity", () => {
  const entries = Object.entries(WORD_DICTIONARY);

  it("covers a useful vocabulary", () => {
    expect(entries.length).toBeGreaterThan(400);
  });

  it("keys are already normalized, or lookups would silently miss", () => {
    // romanize() normalizes its input before lookup, so a key spelled with Arabic
    // ي or ه could never be hit.
    for (const [urduWord] of entries) {
      expect(normalizeUrdu(urduWord)).toBe(urduWord);
    }
  });

  it("values are lowercase ASCII single words, so slugs stay clean", () => {
    for (const [urduWord, roman] of entries) {
      expect(roman, `value for ${urduWord}`).toMatch(/^[a-z]+$/u);
    }
  });

  it("reverse variants point at Urdu script and are keyed by lowercase ASCII", () => {
    for (const [roman, urduWord] of Object.entries(ROMAN_VARIANTS)) {
      expect(roman).toMatch(/^[a-z]+$/u);
      expect(urduWord).toMatch(/^\S+$/u);
      expect(normalizeUrdu(urduWord)).toBe(urduWord);
    }
  });
});

describe("dictionary-backed transliteration", () => {
  it("handles ordinary sentences word for word", () => {
    expect(romanize("میں پاکستان کا رہنے والا ہوں")).toBe("mein pakistan ka rehne wala hoon");
    expect(romanize("یہ کتاب بہت اچھی ہے")).toBe("yeh kitaab bohat achi hai");
    expect(romanize("وہ سکول جا رہا ہے")).toBe("woh school ja raha hai");
  });

  it("round-trips a sentence built from dictionary words", () => {
    const urdu = "میرا دوست بہت اچھا انسان ہے";
    expect(romanToUrdu(romanize(urdu))).toBe(urdu);
  });

  it("keeps English loanwords intact in both directions", () => {
    // Without an explicit pairing the rules read "school" as s-ch-ool -> سچول.
    expect(romanToUrdu("school")).toBe("سکول");
    expect(romanToUrdu("main school ja raha hoon")).toBe("میں سکول جا رہا ہوں");
    expect(romanize("کمپیوٹر")).toBe("computer");
  });

  it("resolves alternate Roman spellings to one Urdu word", () => {
    for (const variant of ["bohot", "bahut", "bhot"]) {
      expect(romanToUrdu(variant)).toBe("بہت");
    }
    expect(romanToUrdu("kaise")).toBe(romanToUrdu("kaisay"));
  });
});

describe("rule fallback", () => {
  it("inserts a schwa so initial clusters are pronounceable", () => {
    // The dictionary has no کرکٹ; without a schwa the rules emit "krkt".
    expect(romanize("کرکٹ")).toMatch(/^kar/u);
  });

  it("treats word-initial و and ی as consonants", () => {
    expect(romanize("ویسا")).toMatch(/^w/u);
    expect(romanize("یاد")).toMatch(/^y/u);
  });

  it("reads word-final ہ as -a rather than -h", () => {
    expect(romanize("پرندہ")).toMatch(/a$/u);
  });

  it("produces slug-safe output for words it has never seen", () => {
    expect(urduSlug("طوطا مینا کی کہانی")).toMatch(/^[a-z0-9-]+$/u);
  });
});
