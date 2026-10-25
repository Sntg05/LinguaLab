/**
 * Fakes en memoria, uno por puerto.
 *
 * Estan los doce aunque los casos de uso de cinco de ellos lleguen en
 * segmentos posteriores: una interfaz que nadie implementa no se comprueba, y
 * un fake es lo que la mantiene honesta hasta que llegue el adaptador real.
 */

export { FixedClock } from "./fixed-clock";
export { InMemoryAcousticAnalysis } from "./in-memory-acoustic-analysis";
export type { InMemoryAcousticAnalysisOptions } from "./in-memory-acoustic-analysis";
export { InMemoryAnnotationStorage } from "./in-memory-annotation-storage";
export { InMemoryAudioDecoder } from "./in-memory-audio-decoder";
export { InMemoryElanCodec } from "./in-memory-elan-codec";
export { InMemoryExperimentRunner } from "./in-memory-experiment-runner";
export { InMemoryLanguageCatalog } from "./in-memory-language-catalog";
export { InMemoryOrthographyRepository } from "./in-memory-orthography-repository";
export { InMemoryPhoneRecognition } from "./in-memory-phone-recognition";
export type { InMemoryPhoneRecognitionOptions } from "./in-memory-phone-recognition";
export { InMemoryPhonemizer } from "./in-memory-phonemizer";
export type { InMemoryPhonemizerOptions } from "./in-memory-phonemizer";
export { InMemoryTextGridCodec } from "./in-memory-textgrid-codec";
export { InMemoryToolRegistry } from "./in-memory-tool-registry";
export { SequentialIdGenerator } from "./sequential-id-generator";
