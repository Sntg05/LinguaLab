import { describe, expect, it } from "vitest";
import {
  normalizeWord,
  parsePosModel,
  serializePosModel,
  tagTokens,
  trainPosModel,
  UPOS_TAGS,
} from "./tagger";

/** Un corpus de juguete: el modelo tiene que aprender lo que se le enseñó. */
const corpus = [
  [
    ["el", "DET"],
    ["gato", "NOUN"],
    ["come", "VERB"],
  ],
  [
    ["la", "DET"],
    ["gata", "NOUN"],
    ["duerme", "VERB"],
  ],
  [
    ["el", "DET"],
    ["perro", "NOUN"],
    ["corre", "VERB"],
  ],
  [
    ["la", "DET"],
    ["niña", "NOUN"],
    ["lee", "VERB"],
  ],
  [
    ["Ana", "PROPN"],
    ["come", "VERB"],
  ],
  [
    ["Luis", "PROPN"],
    ["duerme", "VERB"],
  ],
] as const;

describe("etiquetador POS de perceptrón promediado", () => {
  it("UPOS tiene las 17 categorías de Universal Dependencies", () => {
    expect(UPOS_TAGS).toHaveLength(17);
    expect(UPOS_TAGS).toContain("PROPN");
  });

  it("normaliza números y guiones como en los etiquetadores clásicos", () => {
    expect(normalizeWord("1998")).toBe("!YEAR");
    expect(normalizeWord("42")).toBe("!DIGITS");
    expect(normalizeWord("bien-estar")).toBe("!HYPHEN");
    expect(normalizeWord("Gato")).toBe("gato");
  });

  it("aprende el corpus y generaliza a una combinación nueva", () => {
    const model = trainPosModel(corpus, { iterations: 8, seed: 1 });
    expect(tagTokens(model, ["el", "gato", "duerme"])).toEqual(["DET", "NOUN", "VERB"]);
    expect(tagTokens(model, ["la", "perro", "lee"])).toEqual(["DET", "NOUN", "VERB"]);
  });

  it("entrenar dos veces con la misma semilla da el mismo modelo", () => {
    const a = serializePosModel(trainPosModel(corpus, { iterations: 3, seed: 7 }));
    const b = serializePosModel(trainPosModel(corpus, { iterations: 3, seed: 7 }));
    expect(a).toBe(b);
  });

  it("el modelo guardado se lee igual y etiqueta igual", () => {
    const model = trainPosModel(corpus, { iterations: 5, seed: 1 });
    const back = parsePosModel(serializePosModel(model));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(tagTokens(back.value, ["Ana", "corre"])).toEqual(tagTokens(model, ["Ana", "corre"]));
  });

  it("un archivo que no es un modelo se rechaza en vez de etiquetar con basura", () => {
    expect(parsePosModel("<!doctype html>").ok).toBe(false);
  });

  it("sin palabras no hay etiquetas", () => {
    expect(tagTokens(trainPosModel(corpus, { iterations: 1, seed: 1 }), [])).toEqual([]);
  });
});
