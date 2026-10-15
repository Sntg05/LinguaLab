/**
 * Contrato del puerto contra el respaldo en memoria, en un runtime SIN IndexedDB.
 *
 * Este archivo no importa `fake-indexeddb/auto` a proposito: la unica forma de
 * probar el motivo `no-indexeddb` es que el global no exista de verdad. Si se
 * instalara el fake y luego se borrara el global, la prueba describiria un
 * escenario que ningun navegador produce y el motivo declarado dejaria de
 * significar algo.
 */
import { describe, expect, it } from "vitest";
import { isOk } from "@lingualab/core";
import { runOrthographyRepositoryPortContract } from "@lingualab/core/testing";
import { createIndexedDbOrthographyRepository } from "./indexeddb-orthography-repository";

describe("OrthographyRepositoryPort sin IndexedDB en el entorno", () => {
  it("la premisa del archivo: el global no existe", () => {
    expect(typeof globalThis.indexedDB).toBe("undefined");
  });

  runOrthographyRepositoryPortContract(() => createIndexedDbOrthographyRepository());

  it("informa respaldo en memoria con el motivo no-indexeddb", async () => {
    const adapter = createIndexedDbOrthographyRepository();

    const saved = await adapter.save({
      id: "es-sin-indexeddb",
      languageId: "spa",
      name: "Tabla sin IndexedDB",
      version: 1,
      classes: {},
      rules: [{ grapheme: "ch", ipa: "t\u0283" }],
      status: "draft",
    });
    const listed = await adapter.list();

    expect(isOk(saved)).toBe(true);
    expect(isOk(listed)).toBe(true);
    expect(adapter.persistence()).toStrictEqual({ backend: "memory", reason: "no-indexeddb" });
  });
});
