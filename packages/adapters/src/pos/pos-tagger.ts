/**
 * Adaptador del etiquetador POS: descarga el modelo de cada lengua la primera
 * vez que se usa (unos 0,8 MB comprimidos) y etiqueta con el núcleo. Si la
 * descarga falla, el fallo no se guarda: el siguiente intento vuelve a pedirlo.
 */
import {
  err,
  ok,
  type PosModel,
  type PosTaggerError,
  type PosTaggerPort,
  parsePosModel,
  type Result,
  tagTokens,
} from "@lingualab/core";

export interface PosTaggerOptions {
  /** Carpeta versionada de los modelos (`/pos/<versión>`), del propio sitio. */
  readonly baseUrl: string;
  readonly fetch?: (url: string) => Promise<Response>;
}

const LANGUAGES = ["es", "en"] as const;

export function createPosTagger(options: PosTaggerOptions): PosTaggerPort {
  const fetchFn = options.fetch ?? ((url: string) => fetch(url));
  const models = new Map<string, Promise<Result<PosModel, PosTaggerError>>>();

  const download = async (language: string): Promise<Result<PosModel, PosTaggerError>> => {
    let text: string;
    try {
      const response = await fetchFn(`${options.baseUrl}/${language}.tsv`);
      if (!response.ok)
        return err({ code: "model-unavailable", detail: `HTTP ${response.status}` });
      text = await response.text();
    } catch (error) {
      return err({
        code: "model-unavailable",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    const model = parsePosModel(text);
    return model.ok
      ? ok(model.value)
      : err({ code: "model-unavailable", detail: "not a model file" });
  };

  const load = (language: string): Promise<Result<PosModel, PosTaggerError>> => {
    const cached = models.get(language);
    if (cached !== undefined) return cached;
    const attempt = download(language);
    models.set(language, attempt);
    void attempt.then((result) => {
      if (!result.ok && models.get(language) === attempt) models.delete(language);
    });
    return attempt;
  };

  return {
    listLanguages: () => LANGUAGES,
    tag: async (tokens, languageCode) => {
      if (!(LANGUAGES as readonly string[]).includes(languageCode)) {
        return err({ code: "unsupported-language", languageCode });
      }
      const model = await load(languageCode);
      return model.ok ? ok(tagTokens(model.value, tokens)) : model;
    },
  };
}
