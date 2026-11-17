/* ============================================================
   LinguaLab — estado compartido del visor de audio

   El visor tiene un solo estado mutable —el audio cargado, la ventana visible,
   el cursor, la capa activa y el historial del documento— y varios modulos que
   lo leen y lo cambian: el dibujo, la tabla de intervalos, la reproduccion, la
   importacion. En vez de que cada uno guarde su copia, todos reciben el mismo
   `ViewerContext`; asi el cursor que dibuja la onda es, por construccion, el
   que usa el bucle de reproduccion.

   Este archivo no toca el DOM salvo por escribir en los dos nodos de mensajes
   que recibe: el estado y sus consultas se prueban en Node.
   ============================================================ */

import {
  type AnnotationDocument,
  type AnnotationHistoryState,
  type AnnotationStorageError,
  createEmptyDocument,
  startAnnotationHistory,
} from "@lingualab/core";
import type { RequiredAudioLabElements } from "./elements";
import type { Palette } from "./render";
import {
  activeSheet,
  effectiveSelection,
  intervalIndexAt,
  loopRegionAt,
  type Region,
  type Sheet,
  selectionRegion,
  type TimeSelection,
} from "./selection";
import type { Spectrogram } from "./spectrogram";
import type { AudioStrings } from "./strings";
import type { PendingGap } from "./textgrid-gaps";
import type { Peak } from "./waveform";
import type { ViewWindow } from "./view";

/** Lo que el visor necesita del audio cargado. */
export interface LoadedAudio {
  readonly buffer: AudioBuffer;
  readonly duration: number;
  readonly sampleRate: number;
  readonly samples: Float32Array;
  readonly peaks: readonly Peak[];
  readonly name: string;
}

export interface ViewerState {
  audio: LoadedAudio | null;
  spectrogram: Spectrogram | null;
  view: ViewWindow;
  /** Ventanas anteriores a cada zoom: las recupera «Atras». */
  viewHistory: readonly ViewWindow[];
  cursor: number;
  /**
   * Tramo arrastrado sobre la onda o el espectrograma, o con Mayus+flechas. Vale
   * mientras el cursor siga en su inicio (ver `effectiveSelection`).
   */
  selection: TimeSelection | null;
  activeTier: number;
  /**
   * Frontera seleccionada en la capa activa, nombrada por el intervalo de su
   * izquierda, o `null`. Es la que quita Supr y la que se arrastra.
   */
  selectedBoundary: number | null;
  /** Documento con la frontera arrastrada, mientras dura el arrastre; si no, `null`. */
  dragPreview: AnnotationDocument | null;
  history: AnnotationHistoryState;
  palette: Palette;
  /** El ultimo campo de texto de intervalo con foco: ahi escribe el teclado IPA. */
  lastTextInput: HTMLInputElement | null;
  /**
   * Lo que devolvio `load` cuando lo guardado no se pudo entender.
   *
   * Mientras haya un fallo aqui, el autoguardado NO escribe: un registro que no
   * se pudo leer se pierde solo si la persona lo decide (exportando lo que
   * tenga, o borrandolo con el control de proyectos guardados).
   */
  recordFault: AnnotationStorageError | null;
  /** Huecos del ultimo TextGrid importado que la persona aun no relleno. */
  pendingGaps: readonly PendingGap[];
}

export const createViewerState = (palette: Palette): ViewerState => ({
  audio: null,
  spectrogram: null,
  view: { start: 0, end: 1 },
  viewHistory: [],
  cursor: 0,
  selection: null,
  activeTier: 0,
  selectedBoundary: null,
  dragPreview: null,
  history: startAnnotationHistory(createEmptyDocument(0)),
  palette,
  lastTextInput: null,
  recordFault: null,
  pendingGaps: [],
});

export const currentDocument = (state: ViewerState): AnnotationDocument => state.history.present;

/** La capa activa, si es de intervalos. */
export const activeSheetOf = (state: ViewerState): Sheet | null =>
  activeSheet(currentDocument(state), state.activeTier);

/** El intervalo de la capa activa donde esta el cursor, o -1. */
export const activeIntervalIndexOf = (state: ViewerState): number =>
  intervalIndexAt(activeSheetOf(state), state.cursor);

/** El intervalo bajo el cursor como tramo, sin contar lo arrastrado. */
export const loopRegionOf = (state: ViewerState): Region | null =>
  loopRegionAt(activeSheetOf(state), activeIntervalIndexOf(state));

/**
 * La seleccion del visor: lo que se resalta, lo que suena con Tab y en bucle, lo
 * que se mide y a lo que se hace zoom. Es el tramo arrastrado si sigue vigente;
 * si no, el intervalo bajo el cursor.
 */
export const selectionOf = (state: ViewerState): Region | null =>
  effectiveSelection(state.selection, state.cursor, loopRegionOf(state));

/** El arrastre guardado, solo si sigue vigente; si no, `null`. */
export const draggedSelectionOf = (state: ViewerState): TimeSelection | null => {
  const dragged = selectionRegion(state.selection);
  return dragged !== null && Math.abs(state.cursor - dragged.start) <= 1e-9
    ? state.selection
    : null;
};

export type StatusState = "idle" | "busy" | "ok" | "error";

/** Lo que comparten todos los modulos del visor. */
export interface ViewerContext {
  readonly root: HTMLElement;
  readonly el: RequiredAudioLabElements;
  readonly strings: AudioStrings;
  readonly es: boolean;
  readonly state: ViewerState;
  /** Linea de estado del visor: carga, errores, importaciones. */
  say(message: string, state: StatusState): void;
  /** Nota del panel de datos: guardado, restauracion, exportacion. */
  announce(message: string): void;
}

export const createViewerContext = (
  base: Omit<ViewerContext, "say" | "announce">,
): ViewerContext => ({
  ...base,
  say: (message, state) => {
    base.el.status.textContent = message;
    base.el.status.dataset.state = state;
  },
  announce: (message) => {
    if (base.el.saveNote !== null) {
      base.el.saveNote.textContent = message;
    }
  },
});
