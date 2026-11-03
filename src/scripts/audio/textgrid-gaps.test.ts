import type { AnnotationDocument } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { describeGapList, fillDocumentGaps, isTextGridFileName } from "./textgrid-gaps";

/** Un documento cuya capa «palabras» no llega al final: hueco de 3 a 4 s. */
const withGap: AnnotationDocument = {
  xmin: 0,
  xmax: 4,
  tiers: [
    {
      name: "palabras",
      kind: "interval",
      items: [
        { start: 0, end: 1, text: "a" },
        { start: 1, end: 3, text: "b" },
      ],
    },
    { name: "tonos", kind: "point", points: [] },
  ],
};

describe("isTextGridFileName", () => {
  it("reconoce las dos extensiones sin importar mayusculas", () => {
    expect(isTextGridFileName("sesion.TextGrid")).toBe(true);
    expect(isTextGridFileName("sesion.textgrid")).toBe(true);
    expect(isTextGridFileName("sesion.TG")).toBe(true);
  });

  it("todo lo demas se trata como audio", () => {
    expect(isTextGridFileName("sesion.wav")).toBe(false);
    expect(isTextGridFileName("textgrid.mp3")).toBe(false);
  });
});

describe("describeGapList", () => {
  it("nombra capa y tramo de cada hueco, separados por un punto medio", () => {
    expect(
      describeGapList([
        { tier: "palabras", start: 3, end: 4 },
        { tier: "fonos", start: 0, end: 0.5 },
      ]),
    ).toBe("palabras: 3.000 s–4.000 s · fonos: 0.000 s–0.500 s");
  });

  it("nombra a lo sumo cuatro huecos", () => {
    const gaps = Array.from({ length: 6 }, (_, index) => ({
      tier: `c${index}`,
      start: index,
      end: index + 1,
    }));
    expect(describeGapList(gaps).split(" · ")).toHaveLength(4);
  });

  it("sin huecos, la lista queda vacia", () => {
    expect(describeGapList([])).toBe("");
  });
});

describe("fillDocumentGaps", () => {
  it("rellena la capa nombrada hasta el final del documento", () => {
    const filled = fillDocumentGaps(withGap, [{ tier: "palabras", start: 3, end: 4 }]);
    const tier = filled.tiers[0];
    expect(tier?.kind).toBe("interval");
    if (tier?.kind === "interval") {
      expect(tier.items.at(-1)).toEqual({ start: 3, end: 4, text: "" });
    }
  });

  it("no toca las capas que no se nombran", () => {
    const filled = fillDocumentGaps(withGap, [{ tier: "palabras", start: 3, end: 4 }]);
    expect(filled.tiers[1]).toBe(withGap.tiers[1]);
  });

  it("salta capas que ya no existen o que no son de intervalos", () => {
    expect(
      fillDocumentGaps(withGap, [
        { tier: "borrada", start: 0, end: 1 },
        { tier: "tonos", start: 0, end: 1 },
      ]),
    ).toBe(withGap);
  });

  it("sin huecos pendientes devuelve el mismo documento", () => {
    expect(fillDocumentGaps(withGap, [])).toBe(withGap);
  });
});
