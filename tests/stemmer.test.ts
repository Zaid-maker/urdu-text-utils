import { describe, expect, it } from "vitest";
import {
  URDU_PREFIXES,
  URDU_SUFFIXES,
  getAffixes,
  stemUrdu,
  stemUrduText,
} from "../src/stemmer.js";

describe("URDU_PREFIXES & URDU_SUFFIXES constants", () => {
  it("contains canonical Urdu prefixes and suffixes", () => {
    expect(URDU_PREFIXES.length).toBeGreaterThan(5);
    expect(URDU_PREFIXES).toContain("بے");
    expect(URDU_PREFIXES).toContain("نا");
    expect(URDU_PREFIXES).toContain("غیر");

    expect(URDU_SUFFIXES.length).toBeGreaterThan(15);
    expect(URDU_SUFFIXES).toContain("وں");
    expect(URDU_SUFFIXES).toContain("یں");
    expect(URDU_SUFFIXES).toContain("یاں");
  });
});

describe("stemUrdu - Plural and morphological restorations", () => {
  it("stems standard Urdu plurals ending in -وں and -یں", () => {
    expect(stemUrdu("کتابیں")).toBe("کتاب");
    expect(stemUrdu("کتابوں")).toBe("کتاب");
    expect(stemUrdu("شہروں")).toBe("شہر");
    expect(stemUrdu("خبریں")).toBe("خبر");
    expect(stemUrdu("تصویریں")).toBe("تصویر");
    expect(stemUrdu("لوگوں")).toBe("لوگ");
  });

  it("restores final 'ی' when stripping feminine plurals ending in -یاں and -یوں", () => {
    expect(stemUrdu("لڑکیاں")).toBe("لڑکی");
    expect(stemUrdu("لڑکیوں")).toBe("لڑکی");
    expect(stemUrdu("کہانیاں")).toBe("کہانی");
    expect(stemUrdu("روٹیاں")).toBe("روٹی");
    expect(stemUrdu("گاڑیاں")).toBe("گاڑی");
    expect(stemUrdu("صدیوں")).toBe("صدی");
    expect(stemUrdu("تبدیلیاں")).toBe("تبدیلی");
    expect(stemUrdu("خوبصورتیاں")).toBe("خوبصورتی");
  });

  it("restores base vowel when stripping hamza plurals -ائیں, -اؤں, -ئیں, -ؤں", () => {
    expect(stemUrdu("دعائیں")).toBe("دعا");
    expect(stemUrdu("دعاؤں")).toBe("دعا");
    expect(stemUrdu("ہوائیں")).toBe("ہوا");
    expect(stemUrdu("ہواؤں")).toBe("ہوا");
    expect(stemUrdu("فضائیں")).toBe("فضا");
    expect(stemUrdu("خوشبوئیں")).toBe("خوشبو");
    expect(stemUrdu("خوشبوؤں")).toBe("خوشبو");
  });

  it("stems -ات and -جات plural forms", () => {
    expect(stemUrdu("تعلیمات")).toBe("تعلیم");
    expect(stemUrdu("احساسات")).toBe("احساس");
    expect(stemUrdu("معلومات")).toBe("معلوم");
    expect(stemUrdu("کاغذات")).toBe("کاغذ");
  });
});

describe("stemUrdu - Prefixes (سابقے)", () => {
  it("strips common Urdu prefixes", () => {
    expect(stemUrdu("بےوقوف")).toBe("وقوف");
    expect(stemUrdu("بےشک")).toBe("شک");
    expect(stemUrdu("نااہل")).toBe("اہل");
    expect(stemUrdu("ناکام")).toBe("کام");
    expect(stemUrdu("غیرملکی")).toBe("ملکی");
    expect(stemUrdu("لاجواب")).toBe("جواب");
    expect(stemUrdu("ہمسفر")).toBe("سفر");
    expect(stemUrdu("ہمدرد")).toBe("درد");
    expect(stemUrdu("بدنام")).toBe("نام");
    expect(stemUrdu("کمزور")).toBe("زور");
  });
});

describe("stemUrdu - Derivational and verbal suffixes", () => {
  it("strips adjectival and agentive suffixes", () => {
    expect(stemUrdu("دکاندار")).toBe("دکان");
    expect(stemUrdu("وفاداری")).toBe("وفا");
    expect(stemUrdu("مددگار")).toBe("مدد");
    expect(stemUrdu("خوفناک")).toBe("خوف");
    expect(stemUrdu("ضرورتمند")).toBe("ضرورت");
    expect(stemUrdu("امیدوار")).toBe("امید");
    expect(stemUrdu("انسانیت")).toBe("انسان");
    expect(stemUrdu("پاگل پن")).toBe("پاگل");
  });

  it("strips common verb tense inflections", () => {
    expect(stemUrdu("پڑھتا")).toBe("پڑھ");
    expect(stemUrdu("پڑھتی")).toBe("پڑھ");
    expect(stemUrdu("پڑھتے")).toBe("پڑھ");
    expect(stemUrdu("کھاتے")).toBe("کھا");
    expect(stemUrdu("پڑھیںگے")).toBe("پڑھ");
    expect(stemUrdu("پڑھینگے")).toBe("پڑھ");
  });
});

describe("stemUrdu - Protection of short and irreducible roots", () => {
  it("protects short roots and core words from over-stemming", () => {
    expect(stemUrdu("ہم")).toBe("ہم");
    expect(stemUrdu("باغ")).toBe("باغ");
    expect(stemUrdu("نام")).toBe("نام");
    expect(stemUrdu("ہوا")).toBe("ہوا");
    expect(stemUrdu("دل")).toBe("دل");
    expect(stemUrdu("سر")).toBe("سر");
    expect(stemUrdu("رات")).toBe("رات");
    expect(stemUrdu("بات")).toBe("بات");
    expect(stemUrdu("ہے")).toBe("ہے");
    expect(stemUrdu("ہیں")).toBe("ہیں");
  });
});

describe("getAffixes", () => {
  it("breaks down a word into its prefix, stem, and suffix", () => {
    expect(getAffixes("بےوقوف")).toEqual({ prefix: "بے", stem: "وقوف", suffix: undefined });
    expect(getAffixes("کتابیں")).toEqual({ prefix: undefined, stem: "کتاب", suffix: "یں" });
    expect(getAffixes("نااہل")).toEqual({ prefix: "نا", stem: "اہل", suffix: undefined });
    expect(getAffixes("دکاندار")).toEqual({ prefix: undefined, stem: "دکان", suffix: "دار" });
    expect(getAffixes("لڑکیاں")).toEqual({ prefix: undefined, stem: "لڑکی", suffix: "یاں" });
  });

  it("returns empty stem for empty input", () => {
    expect(getAffixes("")).toEqual({ stem: "" });
  });
});

describe("stemUrdu - Options", () => {
  it("allows disabling prefix or suffix stripping", () => {
    expect(stemUrdu("بےوقوف", { stripPrefixes: false })).toBe("بےوقوف");
    expect(stemUrdu("کتابیں", { stripSuffixes: false })).toBe("کتابیں");
  });

  it("supports custom exceptions dictionary", () => {
    expect(stemUrdu("خصوصی", { exceptions: { خصوصی: "خاص" } })).toBe("خاص");
  });
});

describe("stemUrduText", () => {
  it("stems all words in a full Urdu sentence while preserving punctuation and spacing", () => {
    const text = "طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔";
    const stemmed = stemUrduText(text);
    expect(stemmed).toBe("طلباء کتاب پڑھ ہیں اور کہانی سن ہیں۔");
  });

  it("handles empty or non-string input safely", () => {
    expect(stemUrduText("")).toBe("");
  });
});
