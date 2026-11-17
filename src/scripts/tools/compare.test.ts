import { describe, expect, it } from "vitest";
import {
  compareVocabulary,
  concordanceByDocument,
  documentProfile,
  frequencyTable,
  keywords,
  perTenThousand,
  prepareDocument,
} from "./compare";
import { chiSquareOneDfUpperTail, logLikelihood, logRatio } from "./keyness";

const A = prepareDocument({
  name: "a.docx",
  text: "La lengua de la casa. La lengua de la abuela. Lengua, lengua y lengua en la casa.",
});
const B = prepareDocument({
  name: "b.pdf",
  text: "La escuela prohibía la lengua. En la escuela, el maestro y la escuela mandaban.",
});
const C = prepareDocument({ name: "c.txt", text: "La radio y la escuela. La radio en la casa." });

const options = { stopwords: "es" as const, minCount: 1, limit: 50, alpha: 1 };

describe("prepareDocument", () => {
  it("counts every word, stopwords included, and the sentences", () => {
    expect(A.size).toBe(17);
    expect(A.sentences).toBe(3);
    expect(A.counts.get("lengua")).toBe(5);
    expect(A.counts.get("la")).toBe(5);
  });
});

describe("keywords: one document against the rest", () => {
  const list = keywords([A, B, C], 0, options);
  const lengua = list.positive.find((row) => row.word === "lengua");

  it("compares the document with the other documents put together", () => {
    expect(lengua).toMatchObject({ here: 5, rest: 1 });
    expect(lengua?.g2).toBe(logLikelihood(5, 1, A.size, B.size + C.size));
    expect(lengua?.p).toBe(chiSquareOneDfUpperTail(logLikelihood(5, 1, A.size, B.size + C.size)));
    expect(lengua?.logRatio).toBe(logRatio(5, 1, A.size, B.size + C.size));
    expect(lengua?.herePer10k).toBeCloseTo(perTenThousand(5, 17), 12);
  });

  it("puts words the document uses less on the negative side", () => {
    const escuela = list.negative.find((row) => row.word === "escuela");
    expect(escuela).toMatchObject({ here: 0, rest: 4 });
    expect(list.positive.some((row) => row.word === "escuela")).toBe(false);
  });

  it("hides stopwords from the lists but keeps them in the corpus sizes", () => {
    expect([...list.positive, ...list.negative].some((row) => row.word === "la")).toBe(false);
  });

  it("orders by G², strongest first, and counts the words it tested", () => {
    const values = list.positive.map((row) => row.g2);
    expect(values).toEqual([...values].sort((left, right) => right - left));
    expect(list.tested).toBeGreaterThan(list.positive.length);
  });

  it("keeps only words below the significance level and above the minimum count", () => {
    const strict = keywords([A, B, C], 0, { ...options, alpha: 0.05, minCount: 3 });
    for (const row of [...strict.positive, ...strict.negative]) {
      expect(row.p).toBeLessThan(0.05);
      expect(row.here + row.rest).toBeGreaterThanOrEqual(3);
    }
  });

  it("returns nothing for a document that does not exist", () => {
    expect(keywords([A, B], 5, options)).toEqual({ positive: [], negative: [], tested: 0 });
  });
});

describe("compareVocabulary", () => {
  const vocabulary = compareVocabulary([A, B, C], "es");

  it("lists the words every document uses and the ones only one uses", () => {
    expect(vocabulary.shared).toEqual([]);
    expect(vocabulary.unique[0]).toEqual(["abuela"]);
    expect(vocabulary.unique[1]).toEqual(["maestro", "mandaban", "prohibía"]);
    expect(vocabulary.unique[2]).toEqual(["radio"]);
  });

  it("measures each pair of vocabularies with the Jaccard index", () => {
    // A: {lengua, casa, abuela}; B: {escuela, prohibia, lengua, maestro, mandaban}; C: {radio, escuela, casa}
    expect(vocabulary.jaccard).toEqual([
      { left: 0, right: 1, value: 1 / 7 },
      { left: 0, right: 2, value: 1 / 5 },
      { left: 1, right: 2, value: 1 / 7 },
    ]);
  });

  it("shares the words two documents both use", () => {
    expect(compareVocabulary([A, C], "es").shared).toEqual(["casa"]);
  });
});

describe("frequencyTable and concordance", () => {
  it("puts each document's most frequent words side by side, per 10 000 words", () => {
    const [first] = frequencyTable([A, B], "es", 1);
    expect(first).toEqual({
      word: "lengua",
      display: "lengua",
      counts: [5, 1],
      per10k: [perTenThousand(5, A.size), perTenThousand(1, B.size)],
    });
  });

  it("finds the keyword in each document, labelled by document", () => {
    const lines = concordanceByDocument([A, B, C], "casa", 2);
    expect(lines.map((group) => [group.document, group.lines.length])).toEqual([
      ["a.docx", 2],
      ["b.pdf", 0],
      ["c.txt", 1],
    ]);
    expect(lines[2]?.lines[0]).toMatchObject({ left: "en la", node: "casa", right: "" });
  });

  it("profiles each document with the station's own statistics", () => {
    expect(documentProfile(C, "none")).toMatchObject({ tokens: 10, sentences: 2 });
  });
});
