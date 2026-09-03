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
});
