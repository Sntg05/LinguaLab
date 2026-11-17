/* ============================================================
   LinguaLab — controles de navegacion y reproduccion del visor

   Abrir un archivo (con el selector o soltandolo), mover el cursor, hacer zoom
   y desplazar la ventana, reproducir, ajustar el espectrograma y seguir el tema
   del sistema. Cada control solo cambia el estado y pide el redibujo que le
   toca; ninguno decide nada sobre el documento.
   ============================================================ */

import { readPalette } from "./render";
import {
  clamp,
  dragSelection,
  extendSelection,
  frequencyAtRatio,
  isDragGesture,
  selectionRegion,
} from "./selection";
import { format, formatSeconds } from "./strings";
import { isTextGridFileName } from "./textgrid-gaps";
import type { Transport } from "./transport";
import {
  clampWindow,
  panWindow,
  popView,
  pushView,
  timeAtRatio,
  zoomToRegion,
  zoomWindow,
  type ViewWindow,
} from "./view";
import { draggedSelectionOf, selectionOf, type ViewerContext } from "./viewer-state";

export interface ViewerControlsDeps {
  readonly transport: Transport;
  readonly loadAudioFile: (file: File) => Promise<void>;
  readonly importTextGrid: (file: File) => Promise<void>;
  readonly recomputeSpectrogram: () => void;
  readonly renderCanvas: () => void;
  readonly renderIntervals: () => void;
  readonly updateCursor: () => void;
}

/** Ordenes de zoom y de seleccion que tambien llegan por teclado (`shortcuts.ts`). */
export interface ViewerCommands {
  zoomAll(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomSelection(): void;
  zoomBack(): void;
  /** Mueve el extremo libre de la seleccion una centesima de la ventana visible. */
  extendSelection(direction: -1 | 1): void;
}

export const listenToViewerControls = (
  ctx: ViewerContext,
  deps: ViewerControlsDeps,
): ViewerCommands => {
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

  /**
   * Un zoom guarda la ventana de antes, para «Atras». Desplazar no la guarda:
   * en Praat «Zoom back» deshace zooms, no cada paso del desplazamiento.
   */
  const zoom = (next: (view: ViewWindow, duration: number) => ViewWindow): void => {
    if (state.audio === null) {
      return;
    }
    const before = state.view;
    setView(next);
    if (state.view.start !== before.start || state.view.end !== before.end) {
      state.viewHistory = pushView(state.viewHistory, before);
    }
  };

  const commands: ViewerCommands = {
    zoomAll: () => zoom((_view, duration) => clampWindow({ start: 0, end: duration }, duration)),
    zoomIn: () => zoom((view, duration) => zoomWindow(view, duration, 2, 0.5)),
    zoomOut: () => zoom((view, duration) => zoomWindow(view, duration, 0.5, 0.5)),
    zoomSelection: () => zoom((view, duration) => zoomToRegion(view, duration, selectionOf(state))),
    zoomBack: () => {
      const previous = popView(state.viewHistory);
      if (previous.view === null || state.audio === null) {
        return;
      }
      state.viewHistory = previous.history;
      state.view = clampWindow(previous.view, state.audio.duration);
      deps.renderCanvas();
    },
    extendSelection: (direction) => {
      const audio = state.audio;
      if (audio === null) {
        return;
      }
      const step = Math.max((state.view.end - state.view.start) / 100, 0.001);
      const next = extendSelection(
        draggedSelectionOf(state),
        state.cursor,
        direction * step,
        audio.duration,
      );
      state.selection = next;
      state.cursor = selectionRegion(next)?.start ?? next.anchor;
      cursorMoved();
    },
  };

  /* ------------- arrastre para seleccionar sobre la onda y el espectrograma ------------- */

  /** Instante bajo el puntero, medido sobre el lienzo que lo recibe. */
  const timeOn = (canvas: HTMLCanvasElement, clientX: number): number => {
    const rect = canvas.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return timeAtRatio(state.view, ratio);
  };

  /**
   * Lectura del puntero: tiempo y, sobre el espectrograma, la frecuencia a su
   * altura (la «frequency cursor» de Praat). No es una region viva: cambia con
   * cada movimiento del raton y anunciarla taparia todo lo demas.
   */
  const showPointer = (canvas: HTMLCanvasElement, event: PointerEvent): void => {
    const readout = el.pointerReadout;
    if (readout === null || state.audio === null) {
      return;
    }
    const time = formatSeconds(timeOn(canvas, event.clientX));
    const spectrogram = state.spectrogram;
    if (canvas === el.specCanvas && spectrogram !== null) {
      const rect = canvas.getBoundingClientRect();
      const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
      const hz = frequencyAtRatio(ratio, spectrogram.minHz, spectrogram.maxHz);
      readout.textContent = format(ctx.strings.text("audio.readout.pointerHz"), {
        time,
        hz: Math.round(hz),
      });
      return;
    }
    readout.textContent = format(ctx.strings.text("audio.readout.pointer"), { time });
  };

  let drag: { readonly canvas: HTMLCanvasElement; readonly x: number; readonly time: number } | null =
    null;

  for (const canvas of [el.waveCanvas, el.specCanvas]) {
    if (canvas === null) {
      continue;
    }
    canvas.addEventListener("pointerdown", (event) => {
      if (state.audio === null || event.button !== 0) {
        return;
      }
      // El cursor lo pone el oyente del marco, que recibe este mismo evento
      // despues; aqui solo se recuerda de donde parte un posible arrastre.
      drag = { canvas, x: event.clientX, time: timeOn(canvas, event.clientX) };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      showPointer(canvas, event);
      const audio = state.audio;
      if (drag === null || drag.canvas !== canvas || audio === null) {
        return;
      }
      if (!isDragGesture(drag.x, event.clientX)) {
        return;
      }
      const next = dragSelection(drag.time, timeOn(canvas, event.clientX), audio.duration);
      state.selection = next;
      // El cursor va al inicio del tramo, como en Praat: es lo que mantiene
      // vigente la seleccion (`effectiveSelection`).
      state.cursor = selectionRegion(next)?.start ?? drag.time;
      cursorMoved();
    });
    const finish = (event: PointerEvent): void => {
      if (drag?.canvas !== canvas) {
        return;
      }
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("pointerleave", () => {
      if (drag === null && el.pointerReadout !== null) {
        el.pointerReadout.textContent = "";
      }
    });
  }

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
    // La posicion se mide sobre el lienzo que recibio el clic, no sobre el marco:
    // el marco tiene relleno, y medir sobre el daba un cursor corrido unos pixeles.
    const target = event.target instanceof HTMLCanvasElement ? event.target : null;
    if (target === null) {
      // La ventana de texto y la nota tambien estan en el marco: no mueven el cursor.
      return;
    }
    // Un clic suelta la seleccion arrastrada, como en Praat: en la onda deja un
    // cursor, y en una capa la seleccion pasa a ser el intervalo que se toco.
    state.selection = null;
    if (target !== el.tiersCanvas) {
      // Un clic en la onda o el espectrograma suelta la frontera seleccionada.
      state.selectedBoundary = null;
    }
    const rect = target.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    state.cursor = timeAtRatio(state.view, ratio);
    cursorMoved();
  });

  // Un lienzo no recibe el foco con un clic, y sin foco en el editor Intro, Supr
  // y Tab no llegan a los atajos de Praat: se le da al marco a mano. Va en
  // `click`, que llega despues de que el navegador resuelva el foco del
  // `mousedown`; en `pointerdown` el navegador lo volvia a quitar.
  el.canvasFrame?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLCanvasElement) {
      el.canvasFrame?.focus({ preventScroll: true });
    }
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

  el.zoomInButton?.addEventListener("click", commands.zoomIn);
  el.zoomOutButton?.addEventListener("click", commands.zoomOut);
  el.zoomAllButton?.addEventListener("click", commands.zoomAll);
  el.zoomSelectionButton?.addEventListener("click", commands.zoomSelection);
  el.zoomBackButton?.addEventListener("click", commands.zoomBack);

  // Las barras de reproduccion de Praat (visible, seleccion, total), como botones.
  el.playVisibleButton?.addEventListener("click", () => {
    transport.playRegion(state.view);
  });
  el.playSelectionButton?.addEventListener("click", () => {
    transport.playRegion(selectionOf(state));
  });
  el.playAllButton?.addEventListener("click", () => {
    const audio = state.audio;
    transport.playRegion(audio === null ? null : { start: 0, end: audio.duration });
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

  // Ni mostrar u ocultar ni cambiar la paleta recalculan nada: solo se repinta.
  for (const control of [el.spectrogramToggle, el.scaleSelect]) {
    control?.addEventListener("change", () => {
      deps.renderCanvas();
    });
  }

  const repaint = (): void => {
    state.palette = readPalette(root);
    deps.renderCanvas();
  };

  window.addEventListener("resize", repaint);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", repaint);

  return commands;
};
