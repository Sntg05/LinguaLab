/**
 * Repositorio de tablas de ortografia sobre IndexedDB, con respaldo en memoria.
 *
 * POR QUE GUARDA EXACTAMENTE EL MISMO JSON QUE SE DESCARGA
 *
 * Lo que vive en el navegador no es una copia del dominio ni un formato propio
 * de este adaptador: es `orthographyTableToJson(table)` del nucleo, y toda
 * lectura pasa por `orthographyTableFromJson`. Con un serializador propio,
 * exportar una tabla como respaldo y volver a importarla —en otro navegador o
 * en el mismo, manana— dejaria de funcionar sin que nadie hubiera tocado la
 * tabla. Ese es el defecto que este diseno existe para impedir: el adaptador
 * decide DONDE se guarda, no COMO se escribe.
 *
 * POR QUE SE DEGRADA A MEMORIA Y POR QUE LO DICE
 *
 * Hay entornos sin IndexedDB (pruebas, almacenamiento deshabilitado por
 * politica, modo privado) y entornos donde existe pero se niega a abrir o a
 * escribir. En todos ellos el puerto tiene que seguir respondiendo: perder la
 * persistencia es un precio aceptable, dejar sin editor a quien estaba
 * trabajando no lo es. Lo que si es inaceptable es fingir que se guardo, asi
 * que `persistence()` declara el almacen activo y el motivo del respaldo: es lo
 * que permite avisar que las tablas no sobreviviran a una recarga.
 */
import {
  type OrthographyRepositoryError,
  type OrthographyRepositoryPort,
  type OrthographyTable,
  type OrthographyTableSummary,
  err,
  ok,
  orthographyTableFromJson,
  orthographyTableToJson,
  type Result,
} from "@lingualab/core";

/** Motivo por el que IndexedDB dejo de ser el almacenamiento activo. */
type PersistenceReason = "no-indexeddb" | "open-failed" | "quota-exceeded";

export type PersistenceBackend = "indexeddb" | "memory";

export interface PersistenceStatus {
  readonly backend: PersistenceBackend;
  /** Por que entro el respaldo. Ausente cuando IndexedDB es el que guarda de verdad. */
  readonly reason?: "no-indexeddb" | "open-failed" | "quota-exceeded";
}

export interface IndexedDbOrthographyRepository extends OrthographyRepositoryPort {
  /** Que almacen esta respaldando los datos en este momento. */
  readonly persistence: () => PersistenceStatus;
}

const DEFAULT_DATABASE_NAME = "lingualab-orthography";
const STORE_NAME = "orthography-tables";
const DATABASE_VERSION = 1;

/** Un registro tal como lo devuelve el almacen, antes de interpretarlo. */
interface TableRecord {
  readonly id: string;
  readonly value: unknown;
}

/**
 * Acceso de bajo nivel al almacen.
 *
 * Las dos implementaciones (IndexedDB y memoria) responden a la misma interfaz
 * para que el puerto se escriba UNA sola vez: si el respaldo tuviera su propia
 * copia de las operaciones, la degradacion dejaria de ser invisible y empezaria
 * a cambiar el comportamiento del puerto en cada metodo.
 */
interface TableStore {
  readonly read: (id: string) => Promise<unknown>;
  readonly readAll: () => Promise<readonly TableRecord[]>;
  readonly write: (id: string, json: string) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
}

/**
 * Estado ya resuelto del almacenamiento. Es una union discriminada, y no dos
 * campos sueltos, para que un estado "memoria" sin motivo no pueda existir.
 */
type PersistenceState =
  | { readonly backend: "indexeddb" }
  | { readonly backend: "memory"; readonly reason: PersistenceReason };

class MemoryTableStore implements TableStore {
  private readonly records = new Map<string, string>();

  read(id: string): Promise<unknown> {
    return Promise.resolve(this.records.get(id));
  }

  readAll(): Promise<readonly TableRecord[]> {
    return Promise.resolve([...this.records.entries()].map(([id, value]) => ({ id, value })));
  }

  write(id: string, json: string): Promise<void> {
    this.records.set(id, json);
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.records.delete(id);
    return Promise.resolve();
  }
}

const errorName = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    const name: unknown = error.name;
    if (typeof name === "string") {
      return name;
    }
  }
  return "";
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  const name = errorName(error);
  return name === "" ? "error sin nombre ni mensaje" : name;
};

/**
 * `QuotaExceededError` se reconoce por nombre y no con `instanceof DOMException`
 * porque la identidad de esa clase depende del contexto: el navegador, un
 * worker y `fake-indexeddb` pueden construir cada uno la suya. El nombre, en
 * cambio, es lo que fija la especificacion.
 */
const isQuotaExceeded = (error: unknown): boolean => errorName(error) === "QuotaExceededError";

const runRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("la peticion a IndexedDB fallo"));
    };
  });

const runWrite = (database: IDBDatabase, work: (store: IDBObjectStore) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    // Si la base ya se cerro, `transaction` revienta de forma sincrona dentro
    // del ejecutor y eso rechaza la promesa: no hace falta un try/catch aparte.
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("la escritura en IndexedDB fallo"));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("la escritura en IndexedDB se aborto"));
    };
    work(transaction.objectStore(STORE_NAME));
  });

const openDatabase = (databaseName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      // Un solo almacen con clave externa (el id de la tabla) y el JSON como
      // valor. El id ya viaja dentro del propio JSON, asi que repetirlo en un
      // `keyPath` serian dos fuentes de verdad que pueden discrepar.
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("no se pudo abrir IndexedDB"));
    };
    // Una apertura bloqueada por otra pestana con una version anterior no
    // termina nunca. Un adaptador que no responde es peor que uno degradado.
    request.onblocked = () => {
      reject(new Error("la apertura quedo bloqueada por otra pestana"));
    };
  });

const createIndexedDbStore = (database: IDBDatabase): TableStore => ({
  read: (id) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    return runRequest<unknown>(request);
  },

  readAll: async () => {
    // Claves y valores en la MISMA transaccion de solo lectura: aparecen en el
    // mismo orden, asi que se pueden emparejar sin riesgo de leer un estado
    // intermedio. La clave es lo unico que permite copiar una tabla ilegible
    // durante la degradacion, porque su id podria no ser parseable.
    const transaction = database.transaction(STORE_NAME, "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const keys = await runRequest<IDBValidKey[]>(objectStore.getAllKeys());
    const values = await runRequest<unknown[]>(objectStore.getAll());

    const records: TableRecord[] = [];
    for (const [index, key] of keys.entries()) {
      records.push({ id: String(key), value: values[index] });
    }
    return records;
  },

  write: (id, json) =>
    runWrite(database, (store) => {
      store.put(json, id);
    }),

  remove: (id) =>
    runWrite(database, (store) => {
      store.delete(id);
    }),
});

/**
 * Orden de `list()`: por nombre y, a igual nombre, por id.
 *
 * Es orden por nombre y no de insercion porque IndexedDB entrega las claves en
 * su orden, no en el orden en que se escribieron: reconstruir la insercion
 * exigiria guardar una marca de tiempo y que los dos almacenes coincidieran en
 * un dato que la tabla no necesita. Se compara por unidades de codigo y no con
 * `localeCompare` para que el catalogo no se reordene segun el idioma del
 * sistema, y a igual nombre decide el id, que es unico: el orden es total.
 */
const byNameThenId = (left: OrthographyTableSummary, right: OrthographyTableSummary): number => {
  if (left.name !== right.name) {
    return left.name < right.name ? -1 : 1;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
};

const toSummary = (table: OrthographyTable): OrthographyTableSummary => ({
  id: table.id,
  name: table.name,
  languageId: table.languageId,
  status: table.status,
  ruleCount: table.rules.length,
});

/**
 * Fabrica sincrona del repositorio: el composition root la llama sin `await`.
 *
 * Por eso la base se abre en la PRIMERA operacion y no aqui. Los errores de
 * apertura no se propagan: se convierten en el respaldo declarado, que es un
 * estado del adaptador y no una excepcion que alguien tenga que atrapar.
 */
export const createIndexedDbOrthographyRepository = (
  options: { readonly databaseName?: string } = {},
): IndexedDbOrthographyRepository => {
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  const memory = new MemoryTableStore();

  let store: TableStore | null = null;
  let state: PersistenceState | null = null;

  const persistence = (): PersistenceStatus => {
    if (state !== null) {
      return state;
    }
    // Antes de la primera operacion solo se puede saber lo que es visible de
    // forma sincrona: si la API existe. Responder "memoria" cuando IndexedDB
    // esta disponible seria una etiqueta falsa; si la apertura llega a fallar,
    // el estado se corrige en cuanto pase.
    return typeof indexedDB === "undefined"
      ? { backend: "memory", reason: "no-indexeddb" }
      : { backend: "indexeddb" };
  };

  const resolveStore = async (): Promise<TableStore> => {
    if (store !== null) {
      return store;
    }

    if (typeof indexedDB === "undefined") {
      state = { backend: "memory", reason: "no-indexeddb" };
      store = memory;
      return store;
    }

    try {
      const database = await openDatabase(databaseName);
      state = { backend: "indexeddb" };
      store = createIndexedDbStore(database);
    } catch {
      // Un fallo al abrir no se propaga: degradarse es el camino esperado y
      // queda declarado en `persistence()`.
      state = { backend: "memory", reason: "open-failed" };
      store = memory;
    }
    return store;
  };

  /**
   * Cambia a memoria copiando antes lo que ya estaba guardado.
   *
   * Sin esa copia, el respaldo haria desaparecer de la lista las tablas que la
   * persona si tenia: seria una mentira peor que un error. La copia se hace
   * mejor esfuerzo porque se dispara justo cuando el almacenamiento esta
   * fallando; si aun asi no alcanza, el respaldo arranca vacio pero responde.
   */
  const degradeToMemory = async (): Promise<void> => {
    const source = store;
    state = { backend: "memory", reason: "quota-exceeded" };
    store = memory;

    if (source === null || source === memory) {
      return;
    }
    try {
      for (const record of await source.readAll()) {
        if (typeof record.value === "string") {
          await memory.write(record.id, record.value);
        }
      }
    } catch {
      // Nada que hacer con el cupo agotado: se conserva lo que se haya copiado.
    }
  };

  const readJson = async (
    id: string,
  ): Promise<Result<string | null, OrthographyRepositoryError>> => {
    const activeStore = await resolveStore();
    let value: unknown;
    try {
      value = await activeStore.read(id);
    } catch (error) {
      return err({ code: "storage-unavailable", detail: describeError(error) });
    }

    if (value === undefined || value === null) {
      return ok(null);
    }
    if (typeof value !== "string") {
      return err({
        code: "invalid-json",
        detail: `la tabla ${id} no esta guardada como texto JSON`,
      });
    }
    return ok(value);
  };

  const readAllJson = async (): Promise<Result<readonly string[], OrthographyRepositoryError>> => {
    const activeStore = await resolveStore();
    let records: readonly TableRecord[];
    try {
      records = await activeStore.readAll();
    } catch (error) {
      return err({ code: "storage-unavailable", detail: describeError(error) });
    }

    const values: string[] = [];
    for (const record of records) {
      if (typeof record.value !== "string") {
        // Una tabla guardada e ilegible no se omite en silencio: si la lista la
        // escondiera, el catalogo afirmaria que no existe algo que si esta.
        return err({
          code: "invalid-json",
          detail: `la tabla ${record.id} no esta guardada como texto JSON`,
        });
      }
      values.push(record.value);
    }
    return ok(values);
  };

  const writeJson = async (
    id: string,
    json: string,
  ): Promise<Result<void, OrthographyRepositoryError>> => {
    const activeStore = await resolveStore();
    try {
      await activeStore.write(id, json);
      return ok(undefined);
    } catch (error) {
      const wasIndexedDb = state?.backend === "indexeddb";
      if (!wasIndexedDb || !isQuotaExceeded(error)) {
        // El resto de fallos no mejora reintentando: se informan con el codigo
        // del puerto. El unico caso que tiene salida honesta es el cupo agotado,
        // que el puerto ya sabe nombrar (`quota-exceeded`).
        return err({ code: "storage-unavailable", detail: describeError(error) });
      }

      // El cambio no se pierde: se reintenta en memoria y `persistence()` avisa
      // de que desde ahora las tablas no sobreviven a la recarga, en lugar de
      // perder la escritura en silencio o de mentir guardando sin guardar.
      await degradeToMemory();
      try {
        await memory.write(id, json);
        return ok(undefined);
      } catch (fallbackError) {
        return err({ code: "storage-unavailable", detail: describeError(fallbackError) });
      }
    }
  };

  return {
    persistence,

    list: async () => {
      const values = await readAllJson();
      if (!values.ok) {
        return err(values.error);
      }

      const summaries: OrthographyTableSummary[] = [];
      for (const json of values.value) {
        const parsed = orthographyTableFromJson(json);
        if (!parsed.ok) {
          return err(parsed.error);
        }
        summaries.push(toSummary(parsed.value));
      }
      return ok(summaries.sort(byNameThenId));
    },

    get: async (id) => {
      const value = await readJson(id);
      if (!value.ok) {
        return err(value.error);
      }
      if (value.value === null) {
        return ok(null);
      }

      const parsed = orthographyTableFromJson(value.value);
      if (!parsed.ok) {
        return err(parsed.error);
      }
      return ok(parsed.value);
    },

    save: async (table) => {
      const written = await writeJson(table.id, orthographyTableToJson(table));
      if (!written.ok) {
        return err(written.error);
      }
      // La tabla es inmutable y el formato del nucleo no pierde campos, asi que
      // devolver la misma tabla es devolver lo que quedo guardado.
      return ok(table);
    },

    remove: async (id) => {
      // Borrar un id que no existe NO es un error: el resultado que buscaba
      // quien llama —que esa tabla no este— ya se cumple. El puerto reserva sus
      // errores para lo que de verdad fallo.
      const activeStore = await resolveStore();
      try {
        await activeStore.remove(id);
        return ok(undefined);
      } catch (error) {
        return err({ code: "storage-unavailable", detail: describeError(error) });
      }
    },

    exportJson: async (id) => {
      const value = await readJson(id);
      if (!value.ok) {
        return err(value.error);
      }
      if (value.value === null) {
        return err({ code: "not-found", id });
      }

      // Se valida antes de entregarlo para no dar por respaldo algo que ya se
      // sabe ilegible, pero se devuelven los bytes guardados tal cual: si el
      // adaptador reformateara aqui, el archivo descargado y lo almacenado
      // podrian empezar a diferir.
      const parsed = orthographyTableFromJson(value.value);
      if (!parsed.ok) {
        return err(parsed.error);
      }
      return ok(value.value);
    },

    importJson: async (text) => {
      const parsed = orthographyTableFromJson(text);
      if (!parsed.ok) {
        return err(parsed.error);
      }

      // Se guarda la serializacion del nucleo, no el texto recibido: asi un
      // archivo con espacios o claves en otro orden no introduce un formato
      // distinto dentro del mismo almacen.
      const written = await writeJson(parsed.value.id, orthographyTableToJson(parsed.value));
      if (!written.ok) {
        return err(written.error);
      }
      return ok(parsed.value);
    },
  };
};
