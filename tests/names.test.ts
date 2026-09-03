import { describe, it, expect } from "vitest";
import { ARABIC_WORD_RE } from "../src/chars.js";
import {
  HONORIFICS,
  NAME_PREFIXES,
  URDU_FAMILY_NAMES,
  URDU_FIRST_NAMES,
  extractNameParts,
  transliterateNameToEnglish,
  transliterateNameToUrdu,
} from "../src/names.js";

describe("transliterateNameToEnglish", () => {
  it("transliterates single names", () => {
    expect(transliterateNameToEnglish("محمد")).toBe("Muhammad");
    expect(transliterateNameToEnglish("علی")).toBe("Ali");
    expect(transliterateNameToEnglish("عمر")).toBe("Umar");
    expect(transliterateNameToEnglish("خان")).toBe("Khan");
  });

  it("transliterates full names", () => {
    expect(transliterateNameToEnglish("محمد علی")).toBe("Muhammad Ali");
    expect(transliterateNameToEnglish("احمد خان")).toBe("Ahmed Khan");
    expect(transliterateNameToEnglish("فاطمہ عائشہ")).toBe("Fatima Ayesha");
  });

  it("handles honorifics", () => {
    expect(transliterateNameToEnglish("جناب خان")).toBe("Janab Khan");
    expect(transliterateNameToEnglish("محمد صاحب")).toBe("Muhammad Sahib");
    expect(transliterateNameToEnglish("علی صاحب")).toBe("Ali Sahib");
  });

  it("handles family names", () => {
    expect(transliterateNameToEnglish("خان")).toBe("Khan");
    expect(transliterateNameToEnglish("شریف")).toBe("Sharif");
    expect(transliterateNameToEnglish("بھٹو")).toBe("Bhutto");
    expect(transliterateNameToEnglish("زرداری")).toBe("Zardari");
  });

  it("handles full names with honorifics and family names", () => {
    expect(transliterateNameToEnglish("جناب محمد علی خان صاحب")).toBe(
      "Janab Muhammad Ali Khan Sahib",
    );
  });

  it("handles empty input", () => {
    expect(transliterateNameToEnglish("")).toBe("");
  });

  it("preserves case by default", () => {
    const result = transliterateNameToEnglish("محمد علی");
    expect(result).toBe("Muhammad Ali");
  });

  it("can exclude honorifics", () => {
    expect(
      transliterateNameToEnglish("جناب محمد علی", { includeHonorifics: false }),
    ).toBe("Muhammad Ali");
  });
});

describe("transliterateNameToUrdu", () => {
  it("transliterates single names", () => {
    expect(transliterateNameToUrdu("Muhammad")).toBe("محمد");
    expect(transliterateNameToUrdu("Ali")).toBe("علی");
    expect(transliterateNameToUrdu("Umar")).toBe("عمر");
    expect(transliterateNameToUrdu("Khan")).toBe("خان");
  });

  it("transliterates full names", () => {
    expect(transliterateNameToUrdu("Muhammad Ali")).toBe("محمد علی");
    expect(transliterateNameToUrdu("Ahmed Khan")).toBe("احمد خان");
    expect(transliterateNameToUrdu("Fatima Ayesha")).toBe("فاطمہ عائشہ");
  });

  it("handles honorifics", () => {
    expect(transliterateNameToUrdu("Janab Khan")).toBe("جناب خان");
    expect(transliterateNameToUrdu("Muhammad Sahib")).toBe("محمد صاحب");
  });

  it("handles family names", () => {
    expect(transliterateNameToUrdu("Khan")).toBe("خان");
    expect(transliterateNameToUrdu("Sharif")).toBe("شریف");
    expect(transliterateNameToUrdu("Bhutto")).toBe("بھٹو");
    expect(transliterateNameToUrdu("Zardari")).toBe("زرداری");
  });

  it("handles empty input", () => {
    expect(transliterateNameToUrdu("")).toBe("");
  });

  it("handles case insensitivity", () => {
    expect(transliterateNameToUrdu("MUHAMMAD")).toBe("محمد");
    expect(transliterateNameToUrdu("ali")).toBe("علی");
  });
});

describe("extractNameParts", () => {
  it("extracts parts from full name with honorific", () => {
    const parts = extractNameParts("جناب محمد علی خان صاحب");
    expect(parts.honorific).toBe("جناب");
    expect(parts.firstName).toBe("محمد علی");
    expect(parts.familyName).toBe("خان");
    expect(parts.suffix).toBe("صاحب");
  });

  it("extracts parts from name without honorific", () => {
    const parts = extractNameParts("محمد علی خان");
    expect(parts.honorific).toBeUndefined();
    expect(parts.firstName).toBe("محمد علی");
    expect(parts.familyName).toBe("خان");
    expect(parts.suffix).toBeUndefined();
  });

  it("extracts parts from single name", () => {
    const parts = extractNameParts("محمد");
    expect(parts.honorific).toBeUndefined();
    expect(parts.firstName).toBe("محمد");
    expect(parts.familyName).toBeUndefined();
    expect(parts.suffix).toBeUndefined();
  });

  it("handles empty input", () => {
    const parts = extractNameParts("");
    expect(parts.firstName).toBe("");
  });
});

describe("corrected Urdu spellings", () => {
  // Keys previously garbled (mixed or foreign script, leading whitespace) or
  // misspelled — each must now transliterate exactly in both directions.
  const pairs: Array<[string, string]> = [
    ["آصف", "Asif"],
    ["خالد", "Khalid"],
    ["ندیم", "Nadeem"],
    ["نظیر", "Nazir"],
    ["سرفراز", "Sarfraz"],
    ["مقصود", "Maqsood"],
    ["مسعود", "Masood"],
    ["اقصی", "Aqsa"],
    ["لائبہ", "Laiba"],
    ["فیزا", "Fiza"],
    ["فضہ", "Fizza"],
    ["نازیہ", "Nazia"],
    ["تسنیم", "Tasneem"],
    ["سلمی", "Salma"],
    ["عظمی", "Uzma"],
    // Source-verified corrections from the 2026 audit (UrduPoint & others):
    ["عدیل", "Adeel"],
    ["شعیب", "Shoaib"],
    ["رؤف", "Rauf"],
    ["حرا", "Hira"],
    ["ماہم", "Maham"],
    ["حنا", "Hina"],
    ["سدرہ", "Sidra"],
    ["ردا", "Rida"],
    ["نائلہ", "Naila"],
    ["بشری", "Bushra"],
    ["رخسانہ", "Rukhsana"],
    ["ناہید", "Naheed"],
    ["صائمہ", "Saima"],
    ["مہرین", "Mehreen"],
    ["عنبرین", "Ambreen"],
    ["سمیعہ", "Samia"],
    ["سامیہ", "Samiya"],
    ["رابعہ", "Rabia"],
    ["ارم", "Iram"],
    ["فرح", "Farah"],
    ["نزہت", "Nuzhat"],
    ["کرن", "Kiran"],
    ["قریشی", "Qureshi"],
    ["جدون", "Jadoon"],
    ["کھوسہ", "Khosa"],
    ["تالپور", "Talpur"],
    // Verified common names added in the audit:
    ["دانیال", "Daniyal"],
    ["ذیشان", "Zeeshan"],
    ["مصطفی", "Mustafa"],
    ["جویریہ", "Javeria"],
    ["مہوش", "Mehwish"],
    ["عالیہ", "Alia"],
    ["میمونہ", "Memoona"],
  ];

  it("transliterates the corrected Urdu spellings to English", () => {
    for (const [urdu, english] of pairs) {
      expect(transliterateNameToEnglish(urdu)).toBe(english);
    }
  });

  it("transliterates the corrected English spellings back to Urdu", () => {
    for (const [urdu, english] of pairs) {
      expect(transliterateNameToUrdu(english)).toBe(urdu);
    }
  });

  it("maps the alternate Roman spellings Omer and Omar to عمر", () => {
    expect(transliterateNameToUrdu("Omer")).toBe("عمر");
    expect(transliterateNameToUrdu("Omar")).toBe("عمر");
    expect(transliterateNameToEnglish("عمر")).toBe("Umar");
  });

  it("accepts names typed with the superscript-alef spelling", () => {
    expect(transliterateNameToEnglish("اقصیٰ")).toBe("Aqsa");
    expect(transliterateNameToEnglish("سلمیٰ")).toBe("Salma");
    expect(transliterateNameToEnglish("عظمیٰ")).toBe("Uzma");
    expect(transliterateNameToEnglish("بشریٰ")).toBe("Bushra");
    expect(transliterateNameToEnglish("مصطفیٰ")).toBe("Mustafa");
  });
});

describe("name dictionary data integrity", () => {
  const tables = { ...URDU_FIRST_NAMES, ...URDU_FAMILY_NAMES };
  // Every Urdu-keyed table, so a corrupted entry anywhere fails CI.
  const allTables: Array<[string, Record<string, string>]> = [
    ["URDU_FIRST_NAMES", URDU_FIRST_NAMES],
    ["URDU_FAMILY_NAMES", URDU_FAMILY_NAMES],
    ["HONORIFICS", HONORIFICS],
    ["NAME_PREFIXES", NAME_PREFIXES],
  ];

  it("keys are pure Arabic script (plus ZWNJ/ZWJ) with no foreign lookalikes", () => {
    for (const [tableName, table] of allTables) {
      for (const key of Object.keys(table)) {
        expect(key, `${tableName} key ${JSON.stringify(key)}`).toMatch(ARABIC_WORD_RE);
      }
    }
  });

  it("keys have no leading or trailing whitespace", () => {
    for (const [tableName, table] of allTables) {
      for (const key of Object.keys(table)) {
        expect(key.trim(), `${tableName} key ${JSON.stringify(key)}`).toBe(key);
      }
    }
  });

  it("every Urdu name round-trips through English", () => {
    for (const urdu of Object.keys(tables)) {
      expect(transliterateNameToUrdu(transliterateNameToEnglish(urdu)), urdu).toBe(urdu);
    }
  });

  it("every English spelling round-trips through Urdu", () => {
    for (const english of Object.values(tables)) {
      expect(transliterateNameToEnglish(transliterateNameToUrdu(english)), english).toBe(english);
    }
  });

  it("supports the alternate Roman spellings", () => {
    expect(transliterateNameToUrdu("Hassan")).toBe("حسن");
    expect(transliterateNameToUrdu("Amna")).toBe("آمنہ");
    expect(transliterateNameToUrdu("Yaqoob")).toBe("یعقوب");
    expect(transliterateNameToUrdu("Jameel")).toBe("جمیل");
    expect(transliterateNameToUrdu("Sahab")).toBe("صاحب");
    expect(transliterateNameToUrdu("Dr.")).toBe("ڈاکٹر");
    expect(transliterateNameToUrdu("Prof.")).toBe("پروفیسر");
  });
});
