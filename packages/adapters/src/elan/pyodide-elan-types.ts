import type {
  AnnotationDocument,
  ElanCodecPort,
  ElanLossReport,
  Result,
  ElanError,
} from "@lingualab/core";

/**
 * Tipos del codec ELAN sobre Pyodide.
 *
 * Viven aparte del adaptador y del worker para que los dos compartan la forma de
 * los mensajes sin que el worker importe el adaptador (que crearia un ciclo: el
 * adaptador construye el worker).
 */

/** Las tres fases de la primera carga, en orden. */
export type ElanPhase = "runtime" | "wheel" | "convert";

/**
 * Progreso de una conversion.
 *
 * POR QUE PASOS Y NO UN PORCENTAJE
 *
 * Pyodide pide su wasm, su stdlib y sus wheels por dentro, sin exponer cuanto
 * falta; un porcentaje inventado seria una barra que se mueve sola y no dice la
 * verdad. Lo que si se sabe es en que fase esta: cargar el motor, instalar el
 * wheel de pympi, convertir. La barra muestra eso, y el texto dice cual es la
 * fase. `step` es 1-based para que la interfaz no tenga que sumar uno.
 */
export interface ElanProgress {
  readonly phase: ElanPhase;
  readonly step: number;
  readonly total: number;
}

/**
 * Algo que la conversion cambio y que conviene mirar, como DATO y no como frase.
 *
 * El informe de perdida (`ElanLossReport`) dice que se perdio; estas notas dicen
 * que se transformo, que no es lo mismo: rellenar un silencio o redondear un
 * tiempo no pierde una anotacion, pero cambia el archivo. Se codifican en vez de
 * escribirse en espanol porque la interfaz es bilingue y traduce ella.
 */
export type ElanNote =
  /** El tramo sin anotacion se relleno con un intervalo vacio para que Praat lo abra. */
  | { readonly code: "gap-filled"; readonly tier: string; readonly count: number }
  /** La capa tiene anotaciones que apuntan a otra anotacion, no a un tiempo. */
  | { readonly code: "reference-annotations"; readonly tier: string; readonly count: number }
  /** Una anotacion apunta a una ranura de tiempo sin valor. */
  | { readonly code: "annotation-without-time"; readonly tier: string; readonly count: number }
  /** La capa no tenia ninguna anotacion. */
  | { readonly code: "tier-empty"; readonly tier: string }
  /** Dos anotaciones de la misma capa se solapan; Praat rechaza ese archivo. */
  | { readonly code: "overlap-detected"; readonly tier: string; readonly count: number }
  /** Una capa de puntos no se puede escribir en ELAN (no hay duracion cero). */
  | { readonly code: "point-tier-dropped"; readonly tier: string; readonly count: number }
  /** Los intervalos sin texto son relleno de silencio y no se escriben en ELAN. */
  | { readonly code: "empty-intervals-dropped"; readonly tier: string; readonly count: number }
  /** Un intervalo de duracion cero no se puede escribir en ELAN. */
  | { readonly code: "zero-length-dropped"; readonly tier: string; readonly count: number }
  /** ELAN guarda milisegundos enteros: el tiempo se redondeo. */
  | { readonly code: "time-rounded"; readonly tier: string; readonly count: number }
  /** ELAN no admite esa capa (por ejemplo, sin nombre). */
  | { readonly code: "tier-unwritable"; readonly tier: string };

/**
 * El informe de perdida mas las notas de lo que se transformo.
 *
 * Los tres campos de `ElanLossReport` llevan NOMBRES —de capa, de vocabulario—
 * y no frases: quien los muestra decide como llamarlos en su idioma. Es la
 * unica forma de que el mismo informe se lea bien en `/elan` y en `/en/elan`.
 */
export interface ElanConversionReport extends ElanLossReport {
  readonly notes: readonly ElanNote[];
}

export interface ElanParseResult {
  readonly document: AnnotationDocument;
  readonly report: ElanConversionReport;
}

export interface ElanSerializeResult {
  readonly text: string;
  readonly report: ElanConversionReport;
}

/**
 * El codec completo: el puerto mas lo que la interfaz necesita para no mentir.
 *
 * `parse` y `serialize` son el contrato de `@lingualab/core` y devuelven lo
 * mismo que cualquier codec. Los metodos `*WithReport` devuelven ademas el
 * informe, porque un `AnnotationDocument` no tiene donde llevar la cuenta de lo
 * que se quedo por el camino.
 */
export interface PyodideElanCodec extends ElanCodecPort {
  readonly parseWithReport: (bytes: Uint8Array) => Promise<Result<ElanParseResult, ElanError>>;
  readonly serializeWithReport: (
    document: AnnotationDocument,
  ) => Promise<Result<ElanSerializeResult, ElanError>>;
  /**
   * Arranca el motor sin convertir nada. La primera conversion lo arranca igual;
   * esto existe para que la interfaz pueda adelantar la descarga si algun dia
   * quiere, sin que la construccion del adaptador descargue nada.
   */
  readonly warmUp: () => Promise<Result<void, ElanError>>;
  /** Verdadero desde que el motor quedo listo. Antes de eso, convertir lo arranca. */
  readonly isReady: () => boolean;
  /** Escucha el progreso. Devuelve la funcion para dejar de escuchar. */
  readonly onProgress: (listener: (progress: ElanProgress) => void) => () => void;
  /** Termina el worker. La instancia queda inservible. */
  readonly dispose: () => void;
}
