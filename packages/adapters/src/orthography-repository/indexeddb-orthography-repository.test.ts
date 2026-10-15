/**
 * Contrato del puerto de tablas contra el adaptador de IndexedDB.
 *
 * La suite no se reescribe aqui: se importa `runOrthographyRepositoryPortContract`
 * del nucleo. El ADR 0001 fija que un adaptador nuevo no esta terminado hasta
 * que pasa LA MISMA suite que ya pasaba el fake; una copia local podria
 * divergir de la original y dejar al adaptador "probado" contra un contrato que
 * nadie mas cumple.
 */
import { indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type OrthographyTable, isOk, orthographyTableToJson } from "@lingualab/core";
import { runOrthographyRepositoryPortContract } from "@lingualab/core/testing";
import { createIndexedDbOrthographyRepository } from "./indexeddb-orthography-repository";

// Se instala el global a mano y no con `fake-indexeddb/auto` para que quede
// visible en este archivo en que momento existe IndexedDB: el archivo hermano
// prueba el respaldo precisamente porque NO lo instala.
globalThis.indexedDB = indexedDB;

let databaseCounter = 0;

/** Nombre distinto por adaptador: cada prueba arranca sin tablas heredadas. */
const uniqueDatabaseName = (): string => {
  databaseCounter += 1;
  return `lingualab-test-${databaseCounter}`;
};

const tableFixture = (id: string): OrthographyTable => ({
  id,
  languageId: "spa",
  name: "Tabla de prueba",
  version: 1,
  classes: { V: ["a", "e", "i", "o", "u"] },
  rules: [
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "rr", ipa: "r", note: "vibrante multiple" },
  ],
  allophonic: [{ grapheme: "d", ipa: "\u00f0", after: "V" }],
  notes: "Datos de la prueba de formato compartido.",
  status: "reviewed",
});

describe("OrthographyRepositoryPort sobre IndexedDB", () => {
  runOrthographyRepositoryPortContract(() =>
    createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() }),
  );

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("informa el backend indexeddb sin motivo de respaldo", async () => {
    const adapter = createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() });

    await adapter.list();

    expect(adapter.persistence()).toStrictEqual({ backend: "indexeddb" });
  });

  it("exporta exactamente el JSON del nucleo", async () => {
    const adapter = createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() });
    const table = tableFixture("es-export");

    await adapter.save(table);
    const exported = await adapter.exportJson(table.id);

    expect(isOk(exported)).toBe(true);
    if (isOk(exported)) {
      // Si el adaptador escribiera su propio serializador, este texto seria
      // distinto: es la comprobacion que impide que el respaldo guardado y el
      // archivo que descarga el usuario se separen.
      expect(exported.value).toBe(orthographyTableToJson(table));
    }
  });

  it("entrega el texto exportado a una segunda instancia de la misma base", async () => {
    const databaseName = uniqueDatabaseName();
    const source = createIndexedDbOrthographyRepository({ databaseName });
    const destination = createIndexedDbOrthographyRepository({ databaseName });
    const table = tableFixture("es-portable");

    await source.save(table);
    const exported = await source.exportJson(table.id);
    expect(isOk(exported)).toBe(true);
    if (!isOk(exported)) {
      return;
    }

    const imported = await destination.importJson(exported.value);

    expect(isOk(imported)).toBe(true);
    if (isOk(imported)) {
      expect(imported.value).toEqual(table);
    }
  });

  it("degrada a memoria y lo declara cuando la apertura revienta", async () => {
    // La API puede existir y aun asi fallar (almacenamiento deshabilitado por
    // politica, modo privado). El respaldo tiene que cubrir tambien ese caso y
    // decir cual fue, no solo que hubo un problema.
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw new Error("apertura imposible");
      },
    });
    const adapter = createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() });

    const listed = await adapter.list();

    expect(isOk(listed)).toBe(true);
    expect(adapter.persistence()).toStrictEqual({ backend: "memory", reason: "open-failed" });
  });
});
