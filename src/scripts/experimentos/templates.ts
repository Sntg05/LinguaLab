/* ============================================================
   LinguaLab — las cuatro plantillas de experimento

   Cada plantilla es una especificacion: el tipo de tarea y los parametros del
   diseno. No hay logica por plantilla aqui; lo que cambia entre una y otra es
   que plugin la ejecuta y que se registra como respuesta, y eso vive en el
   adaptador. Este modulo solo arma la especificacion que se puede exportar a
   JSON para reproducir el experimento.

   POR QUE LOS TEXTOS POR DEFECTO SON CLAVES DE I18N Y NO CADENAS

   Las instrucciones son editables y el sitio es bilingue: la clave se resuelve
   en la compilacion, en el idioma de la ruta, y viaja al formulario ya
   traducida. Escribir el texto aqui en espanol dejaria la version inglesa
   mostrando espanol en un campo editable, que es peor que un hueco.
   ============================================================ */

import type { ExperimentKind, ExperimentSpec } from "@lingualab/core";
import type { MessageKey } from "../../i18n";
import type { StimulusRow } from "./csv";

/** Una plantilla del constructor: que tarea es y que texto la explica. */
export interface ExperimentTemplate {
  readonly kind: ExperimentKind;
  readonly labelKey: MessageKey;
  readonly noteKey: MessageKey;
  readonly instructionsKey: MessageKey;
}

/**
 * Las cuatro del prompt, en el orden en que se ofrecen: de la mas simple a la
 * que necesita mas preparacion del material.
 */
export const TEMPLATES = [
  {
    kind: "acceptability",
    labelKey: "exp.template.acceptability",
    noteKey: "exp.template.acceptability.note",
    instructionsKey: "exp.instructions.acceptability",
  },
  {
    kind: "two-afc",
    labelKey: "exp.template.two-afc",
    noteKey: "exp.template.two-afc.note",
    instructionsKey: "exp.instructions.two-afc",
  },
  {
    kind: "self-paced-reading",
    labelKey: "exp.template.self-paced-reading",
    noteKey: "exp.template.self-paced-reading.note",
    instructionsKey: "exp.instructions.self-paced-reading",
  },
  {
    kind: "lexical-decision",
    labelKey: "exp.template.lexical-decision",
    noteKey: "exp.template.lexical-decision.note",
    instructionsKey: "exp.instructions.lexical-decision",
  },
] as const satisfies readonly [ExperimentTemplate, ...ExperimentTemplate[]];

/** La plantilla con la que abre el constructor: montar un juicio de aceptabilidad. */
export const DEFAULT_TEMPLATE: ExperimentKind = "acceptability";

/** La plantilla de un tipo, con la primera como respaldo. */
export const templateFor = (kind: ExperimentKind): ExperimentTemplate =>
  TEMPLATES.find((template) => template.kind === kind) ?? TEMPLATES[0];

export interface ExperimentSpecInput {
  readonly kind: ExperimentKind;
  readonly items: readonly StimulusRow[];
  readonly seed: number;
  readonly blocks: number;
  readonly practiceTrials: number;
  readonly instructions: string;
  readonly continueLabel: string;
  readonly scaleLeft: string;
  readonly scaleRight: string;
  readonly wordLabel: string;
  readonly nonWordLabel: string;
}

/**
 * Arma la especificacion completa.
 *
 * Los parametros van como valores primitivos para que el JSON exportado se pueda
 * volver a cargar sin un esquema por plantilla, y para que el adaptador lea de
 * ahi todo lo que necesita: si algo dependiera de una constante suya, la
 * especificacion dejaria de describir el experimento.
 */
export const buildExperimentSpec = (input: ExperimentSpecInput): ExperimentSpec => ({
  id: `${input.kind}-${input.seed}`,
  kind: input.kind,
  items: input.items.map((item) =>
    item.audioFile === undefined
      ? { id: item.id, condition: item.condition, text: item.text }
      : { id: item.id, condition: item.condition, text: item.text, audioFile: item.audioFile },
  ),
  parameters: {
    seed: input.seed,
    blocks: input.blocks,
    practiceTrials: input.practiceTrials,
    instructions: input.instructions,
    continueLabel: input.continueLabel,
    scaleLeft: input.scaleLeft,
    scaleRight: input.scaleRight,
    wordLabel: input.wordLabel,
    nonWordLabel: input.nonWordLabel,
  },
});
