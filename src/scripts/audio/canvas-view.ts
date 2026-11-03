/* ============================================================
   LinguaLab — que se redibuja del visor y cuando

   Las funciones de `./render.ts` saben pintar; este modulo sabe QUE pintar con
   el estado actual: la onda con el cursor y la seleccion, el espectrograma con
   los formantes encima, las capas, la lectura del cursor y el estado de los
   botones que dependen del historial y de la reproduccion.
   ============================================================ */

import { canRedoAnnotation, canUndoAnnotation } from "@lingualab/core";
import type { AcousticPanels } from "./acoustic-analysis";
import { drawSpectrogram, drawTierStrips, drawWaveform } from "./render";
import { formatSeconds } from "./strings";
import { playLabel } from "./viewer-rules";
import { currentDocument, loopRegionOf, type ViewerContext } from "./viewer-state";

export interface CanvasView {
  /** Onda, espectrograma (con formantes) y capas. No hace nada sin audio. */
  renderCanvas(): void;
  /** Solo las capas: basta cuando cambia el texto de un intervalo. */
  renderTiers(): void;
  updateCursor(): void;
  updateHistory(): void;
  updateTransport(): void;
}

export interface CanvasViewDeps {
  /** Los paneles acusticos, que se montan despues que el dibujo. */
  readonly acoustic: () => AcousticPanels | null;
  readonly isPlaying: () => boolean;
}

export const createCanvasView = (ctx: ViewerContext, deps: CanvasViewDeps): CanvasView => {
  const { el, state } = ctx;

  const renderCanvas = (): void => {
    const audio = state.audio;
    if (audio === null) {
      return;
    }
    if (el.waveCanvas !== null) {
      drawWaveform(el.waveCanvas, {
        peaks: audio.peaks,
        view: state.view,
        duration: audio.duration,
        palette: state.palette,
        cursor: state.cursor,
        selection: loopRegionOf(state),
      });
    }
    if (el.specCanvas !== null) {
      const spectrogram = state.spectrogram;
      if (spectrogram !== null && el.spectrogramToggle?.checked !== false) {
        el.specCanvas.hidden = false;
        drawSpectrogram(el.specCanvas, { spectrogram, view: state.view, palette: state.palette });
        // Los formantes se dibujan ENCIMA del espectrograma ya pintado: es la
        // unica forma de leer el formante contra su banda oscura.
        deps
          .acoustic()
          ?.drawOverlay(el.specCanvas, state.view, spectrogram.minHz, spectrogram.maxHz);
      } else {
        el.specCanvas.hidden = true;
      }
    }
    renderTiers();
  };

  const renderTiers = (): void => {
    if (el.tiersCanvas !== null) {
      drawTierStrips(el.tiersCanvas, {
        document: currentDocument(state),
        view: state.view,
        activeTier: state.activeTier,
        palette: state.palette,
      });
    }
  };

  const updateCursor = (): void => {
    if (el.cursorInput !== null) {
      el.cursorInput.value = String(state.cursor);
    }
    if (el.cursorReadout !== null) {
      el.cursorReadout.textContent = formatSeconds(state.cursor);
    }
  };

  const updateHistory = (): void => {
    if (el.undoButton !== null) {
      el.undoButton.disabled = !canUndoAnnotation(state.history);
    }
    if (el.redoButton !== null) {
      el.redoButton.disabled = !canRedoAnnotation(state.history);
    }
  };

  const updateTransport = (): void => {
    const playing = deps.isPlaying();
    if (el.playButton !== null) {
      el.playButton.setAttribute("aria-pressed", playing ? "true" : "false");
      el.playButton.textContent = playLabel(playing, ctx.es);
    }
    if (el.stopButton !== null) {
      el.stopButton.disabled = state.audio === null;
    }
  };

  return { renderCanvas, renderTiers, updateCursor, updateHistory, updateTransport };
};
