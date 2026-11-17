import type { AnnotationDocument, IntervalTier } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  activeSheet,
  clamp,
  DRAG_THRESHOLD_PX,
  dragSelection,
  effectiveSelection,
  extendSelection,
  frequencyAtRatio,
  intervalIndexAt,
  isDragGesture,
  loopRegionAt,
  neighbourInterval,
  type Sheet,
  selectionRegion,
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

/* ---------------- 5.4: seleccion por arrastre, como en Praat ---------------- */

describe("selectionRegion / dragSelection", () => {
  it("un arrastre hacia la derecha da el tramo de donde se apreto a donde se solto", () => {
    expect(selectionRegion(dragSelection(1.2, 2.7, 4))).toEqual({ start: 1.2, end: 2.7 });
  });

  it("un arrastre hacia la izquierda da el mismo tramo, ordenado", () => {
    expect(selectionRegion(dragSelection(2.7, 1.2, 4))).toEqual({ start: 1.2, end: 2.7 });
  });

  it("el arrastre no se sale del audio por ningun lado", () => {
    expect(selectionRegion(dragSelection(-1, 9, 4))).toEqual({ start: 0, end: 4 });
  });

  it("una seleccion sin duracion no es un tramo: es un cursor", () => {
    expect(selectionRegion(dragSelection(1.5, 1.5, 4))).toBeNull();
    expect(selectionRegion(null)).toBeNull();
  });
});

describe("isDragGesture", () => {
  it("moverse menos que el umbral es un clic: pone el cursor, no selecciona", () => {
    expect(isDragGesture(100, 100 + DRAG_THRESHOLD_PX - 1)).toBe(false);
  });

  it("moverse el umbral o mas, en cualquier sentido, es un arrastre", () => {
    expect(isDragGesture(100, 100 + DRAG_THRESHOLD_PX)).toBe(true);
    expect(isDragGesture(100, 100 - DRAG_THRESHOLD_PX)).toBe(true);
  });
});

describe("extendSelection (Mayus+flechas)", () => {
  it("sin seleccion, parte del cursor y mueve el otro extremo", () => {
    expect(selectionRegion(extendSelection(null, 1, 0.25, 4))).toEqual({ start: 1, end: 1.25 });
  });

  it("con seleccion, el extremo que se apreto primero queda fijo", () => {
    const first = extendSelection(null, 1, 0.25, 4);
    const back = extendSelection(extendSelection(first, 1, -0.25, 4), 1, -0.25, 4);
    expect(selectionRegion(back)).toEqual({ start: 0.75, end: 1 });
  });

  it("no pasa del final del audio", () => {
    expect(selectionRegion(extendSelection(null, 3.9, 0.5, 4))).toEqual({ start: 3.9, end: 4 });
  });
});

describe("effectiveSelection", () => {
  const interval = { start: 1, end: 2.5 };

  it("sin arrastre, la seleccion es el intervalo bajo el cursor (como hasta ahora)", () => {
    expect(effectiveSelection(null, 1.4, interval)).toEqual(interval);
  });

  it("con un arrastre vigente, la seleccion es el tramo arrastrado", () => {
    const dragged = dragSelection(2, 3, 4);
    expect(effectiveSelection(dragged, 2, interval)).toEqual({ start: 2, end: 3 });
  });

  it("si el cursor se movio despues, el arrastre caduca y vuelve el intervalo", () => {
    const dragged = dragSelection(2, 3, 4);
    expect(effectiveSelection(dragged, 1.4, interval)).toEqual(interval);
  });
});

describe("frequencyAtRatio", () => {
  it("arriba del espectrograma es la frecuencia maxima y abajo la minima", () => {
    expect(frequencyAtRatio(0, 0, 5000)).toBe(5000);
    expect(frequencyAtRatio(1, 0, 5000)).toBe(0);
  });

  it("en medio, la frecuencia crece hacia arriba en linea recta", () => {
    expect(frequencyAtRatio(0.25, 0, 5000)).toBe(3750);
    expect(frequencyAtRatio(0.5, 1000, 3000)).toBe(2000);
  });

  it("fuera del lienzo se queda en el borde", () => {
    expect(frequencyAtRatio(-0.2, 0, 5000)).toBe(5000);
    expect(frequencyAtRatio(1.3, 0, 5000)).toBe(0);
  });
});
