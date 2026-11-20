import type { Result } from "../result";

export type PosTaggerError =
  | { readonly code: "unsupported-language"; readonly languageCode: string }
  | { readonly code: "model-unavailable"; readonly detail: string };

/**
 * Puerto hacia un etiquetador de categorías gramaticales (UPOS). Recibe las
 * palabras ya separadas y devuelve una etiqueta por palabra, en orden. Que el
 * modelo no se pueda descargar es una respuesta tipada, no una excepción.
 */
export interface PosTaggerPort {
  listLanguages(): readonly string[];
  tag(
    tokens: readonly string[],
    languageCode: string,
  ): Promise<Result<readonly string[], PosTaggerError>>;
}
