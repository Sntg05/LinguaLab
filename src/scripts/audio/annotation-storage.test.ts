/**
 * El almacenamiento de anotaciones del visor, contra IndexedDB de verdad.
 *
 * DOS COSAS QUE SOLO SE PUEDEN PROBAR AQUI
 *
 * 1. El contrato del puerto. `runAnnotationStoragePortContract` corria solo
 *    contra el fake del nucleo; un adaptador que se desvia del contrato no lo
 *    nota nadie hasta que la interfaz se rompe en el navegador. Se importa la
 *    suite del nucleo —no se copia— por la misma razon que el repositorio de
 *    tablas: una copia local puede divergir de la que cumplen los demas.
 * 2. Que lo guardado se VALIDE al leer. Un registro escrito por otra version
 *    del sitio es el caso normal de un proyecto que sobrevive a una
 *    actualizacion, y hasta hoy entraba sin mirar su forma.
 *
 * `fake-indexeddb` se instala a mano y no con `/auto` para que se vea en que
 * momento existe IndexedDB: aqui, antes de crear el primer adaptador.
 */

import {
  type AnnotationDocument,
  type AnnotationStorageError,
  isErr,
  isOk,
  type Result,
} from "@lingualab/core";
import { runAnnotationStoragePortContract } from "@lingualab/core/testing";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { ANNOTATION_STORE_NAME, createIndexedDbAnnotationStorage } from "./annotation-storage";

/**
 * IndexedDB de prueba, SIEMPRE por el global.
 *
 * Se instala el global y no se usa el valor importado de `fake-indexeddb`: el
 * adaptador lee `globalThis.indexedDB`, y con dos fabricas distintas —una en el
 * import, otra en el global— la prueba escribiria en una base y el adaptador
 * leeria otra, y el rojo resultante no diria nada sobre el adaptador.
 */
const installFreshDatabase = (): void => {
  globalThis.indexedDB = new IDBFactory();
};

installFreshDatabase();

let databaseCounter = 0;

/** Nombre propio por adaptador: cada prueba arranca sin registros heredados. */
const uniqueDatabaseName = (): string => {
  databaseCounter += 1;
  return `lingualab-audio-test-${databaseCounter}`;
};

const documentFixture: AnnotationDocument = {
  xmin: 0,
  xmax: 2,
  tiers: [
    {
      name: "palabras",
      kind: "interval",
      items: [
        { start: 0, end: 1, text: "hola" },
        { start: 1, end: 2, text: "adios" },
      ],
    },
  ],
};

/**
 * El sobre que el adaptador escribe hoy, escrito a mano.
 *
 * Se escribe literal y no con una constante exportada a proposito: esto es el
 * formato en disco, y si alguien le cambia el nombre al campo, la prueba tiene
 * que fallar aqui en vez de acompanarlo sin decir nada.
 */
const envelopeWith = (document: unknown): Record<string, unknown> => ({
  schema: "lingualab/annotation-project",
  version: 1,
  document,
});

/** Escribe un registro crudo, como lo dejaria otra version del sitio. */
const putRawRecord = async (
  databaseName: string,
  projectId: string,
  value: unknown,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const request = globalThis.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ANNOTATION_STORE_NAME)) {
        database.createObjectStore(ANNOTATION_STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(ANNOTATION_STORE_NAME, "readwrite");
      transaction.objectStore(ANNOTATION_STORE_NAME).put(value, projectId);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
};

const expectError = (
  result: Result<unknown, AnnotationStorageError>,
  code: AnnotationStorageError["code"],
): void => {
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.code).toBe(code);
  }
};

describe("AnnotationStoragePort sobre IndexedDB", () => {
  runAnnotationStoragePortContract(() =>
    createIndexedDbAnnotationStorage({ databaseName: uniqueDatabaseName() }),
  );
});

describe("D7 — lo guardado se lee sin validar forma ni version", () => {
  let databaseName: string;

  beforeEach(() => {
    // Base limpia por prueba: un registro heredado no debe decidir el resultado.
    installFreshDatabase();
    databaseName = uniqueDatabaseName();
  });

  it("un registro con forma de otro proyecto devuelve `invalid-record` y el visor sigue usable", async () => {
    // El caso que reprodujo el verificador: `{bounds, layers}` bajo la clave del
    // proyecto. Antes reventaba con `Cannot read properties of undefined`.
    await putRawRecord(databaseName, "visor", { bounds: { min: 0, max: 2 }, layers: [] });
    const storage = createIndexedDbAnnotationStorage({ databaseName });

      const loaded = await storage.load("visor");

    expectError(loaded, "invalid-record");
    // Lo que sigue es lo que hace usable el visor despues del error: guardar y
    // leer otro proyecto sigue funcionando, y el backend no se degrado.
    const saved = await storage.save("otro", documentFixture);
    expect(isOk(saved)).toBe(true);
    const roundTrip = await storage.load("otro");
    expect(isOk(roundTrip)).toBe(true);
    if (isOk(roundTrip)) {
      expect(roundTrip.value).toEqual(documentFixture);
    }
    expect(storage.status()).toEqual({ backend: "indexeddb" });
  });

  it("un sobre con version desconocida devuelve `unsupported-schema-version` con los dos numeros", async () => {
    const storage = createIndexedDbAnnotationStorage({ databaseName });
    // Se escribe a mano un sobre de la version 99: el adaptador tiene que decir
    // cual encontro y cual sabe leer, no solo que no puede.
    await putRawRecord(databaseName, "visor", {
      schema: "lingualab/annotation-project",
      version: 99,
      document: documentFixture,
    });

    const loaded = await storage.load("visor");

    expectError(loaded, "unsupported-schema-version");
    if (isErr(loaded) && loaded.error.code === "unsupported-schema-version") {
      expect(loaded.error.version).toBe(99);
      expect(loaded.error.supportedVersion).toBe(1);
    }
  });

  it("un sobre valido se restaura en una instancia nueva del adaptador", async () => {
    const first = createIndexedDbAnnotationStorage({ databaseName });
    await first.save("visor", documentFixture);

    const second = createIndexedDbAnnotationStorage({ databaseName });
    const loaded = await second.load("visor");

    expect(isOk(loaded)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toEqual(documentFixture);
    }
  });

  it("un registro historico sin sobre se migra al esquema actual", async () => {
    // Lo que escribia la version anterior del visor: el documento crudo.
    await putRawRecord(databaseName, "visor", documentFixture);
    const storage = createIndexedDbAnnotationStorage({ databaseName });

    const loaded = await storage.load("visor");

    expect(isOk(loaded)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toEqual(documentFixture);
    }
  });

  it("un documento con capas de forma invalida no entra aunque el sobre sea correcto", async () => {
    await putRawRecord(
      databaseName,
      "visor",
      envelopeWith({ xmin: 0, xmax: 2, tiers: [{ name: "x", kind: "interval" }] }),
    );
    const storage = createIndexedDbAnnotationStorage({ databaseName });

    expectError(await storage.load("visor"), "invalid-record");
  });
});

describe("la memoria gana sobre IndexedDB al leer", () => {
  let databaseName: string;

  beforeEach(() => {
    installFreshDatabase();
    databaseName = uniqueDatabaseName();
  });

  it("si la sesion ya guardo, `load` devuelve lo de memoria y no la copia vieja de la base", async () => {
    const storage = createIndexedDbAnnotationStorage({ databaseName });
    const fresher: AnnotationDocument = { ...documentFixture, xmax: 5 };
    await storage.save("visor", fresher);

    // Otra pestana —u otra version— escribe una copia atrasada en la base.
    await putRawRecord(databaseName, "visor", envelopeWith(documentFixture));

    const loaded = await storage.load("visor");

    expect(isOk(loaded)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toEqual(fresher);
    }
  });
});

describe("`remove` libera el espacio del proyecto", () => {
  it("tras borrar, `list` queda vacia y `load` devuelve null", async () => {
    installFreshDatabase();
    const storage = createIndexedDbAnnotationStorage({ databaseName: uniqueDatabaseName() });
    await storage.save("visor", documentFixture);
    await storage.save("otro", documentFixture);

    await storage.remove("visor");
    await storage.remove("otro");

    const listed = await storage.list();
    expect(isOk(listed)).toBe(true);
    if (isOk(listed)) {
      expect(listed.value).toEqual([]);
    }
    const loaded = await storage.load("visor");
    expect(isOk(loaded)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toBeNull();
    }
  });
});
