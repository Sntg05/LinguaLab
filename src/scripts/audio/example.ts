/* ============================================================
   LinguaLab — palabra de ejemplo y modo guiado

   Dos puertas para la primera clase (unidad 5.8 del rework v4):
   - «Ver resuelto»: el audio de «pato» con su TextGrid, para ver un resultado
     antes de hacer uno;
   - «Practicar»: el mismo audio sin anotar, con la guia de tres pasos en la
     linea de estado.

   El audio y el TextGrid se sirven desde el propio sitio
   (`public/audio/ejemplos/`, con su licencia en `ATTRIBUTION.md`) y entran por
   el mismo camino que un archivo elegido a mano: nada especial que mantener.
   ============================================================ */

import { type AnnotationDocument, intervalTiers } from "@lingualab/core";
import { withBase } from "../../lib/paths";
import { advanceGuide, type GuideEvent, type GuideStep, guideMessageKey } from "./guide";
import type { ViewerContext } from "./viewer-state";

const AUDIO = { path: "/audio/ejemplos/pato.wav", name: "pato.wav", type: "audio/wav" };
const TEXTGRID = { path: "/audio/ejemplos/pato.TextGrid", name: "pato.TextGrid", type: "text/plain" };

export interface ExampleDeps {
  readonly loadAudioFile: (file: File) => Promise<void>;
  readonly importTextGrid: (file: File) => Promise<void>;
}

export interface Example {
  loadSolved(): Promise<void>;
  loadPractice(): Promise<void>;
  /** Un gesto de la persona; si la guia esta activa, puede avanzar. */
  notify(event: GuideEvent): void;
  /** Otro audio cargado a mano: la guia termina sin decir nada. */
  cancel(): void;
}

const fetchFile = async (spec: typeof AUDIO): Promise<File> => {
  const response = await fetch(withBase(spec.path));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return new File([await response.blob()], spec.name, { type: spec.type });
};

export const createExample = (ctx: ViewerContext, deps: ExampleDeps): Example => {
  const { el, strings } = ctx;
  let step: GuideStep | null = null;

  const showCredit = (): void => {
    if (el.exampleCredit !== null) {
      el.exampleCredit.hidden = false;
    }
  };

  const say = (): void => {
    if (step !== null) {
      ctx.say(strings.text(guideMessageKey(step)), "ok");
    }
  };

  const load = async (withTextGrid: boolean): Promise<boolean> => {
    try {
      const audio = await fetchFile(AUDIO);
      const textGrid = withTextGrid ? await fetchFile(TEXTGRID) : null;
      await deps.loadAudioFile(audio);
      if (textGrid !== null) {
        await deps.importTextGrid(textGrid);
      }
      showCredit();
      return true;
    } catch {
      ctx.say(strings.text("audio.example.error"), "error");
      return false;
    }
  };

  return {
    loadSolved: async () => {
      step = null;
      await load(true);
    },
    loadPractice: async () => {
      step = null;
      if (await load(false)) {
        step = "listen";
        say();
      }
    },
    notify: (event) => {
      if (step === null) {
        return;
      }
      const next = advanceGuide(step, event);
      if (next === step) {
        return;
      }
      step = next;
      say();
      if (step === "done") {
        step = null;
      }
    },
    cancel: () => {
      step = null;
    },
  };
};

/** Cuantos intervalos y cuantas etiquetas escritas hay: lo que mide el avance de la guia. */
export const annotationCounts = (
  doc: AnnotationDocument,
): { readonly intervals: number; readonly labels: number } => {
  let intervals = 0;
  let labels = 0;
  for (const { tier } of intervalTiers(doc)) {
    intervals += tier.items.length;
    labels += tier.items.filter((item) => item.text.trim() !== "").length;
  }
  return { intervals, labels };
};
