import { beforeEach, describe, expect, it } from "vitest";
import type { IdGeneratorPort } from "../../ports/id-generator";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del generador de identificadores.
 *
 * Exige lo unico que un consumidor puede asumir: que el valor no este vacio y
 * que dos llamadas no devuelvan lo mismo. La forma concreta (UUID, secuencia)
 * es una decision del adaptador.
 */
export const runIdGeneratorPortContract = (
  createAdapter: AdapterFactory<IdGeneratorPort>,
): void => {
  describe("IdGeneratorPort", () => {
    let adapter: IdGeneratorPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("genera valores no vacios y distintos entre llamadas", () => {
      const first = adapter.generate();
      const second = adapter.generate();
      const third = adapter.generate();

      expect(first.length).toBeGreaterThan(0);
      expect(second.length).toBeGreaterThan(0);
      expect(new Set([first, second, third]).size).toBe(3);
    });
  });
};
