import { beforeEach, describe, expect, it } from "vitest";
import type { ClockPort } from "../../ports/clock";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del reloj.
 *
 * No se puede afirmar "ahora es tal fecha": eso ataria la suite al dia en que
 * se ejecuta. Lo que si es contrato es que devuelva una fecha valida y que no
 * retroceda entre dos lecturas consecutivas.
 */
export const runClockPortContract = (createAdapter: AdapterFactory<ClockPort>): void => {
  describe("ClockPort", () => {
    let adapter: ClockPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("now devuelve una fecha valida", () => {
      const now = adapter.now();

      expect(now).toBeInstanceOf(Date);
      expect(Number.isFinite(now.getTime())).toBe(true);
    });

    it("dos lecturas consecutivas no retroceden", () => {
      const first = adapter.now().getTime();
      const second = adapter.now().getTime();

      expect(second).toBeGreaterThanOrEqual(first);
    });
  });
};
