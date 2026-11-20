import { describe, expect, it } from "vitest";
import { posRowsToCsv, splitForTagging, tagSummary, uposName } from "./rules";

describe("preparar el texto para el etiquetador", () => {
  it("separa palabras y signos, como el treebank", () => {
    expect(splitForTagging("Hola, mundo.", "en").map((token) => token.text)).toEqual(["Hola", ",", "mundo", "."]);
  });

  it("en español, «del» y «al» se separan como en AnCora, y se marca que vienen de una contracción", () => {
    const tokens = splitForTagging("Vino del mar al puerto", "es");
    expect(tokens.map((token) => token.text)).toEqual(["Vino", "de", "el", "mar", "a", "el", "puerto"]);
    expect(tokens.filter((token) => token.contraction !== undefined).map((token) => token.contraction)).toEqual([
      "del",
      "del",
      "al",
      "al",
    ]);
  });

  it("en inglés no se separa nada que el treebank no separe", () => {
    expect(splitForTagging("del al", "en").map((token) => token.text)).toEqual(["del", "al"]);
  });
});

describe("resultados", () => {
  it("cuenta las categorías de mayor a menor, con el porcentaje", () => {
    expect(tagSummary(["NOUN", "DET", "NOUN", "VERB"])).toEqual([
      { tag: "NOUN", count: 2, share: 0.5 },
      { tag: "DET", count: 1, share: 0.25 },
      { tag: "VERB", count: 1, share: 0.25 },
    ]);
  });

  it("el CSV tiene cabecera y escapa comillas y comas", () => {
    expect(posRowsToCsv([{ word: 'dijo "hola"', tag: "VERB" }, { word: ",", tag: "PUNCT" }])).toBe(
      'word,upos\n"dijo ""hola""",VERB\n",",PUNCT\n',
    );
  });

  it("cada categoría tiene un nombre que entiende un estudiante", () => {
    expect(uposName("NOUN", "es")).toBe("sustantivo");
    expect(uposName("PROPN", "en")).toBe("proper noun");
    expect(uposName("ZZZ", "es")).toBe("ZZZ");
  });
});
