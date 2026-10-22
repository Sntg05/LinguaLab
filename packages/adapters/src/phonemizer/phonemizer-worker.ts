/**
 * The phonemizer's Web Worker.
 *
 * espeak-ng is synchronous and decompresses its dictionaries on first use, which
 * is exactly the kind of work that must not run on the main thread. It is also
 * the only place the engine is ever imported: the adapter talks to this worker
 * through messages, so opening a page that does not phonemize anything never
 * pays for the download.
 *
 * Nothing here decides what the user sees. It reports one of the port's two
 * engine errors and lets the application layer word it.
 *
 * `self` is typed by the package's DOM lib, which is what the adapter package
 * already uses; at runtime this module only ever loads inside a Worker, so
 * `onmessage` and `postMessage` are the worker's own.
 */
import { createEspeak } from "@spelling-creator/spellophone/browser";

import type { PhonemizerReply, PhonemizerRequest } from "./worker-protocol";

type Engine = Awaited<ReturnType<typeof createEspeak>>;

/** Created once, on the first request, and reused for the worker's lifetime. */
let starting: Promise<Engine> | null = null;
let engine: Engine | null = null;

function detail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function reply(message: PhonemizerReply): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<PhonemizerRequest>) => {
  const { id, text, voice, dataUrl, languages } = event.data;

  if (engine === null) {
    try {
      starting ??= createEspeak({ dataUrl, languages: [...languages] });
      engine = await starting;
    } catch (error) {
      // A failed start is final for this worker: the caller gets a typed error
      // and the next message retries, because a flaky network deserves a retry.
      starting = null;
      reply({
        id,
        ok: false,
        code: "engine-unavailable",
        detail: detail(error),
      });
      return;
    }
  }

  try {
    const ipa = engine.phonemes(text, { voice }).trim();
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
