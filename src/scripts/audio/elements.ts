/* ============================================================
   LinguaLab — controles del visor de audio, leidos del marcado una sola vez

   El marcado de `AudioLab.astro` lleva un atributo `data-audio-*` por control
   y este es el unico lugar que los conoce por nombre. Ninguno se da por
   supuesto y por eso todo es `| null`: quien lo usa decide si su ausencia apaga
   una funcion o el visor entero.
   ============================================================ */

export interface AudioLabElements {
  readonly audioInput: HTMLInputElement | null;
  readonly status: HTMLElement | null;
  readonly playButton: HTMLButtonElement | null;
  readonly stopButton: HTMLButtonElement | null;
  readonly rateInput: HTMLInputElement | null;
  readonly loopInput: HTMLInputElement | null;
  readonly cursorInput: HTMLInputElement | null;
  readonly cursorReadout: HTMLOutputElement | null;
  readonly zoomInButton: HTMLButtonElement | null;
  readonly zoomOutButton: HTMLButtonElement | null;
  readonly panLeftButton: HTMLButtonElement | null;
  readonly panRightButton: HTMLButtonElement | null;
  readonly windowSelect: HTMLSelectElement | null;
  readonly minHzInput: HTMLInputElement | null;
  readonly maxHzInput: HTMLInputElement | null;
  readonly spectrogramToggle: HTMLInputElement | null;
  readonly scaleSelect: HTMLSelectElement | null;
  /** Casillas «mostrar» de las curvas sobre el espectrograma (unidad 5.3). */
  readonly overlayPitchToggle: HTMLInputElement | null;
  readonly overlayFormantsToggle: HTMLInputElement | null;
  readonly overlayIntensityToggle: HTMLInputElement | null;
  readonly overlayStatus: HTMLElement | null;
  readonly waveCanvas: HTMLCanvasElement | null;
  readonly specCanvas: HTMLCanvasElement | null;
  readonly tiersCanvas: HTMLCanvasElement | null;
  readonly canvasFrame: HTMLElement | null;
  /** Barra de carga y transporte, el borde de arriba del editor. */
  readonly editorBar: HTMLElement | null;
  /** Ventana de texto del intervalo seleccionado, como la de Praat. */
  readonly labelInput: HTMLInputElement | null;
  readonly exampleSolvedButton: HTMLButtonElement | null;
  readonly examplePracticeButton: HTMLButtonElement | null;
  /** Credito del audio de ejemplo; se muestra al cargarlo. */
  readonly exampleCredit: HTMLElement | null;
  readonly tierSelect: HTMLSelectElement | null;
  readonly tierNameInput: HTMLInputElement | null;
  readonly tierAddButton: HTMLButtonElement | null;
  readonly tierRemoveButton: HTMLButtonElement | null;
  readonly tierUpButton: HTMLButtonElement | null;
  readonly tierDownButton: HTMLButtonElement | null;
  readonly intervalsBody: HTMLTableSectionElement | null;
  readonly intervalsCaption: HTMLElement | null;
  readonly splitButton: HTMLButtonElement | null;
  readonly prevButton: HTMLButtonElement | null;
  readonly nextButton: HTMLButtonElement | null;
  readonly undoButton: HTMLButtonElement | null;
  readonly redoButton: HTMLButtonElement | null;
  readonly ipaContainer: HTMLElement | null;
  readonly projectInput: HTMLInputElement | null;
  readonly saveNote: HTMLElement | null;
  readonly persistenceNote: HTMLElement | null;
  readonly exportTextGridButton: HTMLButtonElement | null;
  readonly exportCsvButton: HTMLButtonElement | null;
  readonly textGridInput: HTMLInputElement | null;
  readonly gapsPanel: HTMLElement | null;
  readonly gapsText: HTMLElement | null;
  readonly gapsFillButton: HTMLButtonElement | null;
  readonly projectsCount: HTMLElement | null;
  readonly projectsClearButton: HTMLButtonElement | null;
  readonly projectsConfirm: HTMLElement | null;
  readonly projectsConfirmText: HTMLElement | null;
  readonly projectsConfirmButton: HTMLButtonElement | null;
  readonly projectsCancelButton: HTMLButtonElement | null;
  readonly acousticRoot: HTMLElement | null;
}

/**
 * Los controles sin los que el visor no arranca: sin selector de archivo no hay
 * audio, sin linea de estado no hay forma de decir que fallo, y sin cuerpo de
 * tabla no hay donde editar intervalos.
 */
export type RequiredAudioLabElements = AudioLabElements & {
  readonly audioInput: HTMLInputElement;
  readonly status: HTMLElement;
  readonly intervalsBody: HTMLTableSectionElement;
};

export const queryAudioLabElements = (root: HTMLElement): AudioLabElements => {
  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);
  return {
    audioInput: $<HTMLInputElement>("[data-audio-file]"),
    status: $<HTMLElement>("[data-audio-status]"),
    playButton: $<HTMLButtonElement>("[data-audio-play]"),
    stopButton: $<HTMLButtonElement>("[data-audio-stop]"),
    rateInput: $<HTMLInputElement>("[data-audio-rate]"),
    loopInput: $<HTMLInputElement>("[data-audio-loop]"),
    cursorInput: $<HTMLInputElement>("[data-audio-cursor]"),
    cursorReadout: $<HTMLOutputElement>("[data-audio-cursor-readout]"),
    zoomInButton: $<HTMLButtonElement>("[data-audio-zoom-in]"),
    zoomOutButton: $<HTMLButtonElement>("[data-audio-zoom-out]"),
    panLeftButton: $<HTMLButtonElement>("[data-audio-pan-left]"),
    panRightButton: $<HTMLButtonElement>("[data-audio-pan-right]"),
    windowSelect: $<HTMLSelectElement>("[data-audio-window]"),
    minHzInput: $<HTMLInputElement>("[data-audio-fmin]"),
    maxHzInput: $<HTMLInputElement>("[data-audio-fmax]"),
    spectrogramToggle: $<HTMLInputElement>("[data-audio-spectrogram]"),
    scaleSelect: $<HTMLSelectElement>("[data-audio-scale]"),
    overlayPitchToggle: $<HTMLInputElement>("[data-audio-overlay-pitch]"),
    overlayFormantsToggle: $<HTMLInputElement>("[data-audio-overlay-formants]"),
    overlayIntensityToggle: $<HTMLInputElement>("[data-audio-overlay-intensity]"),
    overlayStatus: $<HTMLElement>("[data-audio-overlay-status]"),
    waveCanvas: $<HTMLCanvasElement>("[data-audio-wave]"),
    specCanvas: $<HTMLCanvasElement>("[data-audio-spec]"),
    tiersCanvas: $<HTMLCanvasElement>("[data-audio-tiers]"),
    canvasFrame: $<HTMLElement>("[data-audio-canvas]"),
    editorBar: $<HTMLElement>("[data-audio-bar]"),
    labelInput: $<HTMLInputElement>("[data-audio-label]"),
    exampleSolvedButton: $<HTMLButtonElement>("[data-audio-example-solved]"),
    examplePracticeButton: $<HTMLButtonElement>("[data-audio-example-practice]"),
    exampleCredit: $<HTMLElement>("[data-audio-example-credit]"),
    tierSelect: $<HTMLSelectElement>("[data-audio-tier]"),
    tierNameInput: $<HTMLInputElement>("[data-audio-tier-name]"),
    tierAddButton: $<HTMLButtonElement>("[data-audio-tier-add]"),
    tierRemoveButton: $<HTMLButtonElement>("[data-audio-tier-remove]"),
    tierUpButton: $<HTMLButtonElement>("[data-audio-tier-up]"),
    tierDownButton: $<HTMLButtonElement>("[data-audio-tier-down]"),
    intervalsBody: $<HTMLTableSectionElement>("[data-audio-intervals]"),
    intervalsCaption: $<HTMLElement>("[data-audio-intervals-caption]"),
    splitButton: $<HTMLButtonElement>("[data-audio-interval-split]"),
    prevButton: $<HTMLButtonElement>("[data-audio-interval-prev]"),
    nextButton: $<HTMLButtonElement>("[data-audio-interval-next]"),
    undoButton: $<HTMLButtonElement>("[data-audio-undo]"),
    redoButton: $<HTMLButtonElement>("[data-audio-redo]"),
    ipaContainer: $<HTMLElement>("[data-audio-ipa]"),
    projectInput: $<HTMLInputElement>("[data-audio-project]"),
    saveNote: $<HTMLElement>("[data-audio-save-note]"),
    persistenceNote: $<HTMLElement>("[data-audio-persistence]"),
    exportTextGridButton: $<HTMLButtonElement>("[data-audio-export-textgrid]"),
    exportCsvButton: $<HTMLButtonElement>("[data-audio-export-csv]"),
    textGridInput: $<HTMLInputElement>("[data-audio-textgrid-file]"),
    gapsPanel: $<HTMLElement>("[data-audio-gaps]"),
    gapsText: $<HTMLElement>("[data-audio-gaps-text]"),
    gapsFillButton: $<HTMLButtonElement>("[data-audio-gaps-fill]"),
    projectsCount: $<HTMLElement>("[data-audio-projects-count]"),
    projectsClearButton: $<HTMLButtonElement>("[data-audio-projects-clear]"),
    projectsConfirm: $<HTMLElement>("[data-audio-projects-confirm]"),
    projectsConfirmText: $<HTMLElement>("[data-audio-projects-confirm-text]"),
    projectsConfirmButton: $<HTMLButtonElement>("[data-audio-projects-clear-confirm]"),
    projectsCancelButton: $<HTMLButtonElement>("[data-audio-projects-cancel]"),
    acousticRoot: $<HTMLElement>("[data-acoustic]"),
  };
};

/** Los controles, si estan los imprescindibles; `null` si el visor no puede arrancar. */
export const requireAudioLabElements = (
  elements: AudioLabElements,
): RequiredAudioLabElements | null => {
  const { audioInput, status, intervalsBody } = elements;
  if (audioInput === null || status === null || intervalsBody === null) {
    return null;
  }
  return { ...elements, audioInput, status, intervalsBody };
};
