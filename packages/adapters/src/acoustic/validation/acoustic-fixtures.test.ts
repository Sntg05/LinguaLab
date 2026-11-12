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
import { validateAgainstReference } from "./acoustic-validation";

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
});
