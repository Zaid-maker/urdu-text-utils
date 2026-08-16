import { describe, expect, it } from "vitest";
import { analyzeUrdu, countSentences, countWords, splitSentences, splitWords } from "../src/stats.js";

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

describe("countSentences & splitSentences", () => {
  it("splits on the Urdu full stop and question mark", () => {
    expect(countSentences("یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔")).toBe(2);
    expect(countSentences("آپ کیسے ہیں؟ میں ٹھیک ہوں۔")).toBe(2);
    expect(splitSentences("یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔")).toEqual([
      "یہ پہلا جملہ ہے",
      "یہ دوسرا ہے",
    ]);
  });

  it("does not invent a sentence from a trailing terminator", () => {
    expect(countSentences("ایک جملہ۔")).toBe(1);
    expect(countSentences("")).toBe(0);
    expect(splitSentences("")).toEqual([]);
  });

  it("preserves terminators when requested", () => {
    const text = "کیا آپ خیریت سے ہیں؟ جی ہاں، میں ٹھیک ہوں۔";
    expect(splitSentences(text, { preserveTerminators: true })).toEqual([
      "کیا آپ خیریت سے ہیں؟",
      "جی ہاں، میں ٹھیک ہوں۔",
    ]);
  });

  it("protects abbreviations and titles from false splits", () => {
    const text = "ڈاکٹر. علامہ اقبال ہمارے قومی شاعر ہیں۔ وہ سیالکوٹ میں پیدا ہوئے۔";
    const sentences = splitSentences(text);
    expect(sentences.length).toBe(2);
    expect(sentences[0]).toBe("ڈاکٹر. علامہ اقبال ہمارے قومی شاعر ہیں");
  });

  it("protects numeric decimals from false splits", () => {
    const text = "پائی کی قیمت 3.14 ہے۔ یہ ایک مستقل عدد ہے۔";
    expect(splitSentences(text).length).toBe(2);
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
