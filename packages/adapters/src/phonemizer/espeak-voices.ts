/**
 * Language codes for the phonemizer adapter.
 *
 * The domain, the port contract and the in-memory fake speak ISO 639-3
 * (`spa`, `eng`). espeak-ng names voices with its own tags, and this build ships
 * 51 of them. This module is the single translation point: anything not in the
 * table is *unsupported*, and saying so is the adapter's job, not the engine's.
 *
 * WHY `es-419` AND NOT `es`: the project's declared Spanish variant is Latin
 * American with seseo (see the orthography demo in `docs/STATUS.md`), and
 * `es-419` is the Latin American voice. Castilian `es` would transcribe `zapato`
 * with /θ/, disagreeing with the spelling tool on the same site. Both tags were
 * checked against this package's `manifest.json`, because `setVoice` rejects
 * anything that is not in that list.
 */

/** Our ISO 639-3 code → the espeak-ng voice tag it selects. */
const VOICES = {
  spa: "es-419",
  eng: "en-us",
} as const satisfies Record<string, string>;

export type SupportedLanguageCode = keyof typeof VOICES;

/** Whether this build can phonemize the given language code. */
export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return Object.hasOwn(VOICES, code);
}

/**
 * The espeak-ng voice tag for a language code, or null when unsupported.
 *
 * Matching is exact and case sensitive: ISO 639-3 codes are lowercase, and a
 * silent case fix would hide a mistake in the caller.
 */
export function toEspeakVoice(code: string): string | null {
  return isSupportedLanguage(code) ? VOICES[code] : null;
}

/** Every code this build admits, in a stable order for the interface. */
export function supportedLanguages(): readonly SupportedLanguageCode[] {
  return Object.keys(VOICES) as SupportedLanguageCode[];
}
