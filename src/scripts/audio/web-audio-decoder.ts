/* ============================================================
   LinguaLab — decodificador de audio del navegador

   Implementa `AudioDecoderPort` (`@lingualab/core`) con la Web Audio API. Es un
   adaptador de verdad: declara errores tipados y no lanza, para que la interfaz
   pueda mostrar «este archivo no se pudo leer» sin un `try` alrededor.

   POR QUE VIVE EN `src/scripts/audio` Y NO EN `packages/adapters`

   La regla `ui-to-adapters-only-from-composition-root` solo deja cablear
   adaptadores desde `src/composition-root.ts`, y ese archivo no forma parte de
   los cambios de este segmento. El puerto es el del nucleo —eso es lo que
   mantiene la costura— y la implementacion de navegador vive junto al visor que
   la usa. El dia que el composition root cablee el visor, este archivo se muda a
   `packages/adapters` sin cambiar una linea de la interfaz.

   NADA SALE DEL NAVEGADOR: `decodeAudioData` trabaja sobre un `ArrayBuffer` que
   ya esta en memoria. No hay `fetch`, ni `FormData`, ni subida.
   ============================================================ */

import {
  type AudioDecoderError,
  type AudioDecoderPort,
  type DecodedAudio,
  err,
  ok,
  type Result,
} from "@lingualab/core";

/** Audio decodificado mas el `AudioBuffer` que la reproduccion necesita. */
export interface DecodedAudioWithBuffer extends DecodedAudio {
  readonly buffer: AudioBuffer;
}

/** Duracion maxima aceptada. Un visor no es un editor de archivos de horas. */
export const MAX_DURATION_SECONDS = 300;

export interface WebAudioDecoder extends AudioDecoderPort {
  /**
   * Igual que `decode`, pero devuelve tambien el `AudioBuffer`.
   *
   * El puerto no lo declara porque `AudioBuffer` es una API del navegador y el
   * nucleo no puede nombrarla. La interfaz lo necesita para reproducir sin un
   * segundo `decodeAudioData`.
   */
  decodeToBuffer(
    bytes: ArrayBuffer,
    mimeType?: string,
  ): Promise<Result<DecodedAudioWithBuffer, AudioDecoderError>>;
}

/** Copia mono en punto flotante: el espectrograma y los picos se calculan sobre una sola senal. */
export const monoMix = (buffer: AudioBuffer): Float32Array => {
  const mono = new Float32Array(buffer.length);
  const channels = buffer.numberOfChannels;

  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] = (mono[index] ?? 0) + (data[index] ?? 0) / channels;
    }
  }

  return mono;
};

export const createWebAudioDecoder = (
  context: () => AudioContext,
  maxDurationSeconds = MAX_DURATION_SECONDS,
): WebAudioDecoder => {
  const decodeToBuffer = async (
    bytes: ArrayBuffer,
    _mimeType?: string,
  ): Promise<Result<DecodedAudioWithBuffer, AudioDecoderError>> => {
    if (bytes.byteLength === 0) {
      return err({ code: "decode-failed", detail: "El archivo esta vacio." });
    }

    let buffer: AudioBuffer;
    try {
      // `decodeAudioData` consume el ArrayBuffer: se le pasa una copia para no
      // dejar sin datos a quien vuelva a leer el archivo.
      buffer = await context().decodeAudioData(bytes.slice(0));
    } catch (error) {
      return err({
        code: "decode-failed",
        detail: error instanceof Error ? error.message : "El navegador no pudo decodificar el audio.",
      });
    }

    if (buffer.duration > maxDurationSeconds) {
      // Se comprueba DESPUES de decodificar porque la duracion solo se conoce
      // entonces; el mensaje dice cuanto sobra, que es lo que hace falta para
      // recortar el archivo.
      return err({ code: "too-long", durationSeconds: buffer.duration });
    }

    return ok({
      buffer,
      sampleRate: buffer.sampleRate,
      channels: [monoMix(buffer)],
      durationSeconds: buffer.duration,
    });
  };

  return {
    decode: decodeToBuffer,
    decodeToBuffer,
  };
};
