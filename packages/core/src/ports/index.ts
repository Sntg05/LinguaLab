/**
 * Superficie publica de los puertos de salida del hexagono.
 *
 * Un puerto es una interfaz que el nucleo define y un adaptador implementa.
 * Ninguno de estos archivos importa APIs del navegador: solo describen el
 * contrato, y por eso todos sus miembros devuelven `Result` en lugar de lanzar
 * excepciones por flujos esperados (especificacion S4).
 */

export type {
  AcousticAnalysisPort,
  AcousticError,
  FormantParams,
  IntensityParams,
  PitchParams,
} from "./acoustic-analysis";
export type { AnnotationStorageError, AnnotationStoragePort } from "./annotation-storage";
export type { AudioDecoderError, AudioDecoderPort, DecodedAudio } from "./audio-decoder";
export type { ClockPort } from "./clock";
export type { ElanCodecPort, ElanError, ElanLossReport } from "./elan-codec";
export type {
  ExperimentError,
  ExperimentResults,
  ExperimentRunnerPort,
  ExperimentTrial,
} from "./experiment-runner";
export type { IdGeneratorPort } from "./id-generator";
export type { LanguageCatalogError, LanguageCatalogPort } from "./language-catalog";
export type {
  OrthographyRepositoryError,
  OrthographyRepositoryPort,
  OrthographyTableSummary,
} from "./orthography-repository";
export type { PhonemizerError, PhonemizerPort } from "./phonemizer";
export type {
  PhoneRecognitionError,
  PhoneRecognitionParams,
  PhoneRecognitionPort,
  RecognizedPhone,
} from "./phone-recognition";
export type { TextGridCodecPort, TextGridError } from "./textgrid-codec";
export type { ToolFilter, ToolRegistryError, ToolRegistryPort } from "./tool-registry";
