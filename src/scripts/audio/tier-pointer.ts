/* ============================================================
   LinguaLab — el raton sobre la franja de capas, como en Praat

   Del TextGridEditor de Praat (manual, «TextGridEditor»): un clic dentro de una
   capa la selecciona; un clic dentro de un intervalo lo selecciona y su texto
   aparece en la ventana de texto; una frontera se mueve arrastrandola.

   Mientras se arrastra, el documento movido se guarda aparte (`dragPreview`) y
   solo se registra en el historial al soltar: una frontera arrastrada es UN
   paso que se deshace, no cien.

   El cursor lo pone el oyente del marco (`viewer-controls.ts`), que recibe el
   mismo evento despues de este.
   ============================================================ */

import { type AnnotationDocument, moveTierBoundary } from "@lingualab/core";
import { clamp } from "./selection";
import { boundaryNear, tierAtY, tierStripLayout } from "./tier-geometry";
import { timeAtRatio } from "./view";
import { activeSheetOf, currentDocument, type ViewerContext } from "./viewer-state";

export interface TierPointerDeps {
  readonly applyDocument: (next: AnnotationDocument) => void;
  readonly renderCanvas: () => void;
  readonly renderTierSelect: () => void;
}

export const listenToTierPointer = (ctx: ViewerContext, deps: TierPointerDeps): void => {
  const { el, state } = ctx;
  const canvas = el.tiersCanvas;
  if (canvas === null) {
    return;
  }

  let drag: { readonly base: AnnotationDocument; readonly boundary: number } | null = null;

  const timeAt = (event: PointerEvent): number => {
    const rect = canvas.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return timeAtRatio(state.view, ratio);
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (state.audio === null) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const doc = currentDocument(state);
    const layout = tierStripLayout(rect.height, doc.tiers.length);
    const tier = tierAtY(layout, event.clientY - rect.top, doc.tiers.length);
    if (tier >= 0 && tier !== state.activeTier) {
      state.activeTier = tier;
      deps.renderTierSelect();
    }

    const sheet = activeSheetOf(state);
    const boundary =
      tier >= 0 && sheet !== null && sheet.index === tier
        ? boundaryNear(sheet.tier.items, state.view, rect.width, event.clientX - rect.left)
        : null;
    state.selectedBoundary = boundary;
    if (boundary !== null) {
      drag = { base: doc, boundary };
      canvas.setPointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (drag === null) {
      return;
    }
    state.dragPreview = moveTierBoundary(drag.base, state.activeTier, drag.boundary, timeAt(event));
    deps.renderCanvas();
  });

  const finish = (event: PointerEvent): void => {
    if (drag === null) {
      return;
    }
    const moved = moveTierBoundary(drag.base, state.activeTier, drag.boundary, timeAt(event));
    drag = null;
    state.dragPreview = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    deps.applyDocument(moved);
    deps.renderCanvas();
  };

  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
};
