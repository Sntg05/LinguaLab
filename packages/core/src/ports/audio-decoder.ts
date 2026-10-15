import type { Result } from "../result";

/**
 * Audio decodificado a PCM en punto flotante, listo para analisis.
 *
 * `channels` es un arreglo de `Float32Array` porque es exactamente lo que
 * entrega la API de audio del navegador: convertir a arreglos normales
 * duplicaria la memoria de una grabacion de campo sin ganar nada.
 * `durationSeconds` viaja calculado aunque se pueda derivar de la longitud,
 * porque el error `too-long` necesita la duracion sin tener que decodificar
 * primero.
 */
export interface DecodedAudio {
  readonly sampleRate: number;
  readonly channels: readonly Float32Array[];
  readonly durationSeconds: number;
}

/** Fallos al decodificar audio. `too-long` lleva la duracion para poder avisar cuanto sobra. */
export type AudioDecoderError =
  | { readonly code: "unsupported-format"; readonly mimeType?: string }
  | { readonly code: "too-long"; readonly durationSeconds: number }
  | { readonly code: "decode-failed"; readonly detail?: string };

/**
 * Puerto de decodificacion de audio. `mimeType` es opcional porque un archivo
 * sin metadatos fiables se puede intentar decodificar a ciegas: rechazarlo
 * antes de probar seria descartar audio valido.
 */
export interface AudioDecoderPort {
  decode(bytes: ArrayBuffer, mimeType?: string): Promise<Result<DecodedAudio, AudioDecoderError>>;
}
