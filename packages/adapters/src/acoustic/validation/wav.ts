/**
 * Lector de WAV PCM de 16 bits para el arnes de validacion.
 *
 * POR QUE UN LECTOR PROPIO Y NO `decodeAudioData`
 *
 * El arnes corre en Node, donde no hay Web Audio, y las referencias de Praat
 * son WAV PCM: es el formato en que Praat guarda un recorte de trabajo. Se
 * acepta solo lo que se sabe leer —PCM sin comprimir, 8 o 16 bits, mono o
 * estereo— y todo lo demas se rechaza con un motivo en vez de devolver muestras
 * inventadas. Un flotante IEEE (formato 3) es comun en Praat: si aparece, el
 * mensaje lo dice, porque el camino es convertir el archivo, no adivinar.
 */

import type { Result } from "@lingualab/core";
import { err, ok } from "@lingualab/core";

export interface DecodedWav {
  readonly sampleRate: number;
  readonly samples: Float64Array;
  readonly durationSeconds: number;
}

export type WavError = { readonly code: "unsupported-wav"; readonly detail: string };

const FOURCC = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );

interface Chunk {
  readonly id: string;
  readonly start: number;
  readonly size: number;
}

/** Recorre los trozos del RIFF: el `data` no siempre esta en tercer lugar. */
const chunks = (bytes: Uint8Array): Chunk[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: Chunk[] = [];
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const id = FOURCC(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (size < 0 || start + size > bytes.length + 1) {
      break;
    }
    found.push({ id, start, size });
    // Los trozos se alinean a dos bytes: un tamano impar lleva relleno detras.
    offset = start + size + (size % 2);
  }

  return found;
};

export const decodeWavPcm16 = (bytes: Uint8Array): Result<DecodedWav, WavError> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length < 44 || FOURCC(bytes, 0) !== "RIFF" || FOURCC(bytes, 8) !== "WAVE") {
    return err({ code: "unsupported-wav", detail: "el archivo no es un RIFF/WAVE" });
  }

  const found = chunks(bytes);
  const format = found.find((chunk) => chunk.id === "fmt ");
  const data = found.find((chunk) => chunk.id === "data");
  if (format === undefined || data === undefined) {
    return err({ code: "unsupported-wav", detail: "al wav le falta el trozo fmt o el trozo data" });
  }

  const audioFormat = view.getUint16(format.start, true);
  const channels = view.getUint16(format.start + 2, true);
  const sampleRate = view.getUint32(format.start + 4, true);
  const bits = view.getUint16(format.start + 14, true);

  if (audioFormat !== 1) {
    return err({
      code: "unsupported-wav",
      detail: `codificacion ${audioFormat} no soportada: conviene exportar PCM de 16 bits desde Praat`,
    });
  }
  if (bits !== 16) {
    return err({
      code: "unsupported-wav",
      detail: `se esperaban 16 bits por muestra, hay ${bits}`,
    });
  }
  if (channels < 1 || sampleRate <= 0) {
    return err({
      code: "unsupported-wav",
      detail: "el formato declara cero canales o frecuencia cero",
    });
  }

  const frames = Math.floor(data.size / (2 * channels));
  const samples = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const at = data.start + (frame * channels + channel) * 2;
      // Se normaliza a 1 y se promedia: el analisis es de una sola senal y un
      // estereo identico no debe sonar mas fuerte que el mismo audio en mono.
      sum += view.getInt16(at, true) / 32768;
    }
    samples[frame] = sum / channels;
  }

  return ok({ sampleRate, samples, durationSeconds: frames / sampleRate });
};
