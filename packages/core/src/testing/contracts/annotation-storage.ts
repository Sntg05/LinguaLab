import { beforeEach, describe, expect, it } from "vitest";
import type { AnnotationDocument } from "../../domain/annotation";
import type { AnnotationStoragePort } from "../../ports/annotation-storage";
import { isOk } from "../../result";
import type { AdapterFactory } from "./types";

const contractDocument: AnnotationDocument = {
  tiers: [{ name: "words", kind: "interval", items: [{ start: 0, end: 0.5, text: "hola" }] }],
  xmin: 0,
  xmax: 1,
};

/** Suite de contrato del almacen de anotaciones. */
export const runAnnotationStoragePortContract = (
  createAdapter: AdapterFactory<AnnotationStoragePort>,
): void => {
  describe("AnnotationStoragePort", () => {
    let adapter: AnnotationStoragePort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("load de un proyecto inexistente devuelve null y no un error", async () => {
      const result = await adapter.load("no-existe");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it("save y load hacen un viaje de ida y vuelta, y list incluye el proyecto", async () => {
      const saved = await adapter.save("proyecto-1", contractDocument);
      const loaded = await adapter.load("proyecto-1");
      const listed = await adapter.list();

      expect(isOk(saved)).toBe(true);
      expect(isOk(loaded)).toBe(true);
      expect(isOk(listed)).toBe(true);
      if (isOk(loaded)) {
        expect(loaded.value).toEqual(contractDocument);
      }
      if (isOk(listed)) {
        expect(listed.value).toContain("proyecto-1");
      }
    });

    it("remove deja el proyecto sin documento", async () => {
      await adapter.save("proyecto-1", contractDocument);

      const removed = await adapter.remove("proyecto-1");
      const loaded = await adapter.load("proyecto-1");

      expect(isOk(removed)).toBe(true);
      if (isOk(loaded)) {
        expect(loaded.value).toBeNull();
      }
    });
  });
};
