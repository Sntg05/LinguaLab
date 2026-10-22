import {
  type PhonemeSequence,
  type PhonemizerError,
  type PhonemizerPort,
  type Result,
  err,
  ok,
  tokenizeIpa,
} from "@lingualab/core";

import { supportedLanguages, toEspeakVoice } from "./espeak-voices";
import type { PhonemizerReply, PhonemizerRequest } from "./worker-protocol";

export interface EspeakPhonemizerOptions {
  /**
   * Where the engine's `wasm/` and `data/` directories are served from. Must be
   * same-origin: the site's `connect-src` is `'self'`, the data is fetched at
   * runtime rather than bundled, and the package's fallback to a public CDN
   * would both break that policy and the offline promise.
   */
  readonly baseUrl?: string;
  /** Give up on a single request after this long. */
  readonly timeoutMs?: number;
}

export interface EspeakPhonemizer extends PhonemizerPort {
  /** Terminates the worker. The instance is unusable afterwards. */
  dispose(): void;
}

const DEFAULT_BASE_URL = "/espeak-phonemizer";
const DEFAULT_TIMEOUT_MS = 30_000;

interface Waiting {
  readonly resolve: (reply: PhonemizerReply) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * espeak-ng (compiled to WebAssembly) behind `PhonemizerPort`.
 *
 * The engine lives in a worker and is imported only there, so a page that never
 * phonemizes anything never downloads it. This adapter's job is narrow on
 * purpose: translate our language code to a voice, carry one request, and turn
 * every way it can fail into the port's typed errors instead of an exception.
 *
 * `isAvailable` follows the port's contract: it reflects whether the module has
 * actually loaded, which is why it is false before the first successful call.
 * The interface must decide what to show by *trying*, not by asking.
 */
export function createEspeakPhonemizer(options: EspeakPhonemizerOptions = {}): EspeakPhonemizer {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const waiting = new Map<number, Waiting>();
  let worker: Worker | null = null;
  let loaded = false;
  let disposed = false;
  let nextId = 1;

  /** Resolve every in-flight request with one failure, so nothing hangs. */
  function failAll(detail: string): void {
    for (const [id, entry] of waiting) {
      clearTimeout(entry.timer);
      waiting.delete(id);
      entry.resolve({ id, ok: false, code: "engine-unavailable", detail });
    }
  }

  function ensureWorker(): Worker | null {
    if (disposed) return null;
    if (worker) return worker;
    if (typeof Worker === "undefined") return null;

    try {
      worker = new Worker(new URL("./phonemizer-worker.ts", import.meta.url), {
        type: "module",
        name: "lingualab-phonemizer",
      });
    } catch {
      worker = null;
      return null;
    }

    worker.addEventListener("message", (event: MessageEvent<PhonemizerReply>) => {
      const reply = event.data;
      const entry = waiting.get(reply.id);
      if (!entry) return;
      waiting.delete(reply.id);
      clearTimeout(entry.timer);
      if (reply.ok) loaded = true;
      entry.resolve(reply);
    });

    // A worker that cannot start, or that dies mid-request, never answers.
    worker.addEventListener("error", () => {
      failAll("the phonemizer worker failed to start");
    });
    worker.addEventListener("messageerror", () => {
      failAll("the phonemizer worker sent a message that could not be read");
    });

    return worker;
  }

  async function phonemize(
    text: string,
    languageCode: string,
  ): Promise<Result<PhonemeSequence, PhonemizerError>> {
    const voice = toEspeakVoice(languageCode);
    if (voice === null) return err({ code: "unsupported-language", languageCode });

    const target = ensureWorker();
    if (!target) {
      return err({
        code: "engine-unavailable",
        detail: disposed
          ? "the phonemizer was disposed"
          : "Web Workers are not available in this environment",
      });
    }

    const id = nextId++;
    const request: PhonemizerRequest = { id, text, voice, baseUrl };

    const answer = new Promise<PhonemizerReply>((resolve) => {
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve({
          id,
          ok: false,
          code: "engine-failed",
          detail: `the phonemizer did not answer within ${timeoutMs} ms`,
        });
      }, timeoutMs);

      waiting.set(id, { resolve, timer });

      try {
        target.postMessage(request);
      } catch (error) {
        clearTimeout(timer);
        waiting.delete(id);
        resolve({
          id,
          ok: false,
          code: "engine-unavailable",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    });

    const reply = await answer;
    if (!reply.ok) return err({ code: reply.code, detail: reply.detail });

    return ok({ ipa: reply.ipa, phones: tokenizeIpa(reply.ipa) });
  }

  return {
    isAvailable: () => loaded,
    listLanguages: () => supportedLanguages(),
    phonemize,
    dispose: () => {
      disposed = true;
      failAll("the phonemizer was disposed");
      worker?.terminate();
      worker = null;
    },
  };
}
