import { describe, expect, it } from "vitest";
import { boxStats, histogramBins, niceTicks, sceneFor } from "./charts";

describe("chart statistics", () => {
  it("splits a sample into Sturges' ⌈log₂ n⌉ + 1 bins that hold every value", () => {
    const values = Array.from({ length: 40 }, (_, i) => i * 1.5);
    const bins = histogramBins(values);
    expect(bins).toHaveLength(Math.ceil(Math.log2(40)) + 1);
    expect(bins.reduce((total, bin) => total + bin.count, 0)).toBe(40);
    expect(bins[bins.length - 1]?.to).toBe(58.5);
  });

  it("draws whiskers to the last value within 1.5 IQR and marks the rest as outliers (Tukey)", () => {
    // R: quantile(c(1:9, 30), type = 7) gives Q1 = 3.25, median 5.5, Q3 = 7.75.
    expect(boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 30])).toEqual({
      q1: 3.25,
      median: 5.5,
      q3: 7.75,
      low: 1,
      high: 9,
      outliers: [30],
    });
  });

  it("chooses round ticks that cover the range", () => {
    expect(niceTicks(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(412, 559)).toEqual([450, 500, 550]);
    expect(niceTicks(3, 3)).toEqual([3]);
  });
});

describe("scenes", () => {
  it("draws one box per group and one outlier point", () => {
    const scene = sceneFor({ kind: "boxplots", groups: [{ label: "A", values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 30] }, { label: "B", values: [2, 3, 4] }] });
    expect(scene.items.filter((item) => item.type === "rect")).toHaveLength(2);
    expect(scene.items.filter((item) => item.type === "circle")).toHaveLength(1);
    expect(scene.items.some((item) => item.type === "text" && item.text === "B")).toBe(true);
  });

  it("keeps every shape inside the drawing", () => {
    const scene = sceneFor({ kind: "scatter", x: [1, 2, 3, 10], y: [5, 3, 8, -2], line: { intercept: 100, slope: -40 } });
    for (const item of scene.items) {
      if (item.type === "circle") {
        expect(item.cx).toBeGreaterThanOrEqual(0);
        expect(item.cy).toBeLessThanOrEqual(scene.height);
      }
      if (item.type === "line") {
        expect(Math.min(item.y1, item.y2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(item.y1, item.y2)).toBeLessThanOrEqual(scene.height);
      }
    }
  });
});
