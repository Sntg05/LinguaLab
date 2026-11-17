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
  mergeIntervalWithNext,
  moveTier,
  recordAnnotation,
  redoAnnotation,
  removeTier,
  renameTier,
  setIntervalText,
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
  /** Quita la frontera seleccionada y une sus dos intervalos. */
  removeSelectedBoundary(): void;
  /** Pone el texto del intervalo bajo el cursor en la capa activa. */
  setActiveText(text: string): void;
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
  /** Aviso de cada cambio registrado, con el documento de antes y el de despues. */
  readonly onChange?: (previous: AnnotationDocument, next: AnnotationDocument) => void;
}

export const createAnnotationCommands = (
  ctx: ViewerContext,
  deps: AnnotationCommandsDeps,
): AnnotationCommands => {
  const { el, state, es } = ctx;
  const current = (): AnnotationDocument => currentDocument(state);

  const applyDocument = (next: AnnotationDocument, rebuild = true): void => {
    const previous = current();
    if (next === previous) {
      return;
    }
    state.history = recordAnnotation(state.history, next);
    deps.onChange?.(previous, next);
    if (rebuild) {
      deps.renderIntervals();
    }
    deps.renderTiers();
    deps.updateHistory();
    deps.scheduleAutosave();
  };

  /**
   * La frontera que empieza en el cursor queda seleccionada, si la hay: asi Supr
   * funciona tambien sin raton, despues de Intro o de ir con coma y punto.
   */
  const selectBoundaryAtCursor = (): void => {
    const index = activeIntervalIndexOf(state);
    const interval = activeSheetOf(state)?.tier.items[index];
    state.selectedBoundary =
      interval !== undefined && index > 0 && Math.abs(interval.start - state.cursor) < 1e-6
        ? index - 1
        : null;
  };

  const splitAtCursor = (): void => {
    applyDocument(splitIntervalAt(current(), state.activeTier, state.cursor));
    selectBoundaryAtCursor();
    deps.renderCanvas();
  };

  const removeSelectedBoundary = (): void => {
    if (state.selectedBoundary === null) {
      return;
    }
    const next = mergeIntervalWithNext(current(), state.activeTier, state.selectedBoundary);
    state.selectedBoundary = null;
    applyDocument(next);
    deps.renderCanvas();
  };

  const setActiveText = (text: string): void => {
    const index = activeIntervalIndexOf(state);
    if (index < 0) {
      return;
    }
    // Se rehace la tabla: es la vista accesible del mismo texto y tiene que
    // decir lo mismo que la capa. El foco esta en la ventana de texto, no en ella.
    applyDocument(setIntervalText(current(), state.activeTier, index, text));
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
    selectBoundaryAtCursor();
    deps.updateCursor();
    deps.renderCanvas();
    deps.renderIntervals();
  };

  const undo = (): void => {
    state.selectedBoundary = null;
    state.history = undoAnnotation(state.history);
    deps.renderAll();
    deps.scheduleAutosave();
  };

  const redo = (): void => {
    state.selectedBoundary = null;
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

  return {
    applyDocument,
    splitAtCursor,
    removeSelectedBoundary,
    setActiveText,
    moveCursorToInterval,
    undo,
    redo,
  };
};
