import type { AnnotationDocument, IntervalTier } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  activeSheet,
  clamp,
  intervalIndexAt,
  loopRegionAt,
  neighbourInterval,
  type Sheet,
} from "./selection";

/**
 * Que intervalo esta seleccionado lo usan el resaltado de la onda, el bucle de
 * reproduccion, los paneles acusticos y la navegacion con `,` y `.`. Estas
 * pruebas fijan la regla una vez para los cuatro.
 */

const tier: IntervalTier = {
  name: "palabras",
  kind: "interval",
  items: [
    { start: 0, end: 1, text: "a" },
    { start: 1, end: 2.5, text: "b" },
    { start: 2.5, end: 4, text: "c" },
  ],
};

const doc: AnnotationDocument = {
  xmin: 0,
  xmax: 4,
  tiers: [tier, { name: "tonos", kind: "point", points: [{ time: 1, text: "H" }] }],
};

const sheet: Sheet = { index: 0, tier };

describe("clamp", () => {
  it("acota por abajo y por arriba y deja pasar lo que esta dentro", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(4, 0, 10)).toBe(4);
  });
});

describe("activeSheet", () => {
  it("devuelve la capa de intervalos con su indice real", () => {
    expect(activeSheet(doc, 0)).toEqual({ index: 0, tier });
  });

  it("no devuelve una capa de puntos: aqui no se editan", () => {
    expect(activeSheet(doc, 1)).toBeNull();
  });

  it("no devuelve nada si el indice no existe", () => {
    expect(activeSheet(doc, 5)).toBeNull();
  });
});

describe("intervalIndexAt", () => {
  it("encuentra el intervalo que contiene al cursor", () => {
    expect(intervalIndexAt(sheet, 0.5)).toBe(0);
    expect(intervalIndexAt(sheet, 2)).toBe(1);
  });

  it("un limite pertenece al intervalo que empieza ahi", () => {
    expect(intervalIndexAt(sheet, 1)).toBe(1);
  });

  it("el final del audio pertenece al ultimo intervalo", () => {
    expect(intervalIndexAt(sheet, 4)).toBe(2);
  });

  it("sin capa activa no hay intervalo", () => {
    expect(intervalIndexAt(null, 1)).toBe(-1);
  });
});

describe("loopRegionAt", () => {
  it("devuelve el tramo del intervalo seleccionado", () => {
    expect(loopRegionAt(sheet, 1)).toEqual({ start: 1, end: 2.5 });
  });

  it("no hay tramo sin capa, con indice negativo o fuera de rango", () => {
    expect(loopRegionAt(null, 0)).toBeNull();
    expect(loopRegionAt(sheet, -1)).toBeNull();
    expect(loopRegionAt(sheet, 9)).toBeNull();
  });

  it("un intervalo sin duracion no es un tramo que se pueda repetir", () => {
    const empty: Sheet = {
      index: 0,
      tier: { name: "x", kind: "interval", items: [{ start: 2, end: 2, text: "" }] },
    };
    expect(loopRegionAt(empty, 0)).toBeNull();
  });
});

describe("neighbourInterval", () => {
  it("devuelve el anterior y el siguiente", () => {
    expect(neighbourInterval(sheet, 1, -1)?.text).toBe("a");
    expect(neighbourInterval(sheet, 1, 1)?.text).toBe("c");
  });

  it("en los bordes se queda en el extremo", () => {
    expect(neighbourInterval(sheet, 0, -1)?.text).toBe("a");
    expect(neighbourInterval(sheet, 2, 1)?.text).toBe("c");
  });
});
