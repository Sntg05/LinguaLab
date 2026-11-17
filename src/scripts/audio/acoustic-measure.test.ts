/**
 * Medicion de una seleccion: estadisticas de F0, muestreo de formantes y CSV.
 *
 * TODO AQUI ES ARITMETICA SIN DOM
 *
 * Se puede probar sin navegador, y por eso se prueba: la estadistica de una
 * seleccion es lo que la persona va a citar en un trabajo, y una mediana mal
 * calculada —o un 0 de «sin voz» contado como un valor de 0 Hz— no se nota
 * mirando el grafico.
 */

import { describe, expect, it } from "vitest";
import type { AcousticTrack } from "@lingualab/core";
import {
  measureSelection,
  queryTrack,
  measurementsToCsv,
  sampleAtPercents,
  summarize,
  vowelPoints,
} from "./acoustic-measure";

const track = (values: readonly number[], times?: readonly number[]): AcousticTrack => ({
  kind: "f0",
  times: times ?? values.map((_, index) => 0.1 + index * 0.1),
  values,
});

describe("summarize", () => {
  it("ignora los tramos sin voz (0) en vez de contarlos como 0 Hz", () => {
    const stats = summarize(track([100, 0, 200, 300]), { start: 0.05, end: 0.45 });

    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(3);
    expect(stats?.mean).toBeCloseTo(200, 6);
    expect(stats?.median).toBe(200);
    expect(stats?.min).toBe(100);
    expect(stats?.max).toBe(300);
  });

  it("la mediana de un numero par de valores es la media de los dos centrales", () => {
    const stats = summarize(track([100, 200]), { start: 0, end: 1 });

    expect(stats?.median).toBe(150);
  });

  it("no inventa un resumen cuando el intervalo no tiene voz", () => {
    const stats = summarize(track([0, 0, 0]), { start: 0, end: 1 });

    expect(stats).toBeNull();
  });

  it("solo cuenta las muestras dentro del intervalo pedido", () => {
    const stats = summarize(track([100, 200, 300, 400]), { start: 0.25, end: 0.55 });

    // Los tiempos 0.3 y 0.4 caen dentro: son 300 y 400.
    expect(stats?.count).toBe(2);
    expect(stats?.mean).toBe(350);
  });
});

describe("sampleAtPercents", () => {
  const contour = track([100, 200, 300, 400], [0, 0.25, 0.5, 0.75]);

  it("toma el valor mas cercano al 25, 50 y 75 por ciento del intervalo", () => {
    const samples = sampleAtPercents(contour, { start: 0, end: 1 }, [25, 50, 75]);

    // 25 % de [0, 1] es 0.25, donde el valor es 200.
    expect(samples.map((sample) => sample.value)).toEqual([200, 300, 400]);
  });

  it("el punto medio es el 50 por ciento del intervalo", () => {
    const samples = sampleAtPercents(contour, { start: 0, end: 1 }, [50]);

    expect(samples[0]?.time).toBeCloseTo(0.5, 9);
    expect(samples[0]?.percent).toBe(50);
  });
});

describe("measureSelection", () => {
  const f0 = track([120, 130, 140, 150]);
  const f1 = track([500, 510, 520, 530]);
  const f2 = track([1500, 1510, 1520, 1530]);
  const intensity = track([70, 71, 72, 73]);

  it("resume F0 e intensidad y muestrea F1 y F2 en los cuatro puntos pedidos", () => {
    const measurement = measureSelection({
      label: "a",
      range: { start: 0.1, end: 0.4 },
      f0,
      formants: [f1, f2],
      intensity,
    });

    expect(measurement.f0?.mean).toBeCloseTo(135, 6);
    expect(measurement.intensity?.mean).toBeCloseTo(71.5, 6);
    expect(measurement.f1.map((sample) => sample.percent)).toEqual([25, 50, 75, 50]);
    expect(measurement.f1.length).toBe(4);
    expect(measurement.f2.length).toBe(4);
    expect(measurement.label).toBe("a");
  });

  it("sin pista de F0 deja el resumen en nulo en vez de rellenarlo con ceros", () => {
    const measurement = measureSelection({
      label: "silabeo",
      range: { start: 0, end: 1 },
      f0: null,
      formants: [f1],
      intensity: null,
    });

    expect(measurement.f0).toBeNull();
    expect(measurement.intensity).toBeNull();
    expect(measurement.f1.length).toBe(4);
    expect(measurement.f2).toEqual([]);
  });
});

describe("vowelPoints", () => {
  it("toma F1 y F2 del 50 por ciento, que es el punto que se grafica", () => {
    const measurement = measureSelection({
      label: "e",
      range: { start: 0.1, end: 0.4 },
      f0: track([130, 130, 130, 130]),
      formants: [track([400, 400, 400, 400]), track([2000, 2000, 2000, 2000])],
      intensity: null,
    });

    expect(vowelPoints([measurement])).toEqual([{ label: "e", f1: 400, f2: 2000 }]);
  });

  it("descarta una medicion sin formantes: un punto en (0, 0) seria una vocal inventada", () => {
    const measurement = measureSelection({
      label: "sin formantes",
      range: { start: 0.1, end: 0.4 },
      f0: track([130, 130]),
      formants: [],
      intensity: null,
    });

    expect(vowelPoints([measurement])).toEqual([]);
  });
});

describe("measurementsToCsv", () => {
  it("escribe cabecera y una fila por medicion, con los valores donde se esperan", () => {
    const measurement = measureSelection({
      label: "a",
      range: { start: 0.1, end: 0.4 },
      f0: track([120, 130, 140, 150]),
      formants: [track([500, 510, 520, 530]), track([1500, 1510, 1520, 1530])],
      intensity: track([70, 71, 72, 73]),
    });

    const csv = measurementsToCsv([measurement]);
    const lines = csv.trim().split("\n");

    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("etiqueta");
    expect(lines[0]).toContain("f0_media");
    expect(lines[1]).toContain("a");
    // La coma decimal no se usa en el CSV: romperia la separacion de campos.
    expect(lines[1]).toContain("135.000");
  });

  it("entrecomilla la etiqueta que trae coma o comilla", () => {
    const measurement = measureSelection({
      label: 'di "si", fuerte',
      range: { start: 0, end: 1 },
      f0: track([100]),
      formants: [],
      intensity: null,
    });

    const csv = measurementsToCsv([measurement]);

    expect(csv).toContain('"di ""si"", fuerte"');
  });

  it("sin mediciones devuelve solo la cabecera, no una tabla vacia con aspecto de dato", () => {
    const csv = measurementsToCsv([]);

    expect(csv.trim().split("\n").length).toBe(1);
  });
});

describe("queryTrack (consultas de Praat: «Get pitch», «Get first formant»…)", () => {
  const f0 = track([0, 120, 130, 0, 140], [0.1, 0.2, 0.3, 0.4, 0.5]);

  it("en el cursor da el valor del marco mas cercano y el instante de ese marco", () => {
    expect(queryTrack(f0, { kind: "cursor", time: 0.29 }, "frequency")).toEqual({
      kind: "value",
      time: 0.3,
      value: 130,
    });
  });

  it("en el cursor sobre un marco sin voz no inventa un valor", () => {
    expect(queryTrack(f0, { kind: "cursor", time: 0.41 }, "frequency")).toEqual({
      kind: "undefined",
    });
  });

  it("fuera de los marcos analizados (mas lejos que un paso) no da valor", () => {
    expect(queryTrack(f0, { kind: "cursor", time: 0.75 }, "frequency")).toEqual({
      kind: "undefined",
    });
  });

  it("con una seleccion da la media de los marcos medidos dentro, sin contar los sordos", () => {
    expect(queryTrack(f0, { kind: "selection", start: 0.15, end: 0.55 }, "frequency")).toEqual({
      kind: "mean",
      start: 0.15,
      end: 0.55,
      value: 130,
      count: 3,
    });
  });

  it("una seleccion sin ningun marco medido no tiene media", () => {
    expect(queryTrack(f0, { kind: "selection", start: 0.35, end: 0.45 }, "frequency")).toEqual({
      kind: "undefined",
    });
  });

  it("un formante indefinido (NaN) cuenta como sin valor", () => {
    const f1 = track([Number.NaN, 700], [0.1, 0.2]);
    expect(queryTrack(f1, { kind: "cursor", time: 0.1 }, "frequency")).toEqual({
      kind: "undefined",
    });
  });

  it("la intensidad de una seleccion es la media de energia, como «Get mean… energy» de Praat", () => {
    const db = track([60, 80], [0.1, 0.2]);
    const answer = queryTrack(db, { kind: "selection", start: 0, end: 0.3 }, "intensity");
    // 10·log10((10^6 + 10^8) / 2) = 77,0329 dB, no la media aritmetica de 70 dB.
    expect(answer.kind).toBe("mean");
    expect(answer.kind === "mean" ? answer.value : 0).toBeCloseTo(77.0329, 3);
  });

  it("la intensidad en el cursor acepta 0 dB: es un valor, no un hueco", () => {
    const db = track([0, 50], [0.1, 0.2]);
    expect(queryTrack(db, { kind: "cursor", time: 0.1 }, "intensity")).toEqual({
      kind: "value",
      time: 0.1,
      value: 0,
    });
  });

  it("sin pista no hay respuesta", () => {
    expect(queryTrack(undefined, { kind: "cursor", time: 0.1 }, "frequency")).toEqual({
      kind: "undefined",
    });
  });
});
