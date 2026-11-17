import { mannWhitneyTest, parseDataset, tTestTwoSample } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { runAnalysis } from "./analyses";
import { apaBounded, apaDf, apaNumber, apaP } from "./apa";
import { EXAMPLE_CSV } from "./example";

const parsed = parseDataset(EXAMPLE_CSV);
if (!parsed.ok) throw new Error("the example must parse");
const DATA = parsed.value;

const column = (name: string) => DATA.variables.find((variable) => variable.name === name);

describe("APA figures", () => {
  it("writes p with three decimals, no leading zero, and a floor", () => {
    expect(apaP(0.0213)).toBe("p = .021");
    expect(apaP(0.0004)).toBe("p < .001");
    expect(apaP(0.5)).toBe("p = .500");
  });

  it("drops the leading zero only where the value cannot pass 1, and uses the minus sign", () => {
    expect(apaBounded(-0.456)).toBe("−.46");
    expect(apaNumber(-3.774)).toBe("−3.77");
    expect(apaNumber(-0.001)).toBe("0.00");
    expect(apaDf(30)).toBe("30");
    expect(apaDf(18.3317)).toBe("18.33");
  });
});

describe("the example dataset", () => {
  it("is invented, has 40 rows and one missing comprehension score", () => {
    expect(DATA.rows).toBe(40);
    expect(column("comprension")?.missing).toBe(1);
    expect(column("grupo")?.kind).toBe("nominal");
    expect(column("lectura_ms")?.kind).toBe("numeric");
  });
});

describe("runAnalysis", () => {
  it("compares two groups with Welch's t and Mann–Whitney, the same figures as the core", () => {
    const result = runAnalysis(DATA, { question: "two-groups", outcome: "lectura_ms", group: "grupo" });
    if (!result.ok) throw new Error(result.error.code);
    const reading = column("lectura_ms")?.numbers ?? [];
    const group = column("grupo")?.raw ?? [];
    const l1 = reading.filter((_, row) => group[row] === "L1") as number[];
    const l2 = reading.filter((_, row) => group[row] === "L2") as number[];
    const t = tTestTwoSample(l1, l2);
    const u = mannWhitneyTest(l1, l2);
    if (!t.ok || !u.ok) throw new Error("core");
    expect(result.value.tests[0]?.apa).toContain(`t(${apaDf(t.value.df ?? 0)}) = ${apaNumber(t.value.statistic)}, ${apaP(t.value.p)}`);
    expect(result.value.tests[1]?.apa).toContain(`W = ${apaNumber(u.value.statistic, 1)}`);
    expect(result.value.tests[0]?.significant).toBe(t.value.p < 0.05);
    expect(result.value.chart.kind).toBe("boxplots");
  });

  it("drops the row with a missing value instead of inventing it", () => {
    const result = runAnalysis(DATA, { question: "regression", outcome: "comprension", predictors: ["edad", "lectura_ms"] });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.figures.find((figure) => figure.key === "n")?.value).toBe("39");
    expect(result.value.coefficients?.map((row) => row[0])).toEqual(["(Intercept)", "edad", "lectura_ms"]);
  });

  it("answers every question of the assistant on the example", () => {
    const requests = [
      { question: "one-mean", outcome: "comprension", mu: 60 },
      { question: "paired", outcome: "antes", second: "despues" },
      { question: "many-groups", outcome: "lectura_ms", group: "condicion" },
      { question: "correlation", outcome: "lectura_ms", second: "comprension" },
      { question: "association", outcome: "grupo", second: "respuesta" },
    ] as const;
    for (const request of requests) {
      const result = runAnalysis(DATA, request);
      expect(result.ok, request.question).toBe(true);
      if (result.ok) expect(result.value.tests.length).toBeGreaterThan(0);
    }
  });

  it("names the problem when the variables do not fit the question", () => {
    expect(runAnalysis(DATA, { question: "two-groups", outcome: "grupo", group: "grupo" })).toEqual({
      ok: false,
      error: { code: "not-numeric", name: "grupo" },
    });
    expect(runAnalysis(DATA, { question: "two-groups", outcome: "lectura_ms", group: "condicion" })).toEqual({
      ok: false,
      error: { code: "levels", name: "condicion", wanted: "two" },
    });
    expect(runAnalysis(DATA, { question: "many-groups", outcome: "lectura_ms", group: "grupo" })).toEqual({
      ok: false,
      error: { code: "levels", name: "grupo", wanted: "three-or-more" },
    });
    expect(runAnalysis(DATA, { question: "correlation", outcome: "edad", second: "edad" })).toEqual({
      ok: false,
      error: { code: "same-variable" },
    });
    expect(runAnalysis(DATA, { question: "association", outcome: "grupo", second: "edad" })).toEqual({
      ok: false,
      error: { code: "not-categorical", name: "edad" },
    });
    expect(runAnalysis(DATA, { question: "one-mean", outcome: "nada" })).toEqual({
      ok: false,
      error: { code: "missing-variable" },
    });
  });
});
