/* ============================================================
   LinguaLab — importar y exportar anotaciones del visor

   La entrada es un TextGrid de Praat; la salida, un TextGrid o un CSV que la
   persona descarga. No hay otro destino: sin servidor, exportar es la copia de
   seguridad. Un TextGrid importado con huecos no se exporta hasta que la
   persona decide rellenarlos: el visor avisa, pero no rellena por su cuenta.
   ============================================================ */

import {
  exportAnnotationCsv,
  isTextGridTooLarge,
  MAX_TEXTGRID_BYTES,
  parseTextGridBytes,
  serializeTextGrid,
  startAnnotationHistory,
  type AnnotationDocument,
} from "@lingualab/core";
import { downloadText, readFileBytes, toFileName } from "./files";
import { formatBytes } from "./limits";
import { format } from "./strings";
import { describeGapList, fillDocumentGaps } from "./textgrid-gaps";
import { DEFAULT_PROJECT } from "./viewer-rules";
import { currentDocument, type ViewerContext } from "./viewer-state";

export interface TextGridIo {
  importTextGrid(file: File): Promise<void>;
}

export interface TextGridIoDeps {
  readonly applyDocument: (next: AnnotationDocument, rebuild?: boolean) => void;
  readonly renderAll: () => void;
  readonly renderCanvas: () => void;
  readonly saveNow: () => Promise<void>;
}

export const createTextGridIo = (ctx: ViewerContext, deps: TextGridIoDeps): TextGridIo => {
  const { el, state, strings, say, announce } = ctx;

  const showGaps = (): void => {
    if (el.gapsPanel === null) {
      return;
    }
    if (state.pendingGaps.length === 0) {
      el.gapsPanel.hidden = true;
      return;
    }
    el.gapsPanel.hidden = false;
    if (el.gapsText !== null) {
      el.gapsText.textContent = format(strings.text("audio.gaps.detected"), {
        count: state.pendingGaps.length,
        list: describeGapList(state.pendingGaps),
      });
    }
  };

  const importTextGrid = async (file: File): Promise<void> => {
    // 1 MB es holgado para un TextGrid real y corta el archivo que congela la
    // pestaña al analizarlo. Se mira `file.size` y no el resultado de leer: el
    // punto es no leerlo entero.
    if (isTextGridTooLarge(file.size)) {
      say(
        format(strings.text("audio.error.tooLarge"), {
          size: formatBytes(file.size),
          limit: formatBytes(MAX_TEXTGRID_BYTES),
        }),
        "error",
      );
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = await readFileBytes(file);
    } catch {
      say(strings.text("audio.error.read"), "error");
      return;
    }
    const parsed = parseTextGridBytes(bytes);
    if (!parsed.ok) {
      say(
        format(strings.text("audio.error.textgrid"), { code: parsed.error.code }),
        "error",
      );
      return;
    }

    state.history = startAnnotationHistory(parsed.value.document);
    state.pendingGaps = parsed.value.gaps;
    state.activeTier = 0;
    state.view = { start: parsed.value.document.xmin, end: parsed.value.document.xmax };
    if (el.cursorInput !== null) {
      el.cursorInput.max = String(state.view.end.toFixed(3));
    }
    deps.renderAll();
    showGaps();
    say(
      format(strings.text("audio.status.imported"), {
        count: currentDocument(state).tiers.length,
      }),
      "ok",
    );
    void deps.saveNow();
  };

  const fillPendingGaps = (): void => {
    const doc = fillDocumentGaps(currentDocument(state), state.pendingGaps);
    state.pendingGaps = [];
    showGaps();
    deps.applyDocument(doc);
    deps.renderCanvas();
    say(strings.text("audio.gaps.filled"), "ok");
  };

  el.exportTextGridButton?.addEventListener("click", () => {
    if (state.pendingGaps.length > 0) {
      showGaps();
      say(el.gapsText?.textContent ?? strings.text("audio.gaps.detected"), "error");
      return;
    }
    const name = toFileName(el.projectInput?.value ?? DEFAULT_PROJECT, "TextGrid");
    downloadText(name, serializeTextGrid(currentDocument(state)), "text/plain");
    announce(name);
  });

  el.exportCsvButton?.addEventListener("click", () => {
    const name = toFileName(el.projectInput?.value ?? DEFAULT_PROJECT, "csv");
    downloadText(name, exportAnnotationCsv(currentDocument(state)), "text/csv");
    announce(name);
  });

  el.textGridInput?.addEventListener("change", () => {
    const file = el.textGridInput?.files?.[0];
    if (file !== undefined) {
      void importTextGrid(file);
    }
  });

  el.gapsFillButton?.addEventListener("click", () => {
    fillPendingGaps();
  });

  return { importTextGrid };
};
