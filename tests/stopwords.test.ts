import { describe, expect, it } from "vitest";
import {
  URDU_STOP_WORDS,
  filterStopWords,
  isStopWord,
  removeStopWords,
} from "../src/stopwords.js";
import { normalizeUrdu } from "../src/normalize.js";

describe("URDU_STOP_WORDS set", () => {
  it("contains a rich set of canonical Urdu stop words", () => {
    expect(URDU_STOP_WORDS.size).toBeGreaterThan(100);
  });

  it("all stop words are normalized and non-empty", () => {
    for (const word of URDU_STOP_WORDS) {
      expect(word.length).toBeGreaterThan(0);
      expect(normalizeUrdu(word)).toBe(word);
    }
  });

  it("includes common postpositions, pronouns and auxiliaries", () => {
    const keyWords = ["ہے", "ہیں", "تھا", "کا", "کی", "کے", "سے", "میں", "اور", "نہیں", "آپ", "ہم"];
    for (const w of keyWords) {
      expect(URDU_STOP_WORDS.has(w), `expected stop words to contain ${w}`).toBe(true);
    }
  });
});

describe("isStopWord", () => {
  it("recognizes stop words accurately", () => {
    expect(isStopWord("ہے")).toBe(true);
    expect(isStopWord("اور")).toBe(true);
    expect(isStopWord("میں")).toBe(true);
    expect(isStopWord("لیکن")).toBe(true);
  });

  it("normalizes before checking", () => {
    // Non-canonical Arabic Yeh or Heh should still be identified
    expect(isStopWord("فى")).toBe(false); // foreign
    expect(isStopWord("اور ")).toBe(true); // whitespace
  });

  it("returns false for non-stop words", () => {
    expect(isStopWord("کتاب")).toBe(false);
    expect(isStopWord("پاکستان")).toBe(false);
    expect(isStopWord("خوبصورت")).toBe(false);
    expect(isStopWord("")).toBe(false);
  });

  it("supports custom stop words", () => {
    const custom = new Set(["خاص", "لفظ"]);
    expect(isStopWord("خاص", custom)).toBe(true);
    expect(isStopWord("ہے", custom)).toBe(false);

    const customArray = ["خاص", "لفظ"];
    expect(isStopWord("لفظ", customArray)).toBe(true);
  });
});

describe("filterStopWords", () => {
  it("filters stop words from array of words", () => {
    const words = ["یہ", "ایک", "بہترین", "اور", "خوبصورت", "کتاب", "ہے"];
    expect(filterStopWords(words)).toEqual(["بہترین", "خوبصورت", "کتاب"]);
  });

  it("handles empty or all-stopword inputs", () => {
    expect(filterStopWords([])).toEqual([]);
    expect(filterStopWords(["یہ", "ہے", "اور"])).toEqual([]);
  });

  it("works with custom stop words", () => {
    const words = ["آم", "سیب", "کیلا"];
    expect(filterStopWords(words, ["سیب"])).toEqual(["آم", "کیلا"]);
  });
});

describe("removeStopWords", () => {
  it("removes stop words from an Urdu sentence", () => {
    const text = "پاکستان ایک بہت خوبصورت ملک ہے اور اس کے لوگ اچھے ہیں";
    // Remaining substantive words
    const result = removeStopWords(text);
    expect(result).toBe("پاکستان بہت خوبصورت ملک لوگ اچھے");
  });

  it("handles empty input", () => {
    expect(removeStopWords("")).toBe("");
  });

  it("works with custom stop word list", () => {
    const text = "آم میٹھا پھل ہے";
    expect(removeStopWords(text, ["میٹھا"])).toBe("آم پھل ہے");
  });
});
