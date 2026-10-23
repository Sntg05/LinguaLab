import { describe, expect, it } from "vitest";
import { computePeaks } from "./waveform";

/**
 * Picos de la forma de onda.
 *
 * POR QUE PICOS Y NO TODAS LAS MUESTRAS
 *
 * Un audio de un minuto a 44.1 kHz tiene 2,6 millones de muestras y el canvas
 * mide unos 900 pixeles: dibujar una muestra por pixel es imposible y dibujar
 * una de cada N esconde los picos, que es justo lo que se mira cuando se busca
 * el golpe de una oclusiva. El pico por columna conserva el maximo y el minimo
 * reales de cada tramo.
 */

describe("computePeaks", () => {
  it("devuelve un pico por columna", () => {
    const samples = new Float32Array(1000);

    expect(computePeaks(samples, 100)).toHaveLength(100);
  });

  it("conserva el maximo y el minimo de cada tramo", () => {
    const samples = new Float32Array([0, 0.5, -0.25, 1, 0, -1]);

    const peaks = computePeaks(samples, 2);

    expect(peaks[0]).toEqual({ min: -0.25, max: 0.5 });
    expect(peaks[1]).toEqual({ min: -1, max: 1 });
  });

  it("un silencio da picos en cero, no en un valor inventado", () => {
    const peaks = computePeaks(new Float32Array(512), 16);

    for (const peak of peaks) {
      expect(peak.min).toBe(0);
      expect(peak.max).toBe(0);
    }
  });

  it("con mas columnas que muestras no pierde la senal", () => {
    const samples = new Float32Array([0.5, -0.5]);

    const peaks = computePeaks(samples, 8);

    expect(peaks).toHaveLength(8);
    expect(peaks.some((peak) => peak.max === 0.5)).toBe(true);
    expect(peaks.some((peak) => peak.min === -0.5)).toBe(true);
  });

  it("con cero columnas devuelve una lista vacia en vez de fallar", () => {
    expect(computePeaks(new Float32Array([1, 2, 3]), 0)).toEqual([]);
  });

  it("no toca el arreglo de entrada", () => {
    const samples = new Float32Array([0.5, -0.5]);

    computePeaks(samples, 4);

    expect([...samples]).toEqual([0.5, -0.5]);
  });
});
