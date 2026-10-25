/* ============================================================
   LinguaLab — vista previa del orden de ensayos

   La vista previa es lo que separa «ejecutar» de «ejecutar a ciegas»: muestra el
   orden exacto que va a ver el participante, con la semilla y los bloques que se
   eligieron. Se construye con nodos, nunca con `innerHTML`, porque el texto de
   cada estimulo viene de un CSV que pego una persona.
   ============================================================ */

import type { ExperimentTrialPlan, GeneratedTrial } from "@lingualab/core";
import { format, type ExperimentsStrings } from "./strings";

/** Una celda de texto; acorta lo larguisimo sin mentir sobre el contenido. */
const cell = (text: string, className?: string): HTMLTableCellElement => {
  const element = document.createElement("td");
  element.textContent = text;
  if (className !== undefined) {
    element.className = className;
  }
  return element;
};

const row = (trial: GeneratedTrial, strings: ExperimentsStrings): HTMLTableRowElement => {
  const element = document.createElement("tr");
  if (trial.practice) {
    element.dataset.practice = "true";
  }

  const order = cell(String(trial.index), "explab__num");
  const block = cell(
    trial.practice
      ? strings.text("exp.preview.practice")
      : String(trial.block),
    "explab__num",
  );
  const condition = cell(trial.condition);
  const stimulus = cell(trial.text, "explab__stimulus");

  element.append(order, block, condition, stimulus);
  return element;
};

/**
 * Dibuja el orden de la sesion.
 *
 * Devuelve el texto del resumen para que quien llama decida si lo escribe en la
 * linea de estado o lo deja aparte: la vista previa y el estado no siempre se
 * actualizan juntos.
 */
export const renderPreview = (
  body: HTMLElement,
  plan: ExperimentTrialPlan,
  strings: ExperimentsStrings,
): string => {
  body.replaceChildren();

  if (plan.trials.length === 0) {
    return strings.text("exp.preview.empty");
  }

  const fragment = document.createDocumentFragment();
  for (const trial of plan.trials) {
    fragment.append(row(trial, strings));
  }
  body.append(fragment);

  return format(strings.text("exp.preview.count"), {
    total: plan.trials.length,
    practice: plan.practiceCount,
    main: plan.mainCount,
  });
};
