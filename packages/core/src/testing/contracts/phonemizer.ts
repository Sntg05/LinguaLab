import { beforeEach, describe, expect, it } from "vitest";
import type { PhonemizerPort } from "../../ports/phonemizer";
import { isErr, isOk } from "../../result";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del fonemizador.
 *
 * La prueba central es la negativa: pedir una lengua que el motor no conoce
 * no puede devolver un exito silencioso con el texto intacto. El caso de
 * "motor no disponible" tambien es un error tipado, no una excepcion.
 */
export const runPhonemizerPortContract = (createAdapter: AdapterFactory<PhonemizerPort>): void => {
  describe("PhonemizerPort", () => {
    let adapter: PhonemizerPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("isAvailable devuelve un booleano y listLanguages una lista de textos", () => {
      expect(typeof adapter.isAvailable()).toBe("boolean");
      expect(adapter.listLanguages().every((code) => typeof code === "string")).toBe(true);
    });

    it("pedir una lengua desconocida devuelve un error tipado", async () => {
      const result = await adapter.phonemize("hola", "__lengua_inexistente__");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(["unsupported-language", "engine-unavailable"]).toContain(result.error.code);
      }
    });

    it("con una lengua disponible devuelve fonos ya separados", async () => {
      if (!adapter.isAvailable()) {
        return;
      }
      const firstLanguage = adapter.listLanguages()[0];
      if (firstLanguage === undefined) {
        return;
      }

      const result = await adapter.phonemize("a", firstLanguage);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(Array.isArray(result.value.phones)).toBe(true);
        expect(typeof result.value.ipa).toBe("string");
      }
    });
  });
};
