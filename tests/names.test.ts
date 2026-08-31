import { describe, it, expect } from "vitest";
import {
  transliterateNameToEnglish,
  transliterateNameToUrdu,
  extractNameParts,
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
