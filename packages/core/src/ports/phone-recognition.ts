import type { DecodedAudio } from "./audio-decoder";
import type { Result } from "../result";

/**
 * Un fono reconocido sobre un tramo de audio.
 *
 * `phone` es una cadena AFI y `startSeconds`/`endSeconds` dicen de que tramo
 * salio: un reconocedor que solo devuelve simbolos sueltos no sirve para
 * alinear nada, y alinearlo despues por posicion en el arreglo seria inventar
 * tiempos que el motor no midio.
 *
 * `probability` es opcional a proposito: el servicio propuesto en
 * `docs/phase2/allosaurus.md` la devuelve, pero un adaptador futuro puede no
 * tenerla, y un campo obligatorio obligaria a inventar un numero.
 */
export interface RecognizedPhone {
  readonly phone: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly probability?: number;
}

export interface PhoneRecognitionParams {
  /**
   * Codigo ISO 639-3 de la lengua del audio. Es opcional porque el
   * reconocedor propuesto no depende de un inventario cerrado, pero cuando se
   * conoce se envia: es la unica forma de que el servicio sepa que inventario
   * de fonos esperar.
   */
  readonly languageId?: string;
}

/**
 * Fallos del reconocimiento de fonos.
 *
 * `unavailable` es el estado esperado de la fase 2: no hay servidor, y la
 * degradacion correcta es decirlo. `too-long` viaja con la duracion porque el
 * mensaje util es «esto dura X y el limite es Y».
 */
export type PhoneRecognitionError =
  | { readonly code: "unavailable"; readonly detail?: string }
  | { readonly code: "too-long"; readonly durationSeconds: number }
  | { readonly code: "recognition-failed"; readonly detail: string };

/**
 * Puerto de reconocimiento automatico de fonos (audio → secuencia de fonos).
 *
 * FASE 2, SOLO CONTRATO. No hay adaptador y la interfaz no lo usa: el sitio es
 * estatico y el reconocimiento necesita un servicio con GPU. Existe para que el
 * dia que se decida desplegarlo —`docs/phase2/allosaurus.md` propone como— el
 * nucleo no cambie de forma.
 *
 * El resultado es un **borrador que requiere correccion manual**: un
 * reconocedor entrenado con otras lenguas no conoce las colombianas, y
 * presentarlo como transcripcion seria el mismo defecto que este proyecto
 * corrige en el catalogo cuando una ficha exagera lo que hace.
 */
export interface PhoneRecognitionPort {
  /** Sincrono: responde por el servicio ya configurado, sin salir a la red. */
  isAvailable(): boolean;
  recognize(
    audio: DecodedAudio,
    params?: PhoneRecognitionParams,
  ): Promise<Result<readonly RecognizedPhone[], PhoneRecognitionError>>;
}
