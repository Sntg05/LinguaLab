/**
 * Controlador de los paneles de analisis acustico del visor.
 *
 * QUE DECIDE ESTE ARCHIVO Y QUE NO
 *
 * Decide con que parametros se analiza (piso y techo del tono, frecuencia
 * maxima de los formantes) y mide la seleccion. No pide nada al motor
 * directamente: los analisis, uno por magnitud, viven en `acoustic-tracks.ts`,
 * que los guarda y los manda al worker de a uno. Las curvas sobre el
 * espectrograma son de `acoustic-overlay.ts` (unidad 5.3): este panel ya no
 * tiene botones ni lienzos por magnitud, porque en Praat las curvas se ven
 * solas sobre el espectrograma. No dibuja geometria (`acoustic-render.ts`) ni
 * calcula estadistica (`acoustic-measure.ts`).
 *
 * POR QUE LOS ANALISIS LLEGAN COMO PARAMETRO
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

import type { AcousticError } from "@lingualab/core";
import type { Palette } from "./render";
import {
  measureSelection,
  measurementsToCsv,
  vowelPoints,
  type AcousticRange,
  type SelectionMeasurement,
} from "./acoustic-measure";
import { measurementRow } from "./acoustic-measure-table";
import { drawVowelChart } from "./acoustic-render";
import type { AcousticAudio, AcousticTracks, TrackParams } from "./acoustic-tracks";
import { format } from "./strings";
import type { AcousticStrings } from "./acoustic-strings";
import { downloadText, toFileName } from "./files";

export type { AcousticAudio } from "./acoustic-tracks";

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
  readonly tracks: AcousticTracks;
  readonly strings: AcousticStrings;
  readonly es: boolean;
  readonly getAudio: () => AcousticAudio | null;
  readonly getSelection: () => AcousticSelection | null;
  readonly palette: () => Palette;
  /** Cambio un parametro: el visor vuelve a pintar y las curvas se recalculan. */
  readonly onParamsChange: () => void;
}

export interface AcousticPanels {
  /** Los parametros saneados que se ven en los campos del panel. */
  params(): TrackParams;
  /** El audio cambio: las mediciones anteriores ya no valen. */
  reset(): void;
}

const DEFAULT_PITCH = { floorHz: 75, ceilingHz: 600 };
const DEFAULT_FORMANT_HZ = 5500;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export interface AcousticParamsInput {
  readonly floorHz: number;
  readonly ceilingHz: number;
  readonly maxFormantHz: number;
}

export type AcousticParams = TrackParams;

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
  const { root, strings, tracks } = options;
  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);

  const status = $<HTMLElement>("[data-acoustic-status]");
  const presetSelect = $<HTMLSelectElement>("[data-acoustic-preset]");
  const pitchFloor = $<HTMLInputElement>("[data-acoustic-pitch-floor]");
  const pitchCeiling = $<HTMLInputElement>("[data-acoustic-pitch-ceiling]");
  const formantMax = $<HTMLInputElement>("[data-acoustic-formant-max]");
  const measureRun = $<HTMLButtonElement>("[data-acoustic-measure-run]");
  const measureExport = $<HTMLButtonElement>("[data-acoustic-measure-export]");
  const measureClear = $<HTMLButtonElement>("[data-acoustic-measure-clear]");
  const measureEmpty = $<HTMLElement>("[data-acoustic-measure-empty]");
  const measureBody = $<HTMLTableSectionElement>("[data-acoustic-measure-body]");
  const measureTable = $<HTMLTableElement>("[data-acoustic-measure-table]");
  const vowelCanvas = $<HTMLCanvasElement>("[data-acoustic-vowels-canvas]");
  const vowelEmpty = $<HTMLElement>("[data-acoustic-vowels-empty]");

  if (status === null) {
    return null;
  }

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

  const renderMeasurements = (): void => {
    if (measureBody !== null) {
      measureBody.replaceChildren();
      measurements.forEach((measurement, index) => {
        measureBody.append(measurementRow(measurement, index, options.es));
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

  /**
   * Los tres analisis que una medicion necesita, sobre el audio completo.
   *
   * Pasan por `acoustic-tracks.ts`, que guarda cada resultado con su tramo y sus
   * parametros: cambiar el techo de F0 invalida el contorno, y reutilizarlo
   * mediria con parametros que no son los de los campos. Si el audio se ve
   * entero, el tramo es el mismo que el de las curvas y no se recalcula.
   */
  const analyseAll = async (audio: AcousticAudio) => {
    const range = { start: 0, end: audio.duration };
    const current = params();
    const pitch = await tracks.pitch(audio, range, current);
    if (!pitch.ok) {
      return pitch;
    }
    const formants = await tracks.formants(audio, range, current);
    if (!formants.ok) {
      return formants;
    }
    const intensity = await tracks.intensity(audio, range, current);
    if (!intensity.ok) {
      return intensity;
    }
    return {
      ok: true as const,
      value: { pitch: pitch.value, formants: formants.value, intensity: intensity.value },
    };
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

      const analyses = await analyseAll(audio);
      if (!analyses.ok) {
        say(describe(analyses.error), "error");
        return;
      }
      const { pitch, formants, intensity } = analyses.value;

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
    // Los rangos cambiaron: las curvas se recalculan con los campos visibles.
    options.onParamsChange();
  });

  // Cambiar un campo a mano tambien recalcula, como al cambiar un ajuste en
  // Praat. `change` y no `input`: escribir «600» no debe analizar con 6 y 60.
  for (const input of [pitchFloor, pitchCeiling, formantMax]) {
    input?.addEventListener("change", () => options.onParamsChange());
  }

  measureRun?.addEventListener("click", runMeasure);

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
    params,
    reset() {
      measurements = [];
      renderMeasurements();
    },
  };
};
