/**
 * Contrato del motor acustico contra el WebAssembly vendoreado.
 *
 * SE EJECUTA EN NODE CON EL WASM REAL, NO CONTRA UN DOBLE
 *
 * El artefacto de `public/praatfan/` es un modulo ES del target `web` de
 * wasm-pack, y su `init` acepta los bytes compilados ademas de una URL. Por eso
 * se puede cargar en Node sin navegador: se leen los bytes con `readFile` y se
 * los pasa tal cual. Probar contra un doble habria demostrado que el adaptador
 * llama a un doble, no que mida.
 *
 * QUE SE AFIRMA Y POR QUE
 *
 * Un tono puro de 200 Hz tiene una respuesta conocida de antemano: la
 * frecuencia fundamental tiene que caer ahi. Un tono ademas NO tiene formantes
 * vocales, asi que de los formantes solo se comprueba la forma —una pista por
 * formante, tiempos paralelos a valores— y no sus valores: inventar una
 * expectativa sobre los formantes de una sinusoide seria afirmar algo que nadie
 * midio con Praat.
 */

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isErr, isOk } from "@lingualab/core";
import { createPraatfanEngine, MIN_ANALYSIS_SECONDS } from "./praatfan-engine";

const VENDOR = new URL("../../../../public/praatfan/", import.meta.url);

/**
 * Rutas al artefacto vendoreado. La prueba las lee del repositorio porque es el
 * mismo archivo que se sirve en el navegador, fijado por hash en
 * `public/praatfan/PROVENANCE.txt`.
 */
const sources = async () => ({
  moduleUrl: new URL("praatfan_gpl.js", VENDOR).href,
  wasmBytes: new Uint8Array(await readFile(new URL("praatfan_gpl_bg.wasm", VENDOR))),
});

/** Tono puro: la senal de referencia que tiene un valor esperado sin discusion. */
const tone = (frequencyHz: number, seconds: number, sampleRate = 16_000): Float64Array => {
  const samples = new Float64Array(Math.round(seconds * sampleRate));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = 0.3 * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
  }
  return samples;
};

const DEFAULT_PITCH = { floorHz: 75, ceilingHz: 600 };
const DEFAULT_FORMANTS = { maxFormantHz: 5500, count: 3 };
const DEFAULT_INTENSITY = { minimumPitchHz: 100 };

describe("createPraatfanEngine", () => {
  it("estima cerca de 200 Hz en un tono sintetico de 200 Hz", async () => {
    const engine = createPraatfanEngine(await sources());

    const result = await engine.pitch(tone(200, 1), 16_000, DEFAULT_PITCH);

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) {
      return;
    }

    // Solo los marcos con voz cuentan: los que no tienen voz valen 0 por
    // convencion del dominio y hundirian la media sin significar nada.
    const voiced = result.value.values.filter((value) => value > 0);
    expect(voiced.length).toBeGreaterThan(10);

    const mean = voiced.reduce((total, value) => total + value, 0) / voiced.length;
    expect(mean).toBeGreaterThan(196);
    expect(mean).toBeLessThan(204);

    // Los tiempos y los valores son listas paralelas, que es lo que el
    // graficador necesita sin convertirlas antes.
    expect(result.value.times.length).toBe(result.value.values.length);
    expect(result.value.kind).toBe("f0");
  });

  it("un tono de 300 Hz no se confunde con su armonico mas bajo", async () => {
    const engine = createPraatfanEngine(await sources());

    const result = await engine.pitch(tone(300, 0.8), 16_000, {
      floorHz: 75,
      ceilingHz: 600,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const voiced = result.value.values.filter((value) => value > 0);
      const mean = voiced.reduce((total, value) => total + value, 0) / voiced.length;
      expect(mean).toBeGreaterThan(294);
      expect(mean).toBeLessThan(306);
    }
  });

  it("un audio mas corto que la ventana de analisis devuelve too-short sin lanzar", async () => {
    const engine = createPraatfanEngine(await sources());

    const result = await engine.pitch(tone(200, MIN_ANALYSIS_SECONDS / 2), 16_000, DEFAULT_PITCH);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("too-short");
      if (result.error.code === "too-short") {
        expect(result.error.durationSeconds).toBeCloseTo(MIN_ANALYSIS_SECONDS / 2, 5);
      }
    }
  });

  it("devuelve una pista por formante, con tiempos del mismo largo que sus valores", async () => {
    const engine = createPraatfanEngine(await sources());

    const result = await engine.formants(tone(200, 1), 16_000, DEFAULT_FORMANTS);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(DEFAULT_FORMANTS.count);
      for (const track of result.value) {
        expect(track.kind).toBe("formant");
        expect(track.times.length).toBe(track.values.length);
        expect(track.times.length).toBeGreaterThan(10);
      }
    }
  });

  it("la intensidad sale en decibelios, en una escala que un sonido audible alcanza", async () => {
    const engine = createPraatfanEngine(await sources());

    const result = await engine.intensity(tone(200, 1), 16_000, DEFAULT_INTENSITY);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.kind).toBe("intensity");
      const finite = result.value.values.filter((value) => Number.isFinite(value));
      expect(finite.length).toBeGreaterThan(0);
      // Una senal de amplitud 0,3 ronda los 80 dB de intensidad de Praat: si
      // saliera en una escala lineal, este limite la rechazaria.
      const mean = finite.reduce((total, value) => total + value, 0) / finite.length;
      expect(mean).toBeGreaterThan(40);
      expect(mean).toBeLessThan(110);
    }
  });

  it("sin modulo cargable devuelve unavailable con detalle y no lanza", async () => {
    const engine = createPraatfanEngine({
      moduleUrl: new URL("no-existe.js", VENDOR).href,
      wasmBytes: new Uint8Array(0),
    });

    const result = await engine.pitch(tone(200, 0.5), 16_000, DEFAULT_PITCH);

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.code === "unavailable") {
      expect(result.error.detail ?? "").not.toBe("");
    } else {
      throw new Error("se esperaba un error unavailable");
    }
    expect(engine.isLoaded()).toBe(false);
  });

  it("no calcula nada antes del primer analisis", async () => {
    const engine = createPraatfanEngine(await sources());

    // La carga del wasm ocurre en el primer pedido: si ocurriera al construir,
    // la pagina pagaria el artefacto aunque nadie analizara nada.
    expect(engine.isLoaded()).toBe(false);

    await engine.pitch(tone(200, 0.5), 16_000, DEFAULT_PITCH);

    expect(engine.isLoaded()).toBe(true);
  });
});
