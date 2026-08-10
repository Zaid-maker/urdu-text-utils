import { describe, expect, it } from "vitest";
import { foldUrdu, normalizeUrdu, removeDiacritics } from "../src/normalize.js";

describe("normalizeUrdu", () => {
  it("maps Arabic letter forms to Urdu ones", () => {
    // Input uses ك (U+0643) and ي (U+064A); output must use ک (U+06A9) and ی (U+06CC).
    expect(normalizeUrdu("كيا حال ہے")).toBe("کیا حال ہے");
  });

  it("maps Arabic heh to Urdu heh goal, not the other way round", () => {
    expect(normalizeUrdu("ه")).toBe("ہ");
    expect(normalizeUrdu("ہ")).toBe("ہ");
  });

  it("preserves letters that are genuinely distinct in Urdu", () => {
    for (const ch of ["آ", "ھ", "ے", "ؤ", "ۃ"]) {
      // آ, ھ, ے, ؤ survive; ۃ folds to ہ and is asserted separately.
      if (ch === "ۃ") continue;
      expect(normalizeUrdu(ch)).toBe(ch);
    }
    expect(normalizeUrdu("ۃ")).toBe("ہ");
  });

  it("strips tatweel, bidi controls and BOM", () => {
    expect(normalizeUrdu("پاکـسـتان")).toBe("پاکستان");
    expect(normalizeUrdu("﻿‎پاکستان‏")).toBe("پاکستان");
  });

  it("collapses whitespace and trims by default", () => {
    expect(normalizeUrdu("  کیا   حال  ")).toBe("کیا حال");
    expect(normalizeUrdu("  کیا   حال  ", { collapseWhitespace: false })).toBe("  کیا   حال  ");
  });

  it("keeps diacritics unless asked", () => {
    expect(normalizeUrdu("مُحَمَّد")).toBe("مُحَمَّد");
    expect(normalizeUrdu("مُحَمَّد", { stripDiacritics: true })).toBe("محمد");
  });

  it("rewrites digits on request", () => {
    expect(normalizeUrdu("سال 2024", { digits: "urdu" })).toBe("سال ۲۰۲۴");
    expect(normalizeUrdu("سال ۲۰۲۴", { digits: "english" })).toBe("سال 2024");
    expect(normalizeUrdu("سال 2024")).toBe("سال 2024");
  });

  it("maps ASCII punctuation on request", () => {
    expect(normalizeUrdu("کیا?", { urduPunctuation: true })).toBe("کیا؟");
    expect(normalizeUrdu("کیا?")).toBe("کیا?");
  });

  it("folds presentation forms via NFKC", () => {
    expect(normalizeUrdu("ﻻ")).toBe("لا"); // ﻻ lam-alef ligature
  });

  it("returns empty string for empty input", () => {
    expect(normalizeUrdu("")).toBe("");
  });
});

describe("removeDiacritics", () => {
  it("removes harakat", () => {
    expect(removeDiacritics("مُحَمَّد")).toBe("محمد");
  });

  it("keeps ۔ ے ۓ, which are not marks", () => {
    expect(removeDiacritics("ہے۔")).toBe("ہے۔");
    expect(removeDiacritics("ۓ")).toBe("ۓ");
  });
});

describe("foldUrdu", () => {
  it("gives one key for spellings a reader would call identical", () => {
    expect(foldUrdu("مُحَمَّد")).toBe(foldUrdu("محمد"));
    expect(foldUrdu("كيا")).toBe(foldUrdu("کیا"));
  });
});
