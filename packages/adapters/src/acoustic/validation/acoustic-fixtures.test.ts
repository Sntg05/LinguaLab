/**
 * La carpeta de referencias de Praat del repositorio, tal como esta hoy.
 *
 * ESTA PRUEBA ES LA QUE NO SE PUEDE SALTAR
 *
 * El arnes puede estar perfecto y aun asi no haber validado nada: sin audios de
 * referencia, la respuesta honesta es «no hay fixtures», no un verde. Esta
 * prueba corre contra la carpeta real —no contra una temporal— y acepta los dos
 * estados posibles: que falten las referencias (y lo diga) o que existan y el
 * arnes produzca filas comparadas. Lo que no acepta es un «passed» sin filas.
 */

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createPraatfanEngine } from "../praatfan-engine";
import type { AcousticTrack } from "@lingualab/core";
import {
  loadReferenceFixtures,
  validateAgainstReference,
  valueAtTime,
} from "./acoustic-validation";

const REFERENCE = new URL("../../../../../e2e/fixtures/reference/", import.meta.url);
/** La version vendorizada sale de `src/config/engines.json`, la unica fuente. */
const PRAATFAN_VERSION = (
  JSON.parse(
    readFileSync(new URL("../../../../../src/config/engines.json", import.meta.url), "utf8"),
  ) as Record<string, string>
)["praatfan"];
const VENDOR = new URL(`../../../../../public/praatfan/${PRAATFAN_VERSION}/`, import.meta.url);

describe("las referencias de Praat del repositorio", () => {
  it("F0, F1 y F2 de las tres vocales coinciden con Praat dentro de la tolerancia", async () => {
    const engine = createPraatfanEngine({
      moduleUrl: new URL("praatfan_gpl.js", VENDOR).href,
      wasmBytes: new Uint8Array(await readFile(new URL("praatfan_gpl_bg.wasm", VENDOR))),
    });

    // `pathname` percent-codifica los espacios y esta ruta los tiene: se usa
    // `fileURLToPath`, que es lo que convierte una URL en una ruta de verdad.
    const report = await validateAgainstReference({
      directory: fileURLToPath(REFERENCE),
      engine,
    });

    // Las referencias existen desde el rework v4 (tres vocales medidas con
    // Praat por `scripts/build-acoustic-reference.mjs`). Que vuelvan a faltar
    // seria perder la validacion en silencio, asi que ya no se acepta.
    if (report.status !== "passed") {
      const failed = "rows" in report ? report.rows.filter((row) => !row.passed) : [];
      throw new Error(`${report.message}\n${JSON.stringify(failed, null, 2)}`);
    }
    // Tres audios, tres instantes y tres magnitudes (F0, F1, F2) cada uno.
    expect(report.rows).toHaveLength(27);
    console.info(
      report.rows
        .map((row) => {
          const diff = ((row.measured - row.reference) / row.reference) * 100;
          return `${row.file} ${row.time.toFixed(3)} ${row.kind} praat=${row.reference} medido=${row.measured.toFixed(4)} (${diff.toFixed(3)} %)`;
        })
        .join("\n"),
    );
  });

  it("pedir tres formantes para mostrar no cambia el analisis: F1 y F2 siguen siendo los de Praat", async () => {
    // El visor pide tres pistas (F1 a F3). Ese numero se pasaba a Praat como
    // «numero maximo de formantes», que fija el orden del modelo: con 3 en vez
    // de 5, la misma [a] daba F1 cerca de 1150 Hz y F2 cerca de 2600 Hz en la
    // pagina, mientras la validacion, que pedia 5, pasaba. Cuantas pistas se
    // muestran y con que orden se analiza son dos cosas distintas.
    const engine = createPraatfanEngine({
      moduleUrl: new URL("praatfan_gpl.js", VENDOR).href,
      wasmBytes: new Uint8Array(await readFile(new URL("praatfan_gpl_bg.wasm", VENDOR))),
    });
    const loaded = await loadReferenceFixtures(fileURLToPath(REFERENCE));
    if (!loaded.ok) throw new Error(loaded.error.detail);
    const vowel = loaded.value.find((entry) => entry.file === "vocal-a.json");
    if (vowel === undefined) throw new Error("falta vocal-a.json");

    const tracks = await engine.formants(vowel.samples, vowel.sampleRate, {
      maxFormantHz: vowel.fixture.formant.maxFormantHz,
      count: 3,
    });
    if (!tracks.ok) throw new Error(tracks.error.code);

    expect(tracks.value).toHaveLength(3);
    const [f1, f2] = tracks.value;
    for (const point of vowel.fixture.points) {
      expect(valueAtTime(f1 as AcousticTrack, point.time)).toBeCloseTo(point.f1, 2);
      expect(valueAtTime(f2 as AcousticTrack, point.time)).toBeCloseTo(point.f2, 2);
    }
  });
});
