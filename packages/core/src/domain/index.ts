/**
 * Superficie publica del dominio de LinguaLab.
 *
 * Todo lo de aqui es TypeScript puro: entidades, valores y funciones puras.
 * Ningun modulo del dominio importa puertos ni adaptadores; las flechas de la
 * arquitectura hexagonal apuntan hacia adentro (ADR 0001).
 */

export type { AcousticMeasurement, AcousticTrack, AcousticTrackKind } from "./acoustic";
export type {
  AnnotationDocument,
  Interval,
  IntervalTier,
  PointTier,
  Tier,
  TierKind,
} from "./annotation";
export type { ExperimentItem, ExperimentKind, ExperimentSpec } from "./experiment";
export type { G2PRule } from "./g2p-rule";
export { tokenizeIpa } from "./ipa";
export type { IpaString, Phoneme, PhonemeSequence } from "./ipa";
export type { Language, LanguageKind } from "./language";
export type { OrthographyTable, OrthographyTableStatus } from "./orthography-table";
export { ANALYSIS_LEVELS } from "./tool-descriptor";
export type {
  ToolArea,
  ToolDescriptor,
  ToolIntegration,
  ToolLocalizedText,
  ToolStatus,
} from "./tool-descriptor";
