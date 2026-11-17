import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  levels,
  parseDataset,
  parseNumber,
  presentNumbers,
  withKind,
} from "./dataset";

describe("parseDataset", () => {
  it("reads a comma CSV, detects numeric and nominal columns and counts missing cells", () => {
    const result = parseDataset('grupo,edad,nota\nL1,21,3.5\nL2,NA,4\n"L1, tarde",30,\n');
    if (!result.ok) throw new Error(result.error.code);
    const [group, age, score] = result.value.variables;
    expect(result.value).toMatchObject({ delimiter: ",", rows: 3 });
    expect(group).toMatchObject({
      name: "grupo",
      kind: "nominal",
      raw: ["L1", "L2", "L1, tarde"],
      missing: 0,
    });
    expect(age).toMatchObject({ kind: "numeric", numbers: [21, null, 30], missing: 1 });
    expect(score).toMatchObject({ kind: "numeric", numbers: [3.5, 4, null], missing: 1 });
  });

  it("reads Excel's Spanish CSV: semicolons and decimal commas", () => {
    const result = parseDataset("tiempo;grupo\n3,25;a\n4,5;b\n");
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.delimiter).toBe(";");
    expect(result.value.variables[0]?.numbers).toEqual([3.25, 4.5]);
  });

  it("reads tab-separated values", () => {
    const result = parseDataset("a\tb\n1\tx\n2\ty\n");
    expect(result.ok && result.value.variables.map((v) => v.kind)).toEqual(["numeric", "nominal"]);
  });

  it("names a missing or repeated column name and a row of the wrong length", () => {
    expect(parseDataset("a,,c\n1,2,3\n")).toEqual({
      ok: false,
      error: { code: "bad-header", column: 2 },
    });
    expect(parseDataset("a,a\n1,2\n")).toEqual({
      ok: false,
      error: { code: "bad-header", column: 2 },
    });
    expect(parseDataset("a,b\n1,2\n3\n")).toEqual({
      ok: false,
      error: { code: "ragged-row", row: 3, expected: 2, found: 1 },
    });
    expect(parseDataset("a,b\n")).toEqual({ ok: false, error: { code: "empty" } });
  });
});

describe("numbers, delimiters and kinds", () => {
  it("does not guess thousands separators or accept a decimal comma next to comma separators", () => {
    expect(parseNumber("1.234", false)).toBe(1.234);
    expect(parseNumber("3,5", false)).toBeNull();
    expect(parseNumber("3,5", true)).toBe(3.5);
    expect(parseNumber("-2e3", true)).toBe(-2000);
    expect(parseNumber("12 años", true)).toBeNull();
  });

  it("picks the delimiter that appears most in the header, outside quotes", () => {
    expect(detectDelimiter('"a;b",c,d\n')).toBe(",");
    expect(detectDelimiter("a;b;c\n")).toBe(";");
  });

  it("lets a person mark a variable ordinal, but never turns text into numbers", () => {
    const result = parseDataset("nivel,n\nalto,1\nbajo,2\n");
    if (!result.ok) throw new Error(result.error.code);
    const marked = withKind(result.value, "nivel", "ordinal");
    expect(marked.variables[0]?.kind).toBe("ordinal");
    expect(withKind(result.value, "nivel", "numeric").variables[0]?.kind).toBe("nominal");
    expect(levels(marked.variables[0] ?? marked.variables[1]!)).toEqual(["alto", "bajo"]);
    expect(presentNumbers(result.value.variables[1]!)).toEqual([1, 2]);
  });
});
