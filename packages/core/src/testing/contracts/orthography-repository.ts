import { beforeEach, describe, expect, it } from "vitest";
import type { OrthographyTable } from "../../domain/orthography-table";
import type { OrthographyRepositoryPort } from "../../ports/orthography-repository";
import { isErr, isOk } from "../../result";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del repositorio de tablas.
 *
 * Es la suite importante de este segmento: define lo que significa "guardar
 * una tabla" para el fake y para cualquier adaptador real. Las dos conductas
 * que mas se rompen al implementar un adaptador nuevo estan aqui primero:
 * `get` de un id ausente es `null` y no un error, e `importJson` distingue el
 * texto ilegible del objeto mal formado.
 */

const contractTable = (): OrthographyTable => ({
  id: "es-contrato",
  languageId: "spa",
  name: "Tabla de contrato",
  version: 1,
  classes: { V: ["a", "e", "i", "o", "u"] },
  rules: [
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "h", ipa: "" },
  ],
  notes: "Datos de la suite de contrato.",
  status: "reviewed",
});

export const runOrthographyRepositoryPortContract = (
  createAdapter: AdapterFactory<OrthographyRepositoryPort>,
): void => {
  describe("OrthographyRepositoryPort", () => {
    let adapter: OrthographyRepositoryPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("get de un id inexistente devuelve null y no un error", async () => {
      const result = await adapter.get("no-existe");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it("list expone el resumen sin arrastrar las reglas", async () => {
      const table = contractTable();
      await adapter.save(table);

      const listed = await adapter.list();

      expect(isOk(listed)).toBe(true);
      if (!isOk(listed)) {
        return;
      }
      expect(listed.value).toContainEqual({
        id: table.id,
        name: table.name,
        languageId: table.languageId,
        status: table.status,
        ruleCount: table.rules.length,
      });
    });

    it("save y get hacen un viaje de ida y vuelta", async () => {
      const table = contractTable();
      await adapter.save(table);

      const loaded = await adapter.get(table.id);

      expect(isOk(loaded)).toBe(true);
      if (isOk(loaded)) {
        expect(loaded.value).toEqual(table);
      }
    });

    it("remove es idempotente: borrar un id inexistente devuelve ok", async () => {
      const removed = await adapter.remove("no-existe");

      // El fake y el adaptador de IndexedDB discrepaban en esto —uno devolvia
      // `not-found` y el otro `ok`— y ninguna prueba lo cubria, asi que los dos
      // pasaban la suite mientras se comportaban distinto. Eso es exactamente lo
      // que una suite de contrato existe para impedir.
      expect(isOk(removed)).toBe(true);
    });

    it("exportJson de un id inexistente si es un error tipado", async () => {
      const exported = await adapter.exportJson("no-existe");

      // La otra cara de la decision: aqui la ausencia impide producir el archivo,
      // asi que devolver texto vacio escondería el problema en vez de reportarlo.
      expect(isErr(exported)).toBe(true);
      if (isErr(exported)) {
        expect(exported.error.code).toBe("not-found");
      }
    });

    it("remove borra la tabla y get vuelve a devolver null", async () => {
      const table = contractTable();
      await adapter.save(table);

      const removed = await adapter.remove(table.id);
      const loaded = await adapter.get(table.id);

      expect(isOk(removed)).toBe(true);
      expect(isOk(loaded)).toBe(true);
      if (isOk(loaded)) {
        expect(loaded.value).toBeNull();
      }
    });

    it("exportJson e importJson hacen un viaje de ida y vuelta", async () => {
      const table = contractTable();
      await adapter.save(table);

      const exported = await adapter.exportJson(table.id);
      expect(isOk(exported)).toBe(true);
      if (!isOk(exported)) {
        return;
      }
      await adapter.remove(table.id);

      const imported = await adapter.importJson(exported.value);

      expect(isOk(imported)).toBe(true);
      if (isOk(imported)) {
        expect(imported.value).toEqual(table);
      }
    });

    it("importJson de texto ilegible devuelve invalid-json", async () => {
      const result = await adapter.importJson("{ esto no es json");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("invalid-json");
      }
    });

    it("importJson de una tabla mal formada devuelve invalid-table", async () => {
      const result = await adapter.importJson(JSON.stringify({ id: "x", name: "sin reglas" }));

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("invalid-table");
      }
    });
  });
};
