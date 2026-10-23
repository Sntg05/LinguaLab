/* ============================================================
   LinguaLab — almacenamiento local de anotaciones

   Implementa `AnnotationStoragePort` sobre IndexedDB, con un almacen en memoria
   como respaldo que se DECLARA. Sin servidor, este almacenamiento es la unica
   copia del trabajo hasta que la persona exporta el TextGrid; guardar en memoria
   sin decirlo seria la peor forma de perder una sesion de anotacion.

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

const DB_NAME = "lingualab-annotations";
const STORE = "projects";
const VERSION = 1;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
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

export const createIndexedDbAnnotationStorage = (): BrowserAnnotationStorage => {
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
      opening = openDatabase();
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
          transaction = db.transaction(STORE, mode);
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

        const request = work(transaction.objectStore(STORE));
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
      if (persistence.backend === "memory") {
        return ok(memory.get(projectId) ?? null);
      }
      const result = await run<AnnotationDocument | undefined>("readonly", (store) =>
        store.get(projectId) as IDBRequest<AnnotationDocument | undefined>,
      );
      if (!result.ok) {
        // Un fallo de lectura no pierde lo que haya en memoria: se devuelve lo
        // que se sepa y se sigue trabajando.
        return ok(memory.get(projectId) ?? null);
      }
      return ok(result.value ?? memory.get(projectId) ?? null);
    },

    save: async (projectId, doc) => {
      memory.set(projectId, doc);
      if (persistence.backend === "memory") {
        return ok(undefined);
      }
      const result = await run<IDBValidKey>("readwrite", (store) => store.put(doc, projectId));
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
