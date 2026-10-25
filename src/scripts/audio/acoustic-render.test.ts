/**
 * Geometria de los graficos acusticos.
 *
 * Lo que se puede probar sin canvas es la aritmetica: donde cae un instante,
 * donde cae una frecuencia y como se invierten los ejes del grafico vocalico.
 * Eso es exactamente lo que un error de signo rompe en silencio, dejando un
 * grafico con aspecto plausible y las vocales al reves.
 */

import { describe, expect, it } from "vitest";
import type { AcousticTrack } from "@lingualab/core";
import {
  contourPoints,
  hzToY,
  timeToX,
  valueToY,
  vowelPlotPosition,
} from "./acoustic-render";

const track = (values: readonly number[], times: readonly number[]): AcousticTrack => ({
  kind: "f0",
  times,
  values,
});

describe("timeToX", () => {
  it("pone el inicio de la ventana en el borde izquierdo y el fin en el derecho", () => {
    const view = { start: 2, end: 4 };

    expect(timeToX(3, view, 200)).toBe(100);
    expect(timeToX(2, view, 200)).toBe(0);
    expect(timeToX(4, view, 200)).toBe(200);
  });
});

describe("valueToY", () => {
  it("pone el valor maximo arriba, porque el eje de frecuencia crece hacia arriba", () => {
    expect(valueToY(600, { minValue: 100, maxValue: 600, height: 100 })).toBe(0);
    expect(valueToY(100, { minValue: 100, maxValue: 600, height: 100 })).toBe(100);
  });

  it("recorta en vez de dibujar fuera del lienzo", () => {
    expect(valueToY(900, { minValue: 100, maxValue: 600, height: 100 })).toBe(0);
    expect(valueToY(0, { minValue: 100, maxValue: 600, height: 100 })).toBe(100);
  });
});

describe("hzToY", () => {
  it("mapea la frecuencia del espectrograma al alto del lienzo", () => {
    expect(hzToY(5500, 0, 5500, 200)).toBe(0);
    expect(hzToY(0, 0, 5500, 200)).toBe(200);
  });
});

describe("contourPoints", () => {
  it("descarta los marcos sin voz para no dibujar una linea sobre el eje cero", () => {
    const points = contourPoints(track([100, 0, 200], [0, 0.5, 1]), {
      view: { start: 0, end: 1 },
      width: 100,
      height: 100,
      minValue: 100,
      maxValue: 300,
    });

    expect(points.length).toBe(2);
    expect(points.map((point) => point.x)).toEqual([0, 100]);
    expect(points[0]?.y).toBe(100);
    expect(points[1]?.y).toBe(50);
  });

  it("ignora lo que cae fuera de la ventana visible", () => {
    const points = contourPoints(track([100, 200, 300], [0, 0.5, 1]), {
      view: { start: 0.4, end: 0.6 },
      width: 100,
      height: 100,
      minValue: 100,
      maxValue: 300,
    });

    expect(points.length).toBe(1);
    expect(points[0]?.value).toBe(200);
  });
});

describe("vowelPlotPosition", () => {
  const area = { width: 100, height: 100 };
  const ranges = { minF1: 200, maxF1: 1000, minF2: 600, maxF2: 2600 };

  it("invierte los dos ejes, como un grafico vocalico", () => {
    // Vocal cerrada y anterior: F1 bajo (arriba) y F2 alto (izquierda).
    const anterior = vowelPlotPosition({ f1: 250, f2: 2400 }, ranges, area);
    // Vocal abierta y posterior: F1 alto (abajo) y F2 bajo (derecha).
    const posterior = vowelPlotPosition({ f1: 900, f2: 700 }, ranges, area);

    expect(anterior.x).toBeLessThan(posterior.x);
    expect(anterior.y).toBeLessThan(posterior.y);
  });

  it("deja los extremos en los bordes del area", () => {
    const corner = vowelPlotPosition({ f1: 200, f2: 2600 }, ranges, area);

    expect(corner.x).toBe(0);
    expect(corner.y).toBe(0);
  });
});
