/**
 * La rama de cuota agotada del adaptador, provocada de verdad.
 *
 * POR QUE NO SE PROBO ANTES, Y QUE CAMBIO
 *
 * `fake-indexeddb` no simula cuotas: no hay forma de pedirle que rechace una
 * escritura por falta de espacio, y una prueba que simulara el error para
 * despues afirmar que el codigo que maneja ese error existe no probaria nada.
 * Lo que si respeta es el prototipo real de `IDBObjectStore`: si se intercepta
 * `put`, el parche llega hasta el adaptador por el mismo camino que en un
 * navegador. Es el proximo paso que dejo escrito P3 de `docs/PENDING.md`.
 *
 * LO QUE SE AFIRMA, Y POR QUE ESOS TRES COSAS
 *
 * 1. La tabla escrita despues del fallo **se guarda** (el respaldo en memoria
 *    tomo el relevo en vez de perder la escritura).
 * 2. Lo que ya estaba en IndexedDB **sigue siendo legible** despues de la
 *    degradacion (la copia de `degradeToMemory`). Sin esto el respaldo
 *    escondaria las tablas que la persona si tenia.
 * 3. `persistence()` informa la degradacion: guardar sin sobrevivir a la recarga
 *    es la mentira mas cara que este adaptador podria decir.
 */
// `IDBObjectStore` se importa del mismo paquete que instala el global: en Node
// la clase no existe como global, y parchear la que entrega `fake-indexeddb` es
// lo que llega hasta el objeto que usa el adaptador.
import { IDBObjectStore, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type OrthographyTable, isOk, orthographyTableToJson } from "@lingualab/core";
import { createIndexedDbOrthographyRepository } from "./indexeddb-orthography-repository";

globalThis.indexedDB = indexedDB;

let databaseCounter = 0;

const uniqueDatabaseName = (): string => {
  databaseCounter += 1;
  return `lingualab-quota-test-${databaseCounter}`;
};

const tableFixture = (id: string, name: string): OrthographyTable => ({
  id,
  languageId: "spa",
  name,
  version: 1,
  classes: {},
  rules: [{ grapheme: "ch", ipa: "t\u0283" }],
  status: "draft",
});

/**
 * `put` rechaza con el nombre que fija la especificacion.
 *
 * Se construye con `DOMException`, que es lo que lanza un navegador; el
 * adaptador reconoce el caso por nombre y no por `instanceof`, precisamente
 * porque la identidad de la clase depende del contexto.
 */
const breakWritesWithQuota = (): void => {
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("el adaptador cuando IndexedDB se queda sin cuota", () => {
  it("guarda en memoria, conserva lo anterior y declara la degradacion", async () => {
    const adapter = createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() });

    const first = await adapter.save(tableFixture("guarda", "Tabla previa"));
    expect(isOk(first)).toBe(true);
    expect(adapter.persistence()).toStrictEqual({ backend: "indexeddb" });

    breakWritesWithQuota();

    const second = await adapter.save(tableFixture("nueva", "Tabla despues del fallo"));
    expect(isOk(second)).toBe(true);

    // 3. La degradacion se dice en voz alta.
    expect(adapter.persistence()).toStrictEqual({ backend: "memory", reason: "quota-exceeded" });

    // 2 y 1: lo que ya estaba sigue legible y lo nuevo no se perdio.
    const listed = await adapter.list();
    expect(isOk(listed)).toBe(true);
    if (!isOk(listed)) {
      return;
    }
    const names = listed.value.map((summary) => summary.name).sort();
    expect(names).toEqual(["Tabla despues del fallo", "Tabla previa"]);

    const read = await adapter.exportJson("guarda");
    expect(isOk(read)).toBe(true);
    if (isOk(read)) {
      expect(read.value).toEqual(orthographyTableToJson(tableFixture("guarda", "Tabla previa")));
    }
  });

  it("un fallo que no es de cuota no se disfraza de degradacion", async () => {
    const adapter = createIndexedDbOrthographyRepository({ databaseName: uniqueDatabaseName() });
    await adapter.save(tableFixture("guarda", "Tabla previa"));

    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("The transaction was aborted.", "AbortError");
    });

    const failed = await adapter.save(tableFixture("otra", "No deberia entrar"));

    // Se informa el codigo del puerto y el adaptador sigue en IndexedDB: cambiar
    // de backend por un error que no es de espacio taparia el problema real.
    expect(isOk(failed)).toBe(false);
    expect(adapter.persistence()).toStrictEqual({ backend: "indexeddb" });
  });
});
