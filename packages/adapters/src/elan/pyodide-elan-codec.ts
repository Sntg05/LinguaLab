import { type AnnotationDocument, type ElanError, type Result, err, ok } from "@lingualab/core";
import type { ElanWorkerReply, ElanWorkerRequest } from "./elan-worker-protocol";
import type {
  ElanParseResult,
  ElanProgress,
  ElanSerializeResult,
  PyodideElanCodec,
} from "./pyodide-elan-types";
import {
  createPyodideRuntime,
  loadPyodideFromUrl,
  type PyodideLoader,
  type PyodideRuntime,
} from "./pyodide-runtime";

/**
 * El codec ELAN sobre Pyodide, detras de `ElanCodecPort`.
 *
 * QUE HACE ESTE ARCHIVO Y QUE NO
 *
 * Traduce el puerto a mensajes: construir el adaptador NO descarga Pyodide ni
 * crea el worker. Igual que el fonemizador, solo registra donde estan los
 * archivos; el motor arranca en la primera conversion, y esa primera conversion
 * es la que se ve en la barra de progreso. Asi una pagina que nunca convierte no
 * paga 13 MB.
 *
 * DOS MODOS, UN MISMO TRABAJO
 *
 * - `worker` (el del sitio): el motor vive fuera del hilo principal.
 * - `in-process`: el motor vive en el hilo que llama. Existe para las pruebas en
 *   Node, donde no hay `Worker`, y para depurar sin abrir la pestaña de workers.
 *   El trabajo real es el mismo modulo (`pyodide-runtime`), no una copia.
 *
 * LAS PETICIONES SE ENCOLAN
 *
 * Pyodide es un solo interprete: dos conversiones a la vez no se aceleran, se
 * estorban, y el progreso de una se confundiria con el de la otra. La cola hace
 * que la segunda espere, y que el progreso que llega pertenezca siempre a la
 * conversion que esta en curso.
 */

/** El wheel vendorizado de pympi-ling. La version esta en `public/pyodide/README.md`. */
export const PYMPI_WHEEL_FILE_NAME = "pympi_ling-1.71-py3-none-any.whl";

/**
 * Tiempo maximo de una peticion, en milisegundos.
 *
 * La primera conversion descarga unos 13 MB y compila el wasm: tres minutos es
 * holgado incluso en una conexion lenta, y sigue cortando el caso en que el
 * worker muere sin avisar (que, sin este limite, dejaria la interfaz esperando
 * para siempre).
 */
const DEFAULT_TIMEOUT_MS = 180_000;

export interface PyodideElanCodecOptions {
  /**
   * Base same-origin donde estan los archivos de Pyodide (`/pyodide/`). Se
   * resuelve contra el origen actual; los wheels se buscan en `wheels/`.
   */
  readonly indexURL: string;
  /** `worker` por defecto. `in-process` solo para pruebas y depuracion. */
  readonly runtime?: "worker" | "in-process";
  readonly timeoutMs?: number;
  readonly wheelFileName?: string;
  /**
   * Carga del modulo de Pyodide. Solo la usan las pruebas: en el navegador se
   * importa `pyodide.mjs` del propio sitio.
   */
  readonly loadPyodide?: PyodideLoader;
}

interface Waiting {
  readonly resolve: (reply: Result<ElanWorkerReply, ElanError>) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export function createPyodideElanCodec(options: PyodideElanCodecOptions): PyodideElanCodec {
  const indexURL = options.indexURL.endsWith("/") ? options.indexURL : `${options.indexURL}/`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const wheelFileName = options.wheelFileName ?? PYMPI_WHEEL_FILE_NAME;
  const mode = options.runtime ?? "worker";

  const listeners = new Set<(progress: ElanProgress) => void>();
  const notify = (progress: ElanProgress): void => {
    for (const listener of listeners) listener(progress);
  };

  /** En proceso, el motor es un objeto; en worker, una promesa por peticion. */
  let runtime: PyodideRuntime | null = null;
  const engine = (): PyodideRuntime => {
    runtime ??= createPyodideRuntime({
      indexURL,
      wheelFileName,
      loadPyodide: options.loadPyodide ?? loadPyodideFromUrl,
      onProgress: notify,
    });
    return runtime;
  };

  let worker: Worker | null = null;
  let nextId = 1;
  let ready = false;
  let disposed = false;
  const waiting = new Map<number, Waiting>();

  /** Resuelve todo lo pendiente con un solo fallo, para que nada quede colgado. */
  const failAll = (detail: string): void => {
    for (const [id, entry] of waiting) {
      clearTimeout(entry.timer);
      waiting.delete(id);
      entry.resolve(err({ code: "runtime-unavailable", detail }));
    }
  };

  const ensureWorker = (): Worker | null => {
    if (disposed) return null;
    if (worker !== null) return worker;
    if (typeof Worker === "undefined") return null;

    try {
      worker = new Worker(new URL("./pyodide-elan-worker.ts", import.meta.url), {
        type: "module",
        name: "lingualab-elan",
      });
    } catch {
      worker = null;
      return null;
    }

    worker.addEventListener("message", (event: MessageEvent<ElanWorkerReply>) => {
      const reply = event.data;
      const entry = waiting.get(reply.id);
      if (entry === undefined) return;
      // El progreso no cierra la peticion: llegan tres antes de la respuesta.
      if (reply.kind === "progress") {
        notify(reply.progress);
        return;
      }
      waiting.delete(reply.id);
      clearTimeout(entry.timer);
      if (reply.kind === "error") {
        entry.resolve(err(reply.error));
        return;
      }
      ready = true;
      entry.resolve(ok(reply));
    });

    // Un worker que no arranca, o que muere a mitad, nunca contesta.
    worker.addEventListener("error", () => {
      failAll("el worker del codec ELAN no arranco");
    });
    worker.addEventListener("messageerror", () => {
      failAll("el worker del codec ELAN envio un mensaje que no se pudo leer");
    });

    return worker;
  };

  const sendWorker = (
    build: (id: number) => ElanWorkerRequest,
  ): Promise<Result<ElanWorkerReply, ElanError>> =>
    new Promise((resolve) => {
      const target = ensureWorker();
      if (target === null) {
        resolve(
          err({
            code: "runtime-unavailable",
            detail: disposed
              ? "el codec ELAN ya se cerro"
              : "este entorno no ofrece Web Workers, asi que Pyodide no puede correr fuera del hilo principal",
          }),
        );
        return;
      }

      const id = nextId++;
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve(
          err({
            code: "runtime-unavailable",
            detail: `el codec ELAN no respondio en ${timeoutMs} ms`,
          }),
        );
      }, timeoutMs);

      waiting.set(id, { resolve, timer });
      try {
        target.postMessage(build(id));
      } catch (error) {
        clearTimeout(timer);
        waiting.delete(id);
        resolve(
          err({
            code: "runtime-unavailable",
            detail: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    });

  /** Una conversion a la vez: el progreso pertenece a la que esta en curso. */
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const parseWithReport = (bytes: Uint8Array): Promise<Result<ElanParseResult, ElanError>> => {
    // Un archivo vacio no necesita motor, y no debe costar 13 MB averiguarlo.
    if (bytes.length === 0) {
      return Promise.resolve(err({ code: "empty" }));
    }

    return enqueue(async () => {
      if (mode === "in-process") {
        return engine().parse(bytes);
      }

      const reply = await sendWorker((id) => ({ id, kind: "parse", indexURL, bytes }));
      if (!reply.ok) return reply;
      if (reply.value.kind !== "parse-ok") {
        return err({
          code: "runtime-unavailable",
          detail: `el worker respondio "${reply.value.kind}" a una peticion de lectura`,
        });
      }
      return ok({ document: reply.value.document, report: reply.value.report });
    });
  };

  const serializeWithReport = (
    document: AnnotationDocument,
  ): Promise<Result<ElanSerializeResult, ElanError>> =>
    enqueue(async () => {
      if (mode === "in-process") {
        return engine().serialize(document);
      }

      const reply = await sendWorker((id) => ({ id, kind: "serialize", indexURL, document }));
      if (!reply.ok) return reply;
      if (reply.value.kind !== "serialize-ok") {
        return err({
          code: "runtime-unavailable",
          detail: `el worker respondio "${reply.value.kind}" a una peticion de escritura`,
        });
      }
      return ok({ text: reply.value.text, report: reply.value.report });
    });

  return {
    parseWithReport,
    serializeWithReport,

    parse: async (bytes) => {
      const parsed = await parseWithReport(bytes);
      return parsed.ok ? ok(parsed.value.document) : parsed;
    },

    serialize: async (document) => {
      const serialized = await serializeWithReport(document);
      return serialized.ok ? ok(serialized.value.text) : serialized;
    },

    warmUp: () =>
      enqueue(async () => {
        if (mode === "in-process") {
          return engine().warmUp();
        }
        const reply = await sendWorker((id) => ({ id, kind: "warm-up", indexURL }));
        if (!reply.ok) return reply;
        if (reply.value.kind !== "warm-up-ok") {
          return err({
            code: "runtime-unavailable",
            detail: `el worker respondio "${reply.value.kind}" a una peticion de arranque`,
          });
        }
        return ok(undefined);
      }),

    isReady: () => (mode === "in-process" ? (runtime?.isReady() ?? false) : ready),

    onProgress: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose: () => {
      disposed = true;
      failAll("el codec ELAN se cerro");
      worker?.terminate();
      worker = null;
      runtime = null;
      listeners.clear();
    },
  };
}
