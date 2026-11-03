import { describe, expect, it } from "vitest";
import { hostOf, strongRuns } from "./catalog-labels";

describe("catalog labels", () => {
  it("turns **marked** text into strong runs", () => {
    expect(strongRuns("Runs here. **Experimental**: not compared yet.")).toEqual([
      { text: "Runs here. ", strong: false },
      { text: "Experimental", strong: true },
      { text: ": not compared yet.", strong: false },
    ]);
  });

  it("leaves text without markers as one plain run", () => {
    expect(strongRuns("Plain note.")).toEqual([{ text: "Plain note.", strong: false }]);
  });

  it("shows the host of a link without www", () => {
    expect(hostOf("https://www.fon.hum.uva.nl/praat/")).toBe("fon.hum.uva.nl");
  });
});
