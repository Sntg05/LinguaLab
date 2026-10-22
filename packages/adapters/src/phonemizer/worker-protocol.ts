/**
 * Messages exchanged with the phonemizer worker.
 *
 * Kept in its own module so the adapter and the worker share the shape without
 * either importing the other: the worker file must only ever be loaded inside a
 * Worker, and the adapter must never drag the engine into the main bundle.
 */

export interface PhonemizerRequest {
  readonly id: number;
  readonly text: string;
  /** An espeak-ng voice tag, already translated from our language code. */
  readonly voice: string;
  /**
   * Where the engine's `wasm/` and `data/` directories are served from. The
   * package resolves `wasm/espeak-ng.wasm`, `data/manifest.json` and
   * `data/data.data` under this base.
   */
  readonly baseUrl: string;
}

export type PhonemizerReply =
  | { readonly id: number; readonly ok: true; readonly ipa: string }
  | {
      readonly id: number;
      readonly ok: false;
      readonly code: "engine-unavailable" | "engine-failed";
      readonly detail: string;
    };
