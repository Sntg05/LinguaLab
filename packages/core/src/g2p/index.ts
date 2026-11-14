/** Transcriptores propios de texto a AFI: reglas para el español, diccionario para el inglés. */
export type { EnglishTranscription, PronunciationLookup } from "./english";
export { arpabetToIpa, transcribeEnglish } from "./english";
export type { SpanishOptions, SpanishVariety, Transcription, TranscriptionLevel } from "./spanish";
export { transcribeSpanish } from "./spanish";
