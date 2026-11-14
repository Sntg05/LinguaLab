/* ============================================================
   LinguaLab — modo guiado de la primera segmentacion

   Unidad 5.8 del rework v4: «Escucha. Pon un limite donde cambia el sonido.
   Escribe que sonido es.» Tres pasos sobre la palabra de ejemplo, dichos en la
   linea de estado de la barra (la que siempre se ve), que avanzan solos cuando
   la persona hace el gesto que pide cada paso. Sin ventana aparte: no quita
   alto al editor.

   Pura y probada en Node; quien escucha los gestos es `index.ts`.
   ============================================================ */

export const GUIDE_STEPS = ["listen", "boundary", "label", "done"] as const;

export type GuideStep = (typeof GUIDE_STEPS)[number];

/** Gestos que hacen avanzar la guia. */
export type GuideEvent = "played" | "boundary-added" | "label-written";

/** El paso que completa cada gesto. */
const COMPLETES: Readonly<Record<GuideEvent, GuideStep>> = {
  played: "listen",
  "boundary-added": "boundary",
  "label-written": "label",
};

/**
 * El paso siguiente tras un gesto. Nunca retrocede, y deja saltar hacia
 * delante: quien ya sabe poner un limite no tiene por que escuchar primero.
 */
export const advanceGuide = (step: GuideStep, event: GuideEvent): GuideStep => {
  const current = GUIDE_STEPS.indexOf(step);
  const completed = GUIDE_STEPS.indexOf(COMPLETES[event]);
  if (completed < current) {
    return step;
  }
  return GUIDE_STEPS[Math.min(completed + 1, GUIDE_STEPS.length - 1)] ?? "done";
};

/** Clave del mensaje de cada paso. */
export const guideMessageKey = (step: GuideStep): `audio.guide.${GuideStep}` =>
  `audio.guide.${step}`;
