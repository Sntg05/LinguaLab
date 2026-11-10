import { describe, expect, it } from "vitest";
import catalog from "./tools.json";
import { TOOL_HIGHLIGHTS } from "./tool-highlights";

describe("tool highlights", () => {
  it("cover exactly the tools in the catalog", () => {
    const ids = catalog.tools.map((tool) => tool.id).sort();
    expect(Object.keys(TOOL_HIGHLIGHTS).sort()).toEqual(ids);
  });

  it("give every tool a summary in both locales", () => {
    for (const [id, highlight] of Object.entries(TOOL_HIGHLIGHTS)) {
      expect(highlight.summary.es.trim(), id).not.toBe("");
      expect(highlight.summary.en.trim(), id).not.toBe("");
    }
  });
});
