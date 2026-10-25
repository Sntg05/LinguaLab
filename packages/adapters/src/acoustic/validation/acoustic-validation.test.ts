/**
 * Arnes de validacion contra valores de referencia de Praat.
 *
 * QUE PRUEBA ESTE ARCHIVO, Y QUE NO
 *
 * Prueba el arnes: que detecte la carpeta de referencias vacia y lo DIGA, que
 * compare con las tolerancias pedidas (F0 ±2 %, F1 y F2 ±5 %) contando el borde
 * como dentro, y que una diferencia real se marque como fallo. NO prueba que
 * praatfan coincida con Praat sobre voces reales: para eso hacen falta los
 * audios y su JSON, que no estan en el repositorio, y fingir que pasaron seria
 * el peor resultado posible de un arnes de validacion.
 *
 * Las referencias sinteticas de esta prueba se escriben en un directorio
 * temporal fuera del arbol de trabajo y se borran al terminar: no son datos de
 * referencia y no deben parecerlo.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PraatfanEngine } from "../praatfan-engine";
import { decodeWavPcm16 } from "./wav";
import {
  DEFAULT_TOLERANCES,
  loadReferenceFixtures,
  validateAgainstReference,
} from "./acoustic-validation";

const scratch: string[] = [];

const makeScratch = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "lingualab-acustico-"));
  scratch.push(directory);
  return directory;
};

afterEach(async () => {
  for (const directory of scratch.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

/** Wav PCM de 16 bits mono con la frecuencia pedida: la referencia minima. */
const wav = (frequencyHz: number, seconds = 0.5, sampleRate = 16_000): Uint8Array => {
  const samples = Math.round(seconds * sampleRate);
  const data = new Uint8Array(samples * 2);
  const view = new DataView(data.buffer);
  for (let index = 0; index < samples; index += 1) {
    const value = Math.round(Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate) * 12_000);
    view.setInt16(index * 2, value, true);
  }

  const header = new Uint8Array(44);
  const head = new DataView(header.buffer);
  const text = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      header[offset + index] = value.charCodeAt(index);
    }
  };
  text(0, "RIFF");
  head.setUint32(4, 36 + data.length, true);
  text(8, "WAVE");
  text(12, "fmt ");
  head.setUint32(16, 16, true);
  head.setUint16(20, 1, true);
  head.setUint16(22, 1, true);
  head.setUint32(24, sampleRate, true);
  head.setUint32(28, sampleRate * 2, true);
  head.setUint16(32, 2, true);
  head.setUint16(34, 16, true);
  text(36, "data");
  head.setUint32(40, data.length, true);

  const bytes = new Uint8Array(header.length + data.length);
  bytes.set(header, 0);
  bytes.set(data, header.length);
  return bytes;
};

const FIXTURE = {
  praatVersion: "6.4.06",
  audio: "tono.wav",
  pitch: { floorHz: 75, ceilingHz: 600 },
  formant: { maxFormantHz: 5500, count: 3 },
  points: [
    { time: 0.25, f0: 200, f1: 500, f2: 1500 },
    { time: 0.35, f0: 200, f1: 500, f2: 1500 },
  ],
};

/**
 * Motor de mentira para probar el arnes: devuelve los valores que la prueba
 * pida, sin wasm. El motor real ya tiene su propia prueba con el artefacto.
 */
const engineReturning = (values: { f0: number; f1: number; f2: number }): PraatfanEngine => ({
  isLoaded: () => true,
  pitch: async () => ({
    ok: true,
    value: { kind: "f0", times: [0.25, 0.35], values: [values.f0, values.f0] },
  }),
  formants: async () => ({
    ok: true,
    value: [
      { kind: "formant", times: [0.25, 0.35], values: [values.f1, values.f1] },
      { kind: "formant", times: [0.25, 0.35], values: [values.f2, values.f2] },
    ],
  }),
  intensity: async () => ({
    ok: true,
    value: { kind: "intensity", times: [0.25, 0.35], values: [70, 70] },
  }),
});

describe("decodeWavPcm16", () => {
  it("lee un wav PCM de 16 bits y devuelve sus muestras", () => {
    const decoded = decodeWavPcm16(wav(200));

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.sampleRate).toBe(16_000);
      expect(decoded.value.samples.length).toBe(8_000);
      expect(Math.max(...decoded.value.samples)).toBeGreaterThan(0.3);
    }
  });

  it("rechaza algo que no es un wav con un motivo, sin lanzar", () => {
    const decoded = decodeWavPcm16(new Uint8Array([1, 2, 3, 4]));

    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error.code).toBe("unsupported-wav");
    }
  });
});

describe("loadReferenceFixtures", () => {
  it("sin fixtures en la carpeta lo dice con claridad en vez de dar por bueno el silencio", async () => {
    const directory = await makeScratch();

    const loaded = await loadReferenceFixtures(directory);

    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.error.code).toBe("missing-fixtures");
      expect(loaded.error.detail).toContain("no hay fixtures de referencia");
    }
  });

  it("una referencia sin su audio es un fallo de la referencia, no un resultado", async () => {
    const directory = await makeScratch();
    await writeFile(join(directory, "tono.json"), JSON.stringify(FIXTURE), "utf8");

    const loaded = await loadReferenceFixtures(directory);

    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.error.code).toBe("invalid-fixture");
      expect(loaded.error.detail).toContain("tono.wav");
    }
  });

  it("carga un audio de referencia con su JSON", async () => {
    const directory = await makeScratch();
    await writeFile(join(directory, "tono.wav"), wav(200));
    await writeFile(join(directory, "tono.json"), JSON.stringify(FIXTURE), "utf8");

    const loaded = await loadReferenceFixtures(directory);

    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.length).toBe(1);
      expect(loaded.value[0]?.fixture.points.length).toBe(2);
      expect(loaded.value[0]?.samples.length).toBe(8_000);
    }
  });
});

describe("validateAgainstReference", () => {
  it("una carpeta vacia no produce un verde: produce missing-fixtures", async () => {
    const directory = await makeScratch();

    const report = await validateAgainstReference({
      directory,
      engine: engineReturning({ f0: 200, f1: 500, f2: 1500 }),
    });

    expect(report.status).toBe("missing-fixtures");
    expect(report.message).toContain("no hay fixtures de referencia");
  });

  it("valores dentro de la tolerancia pasan, y el borde cuenta como dentro", async () => {
    const directory = await makeScratch();
    await writeFile(join(directory, "tono.wav"), wav(200));
    await writeFile(join(directory, "tono.json"), JSON.stringify(FIXTURE), "utf8");

    // Exactamente +2 % en F0 y +5 % en F1/F2: el borde es el caso que una
    // comparacion con `<` estricto marcaria como fallo sin motivo.
    const report = await validateAgainstReference({
      directory,
      engine: engineReturning({ f0: 204, f1: 525, f2: 1575 }),
    });

    if (report.status !== "passed") {
      throw new Error(`se esperaba un informe aprobado: ${report.message}`);
    }
    expect(report.rows.length).toBe(6);
    expect(report.rows.every((row) => row.passed)).toBe(true);
  });

  it("una diferencia mayor que la tolerancia se marca con la cifra medida", async () => {
    const directory = await makeScratch();
    await writeFile(join(directory, "tono.wav"), wav(200));
    await writeFile(join(directory, "tono.json"), JSON.stringify(FIXTURE), "utf8");

    const report = await validateAgainstReference({
      directory,
      engine: engineReturning({ f0: 260, f1: 500, f2: 1500 }),
    });

    if (report.status !== "failed") {
      throw new Error(`se esperaba un informe fallido: ${report.message}`);
    }
    const failed = report.rows.filter((row) => !row.passed);
    expect(failed.length).toBe(2);
    expect(failed[0]?.kind).toBe("f0");
    expect(failed[0]?.measured).toBeCloseTo(260, 6);
    expect(failed[0]?.tolerancePercent).toBe(DEFAULT_TOLERANCES.f0Percent);
  });
});
