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
   ============================================================ */

import {
  type AnnotationDocument,
  type AnnotationHistoryState,
  type AnnotationStorageError,
  type Interval,
  type IntervalTier,
  addTier,
  canRedoAnnotation,
  canUndoAnnotation,
  createEmptyDocument,
  createLoadAnnotationProject,
  createSaveAnnotationProject,
  exportAnnotationCsv,
  fillTierGaps,
  intervalTiers,
  isIntervalTier,
  isTextGridTooLarge,
  MAX_TEXTGRID_BYTES,
  mergeIntervalWithNext,
  moveTier,
  moveTierBoundary,
  parseTextGridBytes,
  recordAnnotation,
  removeTier,
  renameTier,
  redoAnnotation,
  serializeTextGrid,
  setIntervalText,
  splitIntervalAt,
  startAnnotationHistory,
  undoAnnotation,
} from "@lingualab/core";
import {
  createIndexedDbAnnotationStorage,
  type AnnotationPersistenceReason,
} from "./annotation-storage";
import { downloadText, readFileBytes, toFileName } from "./files";
import { formatBytes, isOverLimit, MAX_AUDIO_BYTES } from "./limits";
import { IPA_GROUPS, insertSymbol } from "./ipa-keyboard";
import { createPlayback, type Playback } from "./playback";
import {
  drawSpectrogram,
  drawTierStrips,
  drawWaveform,
  readPalette,
  type Palette,
} from "./render";
import { spectrogramColumns, type Spectrogram } from "./spectrogram";
import {
  createAudioStrings,
  format,
  formatSeconds,
  parseAudioStrings,
  type AudioStrings,
} from "./strings";
import { computePeaks, type Peak } from "./waveform";
import { panWindow, timeAtRatio, zoomWindow, type ViewWindow } from "./view";
import { createWebAudioDecoder } from "./web-audio-decoder";

/** Capa activa con su indice real en el documento. */
interface Sheet {
  readonly index: number;
  readonly tier: IntervalTier;
}

/** Lo que el visor necesita del audio cargado. */
interface LoadedAudio {
  readonly buffer: AudioBuffer;
  readonly duration: number;
  readonly sampleRate: number;
  readonly samples: Float32Array;
  readonly peaks: readonly Peak[];
  readonly name: string;
}

const DEFAULT_WINDOW_SECONDS = 0.025;
const DEFAULT_MAX_HZ = 5500;
const WAVEFORM_BUCKETS = 1600;
const SPECTROGRAM_MAX_COLUMNS = 480;
const AUTOSAVE_DELAY_MS = 700;
const DEFAULT_PROJECT = "visor";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/* El tope del audio, el formateo de tamanos y la decision viven en `./limits.ts`,
   con su prueba al lado: este archivo necesita DOM y no tiene prueba unitaria.
   Ver **P19** de `docs/PENDING.md`. */

/**
 * Por que se degrada el guardado, en el idioma de la pagina.
 *
 * Es una tabla y no una cadena de ternarios: la version anidada tenia tres
 * niveles y una de las ramas quedaba a dos pantallas de su condicion.
 */
const describeReason = (reason: AnnotationPersistenceReason | undefined): string => {
  if (reason === "quota-exceeded") {
    return document.documentElement.lang === "en"
      ? "The browser ran out of space."
      : "Se agoto el espacio del navegador.";
  }
  if (reason === "open-failed") {
    return document.documentElement.lang === "en"
      ? "IndexedDB could not be opened: private mode or browser policy."
      : "IndexedDB no se pudo abrir: modo privado o politica del navegador.";
  }
  return document.documentElement.lang === "en"
    ? "This browser does not offer IndexedDB."
    : "Este navegador no ofrece IndexedDB.";
};

/** Texto del boton de reproduccion: un boton dice lo que va a pasar al pulsarlo. */
const playLabel = (playing: boolean, es: boolean): string => {
  if (playing) {
    return es ? "Pausar" : "Pause";
  }
  return es ? "Reproducir" : "Play";
};

export const initAudioLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-audiolab]");
  if (root === null) {
    return;
  }

  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);

  const strings: AudioStrings = createAudioStrings(
    parseAudioStrings(root.dataset.audiolabStrings),
  );
  const es = document.documentElement.lang !== "en";

  const audioInput = $<HTMLInputElement>("[data-audio-file]");
  const status = $<HTMLElement>("[data-audio-status]");
  const playButton = $<HTMLButtonElement>("[data-audio-play]");
  const stopButton = $<HTMLButtonElement>("[data-audio-stop]");
  const rateInput = $<HTMLInputElement>("[data-audio-rate]");
  const loopInput = $<HTMLInputElement>("[data-audio-loop]");
  const cursorInput = $<HTMLInputElement>("[data-audio-cursor]");
  const cursorReadout = $<HTMLOutputElement>("[data-audio-cursor-readout]");
  const zoomInButton = $<HTMLButtonElement>("[data-audio-zoom-in]");
  const zoomOutButton = $<HTMLButtonElement>("[data-audio-zoom-out]");
  const panLeftButton = $<HTMLButtonElement>("[data-audio-pan-left]");
  const panRightButton = $<HTMLButtonElement>("[data-audio-pan-right]");
  const windowSelect = $<HTMLSelectElement>("[data-audio-window]");
  const minHzInput = $<HTMLInputElement>("[data-audio-fmin]");
  const maxHzInput = $<HTMLInputElement>("[data-audio-fmax]");
  const spectrogramToggle = $<HTMLInputElement>("[data-audio-spectrogram]");
  const waveCanvas = $<HTMLCanvasElement>("[data-audio-wave]");
  const specCanvas = $<HTMLCanvasElement>("[data-audio-spec]");
  const tiersCanvas = $<HTMLCanvasElement>("[data-audio-tiers]");
  const canvasFrame = $<HTMLElement>("[data-audio-canvas]");
  const tierSelect = $<HTMLSelectElement>("[data-audio-tier]");
  const tierNameInput = $<HTMLInputElement>("[data-audio-tier-name]");
  const tierAddButton = $<HTMLButtonElement>("[data-audio-tier-add]");
  const tierRemoveButton = $<HTMLButtonElement>("[data-audio-tier-remove]");
  const tierUpButton = $<HTMLButtonElement>("[data-audio-tier-up]");
  const tierDownButton = $<HTMLButtonElement>("[data-audio-tier-down]");
  const intervalsBody = $<HTMLTableSectionElement>("[data-audio-intervals]");
  const intervalsCaption = $<HTMLElement>("[data-audio-intervals-caption]");
  const splitButton = $<HTMLButtonElement>("[data-audio-interval-split]");
  const prevButton = $<HTMLButtonElement>("[data-audio-interval-prev]");
  const nextButton = $<HTMLButtonElement>("[data-audio-interval-next]");
  const undoButton = $<HTMLButtonElement>("[data-audio-undo]");
  const redoButton = $<HTMLButtonElement>("[data-audio-redo]");
  const ipaContainer = $<HTMLElement>("[data-audio-ipa]");
  const projectInput = $<HTMLInputElement>("[data-audio-project]");
  const saveNote = $<HTMLElement>("[data-audio-save-note]");
  const persistenceNote = $<HTMLElement>("[data-audio-persistence]");
  const exportTextGridButton = $<HTMLButtonElement>("[data-audio-export-textgrid]");
  const exportCsvButton = $<HTMLButtonElement>("[data-audio-export-csv]");
  const textGridInput = $<HTMLInputElement>("[data-audio-textgrid-file]");
  const gapsPanel = $<HTMLElement>("[data-audio-gaps]");
  const gapsText = $<HTMLElement>("[data-audio-gaps-text]");
  const gapsFillButton = $<HTMLButtonElement>("[data-audio-gaps-fill]");
  const projectsCount = $<HTMLElement>("[data-audio-projects-count]");
  const projectsClearButton = $<HTMLButtonElement>("[data-audio-projects-clear]");
  const projectsConfirm = $<HTMLElement>("[data-audio-projects-confirm]");
  const projectsConfirmText = $<HTMLElement>("[data-audio-projects-confirm-text]");
  const projectsConfirmButton = $<HTMLButtonElement>("[data-audio-projects-clear-confirm]");
  const projectsCancelButton = $<HTMLButtonElement>("[data-audio-projects-cancel]");

  if (audioInput === null || status === null || intervalsBody === null) {
    return;
  }

  /* ------------------------------ estado ------------------------------ */

  let audio: LoadedAudio | null = null;
  let spectrogram: Spectrogram | null = null;
  let view: ViewWindow = { start: 0, end: 1 };
  let cursor = 0;
  let activeTier = 0;
  let history: AnnotationHistoryState = startAnnotationHistory(createEmptyDocument(0));
  let palette: Palette = readPalette(root);
  let lastTextInput: HTMLInputElement | null = null;
  let animation = 0;
  let autosaveTimer = 0;
  /**
   * Lo que devolvio `load` cuando lo guardado no se pudo entender.
   *
   * Mientras haya un fallo aqui, el autoguardado NO escribe: un registro que no
   * se pudo leer se pierde solo si la persona lo decide (exportando lo que
   * tenga, o borrandolo con el control de proyectos guardados).
   */
  let recordFault: AnnotationStorageError | null = null;

  const storage = createIndexedDbAnnotationStorage();
  const saveProject = createSaveAnnotationProject({
    storage,
    clock: { now: () => new Date() },
  });
  const loadProject = createLoadAnnotationProject({ storage });

  let audioContext: AudioContext | null = null;
  let playback: Playback | null = null;

  const context = (): AudioContext | null => {
    if (audioContext === null) {
      if (typeof AudioContext === "undefined") {
        return null;
      }
      audioContext = new AudioContext();
      playback = createPlayback(audioContext);
      playback.onEnded(() => {
        stopAnimation();
        updateTransport();
      });
    }
    return audioContext;
  };

  const decoder = createWebAudioDecoder(() => {
    const ctx = context();
    if (ctx === null) {
      throw new Error("Este navegador no ofrece Web Audio.");
    }
    return ctx;
  });

  /* ---------------------------- mensajes ------------------------------ */

  const say = (message: string, state: "idle" | "busy" | "ok" | "error"): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const announce = (message: string): void => {
    if (saveNote !== null) {
      saveNote.textContent = message;
    }
  };

  /* --------------------------- documento ------------------------------ */

  const current = (): AnnotationDocument => history.present;

  const activeIntervalTier = (): Sheet | null => {
    const tier = current().tiers[activeTier];
    return tier !== undefined && isIntervalTier(tier) ? { index: activeTier, tier } : null;
  };

  const activeIntervalIndex = (): number => {
    const active = activeIntervalTier();
    if (active === null) {
      return -1;
    }
    const at = active.tier.items.findIndex(
      (interval) => cursor >= interval.start - 1e-9 && cursor < interval.end,
    );
    if (at !== -1) {
      return at;
    }
    // El cursor puede caer justo al final del audio: pertenece al ultimo intervalo.
    return active.tier.items.length - 1;
  };

  const loopRegion = (): { start: number; end: number } | null => {
    const active = activeIntervalTier();
    const index = activeIntervalIndex();
    if (active === null || index < 0) {
      return null;
    }
    const interval = active.tier.items[index];
    if (interval === undefined || interval.end - interval.start <= 0) {
      return null;
    }
    return { start: interval.start, end: interval.end };
  };

  const scheduleAutosave = (): void => {
    if (projectInput === null) {
      return;
    }
    if (recordFault !== null) {
      // No se guarda encima de un registro que no se pudo leer.
      return;
    }
    announce(strings.text("audio.data.saving"));
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      void saveNow();
    }, AUTOSAVE_DELAY_MS);
  };

  const saveNow = async (): Promise<void> => {
    if (recordFault !== null) {
      announceRecordFault();
      return;
    }
    const projectId = projectInput?.value.trim() ?? "";
    if (projectId === "") {
      announce(strings.text("audio.data.empty"));
      return;
    }
    const result = await saveProject(projectId, current());
    // La persistencia se mide TAMBIEN cuando el guardado falla: quedarse sin
    // cuota es justo el momento en que hay que decirlo, y esperar al proximo
    // guardado exitoso es esperar a uno que puede no llegar nunca.
    updatePersistence();
    if (result.ok) {
      const time = result.value.savedAt.toLocaleTimeString();
      announce(format(strings.text("audio.data.saved"), { time }));
      void refreshProjects();
      return;
    }
    announce(result.error.detail ?? result.error.code);
  };

  const updatePersistence = (): void => {
    if (persistenceNote === null) {
      return;
    }
    const state = storage.status();
    if (state.backend === "indexeddb") {
      persistenceNote.textContent = strings.text("audio.persist.indexeddb");
      persistenceNote.dataset.state = "ok";
      return;
    }
    persistenceNote.textContent = `${strings.text("audio.persist.memory")} ${describeReason(state.reason)}`;
    persistenceNote.dataset.state = "warn";
  };

  /**
   * Por que no se pudo leer lo guardado, en el idioma de la pagina.
   *
   * Se traducen los dos codigos que importan —forma invalida y version
   * desconocida— y no el `detail` del nucleo: quien lee esto no necesita el
   * texto tecnico, necesita saber si el problema es suyo o del sitio.
   */
  const describeRecordFault = (error: AnnotationStorageError): string => {
    if (error.code === "unsupported-schema-version") {
      return format(strings.text("audio.record.version"), {
        version: error.version,
        supported: error.supportedVersion,
      });
    }
    if (error.code === "invalid-record") {
      return strings.text("audio.record.invalid");
    }
    return error.detail ?? error.code;
  };

  const announceRecordFault = (): void => {
    if (recordFault === null) {
      return;
    }
    announce(
      format(strings.text("audio.error.record"), { reason: describeRecordFault(recordFault) }),
    );
  };

  /**
   * Cuantos proyectos hay guardados y si se pueden borrar.
   *
   * Se recalcula en vez de llevar una cuenta: la fuente de verdad es la base,
   * y una cuenta propia se desincroniza en cuanto otra pestana escribe.
   */
  const refreshProjects = async (): Promise<void> => {
    const listed = await storage.list();
    const count = listed.ok ? listed.value.length : 0;
    if (projectsCount !== null) {
      projectsCount.textContent = format(strings.text("audio.projects.count"), { count });
    }
    if (projectsClearButton !== null) {
      projectsClearButton.disabled = count === 0;
    }
    if (projectsConfirmText !== null) {
      projectsConfirmText.textContent = format(strings.text("audio.projects.confirm"), { count });
    }
  };

  /**
   * Borra los proyectos guardados en este navegador, tras la confirmacion.
   *
   * `list` y `remove` estaban en el puerto y nadie los llamaba: no habia forma
   * de liberar espacio desde la pagina, y la unica salida era borrar los datos
   * del navegador a mano. Se borra solo lo que `list` enumera —y no la base
   * entera— para que la operacion sea la que dice ser.
   */
  const clearSavedProjects = async (): Promise<void> => {
    const listed = await storage.list();
    if (!listed.ok) {
      announce(
        format(strings.text("audio.projects.clearFailed"), {
          detail: listed.error.detail ?? listed.error.code,
        }),
      );
      return;
    }

    let failure: string | null = null;
    for (const projectId of listed.value) {
      const removed = await storage.remove(projectId);
      if (!removed.ok) {
        failure = removed.error.detail ?? removed.error.code;
      }
    }

    // El registro ilegible ya no esta: el autoguardado puede volver.
    recordFault = null;
    if (projectsConfirm !== null) {
      projectsConfirm.hidden = true;
    }
    updatePersistence();
    await refreshProjects();
    say(strings.text("audio.projects.cleared"), "ok");
    if (failure !== null) {
      announce(format(strings.text("audio.projects.clearFailed"), { detail: failure }));
      return;
    }
    announce(strings.text("audio.projects.cleared"));
  };

  const applyDocument = (next: AnnotationDocument, rebuild = true): void => {
    if (next === current()) {
      return;
    }
    history = recordAnnotation(history, next);
    if (rebuild) {
      renderIntervals();
    }
    renderTiers();
    updateHistory();
    scheduleAutosave();
  };

  /* ----------------------------- dibujo ------------------------------- */

  const renderCanvas = (): void => {
    if (audio === null) {
      return;
    }
    if (waveCanvas !== null) {
      drawWaveform(waveCanvas, {
        peaks: audio.peaks,
        view,
        duration: audio.duration,
        palette,
        cursor,
        selection: loopRegion(),
      });
    }
    if (specCanvas !== null) {
      if (spectrogram !== null && spectrogramToggle?.checked !== false) {
        specCanvas.hidden = false;
        drawSpectrogram(specCanvas, { spectrogram, view, palette });
      } else {
        specCanvas.hidden = true;
      }
    }
    if (tiersCanvas !== null) {
      drawTierStrips(tiersCanvas, {
        document: current(),
        view,
        activeTier,
        palette,
      });
    }
  };

  const renderTiers = (): void => {
    if (tiersCanvas !== null) {
      drawTierStrips(tiersCanvas, { document: current(), view, activeTier, palette });
    }
  };

  const updateCursor = (): void => {
    if (cursorInput !== null) {
      cursorInput.value = String(cursor);
    }
    if (cursorReadout !== null) {
      cursorReadout.textContent = formatSeconds(cursor);
    }
  };

  const updateHistory = (): void => {
    if (undoButton !== null) {
      undoButton.disabled = !canUndoAnnotation(history);
    }
    if (redoButton !== null) {
      redoButton.disabled = !canRedoAnnotation(history);
    }
  };

  const updateTransport = (): void => {
    const playing = playback?.isPlaying() ?? false;
    if (playButton !== null) {
      playButton.setAttribute("aria-pressed", playing ? "true" : "false");
      playButton.textContent = playLabel(playing, es);
    }
    if (stopButton !== null) {
      stopButton.disabled = !(audio !== null);
    }
  };

  /* --------------------------- tabla de intervalos --------------------- */

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

  /** Boton de accion de una fila. Texto corto, etiqueta larga: el icono no basta. */
  const intervalAction = (sheet: Sheet, interval: Interval): HTMLButtonElement =>
    actionButton(
      es ? `Reproducir el intervalo ${sheet.index + 1}` : `Play interval ${sheet.index + 1}`,
      "▶",
      () => {
        cursor = interval.start;
        updateCursor();
        play(interval.start);
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
            applyDocument(moveTierBoundary(current(), sheet.index, index, next));
            renderCanvas();
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
      lastTextInput = textInput;
    });
    textInput.addEventListener("input", () => {
      // Sin reconstruir la tabla: reconstruirla en cada tecla le quitaria el
      // foco a quien esta escribiendo.
      applyDocument(setIntervalText(current(), sheet.index, index, textInput.value), false);
    });
    textCell.append(textInput);
    row.append(textCell);

    const actions = document.createElement("td");
    actions.className = "audiolab__actions";
    actions.append(intervalAction(sheet, interval));
    if (!last) {
      actions.append(
        actionButton(
          es
            ? `Fusionar el intervalo ${index + 1} con el siguiente`
            : `Merge interval ${index + 1} with the next`,
          "∪",
          () => {
            applyDocument(mergeIntervalWithNext(current(), sheet.index, index));
            renderCanvas();
          },
        ),
      );
    }
    row.append(actions);

    return row;
  };

  /** Cabecera de la tabla: de que capa son los intervalos que se ven. */
  const syncTierHeader = (active: Sheet | null): void => {
    if (intervalsCaption !== null) {
      intervalsCaption.textContent = active?.tier.name ?? "";
    }
    if (tierSelect !== null && tierSelect.options.length > 0) {
      tierSelect.value = String(activeTier);
    }
    if (tierNameInput !== null) {
      tierNameInput.value = current().tiers[activeTier]?.name ?? "";
    }
    if (tierRemoveButton !== null) {
      tierRemoveButton.disabled = current().tiers.length <= 1;
    }
    if (splitButton !== null) {
      splitButton.disabled = active === null || audio === null;
    }
  };

  const renderIntervals = (): void => {
    const active = activeIntervalTier();

    syncTierHeader(active);

    intervalsBody.replaceChildren();

    if (active !== null) {
      const last = active.tier.items.length - 1;
      active.tier.items.forEach((interval, index) => {
        intervalsBody.append(buildIntervalRow(active, interval, index, index === last));
      });
    }

    updateCursor();
    updateHistory();
  };

  const renderTierSelect = (): void => {
    if (tierSelect === null) {
      return;
    }
    tierSelect.replaceChildren();
    current().tiers.forEach((tier, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = tier.name;
      tierSelect.append(option);
    });
    tierSelect.value = String(activeTier);
  };

  const renderAll = (): void => {
    renderTierSelect();
    renderIntervals();
    renderCanvas();
    updateTransport();
    updateHistory();
  };

  /* --------------------------- reproduccion --------------------------- */

  const stopAnimation = (): void => {
    if (animation !== 0) {
      cancelAnimationFrame(animation);
      animation = 0;
    }
  };

  const tick = (): void => {
    if (playback === null || !playback.isPlaying()) {
      stopAnimation();
      updateTransport();
      return;
    }
    cursor = clamp(playback.position(), 0, audio?.duration ?? 0);
    updateCursor();
    renderCanvas();
    animation = requestAnimationFrame(tick);
  };

  const play = (from: number): void => {
    if (playback === null || audio === null) {
      return;
    }
    playback.setBuffer(audio.buffer);
    playback.play(from, {
      rate: Number(rateInput?.value ?? "1"),
      loop: loopInput?.checked === true ? loopRegion() : null,
    });
    updateTransport();
    stopAnimation();
    animation = requestAnimationFrame(tick);
  };

  const togglePlay = (): void => {
    if (playback === null) {
      return;
    }
    if (playback.isPlaying()) {
      cursor = playback.position();
      playback.stop();
      stopAnimation();
      updateTransport();
      updateCursor();
      renderCanvas();
      return;
    }
    play(cursor);
  };

  /* ------------------------- espectrograma ---------------------------- */

  const recomputeSpectrogram = (): void => {
    if (audio === null) {
      return;
    }
    const windowSeconds = Number(windowSelect?.value ?? String(DEFAULT_WINDOW_SECONDS));
    const maxHz = clamp(Number(maxHzInput?.value ?? String(DEFAULT_MAX_HZ)), 500, 22050);
    const minHz = clamp(Number(minHzInput?.value ?? "0"), 0, maxHz - 100);

    spectrogram = spectrogramColumns(audio.samples, {
      sampleRate: audio.sampleRate,
      windowSeconds,
      hopSeconds: windowSeconds / 4,
      minHz,
      maxHz,
      maxColumns: SPECTROGRAM_MAX_COLUMNS,
    });
    renderCanvas();
  };

  /* ------------------------------ audio ------------------------------- */

  const loadAudioFile = async (file: File): Promise<void> => {
    if (typeof AudioContext === "undefined") {
      // Sin Web Audio no hay decodificacion, ni reproduccion, ni espectrograma.
      // Decirlo antes de intentarlo evita un error de decodificacion que
      // culparia al archivo de una carencia del navegador.
      say(strings.text("audio.error.noAudio"), "error");
      return;
    }
    // ANTES de leer y de decodificar: un archivo de este tamano no puede ser un
    // tramo de 300 s, y entregarselo a `decodeAudioData` llena la memoria antes
    // de que ningun limite lo detenga.
    if (isOverLimit(file.size, MAX_AUDIO_BYTES)) {
      say(
        format(strings.text("audio.error.tooLarge"), {
          size: formatBytes(file.size),
          limit: formatBytes(MAX_AUDIO_BYTES),
        }),
        "error",
      );
      return;
    }
    say(strings.text("audio.status.loading"), "busy");
    let bytes: Uint8Array;
    try {
      bytes = await readFileBytes(file);
    } catch {
      // Un fallo de lectura —permiso retirado, archivo movido, lector de
      // tarjetas desconectado— se cuenta como mensaje: antes quedaba como
      // promesa rechazada y la persona veia el visor cargando para siempre.
      say(strings.text("audio.error.read"), "error");
      return;
    }
    const decoded = await decoder.decodeToBuffer(bytes.buffer as ArrayBuffer, file.type);
    if (!decoded.ok) {
      const message =
        decoded.error.code === "too-long"
          ? format(strings.text("audio.error.tooLong"), {
              duration: Math.round(decoded.error.durationSeconds),
            })
          : strings.text("audio.error.decode");
      say(message, "error");
      return;
    }

    const samples = decoded.value.channels[0] ?? new Float32Array(0);
    audio = {
      buffer: decoded.value.buffer,
      duration: decoded.value.durationSeconds,
      sampleRate: decoded.value.sampleRate,
      samples,
      peaks: computePeaks(samples, WAVEFORM_BUCKETS),
      name: file.name,
    };

    view = { start: 0, end: audio.duration };
    cursor = 0;
    playback?.setBuffer(audio.buffer);

    if (cursorInput !== null) {
      cursorInput.max = String(audio.duration.toFixed(3));
      cursorInput.disabled = false;
    }

    // Un documento restaurado sobre un audio distinto se conserva, pero se avisa:
    // anotar sobre otro archivo es legitimo, anotar sin saberlo no. Se compara la
    // duracion y no la identidad del archivo porque el nombre cambia con
    // cualquier copia y el navegador no guarda el binario.
    const previousXmax = current().xmax;
    const mismatched = previousXmax > 0 && Math.abs(previousXmax - audio.duration) > 0.05;

    if (previousXmax === 0) {
      history = startAnnotationHistory(createEmptyDocument(audio.duration));
      activeTier = 0;
    }

    recomputeSpectrogram();
    renderAll();
    updatePersistence();
    if (mismatched) {
      say(
        format(strings.text("audio.status.mismatch"), {
          xmax: formatSeconds(previousXmax),
          duration: formatSeconds(audio.duration),
        }),
        "error",
      );
    } else {
      say(
        format(strings.text("audio.status.loaded"), {
          name: audio.name,
          duration: formatSeconds(audio.duration),
        }),
        "ok",
      );
    }
    void saveNow();
  };

  /* --------------------------- TextGrid ------------------------------- */

  let pendingGaps: readonly { tier: string; start: number; end: number }[] = [];

  const showGaps = (): void => {
    if (gapsPanel === null) {
      return;
    }
    if (pendingGaps.length === 0) {
      gapsPanel.hidden = true;
      return;
    }
    gapsPanel.hidden = false;
    if (gapsText !== null) {
      const list = pendingGaps
        .slice(0, 4)
        .map((gap) => `${gap.tier}: ${formatSeconds(gap.start)}–${formatSeconds(gap.end)}`)
        .join(" · ");
      gapsText.textContent = format(strings.text("audio.gaps.detected"), {
        count: pendingGaps.length,
        list,
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

    history = startAnnotationHistory(parsed.value.document);
    pendingGaps = parsed.value.gaps;
    activeTier = 0;
    view = { start: parsed.value.document.xmin, end: parsed.value.document.xmax };
    if (cursorInput !== null) {
      cursorInput.max = String(view.end.toFixed(3));
    }
    renderAll();
    showGaps();
    say(
      format(strings.text("audio.status.imported"), { count: current().tiers.length }),
      "ok",
    );
    void saveNow();
  };

  const fillPendingGaps = (): void => {
    let doc = current();
    for (const gap of pendingGaps) {
      const index = doc.tiers.findIndex((tier) => tier.name === gap.tier);
      const tier = doc.tiers[index];
      if (index === -1 || tier === undefined || !isIntervalTier(tier)) {
        continue;
      }
      const filled = fillTierGaps(tier, doc.xmin, doc.xmax);
      if (filled === tier) {
        continue;
      }
      doc = {
        ...doc,
        tiers: doc.tiers.map((current, position) => (position === index ? filled : current)),
      };
    }
    pendingGaps = [];
    showGaps();
    applyDocument(doc);
    renderCanvas();
    say(strings.text("audio.gaps.filled"), "ok");
  };

  /* ---------------------------- eventos ------------------------------- */

  audioInput.addEventListener("change", () => {
    const file = audioInput.files?.[0];
    if (file !== undefined) {
      void loadAudioFile(file);
    }
  });

  canvasFrame?.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  canvasFrame?.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file === undefined) {
      return;
    }
    if (/\.(textgrid|tg)$/i.test(file.name)) {
      void importTextGrid(file);
      return;
    }
    void loadAudioFile(file);
  });

  canvasFrame?.addEventListener("pointerdown", (event) => {
    if (audio === null) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    cursor = timeAtRatio(view, ratio);
    updateCursor();
    renderCanvas();
    renderIntervals();
  });

  playButton?.addEventListener("click", () => {
    togglePlay();
  });

  stopButton?.addEventListener("click", () => {
    playback?.stop();
    stopAnimation();
    updateTransport();
    renderCanvas();
  });

  rateInput?.addEventListener("change", () => {
    if (playback?.isPlaying() === true) {
      // Cambiar la velocidad en caliente exige reiniciar la fuente: Web Audio no
      // permite cambiar `playbackRate` de forma fiable con el nodo ya sonando en
      // todos los navegadores objetivo.
      play(cursor);
    }
  });

  loopInput?.addEventListener("change", () => {
    renderCanvas();
  });

  cursorInput?.addEventListener("input", () => {
    cursor = clamp(Number(cursorInput.value), 0, audio?.duration ?? 0);
    updateCursor();
    renderCanvas();
    renderIntervals();
  });

  zoomInButton?.addEventListener("click", () => {
    view = zoomWindow(view, audio?.duration ?? view.end, 2, 0.5);
    renderCanvas();
  });

  zoomOutButton?.addEventListener("click", () => {
    view = zoomWindow(view, audio?.duration ?? view.end, 0.5, 0.5);
    renderCanvas();
  });

  panLeftButton?.addEventListener("click", () => {
    view = panWindow(view, audio?.duration ?? view.end, -(view.end - view.start) / 3);
    renderCanvas();
  });

  panRightButton?.addEventListener("click", () => {
    view = panWindow(view, audio?.duration ?? view.end, (view.end - view.start) / 3);
    renderCanvas();
  });

  windowSelect?.addEventListener("change", () => {
    recomputeSpectrogram();
  });
  minHzInput?.addEventListener("change", () => {
    recomputeSpectrogram();
  });
  maxHzInput?.addEventListener("change", () => {
    recomputeSpectrogram();
  });
  spectrogramToggle?.addEventListener("change", () => {
    renderCanvas();
  });

  tierSelect?.addEventListener("change", () => {
    activeTier = clamp(Number(tierSelect.value), 0, current().tiers.length - 1);
    renderIntervals();
    renderCanvas();
  });

  tierNameInput?.addEventListener("change", () => {
    const name = tierNameInput.value.trim();
    if (name === "") {
      return;
    }
    applyDocument(renameTier(current(), activeTier, name));
    renderTierSelect();
    renderCanvas();
  });

  tierAddButton?.addEventListener("click", () => {
    const name = `${es ? "capa" : "tier"} ${current().tiers.length + 1}`;
    applyDocument(addTier(current(), name, "interval"));
    activeTier = current().tiers.length - 1;
    renderTierSelect();
    renderIntervals();
    renderCanvas();
  });

  tierRemoveButton?.addEventListener("click", () => {
    applyDocument(removeTier(current(), activeTier));
    activeTier = clamp(activeTier, 0, current().tiers.length - 1);
    renderTierSelect();
    renderIntervals();
    renderCanvas();
  });

  tierUpButton?.addEventListener("click", () => {
    const next = moveTier(current(), activeTier, -1);
    if (next === current()) {
      return;
    }
    applyDocument(next);
    activeTier = Math.max(activeTier - 1, 0);
    renderTierSelect();
    renderIntervals();
    renderCanvas();
  });

  tierDownButton?.addEventListener("click", () => {
    const next = moveTier(current(), activeTier, 1);
    if (next === current()) {
      return;
    }
    applyDocument(next);
    activeTier = Math.min(activeTier + 1, current().tiers.length - 1);
    renderTierSelect();
    renderIntervals();
    renderCanvas();
  });

  splitButton?.addEventListener("click", () => {
    applyDocument(splitIntervalAt(current(), activeTier, cursor));
    renderCanvas();
  });

  prevButton?.addEventListener("click", () => {
    moveCursorToInterval(-1);
  });

  nextButton?.addEventListener("click", () => {
    moveCursorToInterval(1);
  });

  undoButton?.addEventListener("click", () => {
    history = undoAnnotation(history);
    renderAll();
    scheduleAutosave();
  });

  redoButton?.addEventListener("click", () => {
    history = redoAnnotation(history);
    renderAll();
    scheduleAutosave();
  });

  function moveCursorToInterval(direction: -1 | 1): void {
    const active = activeIntervalTier();
    if (active === null) {
      return;
    }
    const index = activeIntervalIndex();
    const next = active.tier.items[clamp(index + direction, 0, active.tier.items.length - 1)];
    if (next === undefined) {
      return;
    }
    cursor = next.start;
    updateCursor();
    renderCanvas();
    renderIntervals();
  }

  exportTextGridButton?.addEventListener("click", () => {
    if (pendingGaps.length > 0) {
      showGaps();
      say(gapsText?.textContent ?? strings.text("audio.gaps.detected"), "error");
      return;
    }
    const name = toFileName(projectInput?.value ?? DEFAULT_PROJECT, "TextGrid");
    downloadText(name, serializeTextGrid(current()), "text/plain");
    announce(name);
  });

  exportCsvButton?.addEventListener("click", () => {
    const name = toFileName(projectInput?.value ?? DEFAULT_PROJECT, "csv");
    downloadText(name, exportAnnotationCsv(current()), "text/csv");
    announce(name);
  });

  textGridInput?.addEventListener("change", () => {
    const file = textGridInput.files?.[0];
    if (file !== undefined) {
      void importTextGrid(file);
    }
  });

  gapsFillButton?.addEventListener("click", () => {
    fillPendingGaps();
  });

  projectsClearButton?.addEventListener("click", () => {
    // La confirmacion se pide en el propio control: dos botones con su texto, en
    // vez de un `window.confirm` que no se puede etiquetar ni leer en contexto.
    if (projectsConfirm !== null) {
      projectsConfirm.hidden = false;
    }
    projectsClearButton.disabled = true;
    // El boton que tenia el foco acaba de quedar deshabilitado: sin mover el
    // foco, quien usa el teclado aterriza en el cuerpo del documento y tiene que
    // volver a tabular desde el principio.
    projectsConfirmButton?.focus();
  });

  projectsCancelButton?.addEventListener("click", () => {
    if (projectsConfirm !== null) {
      projectsConfirm.hidden = true;
    }
    projectsClearButton?.focus();
    void refreshProjects();
  });

  projectsConfirmButton?.addEventListener("click", () => {
    void clearSavedProjects();
  });

  ipaContainer?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("[data-audio-ipa-symbol]");
    const symbol = button?.dataset.audioIpaSymbol;
    if (symbol === undefined || lastTextInput === null) {
      return;
    }
    const result = insertSymbol(
      lastTextInput.value,
      lastTextInput.selectionStart ?? lastTextInput.value.length,
      lastTextInput.selectionEnd ?? lastTextInput.value.length,
      symbol,
    );
    lastTextInput.value = result.value;
    lastTextInput.focus();
    lastTextInput.setSelectionRange(result.selectionStart, result.selectionEnd);
    lastTextInput.dispatchEvent(new Event("input", { bubbles: true }));
  });

  projectInput?.addEventListener("change", () => {
    void saveNow();
  });

  /**
   * Atajos de teclado.
   *
   * Se ignoran mientras el foco esta en un campo: ahi el teclado pertenece al
   * texto, y robarle la barra espaciadora a quien escribe una etiqueta seria un
   * defecto, no una funcion. Todos los atajos tienen su boton equivalente.
   */
  const handleShortcut = (event: KeyboardEvent): void => {
    switch (event.key) {
      case " ":
        event.preventDefault();
        togglePlay();
        break;
      case "Escape":
        playback?.stop();
        stopAnimation();
        updateTransport();
        break;
      case "s":
      case "S":
        applyDocument(splitIntervalAt(current(), activeTier, cursor));
        renderCanvas();
        break;
      case ",":
        moveCursorToInterval(-1);
        break;
      case ".":
        moveCursorToInterval(1);
        break;
      default:
        break;
    }
  };

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const inField =
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);

    if (inField) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        history = event.shiftKey ? redoAnnotation(history) : undoAnnotation(history);
        renderAll();
        scheduleAutosave();
      }
      return;
    }

    handleShortcut(event);
  });

  window.addEventListener("resize", () => {
    palette = readPalette(root);
    renderCanvas();
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      palette = readPalette(root);
      renderCanvas();
    });

  /* ------------------------------ arranque ---------------------------- */

  renderTierSelect();
  renderIntervals();
  updatePersistence();
  updateTransport();
  updateHistory();
  void refreshProjects();
  say(strings.text("audio.status.idle"), "idle");

  if (intervalTiers(current()).length === 0) {
    history = startAnnotationHistory(createEmptyDocument(0));
    renderIntervals();
  }

  void (async () => {
    const projectId = projectInput?.value.trim() ?? "";
    if (projectId === "") {
      return;
    }
    const restored = await loadProject(projectId);
    if (!restored.ok) {
      // Un registro que no se entiende NO se borra ni se pisa: se abre un
      // proyecto vacio, se dice por que y el autoguardado queda detenido hasta
      // que la persona exporte o borre a mano. Antes, este caso llegaba con la
      // forma de otro proyecto y rompia el render (`tiers` no existia).
      recordFault = restored.error;
      announceRecordFault();
      updatePersistence();
      return;
    }
    if (restored.value === null) {
      return;
    }
    history = startAnnotationHistory(restored.value);
    activeTier = 0;
    renderAll();
    announce(strings.text("audio.data.restored"));
  })();
};

/** Grupos IPA del panel: se construyen aqui para no repetir 90 botones en el marcado. */
export const mountIpaKeyboard = (): void => {
  const container = document.querySelector<HTMLElement>("[data-audio-ipa]");
  if (container === null || container.childElementCount > 0) {
    return;
  }
  const es = document.documentElement.lang !== "en";

  for (const group of IPA_GROUPS) {
    const wrapper = document.createElement("div");
    wrapper.className = "audiolab__ipa-group";

    const title = document.createElement("p");
    title.className = "audiolab__ipa-title";
    title.id = `audio-ipa-${group.label}`;
    title.textContent = {
      consonants: es ? "Consonantes" : "Consonants",
      vowels: es ? "Vocales" : "Vowels",
      diacritics: es ? "Diacríticos" : "Diacritics",
      prosody: es ? "Prosodia" : "Prosody",
    }[group.label];

    const buttons = document.createElement("div");
    buttons.className = "audiolab__ipa-buttons";
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-labelledby", title.id);

    for (const symbol of group.symbols) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "audiolab__ipa-symbol";
      button.textContent = symbol;
      button.dataset.audioIpaSymbol = symbol;
      buttons.append(button);
    }

    wrapper.append(title, buttons);
    container.append(wrapper);
  }
};
