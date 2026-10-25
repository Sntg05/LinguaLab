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

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createPraatfanEngine } from "../praatfan-engine";
import { validateAgainstReference } from "./acoustic-validation";

const REFERENCE = new URL("../../../../../e2e/fixtures/reference/", import.meta.url);
const VENDOR = new URL("../../../../../public/praatfan/", import.meta.url);

describe("las referencias de Praat del repositorio", () => {
  it("no se dan por buenas por ausencia: o hay filas comparadas, o falta la carpeta", async () => {
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

    if (report.status === "missing-fixtures") {
      // El estado real del repositorio mientras nadie haya medido con Praat.
      expect(report.message).toContain("no hay fixtures de referencia");
      return;
    }

    expect(report.status === "passed" || report.status === "failed").toBe(true);
    if (report.status === "passed" || report.status === "failed") {
      expect(report.rows.length).toBeGreaterThan(0);
    }
  });
});
