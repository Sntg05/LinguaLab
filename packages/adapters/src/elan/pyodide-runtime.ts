import {
  type AnnotationDocument,
  type ElanError,
  type Interval,
  type Result,
  type Tier,
  err,
  ok,
} from "@lingualab/core";
import { ELAN_BRIDGE_PYTHON } from "./elan-bridge-python";
import type {
  ElanConversionReport,
  ElanNote,
  ElanParseResult,
  ElanPhase,
  ElanProgress,
  ElanSerializeResult,
} from "./pyodide-elan-types";

/**
 * El motor ELAN: Pyodide + pympi-ling, en un solo lugar.
 *
 * POR QUE ESTE MODULO EXISTE Y NO ESTA TODO EN EL WORKER
 *
 * El worker solo puede cargarse dentro de un `Worker`, y en Node —donde corren
 * las pruebas— no hay `Worker`. Si la conversion viviera dentro del worker, la
 * unica forma de probarla seria un navegador, y una prueba que necesita un
 * navegador para leer un .eaf no se corre en cada `npm test`. Aqui vive el
 * trabajo real; el worker y el adaptador en proceso son dos formas de llamarlo.
 *
 * La carga es perezosa y ocurre UNA vez: `boot()` guarda la promesa, asi que dos
 * conversiones simultaneas no arrancan dos Pyodide.
 *
 * NADA DE RED FUERA DEL PROPIO ORIGEN
 *
 * `indexURL` es una ruta del sitio (`/pyodide/`). Pyodide pide su wasm, su
 * stdlib y su lock ahi; `packageBaseUrl` apunta a `wheels/` para que incluso
 * `loadPackage("micropip")` se resuelva contra nuestro origen y no contra el CDN
 * que Pyodide usa por defecto. La CSP del sitio (`default-src 'self'`) y la
 * promesa de que el archivo no sale del navegador dependen de eso.
 */

/** Ruta del .eaf de entrada dentro del sistema de archivos en memoria de Pyodide. */
const INPUT_PATH = "/tmp/lingualab-in.eaf";

/** Ruta del documento serializado que el puente Python convierte en .eaf. */
const DOCUMENT_PATH = "/tmp/lingualab-document.json";

/** Cuantas fases tiene la primera carga. La barra de la interfaz usa este numero. */
const TOTAL_STEPS = 3;

const STEP_OF: Readonly<Record<ElanPhase, number>> = {
  runtime: 1,
  wheel: 2,
  convert: 3,
};

const ENCODER = new TextEncoder();

/**
 * Lo minimo que se usa de Pyodide.
 *
 * Se declara aqui en vez de importar `PyodideInterface` para que este modulo no
 * dependa del paquete npm en tiempo de ejecucion: en el navegador Pyodide llega
 * por `import()` desde `public/pyodide/`, y en las pruebas lo inyecta el test.
 * El tipo real es compatible con este, y `loadPyodide` del paquete se le pasa
 * como `PyodideLoader`.
 */
export interface PyodideLike {
  readonly FS: { writeFile(path: string, data: Uint8Array): void };
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  loadPackage(packages: string | string[]): Promise<unknown>;
}

export interface PyodideLoadOptions {
  readonly indexURL: string;
  /** De donde salen los wheels de `loadPackage`. Siempre el mismo origen. */
  readonly packageBaseUrl: string;
}

export type PyodideLoader = (options: PyodideLoadOptions) => Promise<PyodideLike>;

/**
 * Carga `pyodide.mjs` desde el propio sitio.
 *
 * `@vite-ignore` es obligatorio: la URL se calcula en tiempo de ejecucion, y sin
 * esa marca el empaquetador intentaria resolverla en la compilacion y fallaria
 * (o, peor, meteria los 9 MB de wasm en el bundle). La CSP permite el `import()`
 * porque es del mismo origen.
 */
export const loadPyodideFromUrl: PyodideLoader = async ({ indexURL, packageBaseUrl }) => {
  const base = typeof location === "undefined" ? "http://localhost/" : location.href;
  const resolvedIndex = absoluteUrl(indexURL);
  const moduleUrl = new URL("pyodide.mjs", new URL(resolvedIndex, base)).href;
  const module = (await import(/* @vite-ignore */ moduleUrl)) as {
    loadPyodide: (options: PyodideLoadOptions) => Promise<PyodideLike>;
  };
  return module.loadPyodide({
    indexURL: resolvedIndex,
    packageBaseUrl: absoluteUrl(packageBaseUrl),
  });
};

export interface PyodideRuntimeOptions {
  /** Base same-origin de los archivos de Pyodide, con barra final. */
  readonly indexURL: string;
  /** Nombre del wheel de pympi-ling dentro de `wheels/`. */
  readonly wheelFileName: string;
  readonly loadPyodide: PyodideLoader;
  readonly onProgress?: (progress: ElanProgress) => void;
}

export interface PyodideRuntime {
  readonly parse: (bytes: Uint8Array) => Promise<Result<ElanParseResult, ElanError>>;
  readonly serialize: (
    document: AnnotationDocument,
  ) => Promise<Result<ElanSerializeResult, ElanError>>;
  /** Arranca el motor sin convertir nada. */
  readonly warmUp: () => Promise<Result<void, ElanError>>;
  readonly isReady: () => boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const numberOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const detailOf = (error: unknown): string => {
  if (error instanceof Error && error.message !== "") return error.message;
  return String(error);
};

/** Lista de cadenas, ignorando lo que no lo sea: el informe es informativo, no critico. */
const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

/**
 * Una nota del puente, validada.
 *
 * Se descarta lo que no se reconoce en vez de romper la conversion entera: una
 * nota es informacion sobre el archivo, y perder una nota no puede impedir que
 * el archivo se convierta. Los codigos son de este mismo repositorio, asi que un
 * codigo desconocido solo puede venir de una version desalineada.
 */
const toNote = (entry: unknown): ElanNote | null => {
  if (!isRecord(entry) || typeof entry.code !== "string" || typeof entry.tier !== "string") {
    return null;
  }
  const tier = entry.tier;
  const count = numberOf(entry.count) ?? 0;

  switch (entry.code) {
    case "gap-filled":
      return { code: "gap-filled", tier, count };
    case "reference-annotations":
      return { code: "reference-annotations", tier, count };
    case "annotation-without-time":
      return { code: "annotation-without-time", tier, count };
    case "tier-empty":
      return { code: "tier-empty", tier };
    case "overlap-detected":
      return { code: "overlap-detected", tier, count };
    case "point-tier-dropped":
      return { code: "point-tier-dropped", tier, count };
    case "empty-intervals-dropped":
      return { code: "empty-intervals-dropped", tier, count };
    case "zero-length-dropped":
      return { code: "zero-length-dropped", tier, count };
    case "time-rounded":
      return { code: "time-rounded", tier, count };
    case "tier-unwritable":
      return { code: "tier-unwritable", tier };
    default:
      return null;
  }
};

const toReport = (value: unknown): ElanConversionReport => {
  const raw = isRecord(value) ? value : {};
  return {
    hierarchicalTiers: toStringList(raw.hierarchicalTiers),
    annotationReferences: toStringList(raw.annotationReferences),
    controlledVocabularies: toStringList(raw.controlledVocabularies),
    notes: Array.isArray(raw.notes)
      ? raw.notes.map(toNote).filter((note): note is ElanNote => note !== null)
      : [],
  };
};

/** El error que devolvio el puente, con su codigo real cuando lo tiene. */
const toElanError = (raw: Record<string, unknown>): ElanError => {
  const detail = typeof raw.detail === "string" ? raw.detail : "sin detalle";
  switch (raw.code) {
    case "empty":
      return { code: "empty" };
    case "unreadable-encoding":
      return { code: "unreadable-encoding", detail };
    case "malformed-xml":
      return { code: "malformed-xml", detail };
    case "unsupported-structure":
      return { code: "unsupported-structure", detail };
    case "runtime-unavailable":
      return { code: "runtime-unavailable", detail };
    default:
      return {
        code: "unsupported-structure",
        detail: `el puente devolvio un error desconocido (${String(raw.code)}): ${detail}`,
      };
  }
};

const malformed = (detail: string): Result<never, ElanError> =>
  err({ code: "unsupported-structure", detail });

/** Una capa del puente: nombre y sus intervalos, o el motivo por el que no sirve. */
const toTier = (raw: unknown): Result<Tier, ElanError> => {
  if (!isRecord(raw) || typeof raw.name !== "string" || !Array.isArray(raw.items)) {
    return malformed("una capa del puente no trae nombre o lista de intervalos.");
  }

  const items: Interval[] = [];
  for (const rawItem of raw.items) {
    if (!isRecord(rawItem)) {
      return malformed("un intervalo del puente no es un objeto.");
    }
    const start = numberOf(rawItem.start);
    const end = numberOf(rawItem.end);
    if (start === null || end === null || typeof rawItem.text !== "string") {
      return malformed("un intervalo del puente no trae tiempos numericos y texto.");
    }
    items.push({ start, end, text: rawItem.text });
  }

  // El puente solo produce capas de intervalos: las de puntos no existen en ELAN.
  return ok({ name: raw.name, kind: "interval", items });
};

const toParseResult = (raw: Record<string, unknown>): Result<ElanParseResult, ElanError> => {
  const xmin = numberOf(raw.xmin);
  const xmax = numberOf(raw.xmax);
  if (xmin === null || xmax === null) {
    return malformed("el puente no devolvio los limites del documento como numeros.");
  }
  if (!Array.isArray(raw.tiers)) {
    return malformed("el puente no devolvio una lista de capas.");
  }

  const tiers: Tier[] = [];
  for (const rawTier of raw.tiers) {
    const tier = toTier(rawTier);
    if (!tier.ok) return tier;
    tiers.push(tier.value);
  }

  return ok({ document: { xmin, xmax, tiers }, report: toReport(raw.report) });
};

const toSerializeResult = (raw: unknown): Result<ElanSerializeResult, ElanError> => {
  if (typeof raw !== "string") {
    return err({
      code: "unsupported-structure",
      detail: "el puente no devolvio el texto del .eaf.",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err({
      code: "unsupported-structure",
      detail: "el puente devolvio algo que no es JSON al escribir el .eaf.",
    });
  }
  if (!isRecord(parsed) || typeof parsed.text !== "string") {
    return err({
      code: "unsupported-structure",
      detail: "el puente no devolvio el texto del .eaf.",
    });
  }

  return ok({ text: parsed.text, report: toReport(parsed.report) });
};

/**
 * Crea el motor. No carga nada: `boot()` ocurre en la primera conversion.
 *
 * `isReady()` es falso hasta que el motor quedo listo, igual que el contrato de
 * `PhonemizerPort`: la interfaz debe decidir por lo que pasa al intentarlo, no
 * por lo que alguien promete.
 */
export function createPyodideRuntime(options: PyodideRuntimeOptions): PyodideRuntime {
  const indexURL = options.indexURL.endsWith("/") ? options.indexURL : `${options.indexURL}/`;
  const wheelBase = `${indexURL}wheels/`;
  const wheelUrl = absoluteUrl(`${wheelBase}${options.wheelFileName}`);

  let instance: PyodideLike | null = null;
  let booting: Promise<Result<PyodideLike, ElanError>> | null = null;

  const emit = (phase: ElanPhase): void => {
    options.onProgress?.({ phase, step: STEP_OF[phase], total: TOTAL_STEPS });
  };

  const bootOnce = async (): Promise<Result<PyodideLike, ElanError>> => {
    emit("runtime");
    let pyodide: PyodideLike;
    try {
      pyodide = await options.loadPyodide({ indexURL, packageBaseUrl: wheelBase });
    } catch (error) {
      return err({
        code: "runtime-unavailable",
        detail: `Pyodide no se pudo cargar desde ${indexURL}: ${detailOf(error)}`,
      });
    }

    try {
      emit("wheel");
      // `micropip` viene como wheel del propio Pyodide; se instala con
      // `loadPackage` para que su sha256 se compruebe contra el lock.
      await pyodide.loadPackage("micropip");
      // pympi-ling se instala desde nuestro wheel, tambien del mismo origen.
      await pyodide.runPythonAsync(
        `import micropip\nawait micropip.install(${JSON.stringify(wheelUrl)})`,
      );
      pyodide.runPython(ELAN_BRIDGE_PYTHON);
    } catch (error) {
      return err({
        code: "runtime-unavailable",
        detail: `el motor arranco pero pympi-ling no se pudo instalar desde ${wheelUrl}: ${detailOf(error)}`,
      });
    }

    return ok(pyodide);
  };

  const boot = async (): Promise<Result<PyodideLike, ElanError>> => {
    if (instance !== null) return ok(instance);
    booting ??= bootOnce();
    const result = await booting;
    booting = null;
    if (result.ok) {
      instance = result.value;
    }
    return result;
  };

  return {
    isReady: () => instance !== null,

    warmUp: async () => {
      const ready = await boot();
      return ready.ok ? ok(undefined) : ready;
    },

    parse: async (bytes) => {
      // Un archivo vacio no necesita motor: se responde sin descargar 13 MB.
      if (bytes.length === 0) {
        return err({ code: "empty" });
      }

      const ready = await boot();
      if (!ready.ok) return ready;

      emit("convert");
      try {
        ready.value.FS.writeFile(INPUT_PATH, bytes);
        const raw = await ready.value.runPythonAsync("lingualab_parse_eaf()");
        if (typeof raw !== "string") {
          return err({
            code: "unsupported-structure",
            detail: "el puente no devolvio texto al leer el archivo.",
          });
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return err({
            code: "unsupported-structure",
            detail: "el puente devolvio algo que no es JSON al leer el archivo.",
          });
        }
        if (!isRecord(parsed)) {
          return err({
            code: "unsupported-structure",
            detail: "el puente devolvio algo que no es un objeto al leer el archivo.",
          });
        }
        if (isRecord(parsed.error)) {
          return err(toElanError(parsed.error));
        }
        return toParseResult(parsed);
      } catch (error) {
        return err({
          code: "unsupported-structure",
          detail: `el puente fallo al leer el archivo: ${detailOf(error)}`,
        });
      }
    },

    serialize: async (document) => {
      const ready = await boot();
      if (!ready.ok) return ready;

      emit("convert");
      try {
        ready.value.FS.writeFile(DOCUMENT_PATH, ENCODER.encode(JSON.stringify(document)));
        const raw = await ready.value.runPythonAsync("lingualab_build_eaf()");
        return toSerializeResult(raw);
      } catch (error) {
        return err({
          code: "unsupported-structure",
          detail: `el puente fallo al escribir el archivo: ${detailOf(error)}`,
        });
      }
    },
  };
}

/**
 * URL absoluta de un archivo servido por el sitio.
 *
 * `micropip` exige una URL remota: con una ruta relativa responde "Cannot
 * download from a non-remote location" y el error no dice nada de esto. En el
 * worker `location` existe; en Node la base solo se usa si `indexURL` ya es
 * absoluta, que es como la pasan las pruebas.
 *
 * MEDIDO EN UN NAVEGADOR, Y ERA UN DEFECTO: `indexURL` tambien tiene que ser
 * absoluta. Con `/pyodide/`, Pyodide cargaba su propio wasm y al resolver los
 * paquetes hacia `new URL(archivo, indexURL)` reventaba con «Failed to construct
 * 'URL': Invalid base URL»; la barra de progreso se quedaba en «motor no
 * disponible». La ruta vale para `fetch` y para `import()`, y no como base de
 * una URL absoluta.
 */
function absoluteUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
  const base = typeof location === "undefined" ? "http://localhost/" : location.href;
  return new URL(path, base).href;
}
