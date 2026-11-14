/**
 * Analisis acustico por tramo, con cache y de a un pedido por vez.
 *
 * POR QUE UN MODULO APARTE
 *
 * Dos partes del visor piden lo mismo al motor: las curvas sobre el
 * espectrograma (el tramo visible, unidad 5.3) y la medicion de la seleccion
 * (el audio completo). Con un solo lugar que pide y guarda, un audio corto que
 * se ve entero se analiza una sola vez para las dos. Cada magnitud —tono,
 * formantes, intensidad— es una entrada de `MAGNITUDES`, con su clave y su
 * llamada al puerto; agregar una es agregar una entrada.
 *
 * EL TRAMO SE ANALIZA COMO UN AUDIO CORTO
 *
 * Se cortan las muestras del tramo y el motor lo ve como un audio que empieza en
 * 0. Por eso cada pista vuelve con los instantes desplazados al eje del audio
 * completo (`shiftTrack`): sin eso la curva quedaria dibujada al principio de la
 * vista y no sobre el sonido que la produjo.
 *
 * EL LIMITE DE 10 SEGUNDOS ES EL DE PRAAT
 *
 * Praat no analiza si se ven mas de 10 s («longest analysis», menu View de la
 * ventana de sonido) y escribe en su lugar que hay que acercarse. Aqui igual:
 * `planVisibleAnalysis` devuelve `skip` y la pagina lo dice; no se dibuja una
 * curva de otro tramo ni se inventa una.
 */

import type {
  AcousticAnalysisPort,
  AcousticError,
  AcousticTrack,
  DecodedAudio,
  Result,
} from "@lingualab/core";
import type { ViewWindow } from "./view";

/** Duracion visible maxima que se analiza, en segundos, como en Praat. */
export const LONGEST_ANALYSIS_SECONDS = 10;

/** Formantes que se piden: F1 a F3, los que se leen en un grafico vocalico. */
export const FORMANT_COUNT = 3;

/** Piso de tono con que se calcula la intensidad (Praat: «minimum pitch»). */
export const INTENSITY_MIN_PITCH_HZ = 100;

/** Lo que el visor tiene cargado y el analisis necesita. */
export interface AcousticAudio {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly duration: number;
}

export interface AnalysisRange {
  readonly start: number;
  readonly end: number;
}

/** Parametros ya saneados (ver `analysisParams` en `acoustic-analysis.ts`). */
export interface TrackParams {
  readonly floor: number;
  readonly ceiling: number;
  readonly maxFormantHz: number;
}

export type VisiblePlan =
  | { readonly kind: "skip"; readonly span: number }
  | { readonly kind: "reuse" }
  | { readonly kind: "analyse"; readonly range: AnalysisRange };

/**
 * Que hacer con la ventana visible.
 *
 * El margen —un cuarto de lo visible a cada lado, al menos 50 ms— evita que la
 * curva se corte en los bordes: el tono necesita una ventana de varios periodos
 * y los primeros marcos de un tramo quedan sin valor. Tambien deja desplazar un
 * poco la vista sin volver a analizar.
 */
export const planVisibleAnalysis = (
  view: ViewWindow,
  duration: number,
  covered?: AnalysisRange,
): VisiblePlan => {
  const span = view.end - view.start;
  if (span > LONGEST_ANALYSIS_SECONDS) {
    return { kind: "skip", span };
  }
  if (covered !== undefined && covered.start <= view.start && covered.end >= view.end) {
    return { kind: "reuse" };
  }
  const margin = Math.max(span * 0.25, 0.05);
  return {
    kind: "analyse",
    range: {
      start: Math.max(0, view.start - margin),
      end: Math.min(duration, view.end + margin),
    },
  };
};

/** Las muestras de un tramo, como un audio que empieza en 0. */
export const sliceAudio = (audio: AcousticAudio, range: AnalysisRange): AcousticAudio => {
  const first = Math.max(0, Math.floor(range.start * audio.sampleRate));
  const last = Math.min(audio.samples.length, Math.ceil(range.end * audio.sampleRate));
  const samples = audio.samples.subarray(first, Math.max(first, last));
  return {
    samples,
    sampleRate: audio.sampleRate,
    duration: samples.length / audio.sampleRate,
  };
};

/** Devuelve los instantes de una pista al eje del audio completo. */
export const shiftTrack = (track: AcousticTrack, offset: number): AcousticTrack => ({
  ...track,
  times: track.times.map((time) => time + offset),
});

type Outcome<T> = Result<T, AcousticError>;

interface Magnitude<T> {
  readonly key: (params: TrackParams) => string;
  readonly run: (
    port: AcousticAnalysisPort,
    audio: DecodedAudio,
    params: TrackParams,
  ) => Promise<Outcome<T>>;
  readonly shift: (value: T, offset: number) => T;
}

/** Una entrada por magnitud: que parametros la cambian y como se le pide al motor. */
const MAGNITUDES = {
  pitch: {
    key: (params) => `${params.floor}:${params.ceiling}`,
    run: (port, audio, params) =>
      port.pitch(audio, { floorHz: params.floor, ceilingHz: params.ceiling }),
    shift: shiftTrack,
  } satisfies Magnitude<AcousticTrack>,
  formants: {
    key: (params) => `${params.maxFormantHz}`,
    run: (port, audio, params) =>
      port.formants(audio, { maxFormantHz: params.maxFormantHz, count: FORMANT_COUNT }),
    shift: (tracks, offset) => tracks.map((track) => shiftTrack(track, offset)),
  } satisfies Magnitude<readonly AcousticTrack[]>,
  intensity: {
    key: () => `${INTENSITY_MIN_PITCH_HZ}`,
    run: (port, audio) => port.intensity(audio, { minimumPitchHz: INTENSITY_MIN_PITCH_HZ }),
    shift: shiftTrack,
  } satisfies Magnitude<AcousticTrack>,
};

/** Cuantos resultados se guardan por magnitud: la vista y el audio completo, y algo mas. */
const CACHE_SIZE = 4;

export interface AcousticTracks {
  pitch(audio: AcousticAudio, range: AnalysisRange, params: TrackParams): Promise<Outcome<AcousticTrack>>;
  formants(
    audio: AcousticAudio,
    range: AnalysisRange,
    params: TrackParams,
  ): Promise<Outcome<readonly AcousticTrack[]>>;
  intensity(
    audio: AcousticAudio,
    range: AnalysisRange,
    params: TrackParams,
  ): Promise<Outcome<AcousticTrack>>;
  /** El audio cambio: nada de lo guardado le corresponde. */
  reset(): void;
}

export const createAcousticTracks = (port: AcousticAnalysisPort): AcousticTracks => {
  const caches = new Map<string, Map<string, Promise<unknown>>>();

  // Un pedido por vez: el worker del motor atiende de a uno, y encolar aqui
  // evita depender de que el adaptador soporte pedidos simultaneos.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const request = <T>(
    name: string,
    magnitude: Magnitude<T>,
    audio: AcousticAudio,
    range: AnalysisRange,
    params: TrackParams,
  ): Promise<Outcome<T>> => {
    const cache = caches.get(name) ?? new Map<string, Promise<unknown>>();
    caches.set(name, cache);
    const key = `${range.start}:${range.end}|${magnitude.key(params)}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached as Promise<Outcome<T>>;
    }

    const slice = sliceAudio(audio, range);
    const result = enqueue(async (): Promise<Outcome<T>> => {
      const outcome = await magnitude.run(
        port,
        { sampleRate: slice.sampleRate, durationSeconds: slice.duration, channels: [slice.samples] },
        params,
      );
      return outcome.ok
        ? { ok: true, value: magnitude.shift(outcome.value, range.start) }
        : outcome;
    });

    cache.set(key, result);
    while (cache.size > CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      cache.delete(oldest);
    }
    return result;
  };

  return {
    pitch: (audio, range, params) => request("pitch", MAGNITUDES.pitch, audio, range, params),
    formants: (audio, range, params) =>
      request("formants", MAGNITUDES.formants, audio, range, params),
    intensity: (audio, range, params) =>
      request("intensity", MAGNITUDES.intensity, audio, range, params),
    reset() {
      caches.clear();
    },
  };
};
