/**
 * Experimentos conductuales: el diseno de una tarea y sus items.
 *
 * La semilla (`seed`) y la version de la herramienta viven en los RESULTADOS
 * (`ExperimentResults`), no en la especificacion: dos participantes deben ver
 * el mismo diseno pero sus respuestas necesitan registrar con que semilla y
 * con que version se genero, para poder reproducir el analisis.
 */

export type ExperimentKind =
  | "acceptability"
  | "two-afc"
  | "self-paced-reading"
  | "lexical-decision";

export interface ExperimentItem {
  readonly id: string;
  /** Condicion experimental (por ejemplo "control" o "island"); es la que se compara. */
  readonly condition: string;
  readonly text: string;
  readonly audioFile?: string;
}

export interface ExperimentSpec {
  readonly id: string;
  readonly kind: ExperimentKind;
  readonly items: readonly ExperimentItem[];
  /**
   * Parametros libres del diseno (duracion, numero de practica, etc.). Se
   * dejan como valores primitivos para que la especificacion se pueda
   * importar y exportar sin un esquema por tipo de experimento.
   */
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
}
