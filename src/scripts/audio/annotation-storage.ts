/* ============================================================
   LinguaLab — almacenamiento local de anotaciones

   Implementa `AnnotationStoragePort` sobre IndexedDB, con un almacen en memoria
   como respaldo que se DECLARA. Sin servidor, este almacenamiento es la unica
   copia del trabajo hasta que la persona exporta el TextGrid; guardar en memoria
   sin decirlo seria la peor forma de perder una sesion de anotacion.

   LO GUARDADO SE VALIDA AL LEER
   Un registro escrito por otra version del sitio es el caso normal de un
   proyecto que sobrevive a una actualizacion, y entrar sin mirarlo reventaba el
   render (`doc.tiers` de un objeto que no tiene `tiers`). Cada registro va
   envuelto en un sobre con version de esquema, y al leer se comprueba la forma
   antes de entregar nada: un registro que no se entiende devuelve un error
   tipado y se queda donde esta.

   Misma razon que el decodificador para vivir en `src/scripts/audio`: el cableado
   de adaptadores pertenece al composition root, que no se toca en este segmento,
   y el puerto es el del nucleo.
   ============================================================ */

import {
  type AnnotationDocument,
  type AnnotationStorageError,
  type AnnotationStoragePort,
  err,
  ok,
  type Result,
} from "@lingualab/core";

/** Donde se esta guardando de verdad, y por que si se degrado. */
export type AnnotationPersistenceReason = "no-indexeddb" | "open-failed" | "quota-exceeded";

export interface AnnotationPersistenceStatus {
  readonly backend: "indexeddb" | "memory";
  readonly reason?: AnnotationPersistenceReason;
}

export interface BrowserAnnotationStorage extends AnnotationStoragePort {
  /** Se consulta antes de prometerle a la persona que su trabajo sobrevive a la recarga. */
  readonly status: () => AnnotationPersistenceStatus;
}

/**
 * Nombre de la base y del almacen.
 *
 * Son parte del formato en disco: cambiarlos deja huerfano todo lo guardado en
 * los navegadores que ya usaron el visor. Estan exportados para que las pruebas
 * puedan escribir un registro crudo —el caso de «lo guardo otra version»— sin
 * abrir la base a mano con un nombre copiado.
 */
export const ANNOTATION_DB_NAME = "lingualab-annotations";
export const ANNOTATION_STORE_NAME = "projects";

/** Identificador del sobre y version de esquema que este codigo escribe y lee. */
const SCHEMA = "lingualab/annotation-project";
const SCHEMA_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isIntervalShape = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.start) &&
  isFiniteNumber(value.end) &&
  typeof value.text === "string";

const isPointShape = (value: unknown): boolean =>
  isRecord(value) && isFiniteNumber(value.time) && typeof value.text === "string";

/**
 * Guard de forma del documento.
 *
 * Comprueba lo que el visor va a USAR —`tiers`, los items y sus numeros— y no
 * la forma exacta de cada propiedad: agregar un campo opcional en el futuro no
 * tiene que invalidar lo ya guardado. Un documento que pasa por aqui no puede
 * hacer que el render reviente.
 */
const isAnnotationDocumentShape = (value: unknown): value is AnnotationDocument => {
  if (!isRecord(value)) {
    return false;
  }
  if (!isFiniteNumber(value.xmin) || !isFiniteNumber(value.xmax)) {
    return false;
  }
  if (!Array.isArray(value.tiers)) {
    return false;
  }

  return value.tiers.every((tier) => {
    if (!isRecord(tier) || typeof tier.name !== "string") {
      return false;
    }
    if (tier.kind === "interval") {
      return Array.isArray(tier.items) && tier.items.every(isIntervalShape);
    }
    if (tier.kind === "point") {
      return Array.isArray(tier.points) && tier.points.every(isPointShape);
    }
    return false;
  });
};

/**
 * El sobre que se escribe. La version viaja en el registro y no en el codigo
 * porque el codigo cambia: un registro de hace un ano tiene que poder decir con
 * que esquema se escribio.
 */
interface StoredProject {
  readonly schema: typeof SCHEMA;
  readonly version: number;
  readonly document: AnnotationDocument;
}

/**
 * Registro guardado a documento, o el motivo tipado por el que no se puede.
 *
 * EL CAMINO DE MIGRACION, PARA LA PROXIMA VERSION
 *
 * La version 1 es el sobre `{ schema, version, document }`. La version 0 —lo
 * que escribia la version anterior del visor— es el documento crudo, y se sigue
 * aceptando aqui sin tocar la base, para que un proyecto guardado antes de este
 * cambio no se pierda al recargar. Cuando el esquema cambie: se sube
 * `SCHEMA_VERSION`, se agrega un caso que convierta la version anterior al
 * documento actual y se devuelve el documento —nada mas del adaptador cambia—.
 * Un esquema que este codigo no conoce NO se convierte a ciegas: devuelve
 * `unsupported-schema-version` con los dos numeros y el registro se queda
 * intacto.
 *
 * EL ORDEN DE LAS COMPROBACIONES ES PARTE DEL CONTRATO
 *
 * Primero el sobre y su version, despues el documento. Al reves, un registro de
 * otra version caeria como «forma invalida» y quien lo lee no sabria que la
 * solucion es actualizar el sitio en vez de exportar y volver a importar.
 */
const readRecord = (raw: unknown): Result<AnnotationDocument, AnnotationStorageError> => {
  if (isRecord(raw) && raw.schema === SCHEMA) {
    if (!isFiniteNumber(raw.version) || !Number.isInteger(raw.version)) {
      return err({
        code: "invalid-record",
        detail: "El registro declara el esquema de LinguaLab sin un numero de version entero.",
      });
    }
    if (raw.version !== SCHEMA_VERSION) {
      return err({
        code: "unsupported-schema-version",
        version: raw.version,
        supportedVersion: SCHEMA_VERSION,
        detail: `El registro se guardo con el esquema ${raw.version} y este codigo lee el ${SCHEMA_VERSION}.`,
      });
    }
    if (!isAnnotationDocumentShape(raw.document)) {
      return err({
        code: "invalid-record",
        detail:
          "El registro tiene el sobre correcto y un documento que no es un proyecto de anotacion.",
      });
    }
    return ok(raw.document);
  }

  if (isAnnotationDocumentShape(raw)) {
    return ok(raw);
  }

  return err({
    code: "invalid-record",
    detail: "Lo guardado bajo esta clave no es un proyecto de anotacion de este visor.",
  });
};

export interface IndexedDbAnnotationStorageOptions {
  /** Nombre de la base. Solo las pruebas lo cambian: en el navegador hay una sola. */
  readonly databaseName?: string;
}

const openDatabase = (databaseName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ANNOTATION_STORE_NAME)) {
        database.createObjectStore(ANNOTATION_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB no se pudo abrir."));
    request.onblocked = () =>
      reject(new Error("Otra pestaña bloquea la version de la base de datos."));
  });

const isQuotaError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");

export const createIndexedDbAnnotationStorage = (
  options: IndexedDbAnnotationStorageOptions = {},
): BrowserAnnotationStorage => {
  const databaseName = options.databaseName ?? ANNOTATION_DB_NAME;
  const memory = new Map<string, AnnotationDocument>();
  let database: IDBDatabase | null = null;
  let opening: Promise<IDBDatabase> | null = null;
  let persistence: AnnotationPersistenceStatus = { backend: "indexeddb" };

  const degrade = (reason: AnnotationPersistenceReason): void => {
    persistence = { backend: "memory", reason };
  };

  /** Abre la base una sola vez; si falla, se degrada y se queda degradado. */
  const open = async (): Promise<IDBDatabase | null> => {
    if (typeof indexedDB === "undefined") {
      degrade("no-indexeddb");
      return null;
    }
    if (database !== null) {
      return database;
    }
    if (opening === null) {
      opening = openDatabase(databaseName);
    }
    try {
      database = await opening;
      return database;
    } catch {
      degrade("open-failed");
      opening = null;
      return null;
    }
  };

  const run = <T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<Result<T, AnnotationStorageError>> =>
    new Promise((resolve) => {
      void (async () => {
        const db = await open();
        if (db === null) {
          resolve(err({ code: "storage-unavailable", detail: "Sin IndexedDB, solo memoria." }));
          return;
        }

        let transaction: IDBTransaction;
        try {
          transaction = db.transaction(ANNOTATION_STORE_NAME, mode);
        } catch (error) {
          degrade("open-failed");
          resolve(
            err({
              code: "storage-unavailable",
              detail: error instanceof Error ? error.message : "La base no acepta la transaccion.",
            }),
          );
          return;
        }

        const request = work(transaction.objectStore(ANNOTATION_STORE_NAME));
        request.onsuccess = () => resolve(ok(request.result));
        request.onerror = () => {
          if (isQuotaError(request.error)) {
            degrade("quota-exceeded");
            resolve(
              err({ code: "quota-exceeded", detail: "El navegador no tiene mas espacio para guardar." }),
            );
            return;
          }
          resolve(
            err({
              code: "unknown",
              detail: request.error?.message ?? "IndexedDB rechazo la operacion.",
            }),
          );
        };
      })();
    });

  return {
    status: () => persistence,

    load: async (projectId) => {
      // LA MEMORIA GANA, y el orden importa.
      //
      // `save` escribe primero en memoria, asi que lo que hay ahi es lo mas
      // nuevo de esta sesion. Preferir la base —como se hacia antes— devolvia la
      // copia atrasada cuando otra pestaña habia escrito la misma clave, y
      // ademas contradecia lo que el modulo declara: la memoria es el respaldo
      // declarado, no una copia de segunda.
      const inMemory = memory.get(projectId);
      if (inMemory !== undefined) {
        return ok(inMemory);
      }
      if (persistence.backend === "memory") {
        return ok(null);
      }
      const result = await run<unknown>("readonly", (store) =>
        store.get(projectId) as IDBRequest<unknown>,
      );
      if (!result.ok) {
        // Un fallo de lectura no inventa un documento ni borra el registro: se
        // devuelve `null` y el visor arranca vacio.
        return ok(null);
      }
      if (result.value === undefined || result.value === null) {
        return ok(null);
      }
      return readRecord(result.value);
    },

    save: async (projectId, doc) => {
      memory.set(projectId, doc);
      if (persistence.backend === "memory") {
        return ok(undefined);
      }
      const record: StoredProject = { schema: SCHEMA, version: SCHEMA_VERSION, document: doc };
      const result = await run<IDBValidKey>("readwrite", (store) => store.put(record, projectId));
      return result.ok ? ok(undefined) : result;
    },

    list: async () => {
      if (persistence.backend === "memory") {
        return ok([...memory.keys()]);
      }
      const result = await run<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
      if (!result.ok) {
        return ok([...memory.keys()]);
      }
      const keys = result.value.map(String);
      return ok([...new Set([...keys, ...memory.keys()])]);
    },

    remove: async (projectId) => {
      memory.delete(projectId);
      if (persistence.backend === "memory") {
        return ok(undefined);
      }
      const result = await run<undefined>("readwrite", (store) => store.delete(projectId));
      return result.ok ? ok(undefined) : result;
    },
  };
};
