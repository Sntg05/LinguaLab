import type { PhonemeSequence } from "../domain/index";
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
 * Puerto de salida hacia un fonemizador (eSpeak NG en WebAssembly, o su fake).
 *
 * `isAvailable` y `listLanguages` son sincronos porque el adaptador ya sabe la
 * respuesta sin esperar al motor: el primero refleja si el modulo se cargo, y
 * el segundo, que lenguas incluye la compilacion. Solo `phonemize` necesita
 * asincronia.
 */
export interface PhonemizerPort {
  isAvailable(): boolean;
  listLanguages(): readonly string[];
  phonemize(text: string, languageCode: string): Promise<Result<PhonemeSequence, PhonemizerError>>;
}
