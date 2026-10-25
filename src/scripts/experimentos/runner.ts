/* ============================================================
   LinguaLab — como la interfaz pide un ejecutor de experimentos

   El controlador no importa el adaptador: recibe una funcion que lo construye.
   Esa frontera es la que mantiene la regla de dependencias —la interfaz conoce
   el puerto, no la implementacion— y ademas permite cargar jsPsych solo cuando
   alguien ejecuta un experimento, en vez de mandarlo con la pagina.

   El `abort` viaja al lado del puerto y no dentro de el: `ExperimentRunnerPort`
   no lo declara, y agregarselo al nucleo para comodidad de una pantalla seria
   disenar el puerto desde la UI, que es justo lo que el hexagono evita.
   ============================================================ */

import type { ExperimentRunnerPort } from "@lingualab/core";

export interface ExperimentRunnerRequest {
  /** Donde se dibuja el experimento. */
  readonly displayElement: HTMLElement;
  /** Identificador anonimo local de esta sesion. */
  readonly participantId: string;
  /** Nombre de archivo de la columna `audio` -> URL local ya cargada. */
  readonly resolveAudio: (file: string) => string | undefined;
}

/** El ejecutor y la unica forma de cortar una sesion en curso. */
export interface ExperimentRunnerHandle {
  readonly runner: ExperimentRunnerPort;
  readonly abort: () => void;
}

/** Construye el ejecutor; puede fallar si el navegador no puede cargar el motor. */
export type CreateExperimentRunner = (
  request: ExperimentRunnerRequest,
) => Promise<ExperimentRunnerHandle>;
