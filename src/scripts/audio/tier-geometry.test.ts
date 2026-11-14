import { describe, expect, it } from "vitest";
import { boundaryNear, TIER_RULER_HEIGHT, tierAtY, tierStripLayout } from "./tier-geometry";

describe("tierStripLayout", () => {
  it("deja una regla fija y reparte el resto de la franja entre las capas", () => {
    const layout = tierStripLayout(200, 3);
    expect(layout.rulerHeight).toBe(TIER_RULER_HEIGHT);
    expect(layout.rowHeight).toBeCloseTo((200 - TIER_RULER_HEIGHT) / 3);
  });

  it("no estira una capa sola en una banda de mas de 64 px", () => {
    expect(tierStripLayout(400, 1).rowHeight).toBe(64);
  });

  it("nunca baja una fila de 18 px, la altura de una etiqueta legible", () => {
    expect(tierStripLayout(60, 10).rowHeight).toBe(18);
  });
});

describe("tierAtY", () => {
  const layout = tierStripLayout(200, 3);

  it("devuelve -1 sobre la regla de tiempo", () => {
    expect(tierAtY(layout, 3, 5)).toBe(-1);
  });

  it("devuelve la capa cuya fila contiene el punto", () => {
    const y = layout.rulerHeight + layout.rowHeight * 1.5;
    expect(tierAtY(layout, y, 3)).toBe(1);
  });

  it("devuelve -1 debajo de la ultima capa", () => {
    expect(tierAtY(layout, 199, 1)).toBe(-1);
  });
});

describe("boundaryNear", () => {
  const items = [
    { start: 0, end: 0.25, text: "" },
    { start: 0.25, end: 0.5, text: "" },
    { start: 0.5, end: 1, text: "" },
  ];
  const view = { start: 0, end: 1 };

  it("encuentra la frontera bajo el puntero y la nombra por el intervalo de su izquierda", () => {
    // 0,25 s en una franja de 400 px es x = 100.
    expect(boundaryNear(items, view, 400, 103)).toBe(0);
    expect(boundaryNear(items, view, 400, 198)).toBe(1);
  });

  it("ignora los clics mas lejos que la tolerancia: un clic dentro de un intervalo lo selecciona", () => {
    expect(boundaryNear(items, view, 400, 150)).toBeNull();
  });

  it("nunca ofrece los bordes del sonido, que no se mueven ni se quitan", () => {
    expect(boundaryNear(items, view, 400, 1)).toBeNull();
    expect(boundaryNear(items, view, 400, 399)).toBeNull();
  });

  it("sigue el zoom: la misma frontera se mueve en pantalla con la ventana visible", () => {
    expect(boundaryNear(items, { start: 0.2, end: 0.3 }, 400, 200)).toBe(0);
  });
});
