import type { ElanWorkerReply, ElanWorkerRequest } from "./elan-worker-protocol";
import { createPyodideRuntime, loadPyodideFromUrl, type PyodideRuntime } from "./pyodide-runtime";

/**
 * El worker del codec ELAN.
 *
 * POR QUE UN WORKER
 *
 * La primera conversion descarga y compila unos 13 MB de WebAssembly y arranca
 * CPython; hacerlo en el hilo principal congela la pagina justo cuando la
 * persona acaba de elegir un archivo. En el worker, la interfaz sigue
 * respondiendo y puede mostrar el progreso que este archivo emite.
 *
 * Este archivo NO decide que se ve: traduce una peticion en una respuesta del
 * puerto y deja que el adaptador y la interfaz decidan.
 *
 * El motor se crea la primera vez que llega una peticion y se reutiliza: el
 * segundo archivo que se convierte en la misma pagina no vuelve a descargar
 * nada.
 */
/** El wheel vendorizado de pympi-ling. La version esta en `public/pyodide/README.md`. */
const WHEEL_FILE_NAME = "pympi_ling-1.71-py3-none-any.whl";

let runtime: PyodideRuntime | null = null;
let runtimeIndexURL: string | null = null;
let currentId = 0;

const post = (message: ElanWorkerReply): void => {
  self.postMessage(message);
};

/**
 * El motor de esta base, o uno nuevo si la base cambio.
 *
 * Cambiar de base a mitad de sesion no pasa en el sitio (hay una sola), pero
 * reutilizar un motor apuntando a otro directorio seria peor que crearlo de
 * nuevo: el wheel quedaria instalado desde un origen y los archivos de otro.
 */
const ensureRuntime = (indexURL: string): PyodideRuntime => {
  if (runtime !== null && runtimeIndexURL === indexURL) return runtime;
  runtime = createPyodideRuntime({
    indexURL,
    wheelFileName: WHEEL_FILE_NAME,
    loadPyodide: loadPyodideFromUrl,
    onProgress: (progress) => post({ id: currentId, kind: "progress", progress }),
  });
  runtimeIndexURL = indexURL;
  return runtime;
};

self.onmessage = async (event: MessageEvent<ElanWorkerRequest>) => {
  const request = event.data;
  currentId = request.id;
  const engine = ensureRuntime(request.indexURL);

  switch (request.kind) {
    case "warm-up": {
      const warmed = await engine.warmUp();
      if (!warmed.ok) {
        post({ id: request.id, kind: "error", error: warmed.error });
        return;
      }
      post({ id: request.id, kind: "warm-up-ok" });
      return;
    }

    case "parse": {
      const parsed = await engine.parse(request.bytes);
      if (!parsed.ok) {
        post({ id: request.id, kind: "error", error: parsed.error });
        return;
      }
      post({
        id: request.id,
        kind: "parse-ok",
        document: parsed.value.document,
        report: parsed.value.report,
      });
      return;
    }

    case "serialize": {
      const serialized = await engine.serialize(request.document);
      if (!serialized.ok) {
        post({ id: request.id, kind: "error", error: serialized.error });
        return;
      }
      post({
        id: request.id,
        kind: "serialize-ok",
        text: serialized.value.text,
        report: serialized.value.report,
      });
      return;
    }
  }
};
