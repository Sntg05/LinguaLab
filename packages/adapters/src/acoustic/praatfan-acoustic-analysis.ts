/**
 * Adaptador de `AcousticAnalysisPort` sobre praatfan en un Web Worker.
 *
 * EL CALCULO NO OCURRE AQUI
 *
 * Este archivo solo habla con el worker: convierte el audio a mono, manda el
 * pedido con sus parametros y traduce la respuesta al `Result` del puerto. El
 * WebAssembly y las matrices de autocorrelacion viven en
 * `praatfan-worker.ts`, importado por nadie mas que el propio worker. Si el
 * motor se importara desde aqui, quedaria en el paquete de la pagina y cada
 * visita pagaria el analisis aunque no midiera nada.
 *
 * NADA LANZA
 *
 * El puerto declara errores tipados porque «el modulo no cargo» es un estado
 * esperable —wasm ausente, CSP, navegador sin soporte, worker que muere— y no un
 * defecto de programacion. Un `try` en la interfaz para atajar una excepcion del
 * analisis seria tapar la distincion que el contrato pide.
 *
 * EL ARTEFACTO ES DEL MISMO ORIGEN
 *
 * `baseUrl` la decide el composition root (`/praatfan`, con la base del sitio ya
 * aplicada). Nunca es un CDN: la CSP sin origenes externos y la promesa de que
 * la herramienta funciona sin conexion despues de la primera carga lo impiden.
 */

import type {
  AcousticAnalysisPort,
  AcousticError,
  AcousticTrack,
  DecodedAudio,
  FormantParams,
  IntensityParams,
  PitchParams,
  Result,
} from "@lingualab/core";
import { err, ok } from "@lingualab/core";
import type {
  AcousticReply,
  AcousticRequest,
  AcousticWorker,
  AcousticWorkerListener,
} from "./worker-protocol";
import { isAcousticReply } from "./worker-protocol";

export interface PraatfanAcousticAnalysisOptions {
  /**
   * Carpeta donde viven `praatfan_gpl.js` y `praatfan_gpl_bg.wasm`, con la base
   * del sitio ya aplicada. Por defecto `/praatfan`, que es donde el build los
   * publica.
   */
  readonly baseUrl?: string;
  /** Corte de espera por pedido. Analizar 300 s de audio en wasm tarda. */
  readonly timeoutMs?: number;
  /**
   * Fabrica del worker. Existe para que la prueba pueda poner un doble: en el
   * navegador se crea uno real y en Node no hay `Worker` que crear.
   */
  readonly createWorker?: () => AcousticWorker | null;
}

export interface PraatfanAcousticAnalysis extends AcousticAnalysisPort {
  /** Termina el worker. La instancia queda inservible, y decirlo es parte del contrato. */
  dispose(): void;
}

const DEFAULT_BASE_URL = "/praatfan";
const DEFAULT_TIMEOUT_MS = 120_000;

interface Waiting {
  readonly resolve: (reply: AcousticReply) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Mezcla a mono en `Float64Array`, que es el tipo que exige el motor.
 *
 * Se copia a proposito: el worker recibe el buffer transferido, y transferir el
 * arreglo original dejaria al visor sin muestras para el espectrograma y el
 * dibujo. Copiar 300 s de audio son unos pocos megabytes y el ADR 0002 ya fijo
 * que sin `SharedArrayBuffer` la copia es el precio de funcionar en Pages.
 */
const toMono = (audio: DecodedAudio): Float64Array => {
  const channels = audio.channels;
  if (channels.length === 0) {
    return new Float64Array(0);
  }
  const first = channels[0];
  if (channels.length === 1 && first !== undefined) {
    return Float64Array.from(first);
  }

  const length = channels.reduce((longest, channel) => Math.max(longest, channel.length), 0);
  const mono = new Float64Array(length);
  for (const channel of channels) {
    for (let index = 0; index < channel.length; index += 1) {
      mono[index] = (mono[index] ?? 0) + (channel[index] ?? 0) / channels.length;
    }
  }
  return mono;
};

const trimSlash = (value: string): string => value.replace(/\/+$/, "");

/**
 * Crea el worker del analisis.
 *
 * La ruta se escribe como `new URL(..., import.meta.url)` —y no como una cadena
 * suelta— para que el empaquetador sepa que ese archivo es un punto de entrada
 * de worker y lo compile aparte. Si el navegador no tiene `Worker`, devuelve
 * `null` y el adaptador responde `unavailable`: la interfaz muestra el motivo en
 * vez de quedarse esperando una respuesta que nunca va a llegar.
 */
const defaultCreateWorker = (): AcousticWorker | null => {
  if (typeof Worker === "undefined") {
    return null;
  }
  try {
    const worker = new Worker(new URL("./praatfan-worker.ts", import.meta.url), {
      type: "module",
      name: "lingualab-acoustic",
    });
    return worker as unknown as AcousticWorker;
  } catch {
    return null;
  }
};

export const createPraatfanAcousticAnalysis = (
  options: PraatfanAcousticAnalysisOptions = {},
): PraatfanAcousticAnalysis => {
  const baseUrl = trimSlash(options.baseUrl ?? DEFAULT_BASE_URL);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const createWorker = options.createWorker ?? defaultCreateWorker;

  const waiting = new Map<number, Waiting>();
  let worker: AcousticWorker | null = null;
  let loaded = false;
  let disposed = false;
  let nextId = 1;

  /** Contesta todo lo pendiente con un mismo fallo: nada queda esperando. */
  const failAll = (failure: AcousticError): void => {
    for (const [id, entry] of waiting) {
      clearTimeout(entry.timer);
      waiting.delete(id);
      entry.resolve({ id, ok: false, error: failure });
    }
  };

  const unavailable = (detail: string): AcousticError => ({ code: "unavailable", detail });

  const ensureWorker = (): AcousticWorker | null => {
    if (disposed) {
      return null;
    }
    if (worker !== null) {
      return worker;
    }

    const created = createWorker();
    if (created === null) {
      return null;
    }
    worker = created;

    const onMessage: AcousticWorkerListener = (event) => {
      if (!isAcousticReply(event.data)) {
        return;
      }
      const reply = event.data;
      const entry = waiting.get(reply.id);
      if (entry === undefined) {
        return;
      }
      waiting.delete(reply.id);
      clearTimeout(entry.timer);
      if (reply.ok) {
        loaded = true;
      }
      entry.resolve(reply);
    };

    worker.addEventListener("message", onMessage);
    // Un worker que no arranca —o que muere a mitad de un pedido— nunca
    // contesta. Sin esto, el visor se quedaria «analizando» para siempre.
    worker.addEventListener("error", () => {
      failAll(unavailable("el worker de analisis acustico fallo"));
    });
    worker.addEventListener("messageerror", () => {
      failAll(unavailable("el worker de analisis acustico envio un mensaje ilegible"));
    });

    return worker;
  };

  const request = async (
    message: Omit<AcousticRequest, "id"> & { readonly id?: number },
  ): Promise<Result<readonly AcousticTrack[], AcousticError>> => {
    const target = ensureWorker();
    if (target === null) {
      return err(
        unavailable(
          disposed
            ? "el analisis acustico se cerro"
            : "este navegador no ofrece Web Workers para el analisis acustico",
        ),
      );
    }

    const id = nextId++;
    const full = { ...message, id } as AcousticRequest;

    const reply = await new Promise<AcousticReply>((resolve) => {
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve({
          id,
          ok: false,
          error: {
            code: "analysis-failed",
            detail: `el analisis no respondio en ${timeoutMs} ms`,
          },
        });
      }, timeoutMs);

      waiting.set(id, { resolve, timer });

      try {
        target.postMessage(full, [full.samples.buffer]);
      } catch (error) {
        clearTimeout(timer);
        waiting.delete(id);
        resolve({
          id,
          ok: false,
          error: unavailable(error instanceof Error ? error.message : String(error)),
        });
      }
    });

    if (!reply.ok) {
      return err(reply.error);
    }
    if (reply.tracks.length === 0) {
      return err({ code: "analysis-failed", detail: "el analisis no devolvio ninguna pista" });
    }
    return ok(reply.tracks);
  };

  const pitch = async (
    audio: DecodedAudio,
    params: PitchParams,
  ): Promise<Result<AcousticTrack, AcousticError>> => {
    const result = await request({
      kind: "pitch",
      params,
      samples: toMono(audio),
      sampleRate: audio.sampleRate,
      durationSeconds: audio.durationSeconds,
      baseUrl,
    });
    if (!result.ok) {
      return result;
    }
    const track = result.value[0];
    return track === undefined
      ? err({ code: "analysis-failed", detail: "el analisis no devolvio la pista de F0" })
      : ok(track);
  };

  const formants = async (
    audio: DecodedAudio,
    params: FormantParams,
  ): Promise<Result<readonly AcousticTrack[], AcousticError>> =>
    request({
      kind: "formants",
      params,
      samples: toMono(audio),
      sampleRate: audio.sampleRate,
      durationSeconds: audio.durationSeconds,
      baseUrl,
    });

  const intensity = async (
    audio: DecodedAudio,
    params: IntensityParams,
  ): Promise<Result<AcousticTrack, AcousticError>> => {
    const result = await request({
      kind: "intensity",
      params,
      samples: toMono(audio),
      sampleRate: audio.sampleRate,
      durationSeconds: audio.durationSeconds,
      baseUrl,
    });
    if (!result.ok) {
      return result;
    }
    const track = result.value[0];
    return track === undefined
      ? err({ code: "analysis-failed", detail: "el analisis no devolvio la pista de intensidad" })
      : ok(track);
  };

  return {
    // `isAvailable` responde por el modulo YA cargado, como pide el puerto: antes
    // del primer analisis exitoso la respuesta honesta es que no se sabe, y la
    // interfaz lo resuelve intentando, no preguntando.
    isAvailable: () => loaded,
    pitch,
    formants,
    intensity,
    dispose: () => {
      disposed = true;
      failAll(unavailable("el analisis acustico se cerro"));
      worker?.terminate();
      worker = null;
    },
  };
};
