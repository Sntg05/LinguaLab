/* ============================================================
   LinguaLab — reglas del visor de audio que no necesitan DOM

   Los valores por defecto del visor y las pocas decisiones que el controlador
   toma sobre texto y numeros: que dice el boton de reproduccion, que ajustes
   recibe el espectrograma y cuando un documento restaurado no corresponde al
   audio. Estan aqui, y no en el controlador, para que se prueben en Node.
   ============================================================ */

import { clamp } from "./selection";

// Los valores por defecto del espectrograma son los de Praat («Spectrogram
// settings»: ventana de 5 ms, de 0 a 5000 Hz): banda ancha, la que deja ver los
// formantes. Con 25 ms se veian los armonicos y no los formantes.
export const DEFAULT_WINDOW_SECONDS = 0.005;
export const DEFAULT_MAX_HZ = 5000;
export const WAVEFORM_BUCKETS = 1600;
export const SPECTROGRAM_MAX_COLUMNS = 480;
export const AUTOSAVE_DELAY_MS = 700;
export const DEFAULT_PROJECT = "visor";

/** Lo que hay escrito en los controles del espectrograma; `undefined` si falta el control. */
export interface SpectrogramInputs {
  readonly window: string | undefined;
  readonly minHz: string | undefined;
  readonly maxHz: string | undefined;
}

/** Ajustes ya acotados con los que se calcula el espectrograma. */
export interface SpectrogramSettings {
  readonly windowSeconds: number;
  readonly hopSeconds: number;
  readonly minHz: number;
  readonly maxHz: number;
}

/** Texto del boton de reproduccion: un boton dice lo que va a pasar al pulsarlo. */
export const playLabel = (playing: boolean, es: boolean): string => {
  if (playing) {
    return es ? "Pausar" : "Pause";
  }
  return es ? "Reproducir" : "Play";
};

/**
 * Lee los controles del espectrograma y los acota.
 *
 * El techo queda entre 500 Hz y Nyquist de 44,1 kHz; el piso, al menos 100 Hz
 * por debajo del techo, para que la banda dibujada nunca quede vacia. El salto
 * es un cuarto de la ventana: solapamiento del 75 %.
 */
export const spectrogramSettings = (inputs: SpectrogramInputs): SpectrogramSettings => {
  const windowSeconds = Number(inputs.window ?? String(DEFAULT_WINDOW_SECONDS));
  const maxHz = clamp(Number(inputs.maxHz ?? String(DEFAULT_MAX_HZ)), 500, 22050);
  const minHz = clamp(Number(inputs.minHz ?? "0"), 0, maxHz - 100);
  return { windowSeconds, hopSeconds: windowSeconds / 4, minHz, maxHz };
};

/**
 * Si el documento abierto se anoto sobre un audio de otra duracion.
 *
 * Se compara la duracion y no la identidad del archivo porque el nombre cambia
 * con cualquier copia y el navegador no guarda el binario. Un documento vacio
 * (`xmax` 0) no se anoto sobre nada, asi que nunca discrepa.
 */
export const isDurationMismatch = (previousXmax: number, duration: number): boolean =>
  previousXmax > 0 && Math.abs(previousXmax - duration) > 0.05;
