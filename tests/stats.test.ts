import { describe, expect, it } from "vitest";
import { analyzeUrdu, countSentences, countWords, splitWords } from "../src/stats.js";

describe("countWords", () => {
  it("counts words", () => {
    expect(countWords("پاکستان ایک خوبصورت ملک ہے")).toBe(5);
  });

  it("does not count attached punctuation as a word", () => {
    expect(countWords("پاکستان ایک خوبصورت ملک ہے۔")).toBe(5);
    expect(countWords("آپ کیسے ہیں؟")).toBe(3);
  });

  it("handles messy whitespace and empty input", () => {
    expect(countWords("  کیا \n\n حال  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(splitWords("   ")).toEqual([]);
  });
});

describe("countSentences", () => {
  it("splits on the Urdu full stop and question mark", () => {
    expect(countSentences("یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔")).toBe(2);
    expect(countSentences("آپ کیسے ہیں؟ میں ٹھیک ہوں۔")).toBe(2);
  });

  it("does not invent a sentence from a trailing terminator", () => {
    expect(countSentences("ایک جملہ۔")).toBe(1);
    expect(countSentences("")).toBe(0);
  });
});

describe("analyzeUrdu", () => {
  const text = "پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی بہت زیادہ ہے۔";

  it("reports words, sentences and script share", () => {
    const stats = analyzeUrdu(text);
    expect(stats.words).toBe(11);
    expect(stats.sentences).toBe(2);
    expect(stats.urduPercentage).toBe(100);
    expect(stats.characters).toBe([...text].length);
    expect(stats.paragraphs).toBe(1);
    expect(stats.averageWordsPerSentence).toBe(5.5);
  });

  it("counts diacritics and digits", () => {
    const stats = analyzeUrdu("مُحَمَّد ۱۲۳ 45");
    // مُحَمَّد carries damma, fatha, shadda, fatha.
    expect(stats.diacritics).toBe(4);
    expect(stats.digits).toBe(5);
  });

  it("reports a mixed-script percentage below 100", () => {
    const stats = analyzeUrdu("پاکستان Pakistan");
    expect(stats.urduPercentage).toBeGreaterThan(0);
    expect(stats.urduPercentage).toBeLessThan(100);
  });

  it("survives empty input", () => {
    const stats = analyzeUrdu("");
    expect(stats).toMatchObject({ characters: 0, words: 0, sentences: 0, urduPercentage: 0 });
  });
});
