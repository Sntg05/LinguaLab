/**
 * Adaptador del transcriptor propio: reglas para el español, diccionario para
 * el inglés.
 *
 * POR QUÉ REEMPLAZA A eSpeak NG
 *
 * eSpeak NG produce la entrada de un sintetizador de voz, no una transcripción
 * para estudiar: medido contra un diccionario revisado acertaba el 76,9 % de
 * las palabras del español, frente al 96,6 % de las reglas propias (ver
 * `odd/tasks/rework-v4.md`). Los dos motores viven en `@lingualab/core` y son
 * puros; este adaptador solo les da lo que el núcleo no puede tener: la red.
 *
 * QUÉ SE DESCARGA Y CUÁNDO
 *
 * El español no descarga nada. El inglés necesita CMUdict (3,4 MB, unos 0,9 MB
 * comprimidos), que se pide la primera vez que alguien transcribe inglés y
 * nunca al cargar la página. Si la descarga falla no se guarda el fallo: el
 * siguiente intento vuelve a pedirlo.
 *
 * No usa un worker: armar el índice de 126 000 palabras tarda decenas de
 * milisegundos, una sola vez, y transcribir un texto es inmediato.
 */
import {
  err,
  ok,
  type PhonemizedText,
  type PhonemizeOptions,
  type PhonemizerError,
  type PhonemizerPort,
  type Result,
  tokenizeIpa,
  transcribeEnglish,
  transcribeSpanish,
} from "@lingualab/core";

export interface NativePhonemizerOptions {
  /** Dónde está `en-us.tsv` (`palabra<TAB>pron1|pron2`). Siempre del propio sitio. */
  readonly dictionaryUrl: string;
  /** Sustituible en las pruebas; por defecto, el `fetch` del entorno. */
  readonly fetch?: (url: string) => Promise<Response>;
}

const LANGUAGES = ["spa", "eng"] as const;

/**
 * La forma de una entrada. Si la primera línea no la tiene, lo que llegó no es
 * CMUdict (por ejemplo, una página de error servida con 200) y no se usa.
 */
const ENTRY_LINE = /^[a-z'.-]+\t[A-Z]+[012]?(?: [A-Z]+[012]?)*(?:\|[A-Z012 ]+)*$/;

/**
 * Los fonos de una transcripción, sin lo que no es un segmento: el acento, el
 * límite de sílaba y las palabras que quedaron sin transcribir (`⟨palabra⟩`).
 */
const phonesOf = (ipa: string): readonly string[] =>
  tokenizeIpa(ipa.replace(/⟨[^⟩]*⟩/g, " ").replace(/[ˈˌ.]/g, ""));

type Dictionary = ReadonlyMap<string, readonly string[]>;

const parseDictionary = (tsv: string): Dictionary | null => {
  const lines = tsv.split("\n");
  if (!ENTRY_LINE.test(lines[0] ?? "")) return null;
  const entries = new Map<string, readonly string[]>();
  for (const line of lines) {
    const tab = line.indexOf("\t");
    if (tab > 0) entries.set(line.slice(0, tab), line.slice(tab + 1).split("|"));
  }
  return entries;
};

export function createNativePhonemizer(options: NativePhonemizerOptions): PhonemizerPort {
  const fetchFn = options.fetch ?? ((url: string) => fetch(url));
  let dictionary: Promise<Result<Dictionary, PhonemizerError>> | null = null;

  const download = async (): Promise<Result<Dictionary, PhonemizerError>> => {
    let body: string;
    try {
      const response = await fetchFn(options.dictionaryUrl);
      if (!response.ok) {
        return err({
          code: "engine-unavailable",
          detail: `dictionary request answered ${response.status}`,
        });
      }
      body = await response.text();
    } catch (error) {
      return err({
        code: "engine-unavailable",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    const parsed = parseDictionary(body);
    return parsed === null
      ? err({
          code: "engine-failed",
          detail: "the dictionary file is not in the expected format",
          languageCode: "eng",
        })
      : ok(parsed);
  };

  /** Una sola descarga compartida; un fallo no se queda guardado. */
  const loadDictionary = (): Promise<Result<Dictionary, PhonemizerError>> => {
    if (dictionary === null) {
      const attempt = download();
      dictionary = attempt;
      void attempt.then((result) => {
        if (!result.ok && dictionary === attempt) dictionary = null;
      });
    }
    return dictionary;
  };

  const phonemize = async (
    text: string,
    languageCode: string,
    phonemizeOptions: PhonemizeOptions = {},
  ): Promise<Result<PhonemizedText, PhonemizerError>> => {
    if (languageCode === "spa") {
      const { ipa, skipped } = transcribeSpanish(text, phonemizeOptions);
      return ok({ ipa, phones: phonesOf(ipa), skipped, variants: [] });
    }
    if (languageCode === "eng") {
      const loaded = await loadDictionary();
      if (!loaded.ok) return loaded;
      const { ipa, skipped, variants } = transcribeEnglish(text, (word) => loaded.value.get(word));
      return ok({ ipa, phones: phonesOf(ipa), skipped, variants });
    }
    return err({ code: "unsupported-language", languageCode });
  };

  return {
    // No hay motor que cargar: las reglas ya están aquí. Que el diccionario del
    // inglés no llegue es un error de esa petición, no del adaptador entero.
    isAvailable: () => true,
    listLanguages: () => LANGUAGES,
    phonemize,
  };
}
