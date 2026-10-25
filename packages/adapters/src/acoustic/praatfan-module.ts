/**
 * Forma estructural de lo que el adaptador usa del modulo vendoreado.
 *
 * POR QUE UNA DECLARACION PROPIA Y NO LA DEL PAQUETE
 *
 * `public/praatfan/praatfan_gpl.d.ts` es la fuente de verdad de la API —la
 * escribe wasm-bindgen y por eso no se desincroniza—, pero vive en `public/`,
 * fuera de los `include` de cualquier `tsconfig`, y un adaptador no puede
 * importar tipos desde ahi sin sacar el artefacto de su carpeta fijada por
 * hash. Lo que hay aqui es el subconjunto que este adaptador realmente llama:
 * si PraatFan cambiara una firma, `npm run typecheck:packages` no se enteraria,
 * pero el primer analisis de la prueba de contrato si. Por eso la prueba corre
 * contra el wasm real y no contra un doble.
 */

/** Contorno de F0. `values()` devuelve `NaN` en los marcos sin voz. */
export interface PraatfanPitch {
  readonly num_frames: number;
  readonly pitch_floor: number;
  readonly pitch_ceiling: number;
  readonly start_time: number;
  readonly time_step: number;
  times(): Float64Array;
  values(): Float64Array;
}

/** Contorno de un formante. Se pide por numero (1 = F1) y por lista completa. */
export interface PraatfanFormant {
  readonly num_frames: number;
  readonly max_num_formants: number;
  readonly start_time: number;
  readonly time_step: number;
  times(): Float64Array;
  formant_values(formantNumber: number): Float64Array;
}

/** Contorno de intensidad, en dB. */
export interface PraatfanIntensity {
  readonly num_frames: number;
  readonly start_time: number;
  readonly time_step: number;
  times(): Float64Array;
  values(): Float64Array;
}

export interface PraatfanSound {
  readonly duration: number;
  readonly num_samples: number;
  readonly sample_rate: number;
  to_pitch(timeStep: number, pitchFloor: number, pitchCeiling: number): PraatfanPitch;
  to_formant_burg(
    timeStep: number,
    maxNumFormants: number,
    maxFormantHz: number,
    windowLength: number,
    preEmphasisFrom: number,
  ): PraatfanFormant;
  to_intensity(minPitch: number, timeStep: number): PraatfanIntensity;
}

/**
 * Modulo ES tal como lo exporta wasm-pack: un `init` por defecto que recibe la
 * URL o los bytes del `.wasm`, y las clases del analisis.
 */
export interface PraatfanModule {
  readonly default: (input: unknown) => Promise<unknown>;
  readonly Sound: new (samples: Float64Array, sampleRate: number) => PraatfanSound;
}

/**
 * Reconoce el modulo sin confiar en el: un `import` que devuelva HTML de una
 * pagina de error, o una version futura sin `Sound`, tiene que fallar aqui y no
 * mas adelante con un `undefined is not a function` sin contexto.
 */
export const isPraatfanModule = (value: unknown): value is PraatfanModule => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { default?: unknown; Sound?: unknown };
  return typeof candidate.default === "function" && typeof candidate.Sound === "function";
};
