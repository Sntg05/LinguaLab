/* ============================================================
   LinguaLab — tabla de intervalos y selector de capa del visor

   La tabla es la forma accesible de editar: cada intervalo es una fila con su
   inicio, su fin editable, su texto y sus acciones, y todo se puede hacer con
   el teclado. El canvas de capas muestra lo mismo, pero no se puede tabular.
   ============================================================ */

import {
  type AnnotationDocument,
  type Interval,
  mergeIntervalWithNext,
  moveTierBoundary,
  setIntervalText,
} from "@lingualab/core";
import type { Sheet } from "./selection";
import { format, formatSeconds } from "./strings";
import { activeSheetOf, currentDocument, type ViewerContext } from "./viewer-state";

export interface IntervalTable {
  /** Reconstruye la tabla de la capa activa y su cabecera. */
  renderIntervals(): void;
  /** Rehace las opciones del selector de capa. */
  renderTierSelect(): void;
}

export interface IntervalTableDeps {
  readonly applyDocument: (next: AnnotationDocument, rebuild?: boolean) => void;
  readonly renderCanvas: () => void;
  readonly updateCursor: () => void;
  readonly updateHistory: () => void;
  readonly play: (from: number) => void;
}

const numberInput = (
  value: number,
  label: string,
  handler: (next: number) => void,
): HTMLInputElement => {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.001";
  input.value = value.toFixed(3);
  input.setAttribute("aria-label", label);
  input.addEventListener("change", () => {
    const parsed = Number(input.value);
    if (Number.isFinite(parsed)) {
      handler(parsed);
    }
  });
  return input;
};

const actionButton = (label: string, text: string, handler: () => void): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn--quiet btn--sm";
  button.textContent = text;
  // EL NOMBRE ACCESIBLE NO LLEVA EL GLIFO, y la razón está medida.
  //
  // WCAG 2.5.3 (Label in Name) pide que el nombre contenga el texto visible. Con
  // «▶» de texto visible y «Reproducir el intervalo 1» de nombre, axe 4.14.0
  // marca `label-content-name-mismatch`; probé la corrección obvia —meter el
  // glifo en el nombre, «▶ Reproducir el intervalo 1»— y axe sigue marcándolo,
  // porque con un texto visible de un solo símbolo no puede decidir y devuelve
  // `incomplete` sin motivo. O sea: no está diciendo que incumplamos, está
  // diciendo que no sabe.
  //
  // Entre anunciar «▶ Reproducir el intervalo 1» en un lector de pantalla y
  // aceptar que la puerta no puede decidir sobre glifos, gana el lector: el
  // nombre describe la acción completa y el glifo es decoración visual. La regla
  // queda exceptuada por nombre en `AXE_INCOMPLETE_WITHOUT_MOTIVE`
  // (e2e/accessibility.spec.ts) con esta misma justificación.
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
};

export const createIntervalTable = (
  ctx: ViewerContext,
  deps: IntervalTableDeps,
): IntervalTable => {
  const { el, state, strings, es } = ctx;

  /**
   * Boton de accion de una fila. Texto corto, etiqueta larga: el icono no basta.
   * El numero es el del INTERVALO: con el de la capa, todos los botones de una
   * capa se llamaban igual y un lector de pantalla no los distinguia.
   */
  const intervalAction = (index: number, interval: Interval): HTMLButtonElement =>
    actionButton(
      es ? `Reproducir el intervalo ${index + 1}` : `Play interval ${index + 1}`,
      "▶",
      () => {
        state.cursor = interval.start;
        deps.updateCursor();
        deps.play(interval.start);
      },
    );

  /** Una fila de la tabla: numero, inicio, fin editable, texto y acciones. */
  const buildIntervalRow = (
    sheet: Sheet,
    interval: Interval,
    index: number,
    last: boolean,
  ): HTMLTableRowElement => {
    const row = document.createElement("tr");
    row.dataset.interval = String(index);

    const indexCell = document.createElement("th");
    indexCell.scope = "row";
    indexCell.textContent = String(index + 1);
    row.append(indexCell);

    const startCell = document.createElement("td");
    startCell.className = "audiolab__time";
    startCell.textContent = formatSeconds(interval.start);
    row.append(startCell);

    const endCell = document.createElement("td");
    if (last) {
      endCell.textContent = formatSeconds(interval.end);
      endCell.className = "audiolab__time";
    } else {
      endCell.append(
        numberInput(
          interval.end,
          format(strings.text("audio.row.end"), { index: index + 1 }),
          (next) => {
            deps.applyDocument(
              moveTierBoundary(currentDocument(state), sheet.index, index, next),
            );
            deps.renderCanvas();
          },
        ),
      );
    }
    row.append(endCell);

    const textCell = document.createElement("td");
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = interval.text;
    textInput.className = "audiolab__text";
    textInput.setAttribute(
      "aria-label",
      format(strings.text("audio.row.text"), { index: index + 1 }),
    );
    textInput.addEventListener("focus", () => {
      state.lastTextInput = textInput;
    });
    textInput.addEventListener("input", () => {
      // Sin reconstruir la tabla: reconstruirla en cada tecla le quitaria el
      // foco a quien esta escribiendo.
      deps.applyDocument(
        setIntervalText(currentDocument(state), sheet.index, index, textInput.value),
        false,
      );
    });
    textCell.append(textInput);
    row.append(textCell);

    const actions = document.createElement("td");
    actions.className = "audiolab__actions";
    actions.append(intervalAction(index, interval));
    if (!last) {
      actions.append(
        actionButton(
          es
            ? `Fusionar el intervalo ${index + 1} con el siguiente`
            : `Merge interval ${index + 1} with the next`,
          "∪",
          () => {
            deps.applyDocument(mergeIntervalWithNext(currentDocument(state), sheet.index, index));
            deps.renderCanvas();
          },
        ),
      );
    }
    row.append(actions);

    return row;
  };

  /** Cabecera de la tabla: de que capa son los intervalos que se ven. */
  const syncTierHeader = (active: Sheet | null): void => {
    const doc = currentDocument(state);
    if (el.intervalsCaption !== null) {
      el.intervalsCaption.textContent = active?.tier.name ?? "";
    }
    if (el.tierSelect !== null && el.tierSelect.options.length > 0) {
      el.tierSelect.value = String(state.activeTier);
    }
    if (el.tierNameInput !== null) {
      el.tierNameInput.value = doc.tiers[state.activeTier]?.name ?? "";
    }
    if (el.tierRemoveButton !== null) {
      el.tierRemoveButton.disabled = doc.tiers.length <= 1;
    }
    if (el.splitButton !== null) {
      el.splitButton.disabled = active === null || state.audio === null;
    }
  };

  const renderIntervals = (): void => {
    const active = activeSheetOf(state);

    syncTierHeader(active);

    el.intervalsBody.replaceChildren();

    if (active !== null) {
      const last = active.tier.items.length - 1;
      active.tier.items.forEach((interval, index) => {
        el.intervalsBody.append(buildIntervalRow(active, interval, index, index === last));
      });
    }

    deps.updateCursor();
    deps.updateHistory();
  };

  const renderTierSelect = (): void => {
    const { tierSelect } = el;
    if (tierSelect === null) {
      return;
    }
    tierSelect.replaceChildren();
    currentDocument(state).tiers.forEach((tier, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = tier.name;
      tierSelect.append(option);
    });
    tierSelect.value = String(state.activeTier);
  };

  return { renderIntervals, renderTierSelect };
};
