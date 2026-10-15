import type { PhonemeSequence } from "../domain/ipa";
import type { PhonemizerError, PhonemizerPort } from "../ports/phonemizer";
import type { Result } from "../result";

/**
 * Caso de uso `PhonemizeText`.
 *
 * Translitera el error del puerto tal cual: no inventa codigos nuevos. Si el
 * motor no esta disponible o la lengua no esta soportada, eso es exactamente
 * lo que el llamador necesita saber, y traducirlo a un vocabulario propio
 * obligaria a mantener un mapa que no aporta informacion.
 */

export interface PhonemizeTextInput {
  readonly text: string;
  readonly languageCode: string;
}

export const createPhonemizeText =
  (deps: { readonly phonemizer: PhonemizerPort }) =>
  (input: PhonemizeTextInput): Promise<Result<PhonemeSequence, PhonemizerError>> =>
    deps.phonemizer.phonemize(input.text, input.languageCode);
