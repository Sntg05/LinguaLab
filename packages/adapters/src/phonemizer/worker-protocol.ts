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
  /** Where `espeak-ng-data` is served from, same origin. */
  readonly dataUrl: string;
  /** Dictionaries to preload, as espeak-ng language tags. */
  readonly languages: readonly string[];
}

export type PhonemizerReply =
  | { readonly id: number; readonly ok: true; readonly ipa: string }
  | {
      readonly id: number;
      readonly ok: false;
      readonly code: "engine-unavailable" | "engine-failed";
      readonly detail: string;
    };
