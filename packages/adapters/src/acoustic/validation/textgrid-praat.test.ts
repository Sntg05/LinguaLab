/**
 * TextGrid del visor contra el Praat oficial (cierra P17 de docs/PENDING.md).
 *
 * Vive junto al arnés acústico porque es la misma idea: Praat es el árbitro.
 * El trabajo lo hace `scripts/textgrid-praat-roundtrip.mts` (exporta con el
 * mismo `serializeTextGrid` que el visor, abre cada archivo con `praat --run`
 * y compara); aquí solo se exige que todos los casos salgan iguales.
 *
 * Solo corre si `praat` está en el PATH. En CI no está, y una prueba que falla
 * por falta de un programa de escritorio no dice nada del código: se salta y
 * el motivo queda en el nombre de la prueba. El resultado medido está en
 * `docs/validation/textgrid-praat.md`.
 */

import { describe, expect, it } from "vitest";

interface RoundTripReport {
  readonly praatVersion: string;
  readonly cases: readonly {
    readonly name: string;
    readonly ok: boolean;
    readonly problems: readonly string[];
  }[];
}

interface RoundTripModule {
  readonly findPraat: () => string | null;
  readonly runTextGridPraatRoundTrip: () => RoundTripReport;
}

// La ruta se arma en tiempo de ejecución a propósito: así `tsc` no sigue la
// importación hasta `scripts/`, que no es parte de este paquete ni de sus
// tipos (el paquete fija `"types": []` y no conoce `node:child_process`).
// Importar el módulo no corre nada: el script solo trabaja fuera de Vitest.
const SCRIPT = new URL("../../../../../scripts/textgrid-praat-roundtrip.mts", import.meta.url).href;
const roundTrip = (await import(/* @vite-ignore */ SCRIPT)) as RoundTripModule;
const PRAAT = roundTrip.findPraat() !== null;

describe("TextGrid exportado por el visor, abierto con Praat", () => {
  it.skipIf(!PRAAT)(
    PRAAT
      ? "Praat lee las mismas capas, intervalos y etiquetas, y lo que Praat guarda vuelve igual"
      : "se salta: praat no está en el PATH (ver docs/validation/textgrid-praat.md)",
    () => {
      const report = roundTrip.runTextGridPraatRoundTrip();

      const failed = report.cases.filter((result) => !result.ok);
      expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
      expect(report.cases.length).toBeGreaterThanOrEqual(5);
    },
    60_000,
  );
});
