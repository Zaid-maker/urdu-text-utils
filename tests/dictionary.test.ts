import { describe, expect, it } from "vitest";
import { ARABIC_WORD_RE } from "../src/chars.js";
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

  it("keys and reverse values are pure Arabic script (plus ZWNJ/ZWJ)", () => {
    for (const [urduWord] of entries) {
      expect(urduWord, `WORD_DICTIONARY key ${JSON.stringify(urduWord)}`).toMatch(ARABIC_WORD_RE);
    }
    for (const [roman, urduWord] of Object.entries(ROMAN_VARIANTS)) {
      expect(urduWord, `ROMAN_VARIANTS value for ${roman}`).toMatch(ARABIC_WORD_RE);
    }
  });

  it("keys and reverse values have no leading or trailing whitespace", () => {
    for (const [urduWord] of entries) {
      expect(urduWord.trim(), `WORD_DICTIONARY key ${JSON.stringify(urduWord)}`).toBe(urduWord);
    }
    for (const [roman, urduWord] of Object.entries(ROMAN_VARIANTS)) {
      expect(urduWord.trim(), `ROMAN_VARIANTS value for ${roman}`).toBe(urduWord);
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

  it("spells the oblique possessive اپنی in both directions", () => {
    // The key was previously stored in Devanagari (अपनी), so romanize("اپنی")
    // missed the dictionary and romanToUrdu("apni") emitted foreign script.
    expect(romanize("اپنی")).toBe("apni");
    expect(romanToUrdu("apni")).toBe("اپنی");
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

  it("reads ی by position: e inside a word, i at the end", () => {
    expect(romanize("کھیل")).toBe("khel");
    expect(romanize("پڑھی")).toBe("parhi");
  });

  it("reads final یں as the plural ending", () => {
    expect(romanize("سڑکیں")).toBe("sarkein");
    expect(romanize("راتیں")).toBe("ratein");
  });

  it("transliterates a news sentence with no dictionary gaps left visible", () => {
    expect(romanize("کراچی میں بارش کے بعد سڑکیں بند ہیں")).toBe(
      "karachi mein barish ke baad sarkein band hain",
    );
  });

  it("produces slug-safe output for words it has never seen", () => {
    expect(urduSlug("طوطا مینا کی کہانی")).toMatch(/^[a-z0-9-]+$/u);
  });
});
