/**
 * Controlador de los paneles de analisis acustico del visor.
 *
 * QUE DECIDE ESTE ARCHIVO Y QUE NO
 *
 * Decide que se analiza, con que parametros y que se muestra. No mide: el
 * analisis viaja al puerto inyectado —`AcousticAnalysisPort`, implementado por
 * el adaptador de praatfan sobre un Web Worker— y aqui solo se comprueba el
 * `Result`. No dibuja geometria: eso vive en `acoustic-render.ts`, que tiene sus
 * propias pruebas. No calcula estadistica: eso vive en `acoustic-measure.ts`,
 * por la misma razon.
 *
 * POR QUE EL PUERTO LLEGA COMO PARAMETRO
 *
 * La interfaz no puede construir un adaptador —la regla hexagonal solo deja
 * cablearlos en `src/composition-root.ts`— y ademas asi este controlador se
 * puede probar con el fake en memoria del nucleo sin tocar el wasm.
 *
 * EL AVISO DE EXPERIMENTAL NO DEPENDE DEL CODIGO
 *
 * Quitar ese aviso requiere el contraste contra Praat sobre voces reales, que
 * todavia no existe (`docs/validation/acoustic.md`). Este archivo no tiene
 * ninguna bandera para esconderlo: cuando el contraste exista, se cambia el
 * texto, no una condicion aqui.
 */

import type { AcousticAnalysisPort, AcousticError, AcousticTrack } from "@lingualab/core";
import type { ViewWindow } from "./view";
import type { Palette } from "./render";
import {
  measureSelection,
  measurementsToCsv,
  vowelPoints,
  type AcousticRange,
  type SelectionMeasurement,
} from "./acoustic-measure";
import { drawFormantOverlay, drawTrackPlot, drawVowelChart } from "./acoustic-render";
import { format } from "./strings";
import type { AcousticStrings } from "./acoustic-strings";
import { downloadText, toFileName } from "./files";

/** Lo que el visor tiene cargado y el analisis necesita. */
export interface AcousticAudio {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly duration: number;
}

/** Intervalo elegido en el visor, con su texto: la etiqueta de la medicion. */
export interface AcousticSelection {
  readonly start: number;
  readonly end: number;
  readonly label: string;
}

export interface VoicePreset {
  readonly floorHz: number;
  readonly ceilingHz: number;
  readonly maxFormantHz: number;
}

/**
 * Presets de voz.
 *
 * Son rangos de trabajo, no fronteras: los de Praat para voz masculina,
 * femenina e infantil. Se ofrecen porque escribir cuatro numeros antes de ver
 * nada es la forma mas rapida de obtener un contorno vacio y culpar al audio.
 */
export const VOICE_PRESETS: Readonly<Record<string, VoicePreset>> = {
  masculine: { floorHz: 75, ceilingHz: 300, maxFormantHz: 5000 },
  feminine: { floorHz: 100, ceilingHz: 500, maxFormantHz: 5500 },
  child: { floorHz: 150, ceilingHz: 800, maxFormantHz: 8000 },
};

export interface AcousticPanelOptions {
  readonly root: HTMLElement;
  readonly port: AcousticAnalysisPort;
  readonly strings: AcousticStrings;
  readonly es: boolean;
  readonly getAudio: () => AcousticAudio | null;
  readonly getSelection: () => AcousticSelection | null;
  readonly palette: () => Palette;
  /** Se llama cuando cambia la superposicion: el visor vuelve a pintar el espectrograma. */
  readonly onOverlayChange: () => void;
}

export interface AcousticPanels {
  /** Superpone los formantes sobre el espectrograma ya pintado, si estan pedidos. */
  drawOverlay(
    canvas: HTMLCanvasElement,
    view: ViewWindow,
    minHz: number,
    maxHz: number,
  ): void;
  /** El audio cambio: los analisis y las mediciones anteriores ya no valen. */
  reset(): void;
}

const DEFAULT_PITCH = { floorHz: 75, ceilingHz: 600 };
const DEFAULT_FORMANT_HZ = 5500;
const FORMANT_COUNT = 3;
const INTENSITY_MIN_PITCH_HZ = 100;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export interface AcousticParamsInput {
  readonly floorHz: number;
  readonly ceilingHz: number;
  readonly maxFormantHz: number;
}

export interface AcousticParams {
  readonly floor: number;
  readonly ceiling: number;
  readonly maxFormantHz: number;
}

/**
 * Parametros saneados antes de llegar al worker.
 *
 * El motor no valida nada: un techo igual o menor que el piso hace que no
 * encuentre ningun candidato y devuelve un contorno vacio, que en pantalla se
 * lee como «este audio no tiene voz». Un rango imposible no puede salir de aqui.
 * La frecuencia maxima de los formantes se acota por la misma razon: por debajo
 * de F3 el analisis informa un formante que no existe.
 */
export const analysisParams = (input: AcousticParamsInput): AcousticParams => {
  const floor = clamp(input.floorHz, 20, 2000);
  return {
    floor,
    ceiling: clamp(input.ceilingHz, floor + 10, 3000),
    maxFormantHz: clamp(input.maxFormantHz, 1000, 12_000),
  };
};

/** Un numero de un campo, con respaldo si el campo esta vacio o no es un numero. */
const numberFrom = (input: HTMLInputElement | null, fallback: number): number => {
  const value = Number(input?.value ?? "");
  return Number.isFinite(value) ? value : fallback;
};

const rounded = (value: number, digits = 0): string => value.toFixed(digits);

export const initAcousticPanels = (options: AcousticPanelOptions): AcousticPanels | null => {
  const { root, strings, port } = options;
  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);

  const status = $<HTMLElement>("[data-acoustic-status]");
  const presetSelect = $<HTMLSelectElement>("[data-acoustic-preset]");
  const pitchFloor = $<HTMLInputElement>("[data-acoustic-pitch-floor]");
  const pitchCeiling = $<HTMLInputElement>("[data-acoustic-pitch-ceiling]");
  const pitchRun = $<HTMLButtonElement>("[data-acoustic-pitch-run]");
  const formantMax = $<HTMLInputElement>("[data-acoustic-formant-max]");
  const formantRun = $<HTMLButtonElement>("[data-acoustic-formant-run]");
  const formantOverlay = $<HTMLInputElement>("[data-acoustic-formant-overlay]");
  const intensityRun = $<HTMLButtonElement>("[data-acoustic-intensity-run]");
  const measureRun = $<HTMLButtonElement>("[data-acoustic-measure-run]");
  const measureExport = $<HTMLButtonElement>("[data-acoustic-measure-export]");
  const measureClear = $<HTMLButtonElement>("[data-acoustic-measure-clear]");
  const measureEmpty = $<HTMLElement>("[data-acoustic-measure-empty]");
  const measureBody = $<HTMLTableSectionElement>("[data-acoustic-measure-body]");
  const measureTable = $<HTMLTableElement>("[data-acoustic-measure-table]");
  const f0Canvas = $<HTMLCanvasElement>("[data-acoustic-f0-canvas]");
  const intensityCanvas = $<HTMLCanvasElement>("[data-acoustic-intensity-canvas]");
  const vowelCanvas = $<HTMLCanvasElement>("[data-acoustic-vowels-canvas]");
  const vowelEmpty = $<HTMLElement>("[data-acoustic-vowels-empty]");

  if (status === null) {
    return null;
  }

  let pitch: AcousticTrack | null = null;
  let pitchKey = "";
  let formants: readonly AcousticTrack[] = [];
  let formantKey = "";
  let intensity: AcousticTrack | null = null;
  let intensityKey = "";
  let measurements: SelectionMeasurement[] = [];
  let busy = false;

  const say = (message: string, state: "idle" | "busy" | "ok" | "error"): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const params = (): AcousticParams =>
    analysisParams({
      floorHz: numberFrom(pitchFloor, DEFAULT_PITCH.floorHz),
      ceilingHz: numberFrom(pitchCeiling, DEFAULT_PITCH.ceilingHz),
      maxFormantHz: numberFrom(formantMax, DEFAULT_FORMANT_HZ),
    });

  const decoded = (audio: AcousticAudio) => ({
    sampleRate: audio.sampleRate,
    durationSeconds: audio.duration,
    channels: [audio.samples],
  });

  /** Un fallo del puerto, en el idioma de la pagina y con lo que haga falta saber. */
  const describe = (error: AcousticError): string => {
    if (error.code === "unavailable") {
      return format(strings.text("acoustic.error.unavailable"), {
        detail: error.detail ?? (options.es ? "sin detalle" : "no detail"),
      });
    }
    if (error.code === "too-short") {
      return format(strings.text("acoustic.error.tooShort"), {
        duration: rounded(error.durationSeconds, 3),
      });
    }
    return format(strings.text("acoustic.error.failed"), { detail: error.detail });
  };

  const withAudio = (): AcousticAudio | null => {
    const audio = options.getAudio();
    if (audio === null) {
      say(strings.text("acoustic.error.noAudio"), "error");
      return null;
    }
    return audio;
  };

  /* ------------------------------ dibujo ------------------------------ */

  const clearCanvas = (canvas: HTMLCanvasElement | null): void => {
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      return;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    // El canvas vacio no es un dato: se marca como oculto para que el lector de
    // pantalla no anuncie un grafico que no tiene nada.
    canvas.dataset.empty = "true";
  };

  const drawPitch = (): void => {
    if (f0Canvas === null) {
      return;
    }
    if (pitch === null) {
      clearCanvas(f0Canvas);
      return;
    }
    const { floor, ceiling } = params();
    delete f0Canvas.dataset.empty;
    drawTrackPlot(f0Canvas, {
      track: pitch,
      view: { start: 0, end: Math.max(options.getAudio()?.duration ?? 1, 0.001) },
      // El alto y el ancho los fija `drawTrackPlot` a partir del canvas: aqui
      // solo hace falta un valor que no restrinja el trazo.
      width: f0Canvas.clientWidth || 320,
      height: f0Canvas.clientHeight || 140,
      minValue: floor,
      maxValue: ceiling,
      palette: options.palette(),
      label: "F0",
      unit: "Hz",
    });
  };

  const drawIntensity = (): void => {
    if (intensityCanvas === null) {
      return;
    }
    if (intensity === null) {
      clearCanvas(intensityCanvas);
      return;
    }
    const values = intensity.values.filter((value) => Number.isFinite(value));
    const minValue = Math.min(40, ...values);
    const maxValue = Math.max(100, ...values);
    delete intensityCanvas.dataset.empty;
    drawTrackPlot(intensityCanvas, {
      track: intensity,
      view: { start: 0, end: Math.max(options.getAudio()?.duration ?? 1, 0.001) },
      width: intensityCanvas.clientWidth || 320,
      height: intensityCanvas.clientHeight || 140,
      minValue,
      maxValue,
      palette: options.palette(),
      label: options.es ? "Intensidad" : "Intensity",
      unit: "dB",
    });
  };

  /**
   * Rangos del grafico vocalico, con margen.
   *
   * Se calculan sobre las mediciones y no sobre una tabla fija de vocales: los
   * puntos de esta sesion tienen que entrar todos, y un rango fijo recortaria
   * justo los extremos. El margen evita que un punto quede sobre el marco.
   */
  const vowelRanges = (points: readonly { f1: number; f2: number }[]) => {
    const f1 = points.map((point) => point.f1);
    const f2 = points.map((point) => point.f2);
    const pad = (values: readonly number[]): readonly [number, number] => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(max - min, 100);
      return [Math.max(min - span * 0.15, 0), max + span * 0.15];
    };
    const [minF1, maxF1] = pad(f1);
    const [minF2, maxF2] = pad(f2);
    return { minF1, maxF1, minF2, maxF2 };
  };

  const drawVowels = (): void => {
    const points = vowelPoints(measurements);
    if (vowelEmpty !== null) {
      vowelEmpty.hidden = points.length > 0;
    }
    if (vowelCanvas === null) {
      return;
    }
    if (points.length === 0) {
      clearCanvas(vowelCanvas);
      return;
    }
    delete vowelCanvas.dataset.empty;
    drawVowelChart(vowelCanvas, {
      points,
      palette: options.palette(),
      ranges: vowelRanges(points),
      labels: {
        x: options.es ? "F2 (Hz), anterior a la izquierda" : "F2 (Hz), front to the left",
        y: options.es ? "F1 (Hz), abierta abajo" : "F1 (Hz), open below",
      },
    });
  };

  /* ---------------------------- mediciones ---------------------------- */

  const cell = (text: string): HTMLTableCellElement => {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
  };

  const sampleCell = (value: number | undefined): HTMLTableCellElement =>
    cell(value === undefined ? "—" : rounded(value, 0));

  /**
   * Una cifra del resumen de F0, o una raya cuando ese intervalo no tiene voz.
   *
   * «Sin voz» se escribe solo en la media: repetirlo en las cuatro columnas
   * convertiria la fila en una frase. Las rayas dicen «aqui no hay numero» sin
   * inventar un 0 Hz.
   */
  const statsCell = (
    measurement: SelectionMeasurement,
    pick: (stats: NonNullable<SelectionMeasurement["f0"]>) => number,
  ): HTMLTableCellElement => {
    const stats = measurement.f0;
    if (stats === null) {
      return cell("—");
    }
    return cell(rounded(pick(stats), 1));
  };

  const measurementRow = (
    measurement: SelectionMeasurement,
    index: number,
  ): HTMLTableRowElement => {
    const row = document.createElement("tr");
    row.dataset.measurement = String(index);

    const head = document.createElement("th");
    head.scope = "row";
    head.textContent = measurement.label;

    row.append(
      head,
      cell(`${rounded(measurement.start, 3)}–${rounded(measurement.end, 3)}`),
      cell(
        measurement.f0 === null
          ? options.es
            ? "sin voz"
            : "unvoiced"
          : rounded(measurement.f0.mean, 1),
      ),
      statsCell(measurement, (stats) => stats.median),
      statsCell(measurement, (stats) => stats.min),
      statsCell(measurement, (stats) => stats.max),
      cell(measurement.intensity === null ? "—" : rounded(measurement.intensity.mean, 1)),
    );

    for (const sample of measurement.f1) {
      row.append(sampleCell(sample.value));
    }
    for (const sample of measurement.f2) {
      row.append(sampleCell(sample.value));
    }

    return row;
  };

  const renderMeasurements = (): void => {
    if (measureBody !== null) {
      measureBody.replaceChildren();
      measurements.forEach((measurement, index) => {
        measureBody.append(measurementRow(measurement, index));
      });
    }

    if (measureEmpty !== null) {
      measureEmpty.hidden = measurements.length > 0;
    }
    // Sin filas, la tabla no se muestra: encabezados sin celdas es un estado que
    // axe no puede juzgar y que a nadie le sirve.
    if (measureTable !== null) {
      measureTable.hidden = measurements.length === 0;
    }
    if (measureExport !== null) {
      measureExport.disabled = measurements.length === 0;
    }
    if (measureClear !== null) {
      measureClear.disabled = measurements.length === 0;
    }
    drawVowels();
  };

  /* ----------------------------- acciones ----------------------------- */

  /**
   * Analisis con cache por parametros.
   *
   * La clave incluye los parametros porque cambiar el techo de F0 invalida el
   * contorno: reutilizarlo daria un grafico que no corresponde a los campos que
   * se ven en pantalla, que es peor que recalcular.
   */
  const ensurePitch = async (audio: AcousticAudio): Promise<AcousticError | null> => {
    const { floor, ceiling } = params();
    const key = `${floor}:${ceiling}:${audio.duration}`;
    if (pitch !== null && pitchKey === key) {
      return null;
    }
    const result = await port.pitch(decoded(audio), { floorHz: floor, ceilingHz: ceiling });
    if (!result.ok) {
      return result.error;
    }
    pitch = result.value;
    pitchKey = key;
    return null;
  };

  const ensureFormants = async (audio: AcousticAudio): Promise<AcousticError | null> => {
    const { maxFormantHz } = params();
    const key = `${maxFormantHz}:${audio.duration}`;
    if (formants.length > 0 && formantKey === key) {
      return null;
    }
    const result = await port.formants(decoded(audio), {
      maxFormantHz,
      count: FORMANT_COUNT,
    });
    if (!result.ok) {
      return result.error;
    }
    formants = result.value;
    formantKey = key;
    return null;
  };

  const ensureIntensity = async (audio: AcousticAudio): Promise<AcousticError | null> => {
    const key = `${INTENSITY_MIN_PITCH_HZ}:${audio.duration}`;
    if (intensity !== null && intensityKey === key) {
      return null;
    }
    const result = await port.intensity(decoded(audio), {
      minimumPitchHz: INTENSITY_MIN_PITCH_HZ,
    });
    if (!result.ok) {
      return result.error;
    }
    intensity = result.value;
    intensityKey = key;
    return null;
  };

  /**
   * Envuelve una accion asincrona con los tres estados que la pagina necesita:
   * ocupado, hecho y el motivo del fallo. `busy` evita que dos clics encolen dos
   * analisis sobre el mismo audio.
   */
  const guarded = (task: () => Promise<void>): void => {
    if (busy) {
      return;
    }
    busy = true;
    say(strings.text("acoustic.status.analysing"), "busy");
    void task()
      .catch((error: unknown) => {
        say(
          format(strings.text("acoustic.error.failed"), {
            detail: error instanceof Error ? error.message : String(error),
          }),
          "error",
        );
      })
      .finally(() => {
        busy = false;
      });
  };

  const runPitch = (): void => {
    guarded(async () => {
      const audio = withAudio();
      if (audio === null) {
        return;
      }
      const failure = await ensurePitch(audio);
      if (failure !== null) {
        say(describe(failure), "error");
        return;
      }
      drawPitch();
      const voiced = pitch?.values.filter((value) => value > 0).length ?? 0;
      say(format(strings.text("acoustic.status.f0"), { count: voiced }), "ok");
    });
  };

  const runFormants = (): void => {
    guarded(async () => {
      const audio = withAudio();
      if (audio === null) {
        return;
      }
      const failure = await ensureFormants(audio);
      if (failure !== null) {
        say(describe(failure), "error");
        return;
      }
      // La superposicion es la forma de ver los formantes; se enciende al
      // pedirlos para que el resultado no quede en un canvas invisible.
      if (formantOverlay !== null && !formantOverlay.checked) {
        formantOverlay.checked = true;
      }
      options.onOverlayChange();
      say(strings.text("acoustic.status.formants"), "ok");
    });
  };

  const runIntensity = (): void => {
    guarded(async () => {
      const audio = withAudio();
      if (audio === null) {
        return;
      }
      const failure = await ensureIntensity(audio);
      if (failure !== null) {
        say(describe(failure), "error");
        return;
      }
      drawIntensity();
      say(strings.text("acoustic.status.intensity"), "ok");
    });
  };

  /** Los tres analisis que una medicion necesita, en orden y con el primer fallo. */
  const ensureAnalyses = async (audio: AcousticAudio): Promise<AcousticError | null> => {
    const pitchFailure = await ensurePitch(audio);
    if (pitchFailure !== null) {
      return pitchFailure;
    }
    const formantFailure = await ensureFormants(audio);
    if (formantFailure !== null) {
      return formantFailure;
    }
    return ensureIntensity(audio);
  };

  /**
   * Intervalo a medir: el activo del visor o, si no hay ninguno, todo el audio.
   *
   * Devolver `null` cuando el intervalo es de duracion cero evita medir un punto
   * y presentarlo como un tramo.
   */
  const rangeToMeasure = (audio: AcousticAudio) => {
    const selection = options.getSelection();
    const range =
      selection === null
        ? { start: 0, end: audio.duration }
        : { start: selection.start, end: selection.end };
    return range.end - range.start <= 0 ? null : { range, selection };
  };

  /** Etiqueta de la fila: el texto del intervalo o, si esta vacio, su rango. */
  const labelFor = (
    selection: AcousticSelection | null,
    range: AcousticRange,
  ): string => {
    if (selection !== null && selection.label.trim() !== "") {
      return selection.label.trim();
    }
    return `${rounded(range.start, 3)}–${rounded(range.end, 3)} s`;
  };

  /**
   * Mide la seleccion.
   *
   * La seleccion es el intervalo activo del visor; si no hay ninguno se mide el
   * audio completo. Cual de las dos cosas se midio se lee en el intervalo que la
   * fila muestra, que no es decorativo: es la unica forma de saber que se midio.
   */
  const runMeasure = (): void => {
    guarded(async () => {
      const audio = withAudio();
      if (audio === null) {
        return;
      }

      const target = rangeToMeasure(audio);
      if (target === null) {
        say(strings.text("acoustic.error.noSelection"), "error");
        return;
      }
      const { range, selection } = target;

      const failure = await ensureAnalyses(audio);
      if (failure !== null) {
        say(describe(failure), "error");
        return;
      }

      const label = labelFor(selection, range);

      measurements = [
        ...measurements.filter((entry) => entry.label !== label || entry.start !== range.start),
        measureSelection({
          label,
          range,
          f0: pitch,
          formants,
          intensity,
        }),
      ].sort((left, right) => left.start - right.start);

      renderMeasurements();
      say(format(strings.text("acoustic.status.measured"), { count: measurements.length }), "ok");
    });
  };

  /* ------------------------------ eventos ----------------------------- */

  presetSelect?.addEventListener("change", () => {
    const preset = VOICE_PRESETS[presetSelect.value];
    if (preset === undefined) {
      return;
    }
    if (pitchFloor !== null) {
      pitchFloor.value = String(preset.floorHz);
    }
    if (pitchCeiling !== null) {
      pitchCeiling.value = String(preset.ceilingHz);
    }
    if (formantMax !== null) {
      formantMax.value = String(preset.maxFormantHz);
    }
    // Los rangos cambiaron: lo dibujado ya no corresponde a los campos visibles.
    pitch = null;
    formants = [];
  });

  pitchRun?.addEventListener("click", runPitch);
  formantRun?.addEventListener("click", runFormants);
  intensityRun?.addEventListener("click", runIntensity);
  measureRun?.addEventListener("click", runMeasure);

  formantOverlay?.addEventListener("change", () => {
    options.onOverlayChange();
  });

  measureExport?.addEventListener("click", () => {
    if (measurements.length === 0) {
      return;
    }
    const name = toFileName("acustica", "csv");
    downloadText(name, measurementsToCsv(measurements), "text/csv");
    say(format(strings.text("acoustic.status.exported"), { name }), "ok");
  });

  measureClear?.addEventListener("click", () => {
    measurements = [];
    renderMeasurements();
    say(strings.text("acoustic.status.cleared"), "ok");
  });

  renderMeasurements();
  say(strings.text("acoustic.status.idle"), "idle");

  return {
    drawOverlay(canvas, view, minHz, maxHz) {
      if (formantOverlay === null || !formantOverlay.checked) {
        return;
      }
      if (formants.length === 0) {
        return;
      }
      drawFormantOverlay(canvas, formants, {
        view,
        minHz,
        maxHz,
        palette: options.palette(),
      });
    },
    reset() {
      pitch = null;
      pitchKey = "";
      formants = [];
      formantKey = "";
      intensity = null;
      intensityKey = "";
      measurements = [];
      clearCanvas(f0Canvas);
      clearCanvas(intensityCanvas);
      renderMeasurements();
    },
  };
};
