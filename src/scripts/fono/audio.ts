/* ============================================================
   LinguaLab — IPA audio playback

   Two tiers, tried in order, with the tier always reported so the UI can
   tell the user what they are hearing:

     1. sample  — a licensed recording, served from this origin
     2. speech  — the browser's speech synthesis, speaking a carrier word
     3. unavailable — neither worked

   Tier 2 is not a degradation to be hidden: synthesis cannot produce an
   isolated phoneme, so a carrier word is the only honest option, and the UI
   says as much.
   ============================================================ */

import { carrierFor } from "../../data/ipa-carriers";
import { withBase } from "../../lib/paths";
import type { Locale } from "../../i18n";
import samples from "../../data/ipa-samples.json";

export type AudioTier = "sample" | "speech" | "unavailable";

export interface PlayResult {
  symbol: string;
  tier: AudioTier;
  /** What was actually played, for the UI caption. */
  detail: string;
}

/** Base path of the bundled samples, carrying the deployment base. */
export const SAMPLE_BASE = withBase("/audio/ipa/");

const MANIFEST: Readonly<Record<string, string>> = samples;

/** The licensed sample for a symbol, or null when there is none. */
export function sampleFile(symbol: string): string | null {
  return MANIFEST[symbol] ?? null;
}

export function sampleUrl(symbol: string): string | null {
  const file = sampleFile(symbol);
  return file ? `${SAMPLE_BASE}${file}` : null;
}

/** Number of symbols with a licensed recording, for the UI's coverage note. */
export function sampleCount(): number {
  return Object.keys(MANIFEST).length;
}

/**
 * Choose the best available voice for a locale.
 *
 * A voice must match the requested LANGUAGE before quality is considered.
 * Scoring language and quality together let a `localService` bonus qualify an
 * unrelated language, so a French voice could be picked for Spanish.
 *
 * Among matching voices, local wins over network (it starts instantly and
 * works offline, which is what this project promises) and a common regional
 * variant wins over an arbitrary one.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const want = locale === "en" ? "en" : "es";
  const preferredRegions: Record<string, string[]> = {
    es: ["es-es", "es-419", "es-mx", "es-us"],
    en: ["en-gb", "en-us", "en-au"],
  };

  const normalise = (lang: string): string => lang.toLowerCase().replace(/_/g, "-");
  /** The primary subtag: "es-419" -> "es". */
  const primary = (lang: string): string => normalise(lang).split("-")[0] ?? "";

  const matching = voices.filter((v) => primary(v.lang) === want);
  if (matching.length === 0) return null;

  const rank = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    if (preferredRegions[want]?.includes(normalise(v.lang))) score += 8;
    if (v.localService) score += 2;
    if (v.default) score += 1;
    return score;
  };

  return [...matching].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/* ---------------------------------------------------------------
   Playback
   --------------------------------------------------------------- */

let currentAudio: HTMLAudioElement | null = null;

/** Stop whatever is playing. Safe to call at any time. */
export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (speechSupported()) window.speechSynthesis.cancel();
}

function playSample(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;

    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener(
      "error",
      () => reject(new Error(`could not load ${url}`)),
      { once: true },
    );

    void audio.play().catch(reject);
  });
}

function speak(text: string, locale: Locale): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!speechSupported()) {
      reject(new Error("speech synthesis unavailable"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(window.speechSynthesis.getVoices(), locale);
    if (voice) utterance.voice = voice;
    utterance.lang = locale === "en" ? "en-GB" : "es-ES";
    // Slightly slower than default: isolated phonemes are easier to hear.
    utterance.rate = 0.9;

    utterance.addEventListener("end", () => resolve(), { once: true });
    utterance.addEventListener(
      "error",
      (event) => reject(new Error(`speech error: ${event.error}`)),
      { once: true },
    );

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export interface PlayOptions {
  locale: Locale;
  /** Skip tier 1 and go straight to synthesis. */
  preferSpeech?: boolean;
}

/**
 * Play a symbol, falling through the tiers.
 * Never throws: a failure returns tier "unavailable" so the caller can show a
 * message instead of an unhandled rejection.
 */
export async function play(symbol: string, options: PlayOptions): Promise<PlayResult> {
  const { locale, preferSpeech = false } = options;
  stop();

  const url = sampleUrl(symbol);

  if (url && !preferSpeech) {
    try {
      await playSample(url);
      return { symbol, tier: "sample", detail: "muestra con licencia" };
    } catch {
      // Fall through to synthesis: a missing or unsupported file must not
      // leave the user with silence.
    }
  }

  const carrier = carrierFor(symbol, locale);
  if (carrier) {
    try {
      await speak(carrier, locale);
      return { symbol, tier: "speech", detail: carrier };
    } catch {
      /* fall through */
    }
  }

  return { symbol, tier: "unavailable", detail: "" };
}

/** Load the voice list, which some browsers populate asynchronously. */
export function warmUpVoices(): void {
  if (!speechSupported()) return;
  // Reading the list is what triggers population in some engines.
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}
