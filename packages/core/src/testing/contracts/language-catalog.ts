import { beforeEach, describe, expect, it } from "vitest";
import type { LanguageCatalogPort } from "../../ports/language-catalog";
import { isOk } from "../../result";
import type { AdapterFactory } from "./types";

/** Suite de contrato del catalogo de lenguas. */
export const runLanguageCatalogPortContract = (
  createAdapter: AdapterFactory<LanguageCatalogPort>,
): void => {
  describe("LanguageCatalogPort", () => {
    let adapter: LanguageCatalogPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("byId de una lengua desconocida devuelve null y no un error", async () => {
      const result = await adapter.byId("no-existe");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it("byId de una lengua listada devuelve la misma entidad", async () => {
      const listed = await adapter.list();
      if (!isOk(listed)) {
        return;
      }
      const first = listed.value[0];
      if (first === undefined) {
        return;
      }

      const found = await adapter.byId(first.id);

      expect(isOk(found)).toBe(true);
      if (isOk(found)) {
        expect(found.value).toEqual(first);
      }
    });
  });
};
