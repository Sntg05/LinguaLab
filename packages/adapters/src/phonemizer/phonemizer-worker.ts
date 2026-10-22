/**
 * The phonemizer's Web Worker.
 *
 * espeak-ng is synchronous and mounts a 5.6 MB dictionary bundle into its
 * virtual filesystem on first use, which is exactly the work that must not run
 * on the main thread. It is also the only place the engine is imported: the
 * adapter talks to this worker through messages, so a page that does not
 * phonemize anything never pays for the download.
 *
 * Nothing here decides what the user sees. It reports one of the port's two
 * engine errors and lets the application layer word it.
 *
 * `self` is typed by the package's DOM lib, which the adapter package already
 * uses; at runtime this module only ever loads inside a Worker, so `onmessage`
 * and `postMessage` are the worker's own.
 */
import { getPhonemes, initialize, setVoice } from "espeak-phonemizer";

import type { PhonemizerReply, PhonemizerRequest } from "./worker-protocol";

/** Created once, on the first request, and reused for the worker's lifetime. */
let loading: Promise<void> | null = null;
let ready = false;
let currentVoice: string | null = null;

function detail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function reply(message: PhonemizerReply): void {
  self.postMessage(message);
}

/**
 * Bring the engine up, at most once. A failed attempt is not cached: the next
 * message retries, because a flaky network deserves a second chance.
 */
async function ensure(baseUrl: string): Promise<void> {
  if (ready) return;
  loading ??= initialize(baseUrl);
  await loading;
  ready = true;
}

/**
 * One entry per clause comes back from the engine; the terminator is part of
 * what a reader expects to see, so it is appended rather than dropped.
 */
function toIpa(text: string): string {
  return getPhonemes(text)
    .map((clause) => `${clause.phonemes}${clause.terminator}`)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

self.onmessage = async (event: MessageEvent<PhonemizerRequest>) => {
  const { id, text, voice, baseUrl } = event.data;

  try {
    await ensure(baseUrl);
  } catch (error) {
    loading = null;
    reply({ id, ok: false, code: "engine-unavailable", detail: detail(error) });
    return;
  }

  try {
    if (currentVoice !== voice) {
      await setVoice(voice);
      currentVoice = voice;
    }

    const ipa = toIpa(text);
    if (ipa === "") {
      reply({
        id,
        ok: false,
        code: "engine-failed",
        detail: "espeak-ng returned no phonemes for this text",
      });
      return;
    }

    reply({ id, ok: true, ipa });
  } catch (error) {
    reply({ id, ok: false, code: "engine-failed", detail: detail(error) });
  }
};
