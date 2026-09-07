import { describe, expect, it } from "vitest";
import { ARABIC_WORD_RE, URDU_LETTERS } from "../src/chars.js";

describe("URDU_LETTERS inventory", () => {
  const primaries = URDU_LETTERS.filter((letter) => letter.variantOf === undefined);
  const variants = URDU_LETTERS.filter((letter) => letter.variantOf !== undefined);
  const letters = URDU_LETTERS.map((letter) => letter.ch);
  const aliases = URDU_LETTERS.flatMap((letter) =>
    (letter.aliases ?? []).map((alias) => [letter.ch, alias] as const),
  );

  it("covers the 40-letter alphabet plus the 4 hamza variants", () => {
    expect(primaries).toHaveLength(40);
    expect(variants).toHaveLength(4);
  });

  it("lists primaries in Urdu alphabetical order", () => {
    const position = new Map(primaries.map((letter, index) => [letter.ch, index] as const));
    expect(position.get("ا")).toBe(0);
    expect(position.get("آ")).toBe(1);
    expect(position.get("ے")).toBe(39);
    // Alphabetically ک comes before گ, and ن before ں.
    expect(position.get("ک")!).toBeLessThan(position.get("گ")!);
    expect(position.get("ن")!).toBeLessThan(position.get("ں")!);
  });

  it("has no duplicate letters", () => {
    expect(new Set(letters).size).toBe(letters.length);
  });

  it("every variant points at an existing primary letter", () => {
    const primarySet = new Set(primaries.map((letter) => letter.ch));
    for (const letter of variants) {
      expect(primarySet.has(letter.variantOf!), `${letter.ch} → ${letter.variantOf}`).toBe(true);
    }
  });

  it("letters and aliases are pure Urdu script with no foreign lookalikes", () => {
    for (const ch of letters) expect(ch, `letter ${ch}`).toMatch(ARABIC_WORD_RE);
    for (const [, alias] of aliases) expect(alias, `alias ${alias}`).toMatch(ARABIC_WORD_RE);
  });

  it("aliases are unique and never shadow a canonical letter", () => {
    const aliasChars = aliases.map(([, alias]) => alias);
    expect(new Set(aliasChars).size).toBe(aliasChars.length);
    for (const [, alias] of aliases) {
      expect(letters.includes(alias), `alias ${alias}`).toBe(false);
    }
  });

  it("every letter except the bare hamza has a non-empty roman value", () => {
    for (const letter of URDU_LETTERS) {
      if (letter.ch === "ء") continue;
      expect(letter.roman.length, `${letter.ch} → ${JSON.stringify(letter.roman)}`).toBeGreaterThan(0);
    }
  });

  it("lists the alphabet in exact order at both ends", () => {
    const order = URDU_LETTERS.map((letter) => letter.ch);
    expect(order.slice(0, 8)).toEqual(["ا", "آ", "ب", "پ", "ت", "ٹ", "ث", "ج"]);
    expect(order.slice(-4)).toEqual(["ی", "ئ", "ے", "ۓ"]);
  });

  it("marks exactly the expected letters as vowels", () => {
    const vowels = URDU_LETTERS.filter((letter) => letter.vowel).map((letter) => letter.ch);
    expect(vowels).toEqual(["ا", "آ", "ع", "و", "ؤ", "ۂ", "ی", "ئ", "ے", "ۓ"]);
  });

  it("keeps roman values as lowercase ASCII", () => {
    for (const letter of URDU_LETTERS) {
      if (letter.ch === "ء") continue;
      expect(letter.roman, `roman for ${letter.ch}`).toMatch(/^[a-z]+$/u);
    }
  });

  it("sorts each hamza variant immediately after its base letter", () => {
    const order = URDU_LETTERS.map((letter) => letter.ch);
    expect(order.indexOf("ؤ")).toBe(order.indexOf("و") + 1);
    expect(order.indexOf("ئ")).toBe(order.indexOf("ی") + 1);
    expect(order.indexOf("ۓ")).toBe(order.indexOf("ے") + 1);
  });
});
