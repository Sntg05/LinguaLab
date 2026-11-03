import { startAnnotationHistory } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import type { Palette } from "./render";
import {
  activeIntervalIndexOf,
  activeSheetOf,
  createViewerState,
  currentDocument,
  loopRegionOf,
} from "./viewer-state";

/** La paleta solo se pasa de mano en mano: su contenido no importa aqui. */
const palette = {} as Palette;

describe("createViewerState", () => {
  it("arranca sin audio, con el cursor en cero y un documento vacio de una capa", () => {
    const state = createViewerState(palette);
    expect(state.audio).toBeNull();
    expect(state.cursor).toBe(0);
    expect(state.activeTier).toBe(0);
    expect(state.recordFault).toBeNull();
    expect(state.pendingGaps).toEqual([]);
    expect(currentDocument(state).xmax).toBe(0);
    expect(currentDocument(state).tiers).toHaveLength(1);
  });
});

describe("consultas de seleccion sobre el estado", () => {
  it("siguen al cursor y a la capa activa", () => {
    const state = createViewerState(palette);
    state.history = startAnnotationHistory({
      xmin: 0,
      xmax: 3,
      tiers: [
        {
          name: "palabras",
          kind: "interval",
          items: [
            { start: 0, end: 1, text: "a" },
            { start: 1, end: 3, text: "b" },
          ],
        },
      ],
    });
    state.cursor = 1.5;

    expect(activeSheetOf(state)?.tier.name).toBe("palabras");
    expect(activeIntervalIndexOf(state)).toBe(1);
    expect(loopRegionOf(state)).toEqual({ start: 1, end: 3 });

    state.activeTier = 4;
    expect(activeSheetOf(state)).toBeNull();
    expect(activeIntervalIndexOf(state)).toBe(-1);
    expect(loopRegionOf(state)).toBeNull();
  });
});
