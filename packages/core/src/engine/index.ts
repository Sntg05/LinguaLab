/**
 * Superficie publica del motor ortografia -> AFI.
 *
 * El motor es TypeScript puro y sin dependencias externas: normaliza, resuelve
 * contextos, aplica capas y devuelve un rastro. No conoce puertos, ni el DOM,
 * ni el formato en que se guardan las tablas.
 */

export { convertLayer } from "./convert-layer";
export type { ConvertLayerOptions } from "./convert-layer";
export { isReasonableIpa } from "./ipa-symbols";
export { normalizeInput } from "./normalize";
export {
  classReferenceName,
  matchContextPattern,
  patternCharacters,
} from "./patterns";
export type { ContextPatternOutcome, PatternEnvironment } from "./patterns";
export type {
  CasePolicy,
  ConversionLayer,
  ConversionTraceEntry,
  LayerConversion,
  UncoveredPosition,
} from "./types";
