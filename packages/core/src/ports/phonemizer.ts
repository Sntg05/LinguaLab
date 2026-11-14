import type { PhonemeSequence } from "../domain/index";
import type { SpanishVariety, TranscriptionLevel } from "../g2p/spanish";
import type { Result } from "../result";

/**
 * Fallos posibles al fonemizar. La lengua no soportada y el motor no
 * disponible son respuestas normales de un adaptador WebAssembly, no
 * excepciones: el caso de uso decide como mostrarlas.
 */
export type PhonemizerError =
  | { readonly code: "unsupported-language"; readonly languageCode: string }
  | { readonly code: "engine-unavailable"; readonly detail?: string }
  | { readonly code: "engine-failed"; readonly detail: string; readonly languageCode?: string };

/**
 * Lo que la persona puede elegir al transcribir. Un motor ignora lo que no le
 * aplica (el ingles no tiene `variety`), pero nunca lo rechaza: asi la interfaz
 * no necesita saber que motor hay detras.
 */
export interface PhonemizeOptions {
  /** Variedad del espanol: con seseo (por defecto) o con distincion. */
  readonly variety?: SpanishVariety;
  /** Fonemica (por defecto) o fonetica, con alofonos. */
  readonly level?: TranscriptionLevel;
}

/**
 * Una transcripcion junto con lo que el motor NO supo resolver.
 *
 * `skipped` y `variants` viajan hasta la interfaz porque esconderlos seria
 * inventar: una palabra que no esta en el diccionario no tiene transcripcion,
 * y una con dos pronunciaciones («read») no tiene una sola.
 */
export interface PhonemizedText extends PhonemeSequence {
  /** Palabras que el motor no pudo transcribir, tal como se escribieron. */
  readonly skipped?: readonly string[];
  /** Palabras con mas de una pronunciacion registrada. */
  readonly variants?: readonly { readonly word: string; readonly ipa: readonly string[] }[];
}

/**
 * Puerto de salida hacia un fonemizador (el motor propio de reglas y
 * diccionario, o su fake).
 *
 * `isAvailable` y `listLanguages` son sincronos porque el adaptador ya sabe la
 * respuesta sin esperar al motor. Solo `phonemize` necesita asincronia: el
 * diccionario del ingles se descarga la primera vez que se pide.
 */
export interface PhonemizerPort {
  isAvailable(): boolean;
  listLanguages(): readonly string[];
  phonemize(
    text: string,
    languageCode: string,
    options?: PhonemizeOptions,
  ): Promise<Result<PhonemizedText, PhonemizerError>>;
}
