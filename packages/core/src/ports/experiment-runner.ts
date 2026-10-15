import type { ExperimentSpec } from "../domain/index";
import type { Result } from "../result";

/**
 * Un ensayo registrado: lo que hizo una persona en un item.
 *
 * `seed` y `toolVersion` se repiten en cada ensayo aunque tambien esten en los
 * resultados: asi una fila exportada a CSV sigue siendo interpretable por si
 * sola, sin depender del archivo que la contenia.
 */
export interface ExperimentTrial {
  readonly participantId: string;
  readonly trialId: string;
  readonly condition: string;
  readonly response: string;
  readonly reactionTimeMs: number;
  readonly toolVersion: string;
  readonly seed: number;
}

export interface ExperimentResults {
  readonly trials: readonly ExperimentTrial[];
  /** Semilla con la que se genero el orden: sin ella el analisis no es reproducible. */
  readonly seed: number;
  readonly toolVersion: string;
}

/** Fallos al ejecutar un experimento. */
export type ExperimentError =
  | { readonly code: "spec-invalid"; readonly detail: string }
  | { readonly code: "aborted"; readonly detail?: string }
  | { readonly code: "runtime-failed"; readonly detail: string };

/**
 * Puerto de ejecucion de experimentos (jsPsych o su fake). La especificacion
 * entra completa y los resultados salen con la semilla usada, para que el
 * experimento se pueda repetir.
 */
export interface ExperimentRunnerPort {
  run(spec: ExperimentSpec): Promise<Result<ExperimentResults, ExperimentError>>;
}
