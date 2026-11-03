/* ============================================================
   LinguaLab — controles de navegacion y reproduccion del visor

   Abrir un archivo (con el selector o soltandolo), mover el cursor, hacer zoom
   y desplazar la ventana, reproducir, ajustar el espectrograma y seguir el tema
   del sistema. Cada control solo cambia el estado y pide el redibujo que le
   toca; ninguno decide nada sobre el documento.
   ============================================================ */

import { readPalette } from "./render";
import { clamp } from "./selection";
import { isTextGridFileName } from "./textgrid-gaps";
import type { Transport } from "./transport";
import { panWindow, timeAtRatio, zoomWindow, type ViewWindow } from "./view";
import type { ViewerContext } from "./viewer-state";

export interface ViewerControlsDeps {
  readonly transport: Transport;
  readonly loadAudioFile: (file: File) => Promise<void>;
  readonly importTextGrid: (file: File) => Promise<void>;
  readonly recomputeSpectrogram: () => void;
  readonly renderCanvas: () => void;
  readonly renderIntervals: () => void;
  readonly updateCursor: () => void;
}

export const listenToViewerControls = (ctx: ViewerContext, deps: ViewerControlsDeps): void => {
  const { root, el, state } = ctx;
  const { transport } = deps;

  /** El cursor cambio a mano: lectura, canvas y la fila activa de la tabla. */
  const cursorMoved = (): void => {
    deps.updateCursor();
    deps.renderCanvas();
    deps.renderIntervals();
  };

  /** Cambia la ventana visible y redibuja. */
  const setView = (next: (view: ViewWindow, duration: number) => ViewWindow): void => {
    state.view = next(state.view, state.audio?.duration ?? state.view.end);
    deps.renderCanvas();
  };

  el.audioInput.addEventListener("change", () => {
    const file = el.audioInput.files?.[0];
    if (file !== undefined) {
      void deps.loadAudioFile(file);
    }
  });

  el.canvasFrame?.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  el.canvasFrame?.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file === undefined) {
      return;
    }
    if (isTextGridFileName(file.name)) {
      void deps.importTextGrid(file);
      return;
    }
    void deps.loadAudioFile(file);
  });

  el.canvasFrame?.addEventListener("pointerdown", (event) => {
    if (state.audio === null) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    state.cursor = timeAtRatio(state.view, ratio);
    cursorMoved();
  });

  el.playButton?.addEventListener("click", () => {
    transport.togglePlay();
  });

  el.stopButton?.addEventListener("click", () => {
    transport.stop();
    deps.renderCanvas();
  });

  el.rateInput?.addEventListener("change", () => {
    if (transport.isPlaying()) {
      // Cambiar la velocidad en caliente exige reiniciar la fuente: Web Audio no
      // permite cambiar `playbackRate` de forma fiable con el nodo ya sonando en
      // todos los navegadores objetivo.
      transport.play(state.cursor);
    }
  });

  el.loopInput?.addEventListener("change", () => {
    deps.renderCanvas();
  });

  el.cursorInput?.addEventListener("input", () => {
    state.cursor = clamp(Number(el.cursorInput?.value), 0, state.audio?.duration ?? 0);
    cursorMoved();
  });

  el.zoomInButton?.addEventListener("click", () => {
    setView((view, duration) => zoomWindow(view, duration, 2, 0.5));
  });

  el.zoomOutButton?.addEventListener("click", () => {
    setView((view, duration) => zoomWindow(view, duration, 0.5, 0.5));
  });

  el.panLeftButton?.addEventListener("click", () => {
    setView((view, duration) => panWindow(view, duration, -(view.end - view.start) / 3));
  });

  el.panRightButton?.addEventListener("click", () => {
    setView((view, duration) => panWindow(view, duration, (view.end - view.start) / 3));
  });

  for (const control of [el.windowSelect, el.minHzInput, el.maxHzInput]) {
    control?.addEventListener("change", () => {
      deps.recomputeSpectrogram();
    });
  }

  el.spectrogramToggle?.addEventListener("change", () => {
    deps.renderCanvas();
  });

  const repaint = (): void => {
    state.palette = readPalette(root);
    deps.renderCanvas();
  };

  window.addEventListener("resize", repaint);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", repaint);
};
