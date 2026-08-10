import { describe, expect, it } from "vitest";
import { editDistance, highlightUrdu, searchUrdu, searchUrduRanked } from "../src/search.js";

const names = ["مُحَمَّد علی", "احمد", "محمد خان"];

describe("searchUrdu", () => {
  it("matches across diacritics", () => {
    expect(searchUrdu("محمد", names).sort()).toEqual(["محمد خان", "مُحَمَّد علی"].sort());
  });

  it("matches across Arabic vs Urdu letter forms", () => {
    // Query typed on an Arabic keyboard: ك and ي instead of ک and ی.
    expect(searchUrdu("كتاب", ["کتاب", "قلم"])).toEqual(["کتاب"]);
  });

  it("returns nothing for a miss or an empty query", () => {
    expect(searchUrdu("قلم", names)).toEqual([]);
    expect(searchUrdu("", names)).toEqual([]);
  });

  it("ranks exact matches above substring matches", () => {
    const ranked = searchUrduRanked("محمد", ["محمد خان", "محمد"]);
    expect(ranked[0]!.item).toBe("محمد");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("respects limit", () => {
    expect(searchUrdu("محمد", names, { limit: 1 })).toHaveLength(1);
  });

  it("searches objects via getText", () => {
    const rows = [{ title: "محمد خان" }, { title: "احمد" }];
    expect(searchUrdu("محمد", rows, { getText: (r) => r.title })).toEqual([{ title: "محمد خان" }]);
  });

  it("tolerates a one-letter typo only when fuzzy is on", () => {
    expect(searchUrdu("پاکستاں", ["پاکستان"])).toEqual([]);
    expect(searchUrdu("پاکستاں", ["پاکستان"], { fuzzy: true })).toEqual(["پاکستان"]);
  });
});

describe("editDistance", () => {
  it("measures edits", () => {
    expect(editDistance("کتاب", "کتاب")).toBe(0);
    expect(editDistance("کتاب", "کتب")).toBe(1);
  });

  it("exits early past the limit", () => {
    expect(editDistance("کتاب", "پاکستان", 1)).toBeGreaterThan(1);
  });
});

describe("highlightUrdu", () => {
  it("wraps the match but keeps the original diacritics", () => {
    expect(highlightUrdu("مُحَمَّد علی", "محمد")).toBe("<mark>مُحَمَّد</mark> علی");
  });

  it("takes a custom wrapper and handles multiple hits", () => {
    expect(highlightUrdu("محمد اور محمد", "محمد", (m) => `[${m}]`)).toBe("[محمد] اور [محمد]");
  });

  it("returns the text unchanged on a miss", () => {
    expect(highlightUrdu("احمد", "محمد")).toBe("احمد");
    expect(highlightUrdu("احمد", "")).toBe("احمد");
  });

  it("matches across a space", () => {
    expect(highlightUrdu("محمد خان صاحب", "محمد خان")).toBe("<mark>محمد خان</mark> صاحب");
  });
});
