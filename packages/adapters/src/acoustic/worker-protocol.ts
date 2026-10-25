/**
 * Mensajes entre el adaptador acustico y su Web Worker.
 *
 * Vive en su propio modulo para que el adaptador y el worker compartan la forma
 * sin importarse: el archivo del worker solo debe cargarse dentro de un Worker,
 * y el adaptador nunca debe arrastrar el WebAssembly al hilo principal.
 */

import type { AcousticTrack } from "@lingualab/core";
import type { AcousticError, FormantParams, IntensityParams, PitchParams } from "@lingualab/core";

/** Audio ya mezclado a mono y pasado a `Float64Array`, que es lo que exige el motor. */
interface AudioSamples {
  readonly samples: Float64Array;
  readonly sampleRate: number;
  readonly durationSeconds: number;
  /**
   * Donde vive el artefacto vendoreado. Viaja en cada pedido —y no dentro del
   * worker— porque el sitio puede servirse bajo un subpath (`/LinguaLab`) y la
   * ruta se decide en el composition root, que es quien conoce la base.
   */
  readonly baseUrl: string;
}

export type AcousticRequest =
  | ({ readonly id: number; readonly kind: "pitch"; readonly params: PitchParams } & AudioSamples)
  | ({
      readonly id: number;
      readonly kind: "formants";
      readonly params: FormantParams;
    } & AudioSamples)
  | ({
      readonly id: number;
      readonly kind: "intensity";
      readonly params: IntensityParams;
    } & AudioSamples);

/**
 * Una respuesta lleva siempre el `id` del pedido: el worker puede tener varios
 * en vuelo y sin el identificador una respuesta se le contestaria a quien no
 * pregunto.
 */
export type AcousticReply =
  | { readonly id: number; readonly ok: true; readonly tracks: readonly AcousticTrack[] }
  | { readonly id: number; readonly ok: false; readonly error: AcousticError };

/**
 * Lo que el adaptador necesita de un Worker. Es una interfaz propia —y no
 * `Worker`— para que la prueba pueda poner un doble en su lugar y afirmar que
 * el calculo se delega, en vez de comprobar el tipo de una variable.
 */
export type AcousticWorkerListener = (event: { readonly data?: unknown }) => void;

export interface AcousticWorker {
  postMessage(message: AcousticRequest, transfer?: Transferable[]): void;
  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: AcousticWorkerListener,
  ): void;
  terminate(): void;
}

/** Descarta lo que no tenga forma de respuesta antes de resolver una espera. */
export const isAcousticReply = (value: unknown): value is AcousticReply => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { id?: unknown; ok?: unknown };
  return typeof candidate.id === "number" && typeof candidate.ok === "boolean";
};
