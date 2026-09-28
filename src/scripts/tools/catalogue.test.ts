import { describe, expect, it } from "vitest";
import { facetCounts, facetValues, filterCatalogue, fold, matchesQuery } from "./catalogue";

interface Record {
  id: string;
  name: string;
  body: string;
  group: string;
}

const RECORDS: Record[] = [
  { id: "a", name: "Fonema", body: "unidad mínima", group: "Fonética" },
  { id: "b", name: "Análisis", body: "descomposición", group: "Sintaxis" },
  { id: "c", name: "Corpus", body: "conjunto de textos", group: "Fonética" },
  { id: "d", name: "Lema", body: "forma de diccionario", group: "" },
];

const fields = (r: Record) => [r.name, r.body, r.group];
const facetValue = (r: Record) => r.group;

describe("fold", () => {
  it("lower-cases and strips accents", () => {
    expect(fold("Análisis")).toBe("analisis");
    expect(fold("  FONÉTICA  ")).toBe("fonetica");
  });

  it("handles empty input", () => {
    expect(fold("")).toBe("");
  });
});

describe("matchesQuery", () => {
  it("matches an empty query against anything", () => {
    expect(matchesQuery(["anything"], "")).toBe(true);
    expect(matchesQuery(["anything"], "   ")).toBe(true);
  });

  it("matches case- and accent-insensitively", () => {
    expect(matchesQuery(["Análisis"], "analisis")).toBe(true);
    expect(matchesQuery(["analisis"], "ANÁLISIS")).toBe(true);
  });

  it("requires every term to match", () => {
    expect(matchesQuery(["corpus de textos"], "corpus textos")).toBe(true);
    expect(matchesQuery(["corpus de textos"], "corpus ausente")).toBe(false);
  });

  it("matches terms in any order", () => {
    expect(matchesQuery(["alpha beta"], "beta alpha")).toBe(true);
  });

  it("matches across several fields", () => {
    // The term is in the first field, the second term in the third.
    expect(matchesQuery(["Fonema", "unidad", "Fonética"], "fonema fonetica")).toBe(true);
  });

  it("does not match a partial word boundary incorrectly", () => {
    expect(matchesQuery(["corpus"], "corp")).toBe(true);
    expect(matchesQuery(["corpus"], "xyz")).toBe(false);
  });
});

describe("filterCatalogue", () => {
  it("returns everything with no query and no facet", () => {
    expect(filterCatalogue(RECORDS, { fields })).toHaveLength(4);
  });

  it("filters by query", () => {
    expect(filterCatalogue(RECORDS, { fields, query: "textos" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("filters by facet", () => {
    expect(filterCatalogue(RECORDS, { fields, facetValue, facet: "Fonética" }).map((r) => r.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("folds the facet value, so accents do not matter", () => {
    expect(filterCatalogue(RECORDS, { fields, facetValue, facet: "fonetica" })).toHaveLength(2);
  });

  it("treats an empty facet as 'all'", () => {
    expect(filterCatalogue(RECORDS, { fields, facetValue, facet: "" })).toHaveLength(4);
  });

  it("combines a query with a facet", () => {
    expect(
      filterCatalogue(RECORDS, { fields, facetValue, facet: "Fonética", query: "unidad" }).map(
        (r) => r.id,
      ),
    ).toEqual(["a"]);
  });

  it("returns nothing when the combination is empty", () => {
    expect(
      filterCatalogue(RECORDS, { fields, facetValue, facet: "Sintaxis", query: "textos" }),
    ).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const before = RECORDS.length;
    filterCatalogue(RECORDS, { fields, query: "corpus" });
    expect(RECORDS).toHaveLength(before);
  });
});

describe("facetValues", () => {
  it("lists distinct values in first-appearance order", () => {
    expect(facetValues(RECORDS, facetValue)).toEqual(["Fonética", "Sintaxis"]);
  });

  it("skips empty values", () => {
    expect(facetValues(RECORDS, facetValue)).not.toContain("");
  });

  it("deduplicates values that differ only by accent", () => {
    const list = [
      { group: "Fonética" },
      { group: "fonetica" },
    ];
    expect(facetValues(list, (r) => r.group)).toHaveLength(1);
  });

  it("returns nothing for an empty list", () => {
    expect(facetValues([], facetValue)).toEqual([]);
  });
});

describe("facetCounts", () => {
  it("counts records per value", () => {
    const counts = facetCounts(RECORDS, facetValue);
    expect(counts.get("fonetica")).toBe(2);
    expect(counts.get("sintaxis")).toBe(1);
  });

  it("ignores empty values", () => {
    expect(facetCounts(RECORDS, facetValue).has("")).toBe(false);
  });

  it("sums to the number of records with a facet", () => {
    const total = [...facetCounts(RECORDS, facetValue).values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
  });
});
