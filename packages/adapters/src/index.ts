/**
 * Superficie publica de `@lingualab/adapters`.
 *
 * Cada subdirectorio implementa exactamente un puerto de `@lingualab/core` y
 * debe pasar la suite de contrato de ese puerto. Nada de aqui importa la UI.
 *
 * Hoy viven aqui dos adaptadores:
 *
 * - `orthography-repository`, el repositorio de tablas sobre IndexedDB que
 *   conserva el JSON del nucleo y se degrada a un almacen en memoria
 *   —declarandolo— cuando IndexedDB no esta o no responde.
 * - `tool-registry`, el registro de herramientas sobre las fichas que recibe;
 *   los datos del catalogo viven en `src/data/tools.json`, no en el adaptador.
 */
export {
  createIndexedDbOrthographyRepository,
  type IndexedDbOrthographyRepository,
  type PersistenceBackend,
  type PersistenceStatus,
} from "./orthography-repository/indexeddb-orthography-repository";

export {
  createStaticToolRegistry,
  type StaticToolRegistry,
} from "./tool-registry/static-tool-registry";

export {
  createEspeakPhonemizer,
  type EspeakPhonemizer,
  type EspeakPhonemizerOptions,
} from "./phonemizer/espeak-phonemizer";

/**
 * El codec ELAN (Pyodide + pympi-ling).
 *
 * Se exporta la FACTORIA y no solo el tipo del puerto porque la interfaz
 * necesita `onProgress`, `isReady`, `warmUp` y `dispose`, que no son parte de
 * `ElanCodecPort`. Construirla no descarga nada: el motor arranca en la primera
 * conversion.
 */
export {
  createPyodideElanCodec,
  PYMPI_WHEEL_FILE_NAME,
  type PyodideElanCodecOptions,
} from "./elan/pyodide-elan-codec";

export type {
  ElanConversionReport,
  ElanNote,
  ElanParseResult,
  ElanPhase,
  ElanProgress,
  ElanSerializeResult,
  PyodideElanCodec,
} from "./elan/pyodide-elan-types";

export {
  isSupportedLanguage,
  supportedLanguages,
  toEspeakVoice,
  type SupportedLanguageCode,
} from "./phonemizer/espeak-voices";
