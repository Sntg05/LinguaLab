import { beforeEach, describe, expect, it } from "vitest";
import type { ToolRegistryPort } from "../../ports/tool-registry";
import { isOk } from "../../result";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del registro de herramientas.
 *
 * El contrato no siembra el registro: descubre una ficha con `list` y la usa
 * para comprobar `byId` y el filtro. Asi sirve igual para un adaptador con
 * datos de ejemplo que para uno que lee un JSON versionado.
 */
export const runToolRegistryPortContract = (
  createAdapter: AdapterFactory<ToolRegistryPort>,
): void => {
  describe("ToolRegistryPort", () => {
    let adapter: ToolRegistryPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("list es exitoso y byId de un id desconocido devuelve null", async () => {
      const listed = await adapter.list();
      const missing = await adapter.byId("no-existe");

      expect(isOk(listed)).toBe(true);
      expect(isOk(missing)).toBe(true);
      if (isOk(missing)) {
        expect(missing.value).toBeNull();
      }
    });

    it("byId de una herramienta listada devuelve la misma ficha", async () => {
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

    it("el filtro por area solo devuelve esa area y conserva la ficha elegida", async () => {
      const listed = await adapter.list();
      if (!isOk(listed)) {
        return;
      }
      const first = listed.value[0];
      if (first === undefined) {
        return;
      }

      const filtered = await adapter.list({ area: first.area });

      expect(isOk(filtered)).toBe(true);
      if (isOk(filtered)) {
        expect(filtered.value.every((tool) => tool.area === first.area)).toBe(true);
        expect(filtered.value.some((tool) => tool.id === first.id)).toBe(true);
      }
    });
  });
};
