/* ============================================================
   LinguaLab — ordenes de edicion del documento de anotacion

   Toda edicion pasa por `applyDocument`: el nucleo devuelve un documento nuevo
   (o el mismo, si la orden no aplicaba), aqui se registra en el historial y se
   redibuja lo que cambio. Las capas, la division en el cursor, la navegacion
   entre intervalos y deshacer/rehacer viven aqui; los botones y los atajos de
   teclado llaman a las mismas funciones.
   ============================================================ */

import {
  type AnnotationDocument,
  addTier,
  moveTier,
  recordAnnotation,
  redoAnnotation,
  removeTier,
  renameTier,
  splitIntervalAt,
  undoAnnotation,
} from "@lingualab/core";
import { clamp, neighbourInterval } from "./selection";
import {
  activeIntervalIndexOf,
  activeSheetOf,
  currentDocument,
  type ViewerContext,
} from "./viewer-state";

export interface AnnotationCommands {
  /** Registra el documento en el historial; `rebuild` en falso no rehace la tabla. */
  applyDocument(next: AnnotationDocument, rebuild?: boolean): void;
  /** Divide el intervalo activo en el cursor. */
  splitAtCursor(): void;
  /** Lleva el cursor al inicio del intervalo anterior o siguiente. */
  moveCursorToInterval(direction: -1 | 1): void;
  undo(): void;
  redo(): void;
}

export interface AnnotationCommandsDeps {
  readonly renderIntervals: () => void;
  readonly renderTierSelect: () => void;
  readonly renderTiers: () => void;
  readonly renderCanvas: () => void;
  readonly renderAll: () => void;
  readonly updateCursor: () => void;
  readonly updateHistory: () => void;
  readonly scheduleAutosave: () => void;
}

export const createAnnotationCommands = (
  ctx: ViewerContext,
  deps: AnnotationCommandsDeps,
): AnnotationCommands => {
  const { el, state, es } = ctx;
  const current = (): AnnotationDocument => currentDocument(state);

  const applyDocument = (next: AnnotationDocument, rebuild = true): void => {
    if (next === current()) {
      return;
    }
    state.history = recordAnnotation(state.history, next);
    if (rebuild) {
      deps.renderIntervals();
    }
    deps.renderTiers();
    deps.updateHistory();
    deps.scheduleAutosave();
  };

  const splitAtCursor = (): void => {
    applyDocument(splitIntervalAt(current(), state.activeTier, state.cursor));
    deps.renderCanvas();
  };

  const moveCursorToInterval = (direction: -1 | 1): void => {
    const active = activeSheetOf(state);
    if (active === null) {
      return;
    }
    const next = neighbourInterval(active, activeIntervalIndexOf(state), direction);
    if (next === undefined) {
      return;
    }
    state.cursor = next.start;
    deps.updateCursor();
    deps.renderCanvas();
    deps.renderIntervals();
  };

  const undo = (): void => {
    state.history = undoAnnotation(state.history);
    deps.renderAll();
    deps.scheduleAutosave();
  };

  const redo = (): void => {
    state.history = redoAnnotation(state.history);
    deps.renderAll();
    deps.scheduleAutosave();
  };

  /** Tras cambiar la capa activa o las capas: selector, tabla y canvas. */
  const refreshTiers = (): void => {
    deps.renderTierSelect();
    deps.renderIntervals();
    deps.renderCanvas();
  };

  /** Sube o baja la capa activa y la sigue con la seleccion. */
  const shiftTier = (direction: -1 | 1): void => {
    const next = moveTier(current(), state.activeTier, direction);
    if (next === current()) {
      return;
    }
    applyDocument(next);
    state.activeTier =
      direction === -1
        ? Math.max(state.activeTier - 1, 0)
        : Math.min(state.activeTier + 1, current().tiers.length - 1);
    refreshTiers();
  };

  el.tierSelect?.addEventListener("change", () => {
    const select = el.tierSelect;
    if (select === null) {
      return;
    }
    state.activeTier = clamp(Number(select.value), 0, current().tiers.length - 1);
    deps.renderIntervals();
    deps.renderCanvas();
  });

  el.tierNameInput?.addEventListener("change", () => {
    const name = el.tierNameInput?.value.trim() ?? "";
    if (name === "") {
      return;
    }
    applyDocument(renameTier(current(), state.activeTier, name));
    deps.renderTierSelect();
    deps.renderCanvas();
  });

  el.tierAddButton?.addEventListener("click", () => {
    const name = `${es ? "capa" : "tier"} ${current().tiers.length + 1}`;
    applyDocument(addTier(current(), name, "interval"));
    state.activeTier = current().tiers.length - 1;
    refreshTiers();
  });

  el.tierRemoveButton?.addEventListener("click", () => {
    applyDocument(removeTier(current(), state.activeTier));
    state.activeTier = clamp(state.activeTier, 0, current().tiers.length - 1);
    refreshTiers();
  });

  el.tierUpButton?.addEventListener("click", () => {
    shiftTier(-1);
  });

  el.tierDownButton?.addEventListener("click", () => {
    shiftTier(1);
  });

  el.splitButton?.addEventListener("click", () => {
    splitAtCursor();
  });

  el.prevButton?.addEventListener("click", () => {
    moveCursorToInterval(-1);
  });

  el.nextButton?.addEventListener("click", () => {
    moveCursorToInterval(1);
  });

  el.undoButton?.addEventListener("click", () => {
    undo();
  });

  el.redoButton?.addEventListener("click", () => {
    redo();
  });

  return { applyDocument, splitAtCursor, moveCursorToInterval, undo, redo };
};
