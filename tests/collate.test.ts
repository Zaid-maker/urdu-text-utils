import { describe, expect, it } from "vitest";
import { compareUrdu, sortUrdu } from "../src/collate.js";

describe("sortUrdu", () => {
  it("sorts by the Urdu alphabet, not by codepoint", () => {
    // By codepoint گ (U+06AF) precedes ی (U+06CC) but follows ک (U+06A9) —
    // and ٹ (U+0679) would land far away from ت. Alphabet order is required.
    expect(sortUrdu(["گل", "آم", "بادام"])).toEqual(["آم", "بادام", "گل"]);
    expect(sortUrdu(["ٹماٹر", "تربوز", "پپیتا"])).toEqual(["پپیتا", "تربوز", "ٹماٹر"]);
  });

  it("puts ک before گ and ن before ں", () => {
    expect(sortUrdu(["گھر", "کتاب"])).toEqual(["کتاب", "گھر"]);
    expect(sortUrdu(["ماں", "مان"])).toEqual(["مان", "ماں"]);
  });

  it("ignores diacritics and Unicode variants", () => {
    expect(sortUrdu(["مُحَمَّد", "احمد"])).toEqual(["احمد", "مُحَمَّد"]);
    expect(compareUrdu("كتاب", "کتاب")).toBe(0);
  });

  it("sorts descending on request", () => {
    expect(sortUrdu(["آم", "بادام"], { descending: true })).toEqual(["بادام", "آم"]);
  });

  it("sorts objects via getText", () => {
    const rows = [{ name: "گل" }, { name: "آم" }];
    expect(sortUrdu(rows, { getText: (r) => r.name })).toEqual([{ name: "آم" }, { name: "گل" }]);
  });

  it("does not mutate the input", () => {
    const input = ["گل", "آم"];
    sortUrdu(input);
    expect(input).toEqual(["گل", "آم"]);
  });

  it("orders a prefix before a longer word", () => {
    expect(sortUrdu(["کتابیں", "کتاب"])).toEqual(["کتاب", "کتابیں"]);
  });
});
