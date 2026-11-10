import { describe, expect, it } from "vitest";
import { diffRuns, transcribe } from "./transcriber";

describe("landing transcriber", () => {
  it("gives the phonemic and the phonetic layer of the default sentence", () => {
    expect(transcribe("la lluvia cae")).toEqual({
      phonemic: "la ʝubia kae",
      phonetic: "la ʝuβia kae",
    });
  });

  it("marks only the symbols the allophonic layer changed", () => {
    expect(diffRuns("la ʝubia kae", "la ʝuβia kae")).toEqual([
      { text: "la ʝu", changed: false },
      { text: "β", changed: true },
      { text: "ia kae", changed: false },
    ]);
  });

  it("marks nothing when the two layers do not align symbol by symbol", () => {
    expect(diffRuns("ab", "abc")).toEqual([{ text: "abc", changed: false }]);
  });
});
