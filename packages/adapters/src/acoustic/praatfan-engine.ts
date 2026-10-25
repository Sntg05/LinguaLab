/**
 * Motor de analisis acustico sobre el build WebAssembly de praatfan.
 *
 * ESTE ARCHIVO NO DECIDE DONDE CORRE: solo mide
 *
 * El motor es una funcion pura de (senal, parametros) a pistas, sin DOM y sin
 * `Worker`. Lo importa el worker en el navegador y la prueba de contrato en
 * Node: una sola implementacion, dos entornos. Si el motor creara el worker, la
 * prueba del hilo principal tendria que simular un navegador para afirmar algo
 * que aqui se puede afirmar leyendo quien importa a quien.
 *
 * POR QUE PRAATFAN Y NO UN ALGORITMO PROPIO
 *
 * El prompt del segmento lo pide explicitamente y la razon es verificable: es
 * una reimplementacion de los algoritmos de Praat, asi que sus numeros son
 * comparables con los de Praat. Un detector de F0 escrito a mano daria valores
 * plausibles y incomparables, y «experimental» dejaria de ser una advertencia
 * para volverse una excusa. El artefacto esta vendoreado en
 * `public/praatfan/`, con su procedencia y sus hashes; no se pide a un CDN.
 *
 * NADA DE `new WebAssembly.Module(bytes)` CON BYTES DE UN STRING: el `.wasm`
 * que se instancia es el del repositorio, y en el navegador se le pasa su URL.
 */

import type { AcousticTrack } from "@lingualab/core";
import type { AcousticError, FormantParams, IntensityParams, PitchParams } from "@lingualab/core";
import { err, ok, type Result } from "@lingualab/core";
import { isPraatfanModule, type PraatfanModule, type PraatfanSound } from "./praatfan-module";

/**
 * Debajo de esto no hay nada que medir: el contorno de F0 necesita varios
 * periodos y la ventana de formantes mide 25 ms. Se rechaza con un error
 * tipado en vez de devolver una pista vacia que pareceria un silencio.
 */
export const MIN_ANALYSIS_SECONDS = 0.05;

/** Praat usa 0 para «paso automatico»: lo deriva del piso de F0. */
const AUTOMATIC_TIME_STEP = 0;
const FORMANT_WINDOW_SECONDS = 0.025;
const PRE_EMPHASIS_FROM_HZ = 50;

/**
 * De donde sale el artefacto.
 *
 * En el navegador, `moduleUrl` y `wasmUrl` son rutas del mismo origen. En Node
 * se pasan los bytes del `.wasm` porque `fetch` no lee `file://`: el `init` de
 * wasm-pack acepta `BufferSource` ademas de una URL, y esa es la unica razon
 * por la que la prueba de contrato puede correr con el motor de verdad.
 */
export interface PraatfanSources {
  readonly moduleUrl: string;
  readonly wasmUrl?: string;
  readonly wasmBytes?: Uint8Array;
}

export interface PraatfanEngine {
  isLoaded(): boolean;
  pitch(
    samples: Float64Array,
    sampleRate: number,
    params: PitchParams,
  ): Promise<Result<AcousticTrack, AcousticError>>;
  formants(
    samples: Float64Array,
    sampleRate: number,
    params: FormantParams,
  ): Promise<Result<readonly AcousticTrack[], AcousticError>>;
  intensity(
    samples: Float64Array,
    sampleRate: number,
    params: IntensityParams,
  ): Promise<Result<AcousticTrack, AcousticError>>;
}

const detail = (error: unknown): string =>
  error instanceof Error && error.message !== "" ? error.message : String(error);

const durationOf = (samples: Float64Array, sampleRate: number): number =>
  sampleRate > 0 ? samples.length / sampleRate : 0;

/**
 * Tiempos y valores como listas paralelas de numeros.
 *
 * Los marcos sin valor llegan como `NaN` (convencion de Praat) y aqui se
 * convierten en 0: el dominio declara que «sin voz» es 0 y no un hueco, para
 * que las dos listas sigan teniendo el mismo largo. Un `NaN` en el graficador
 * rompe la linea entera.
 */
const toTrack = (
  kind: AcousticTrack["kind"],
  times: Float64Array,
  values: Float64Array,
): AcousticTrack => {
  const length = Math.min(times.length, values.length);
  const timeList: number[] = [];
  const valueList: number[] = [];

  for (let index = 0; index < length; index += 1) {
    const time = times[index];
    const value = values[index];
    if (time === undefined || !Number.isFinite(time)) {
      continue;
    }
    timeList.push(time);
    valueList.push(value !== undefined && Number.isFinite(value) ? value : 0);
  }

  return { kind, times: timeList, values: valueList };
};

const tooShort = (samples: Float64Array, sampleRate: number): Result<never, AcousticError> =>
  err({ code: "too-short", durationSeconds: durationOf(samples, sampleRate) });

const checkLength = (
  samples: Float64Array,
  sampleRate: number,
): Result<true, AcousticError> | null => {
  if (sampleRate <= 0) {
    return err({ code: "analysis-failed", detail: "la frecuencia de muestreo no es valida" });
  }
  if (durationOf(samples, sampleRate) < MIN_ANALYSIS_SECONDS) {
    return tooShort(samples, sampleRate) as Result<true, AcousticError>;
  }
  return null;
};

export const createPraatfanEngine = (sources: PraatfanSources): PraatfanEngine => {
  let module: PraatfanModule | null = null;
  let loading: Promise<PraatfanModule> | null = null;

  /**
   * Trae e inicializa el modulo una sola vez.
   *
   * El `init` se llama con la URL del `.wasm` en el navegador y con sus bytes en
   * Node. Se pasa SIEMPRE un objeto (`{ module_or_path }`) porque la forma
   * posicional esta marcada como obsoleta por wasm-bindgen y emite un aviso por
   * consola en cada carga.
   */
  const load = async (): Promise<PraatfanModule> => {
    if (module !== null) {
      return module;
    }
    loading ??= (async () => {
      // El import es dinamico y con la ruta en una variable: el empaquetador no
      // debe intentar resolverlo, porque el modulo se sirve desde `public/`
      // —fijado por hash— y no desde `node_modules`.
      const imported: unknown = await import(/* @vite-ignore */ sources.moduleUrl);
      if (!isPraatfanModule(imported)) {
        throw new Error(`el modulo de praatfan no tiene la forma esperada: ${sources.moduleUrl}`);
      }

      const input: unknown = sources.wasmBytes ?? sources.wasmUrl;
      if (input === undefined) {
        throw new Error("no hay de donde cargar el wasm de praatfan");
      }
      await imported.default({ module_or_path: input });

      module = imported;
      return imported;
    })();

    try {
      return await loading;
    } catch (error) {
      // Un intento fallido no se cachea: la proxima llamada reintenta en vez de
      // dejar la herramienta muerta para siempre por un error transitorio.
      loading = null;
      throw error;
    }
  };

  const sound = (loaded: PraatfanModule, samples: Float64Array, sampleRate: number) =>
    new loaded.Sound(samples, sampleRate);

  const run = async <T>(task: (loaded: PraatfanModule) => T): Promise<Result<T, AcousticError>> => {
    let loaded: PraatfanModule;
    try {
      loaded = await load();
    } catch (error) {
      return err({ code: "unavailable", detail: detail(error) });
    }
    try {
      return ok(task(loaded));
    } catch (error) {
      return err({ code: "analysis-failed", detail: detail(error) });
    }
  };

  return {
    isLoaded: () => module !== null,

    async pitch(samples, sampleRate, params) {
      const problem = checkLength(samples, sampleRate);
      if (problem !== null) {
        return problem as Result<AcousticTrack, AcousticError>;
      }

      const result = await run((loaded: PraatfanModule) => {
        const tone: PraatfanSound = sound(loaded, samples, sampleRate);
        const contour = tone.to_pitch(AUTOMATIC_TIME_STEP, params.floorHz, params.ceilingHz);
        return toTrack("f0", contour.times(), contour.values());
      });

      return result;
    },

    async formants(samples, sampleRate, params) {
      const problem = checkLength(samples, sampleRate);
      if (problem !== null) {
        return problem as Result<readonly AcousticTrack[], AcousticError>;
      }

      return run((loaded: PraatfanModule) => {
        const tone: PraatfanSound = sound(loaded, samples, sampleRate);
        const analysis = tone.to_formant_burg(
          AUTOMATIC_TIME_STEP,
          Math.max(1, Math.round(params.count)),
          params.maxFormantHz,
          FORMANT_WINDOW_SECONDS,
          PRE_EMPHASIS_FROM_HZ,
        );
        const times = analysis.times();
        const tracks: AcousticTrack[] = [];

        // Se piden tantas pistas como formantes se pidieron, y nunca mas de los
        // que el analisis devolvio: pedir F4 a un analisis de 3 formantes
        // devuelve una lista vacia que se dibujaria como una linea en cero.
        const count = Math.min(Math.max(1, Math.round(params.count)), analysis.max_num_formants);
        for (let number = 1; number <= count; number += 1) {
          tracks.push(toTrack("formant", times, analysis.formant_values(number)));
        }
        return tracks;
      });
    },

    async intensity(samples, sampleRate, params) {
      const problem = checkLength(samples, sampleRate);
      if (problem !== null) {
        return problem as Result<AcousticTrack, AcousticError>;
      }

      return run((loaded: PraatfanModule) => {
        const tone: PraatfanSound = sound(loaded, samples, sampleRate);
        const contour = tone.to_intensity(params.minimumPitchHz, AUTOMATIC_TIME_STEP);
        return toTrack("intensity", contour.times(), contour.values());
      });
    },
  };
};
