/* ============================================================
   LinguaLab — controlador del visor de audio, espectrograma y TextGrid

   Une las piezas: el codec y la edicion viven en `@lingualab/core`, el
   decodificador, el almacenamiento, el dibujo y la reproduccion en este
   directorio, y aqui solo se decide QUE se muestra y cuando.

   Todo el audio se queda en el navegador: no hay `fetch`, ni `FormData`, ni
   ningun destino remoto. La unica salida son los archivos que la persona
   descarga.

   LO EXPERIMENTAL ESTA MARCADO, NO DISIMULADO
   El espectrograma y el TextGrid estan probados en lo que se puede probar de
   forma determinista —la FFT contra una sinusoide, el codec contra archivos de
   referencia y contra la ida y vuelta—, pero que Praat abra el archivo exportado
   no se puede medir desde aqui. La pagina lo dice en voz alta y `docs/PENDING.md`
   guarda el sintoma y el proximo paso.

   COMO ESTA REPARTIDO
   Este archivo solo arma el visor: crea el estado compartido, construye cada
   modulo con lo que necesita y decide el orden de arranque. Cada modulo recibe
   las funciones de los otros como dependencias explicitas; donde dos se
   necesitan mutuamente (la tabla edita el documento y editar el documento
   rehace la tabla) la dependencia se pasa como funcion que se resuelve al
   llamarla, no al construir.

   - `viewer-state.ts`: estado mutable y consultas de seleccion.
   - `canvas-view.ts`: que se redibuja y el estado de los botones.
   - `transport.ts`: contexto de audio, decodificador y reproduccion.
   - `interval-table.ts`: la tabla de intervalos y el selector de capa.
   - `annotation-commands.ts`: ediciones del documento, capas e historial.
   - `persistence.ts`: autoguardado, restauracion y proyectos guardados.
   - `audio-loading.ts`: carga del audio y espectrograma.
   - `textgrid-io.ts`: importacion, huecos y exportacion.
   - `acoustic-tracks.ts`: analisis por magnitud y por tramo, compartidos.
   - `acoustic-overlay.ts`: tono, formantes e intensidad sobre el espectrograma.
   - `acoustic-analysis.ts`: parametros del analisis y medicion de la seleccion.
   - `viewer-controls.ts`, `shortcuts.ts`, `ipa-panel.ts`: entradas de la persona.
   ============================================================ */

import { createEmptyDocument, intervalTiers, startAnnotationHistory } from "@lingualab/core";
import { lingualab } from "../../composition-root";
import { type AcousticPanels, initAcousticPanels } from "./acoustic-analysis";
import { type AcousticOverlay, createAcousticOverlay } from "./acoustic-overlay";
import { type AcousticTracks, createAcousticTracks } from "./acoustic-tracks";
import { createAcousticStrings, parseAcousticStrings } from "./acoustic-strings";
import { createAnnotationCommands } from "./annotation-commands";
import { createAudioLoading } from "./audio-loading";
import { createCanvasView } from "./canvas-view";
import { queryAudioLabElements, requireAudioLabElements } from "./elements";
import { createIntervalTable } from "./interval-table";
import { listenForIpaSymbols } from "./ipa-panel";
import { createProjectPersistence } from "./persistence";
import { readPalette } from "./render";
import { listenForShortcuts, type ShortcutCommand } from "./shortcuts";
import { createAudioStrings, parseAudioStrings } from "./strings";
import { createTextGridIo } from "./textgrid-io";
import { listenToTierPointer } from "./tier-pointer";
import { annotationCounts, createExample } from "./example";
import { createTransport } from "./transport";
import { listenToViewerControls } from "./viewer-controls";
import {
  activeIntervalIndexOf,
  activeSheetOf,
  createViewerContext,
  draggedSelectionOf,
  createViewerState,
  currentDocument,
  selectionOf,
  type ViewerContext,
} from "./viewer-state";

export { mountIpaKeyboard } from "./ipa-panel";

/**
 * Paneles de analisis acustico (segmento 8).
 *
 * El adaptador llega desde el composition root, que es el unico lugar de la
 * interfaz que puede construir uno; aqui solo se le pasa el audio cargado y el
 * intervalo activo. Se montan una sola vez y sobreviven a los cambios de
 * archivo: `reset` descarta lo que ya no corresponde al audio nuevo.
 */
const mountAcoustic = (
  ctx: ViewerContext,
  tracks: AcousticTracks,
  renderCanvas: () => void,
): AcousticPanels | null => {
  const { el, state } = ctx;
  const acousticRoot = el.acousticRoot;
  if (acousticRoot === null) {
    return null;
  }
  return initAcousticPanels({
    root: acousticRoot,
    tracks,
    strings: createAcousticStrings(parseAcousticStrings(acousticRoot.dataset.acousticStrings)),
    es: ctx.es,
    getAudio: () => acousticAudioOf(ctx),
    // La seleccion es la del visor: el tramo arrastrado, si lo hay (sin
    // etiqueta: la fila se nombra por su rango), o el intervalo donde esta el
    // cursor. Es lo que se resalta en la onda, asi que medir «la seleccion» no
    // puede significar otra cosa.
    getSelection: () => {
      const region = selectionOf(state);
      if (region !== null && draggedSelectionOf(state) !== null) {
        return { start: region.start, end: region.end, label: "" };
      }
      const active = activeSheetOf(state);
      const interval = active?.tier.items[activeIntervalIndexOf(state)];
      if (active === null || interval === undefined) {
        return null;
      }
      return { start: interval.start, end: interval.end, label: interval.text };
    },
    palette: () => state.palette,
    onParamsChange: () => renderCanvas(),
  });
};

/** El audio cargado, en la forma que piden los analisis. */
const acousticAudioOf = (ctx: ViewerContext) => {
  const audio = ctx.state.audio;
  return audio === null
    ? null
    : { samples: audio.samples, sampleRate: audio.sampleRate, duration: audio.duration };
};

/**
 * Curvas sobre el espectrograma (unidad 5.3). Comparten los analisis con el
 * panel acustico y toman de el los parametros; sin panel, los de Praat.
 */
const mountOverlay = (
  ctx: ViewerContext,
  tracks: AcousticTracks,
  panels: AcousticPanels | null,
  renderCanvas: () => void,
): AcousticOverlay => {
  const { el } = ctx;
  return createAcousticOverlay({
    tracks,
    strings: ctx.strings,
    getAudio: () => acousticAudioOf(ctx),
    params: () => panels?.params() ?? { floor: 75, ceiling: 600, maxFormantHz: 5500 },
    palette: () => ctx.state.palette,
    toggles: {
      pitch: el.overlayPitchToggle,
      formants: el.overlayFormantsToggle,
      intensity: el.overlayIntensityToggle,
    },
    status: el.overlayStatus,
    onChange: renderCanvas,
  });
};

export const initAudioLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-audiolab]");
  if (root === null) {
    return;
  }

  const el = requireAudioLabElements(queryAudioLabElements(root));
  if (el === null) {
    return;
  }

  const ctx = createViewerContext({
    root,
    el,
    strings: createAudioStrings(parseAudioStrings(root.dataset.audiolabStrings)),
    es: document.documentElement.lang !== "en",
    state: createViewerState(readPalette(root)),
  });
  const { state } = ctx;

  /* ------------------------------ modulos ----------------------------- */

  const canvas = createCanvasView(ctx, {
    overlay: () => overlay,
    isPlaying: () => transport.isPlaying(),
  });
  const tracks = createAcousticTracks(lingualab.acoustic);
  const acoustic = mountAcoustic(ctx, tracks, canvas.renderCanvas);
  const overlay = mountOverlay(ctx, tracks, acoustic, canvas.renderCanvas);
  const transport = createTransport(ctx, {
    ...canvas,
    updateTransport: () => {
      canvas.updateTransport();
      if (transport.isPlaying()) {
        example.notify("played");
      }
    },
  });
  const persistence = createProjectPersistence(ctx);

  const commands = createAnnotationCommands(ctx, {
    renderIntervals: () => table.renderIntervals(),
    renderTierSelect: () => table.renderTierSelect(),
    renderTiers: canvas.renderTiers,
    renderCanvas: canvas.renderCanvas,
    renderAll: () => renderAll(),
    updateCursor: canvas.updateCursor,
    updateHistory: canvas.updateHistory,
    scheduleAutosave: persistence.scheduleAutosave,
    onChange: (previous, next) => {
      const before = annotationCounts(previous);
      const after = annotationCounts(next);
      if (after.intervals > before.intervals) {
        example.notify("boundary-added");
      }
      if (after.labels > before.labels) {
        example.notify("label-written");
      }
    },
  });

  const table = createIntervalTable(ctx, {
    applyDocument: commands.applyDocument,
    renderCanvas: canvas.renderCanvas,
    updateCursor: canvas.updateCursor,
    updateHistory: canvas.updateHistory,
    play: transport.play,
  });

  const renderAll = (): void => {
    table.renderTierSelect();
    table.renderIntervals();
    canvas.renderCanvas();
    canvas.updateTransport();
    canvas.updateHistory();
  };

  const loading = createAudioLoading(ctx, {
    decoder: transport.decoder,
    setBuffer: transport.setBuffer,
    acoustic: {
      reset: () => {
        // Un audio nuevo no hereda la seleccion ni los zooms del anterior.
        state.selection = null;
        state.viewHistory = [];
        tracks.reset();
        overlay.reset();
        acoustic?.reset();
      },
    },
    renderCanvas: canvas.renderCanvas,
    renderAll,
    updatePersistence: persistence.updatePersistence,
    saveNow: persistence.saveNow,
  });

  const textGrid = createTextGridIo(ctx, {
    applyDocument: commands.applyDocument,
    renderAll,
    renderCanvas: canvas.renderCanvas,
    saveNow: persistence.saveNow,
  });

  /* ---------------------------- entradas ------------------------------ */

  const view = listenToViewerControls(ctx, {
    transport,
    loadAudioFile: loading.loadAudioFile,
    importTextGrid: textGrid.importTextGrid,
    recomputeSpectrogram: loading.recomputeSpectrogram,
    renderCanvas: canvas.renderCanvas,
    renderIntervals: table.renderIntervals,
    updateCursor: canvas.updateCursor,
  });

  listenForIpaSymbols(el.ipaContainer, () => state.lastTextInput);

  const shortcuts: Readonly<Record<ShortcutCommand, () => void>> = {
    "toggle-play": transport.togglePlay,
    stop: transport.stop,
    split: commands.splitAtCursor,
    previous: () => commands.moveCursorToInterval(-1),
    next: () => commands.moveCursorToInterval(1),
    undo: commands.undo,
    redo: commands.redo,
    "add-boundary": commands.splitAtCursor,
    "remove-boundary": commands.removeSelectedBoundary,
    "play-interval": () => transport.toggleRegion(selectionOf(state)),
    "zoom-all": view.zoomAll,
    "zoom-in": view.zoomIn,
    "zoom-out": view.zoomOut,
    "zoom-selection": view.zoomSelection,
    "extend-selection-left": () => view.extendSelection(-1),
    "extend-selection-right": () => view.extendSelection(1),
  };
  listenForShortcuts((command) => shortcuts[command](), el.canvasFrame);

  const example = createExample(ctx, {
    loadAudioFile: loading.loadAudioFile,
    importTextGrid: textGrid.importTextGrid,
  });
  el.exampleSolvedButton?.addEventListener("click", () => void example.loadSolved());
  el.examplePracticeButton?.addEventListener("click", () => void example.loadPractice());
  // Un audio elegido a mano termina la guia: ya no habla de «pato».
  el.audioInput.addEventListener("change", () => example.cancel());

  listenToTierPointer(ctx, {
    applyDocument: commands.applyDocument,
    renderCanvas: canvas.renderCanvas,
    renderTierSelect: () => table.renderTierSelect(),
  });

  el.labelInput?.addEventListener("input", () => {
    commands.setActiveText(el.labelInput?.value ?? "");
  });
  el.labelInput?.addEventListener("focus", () => {
    // El teclado AFI escribe en el ultimo campo de texto enfocado.
    state.lastTextInput = el.labelInput;
  });

  /* ------------------------------ arranque ---------------------------- */

  table.renderTierSelect();
  table.renderIntervals();
  persistence.updatePersistence();
  canvas.updateTransport();
  canvas.updateHistory();
  void persistence.refreshProjects();
  ctx.say(ctx.strings.text("audio.status.idle"), "idle");

  if (intervalTiers(currentDocument(state)).length === 0) {
    state.history = startAnnotationHistory(createEmptyDocument(0));
    table.renderIntervals();
  }

  void persistence.restoreSavedProject(renderAll);
};
