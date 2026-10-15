import type { AcousticTrack } from "../domain/index";
import type { DecodedAudio } from "./audio-decoder";
import type { Result } from "../result";

/** Rango de busqueda de la frecuencia fundamental, en hercios. */
export interface PitchParams {
  readonly floorHz: number;
  readonly ceilingHz: number;
}

/** Limite superior de formantes y cuantos se buscan. */
export interface FormantParams {
  readonly maxFormantHz: number;
  readonly count: number;
}

/**
 * Umbral de intensidad ligado al rango de voz: Praat exige este valor para
 * que el calculo de intensidad sea comparable con el de la senal de referencia.
 */
export interface IntensityParams {
  readonly minimumPitchHz: number;
}

/**
 * Fallos del analisis acustico.
 *
 * `unavailable` no es un error de programacion: el modulo WebAssembly del
 * analisis puede no haberse compilado para el navegador, y la especificacion
 * S7 exige degradar con un aviso en lugar de romper la herramienta.
 */
export type AcousticError =
  | { readonly code: "unavailable"; readonly detail?: string }
  | { readonly code: "too-short"; readonly durationSeconds: number }
  | { readonly code: "analysis-failed"; readonly detail: string };

/**
 * Puerto de analisis acustico (pitch, formantes, intensidad).
 *
 * `isAvailable` es sincrono porque responde por el modulo ya cargado; los
 * metodos de analisis son asincronos porque el calculo real puede vivir en un
 * worker y tardar. `formants` devuelve varias pistas porque cada formante es
 * una serie temporal distinta.
 */
export interface AcousticAnalysisPort {
  isAvailable(): boolean;
  pitch(audio: DecodedAudio, params: PitchParams): Promise<Result<AcousticTrack, AcousticError>>;
  formants(
    audio: DecodedAudio,
    params: FormantParams,
  ): Promise<Result<readonly AcousticTrack[], AcousticError>>;
  intensity(
    audio: DecodedAudio,
    params: IntensityParams,
  ): Promise<Result<AcousticTrack, AcousticError>>;
}
