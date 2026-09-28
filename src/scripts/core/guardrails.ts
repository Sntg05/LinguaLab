/* ============================================================
   LinguaLab — input guardrails (pure)
   No DOM access, so every rule here is unit tested directly.
   ============================================================ */

import { LANG_KEY, THEME_KEY } from "./theme-storage";

/** 100 KB cap on any text the user can submit for analysis. */
export const MAX_TEXT_BYTES = 100 * 1024;

/** Extensions accepted by the file uploaders. */
export const ALLOWED_EXT: readonly string[] = [".txt", ".md", ".csv", ".json", ".conllu"];

export type RejectionReason = "null" | "type" | "ext" | "size";

export interface ValidationFailure {
  ok: false;
  reason: RejectionReason;
  /** Message key, so the UI can localise without duplicating the rule table. */
  messageKey:
    | "guardrail.err.null"
    | "guardrail.err.type"
    | "guardrail.err.ext"
    | "guardrail.err.size";
}

export interface ValidationSuccess {
  ok: true;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/** The subset of File this module needs, so tests can pass a plain object. */
export interface FileLike {
  name: string;
  size: number;
}

/** Extract the lower-cased extension, including the dot. "" when absent. */
export function extensionOf(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

export function validateFile(file: FileLike | null | undefined): ValidationResult {
  if (!file) return { ok: false, reason: "null", messageKey: "guardrail.err.null" };

  const ext = extensionOf(file.name);
  if (!ext || !ALLOWED_EXT.includes(ext)) {
    return { ok: false, reason: "ext", messageKey: "guardrail.err.ext" };
  }
  if (file.size > MAX_TEXT_BYTES) {
    return { ok: false, reason: "size", messageKey: "guardrail.err.size" };
  }
  return { ok: true };
}

export function validateText(text: unknown): ValidationResult {
  if (typeof text !== "string") {
    return { ok: false, reason: "type", messageKey: "guardrail.err.type" };
  }

  // TextEncoder is exact for multi-byte characters; the length fallback only
  // matters on very old engines, where erring high is the safe direction.
  let bytes: number;
  try {
    bytes = new TextEncoder().encode(text).length;
  } catch {
    bytes = text.length;
  }

  if (bytes > MAX_TEXT_BYTES) {
    return { ok: false, reason: "size", messageKey: "guardrail.err.size" };
  }
  return { ok: true };
}

/** Size in bytes of a string, using the same rule as validateText. */
export function byteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
}

/**
 * Escape a string for safe interpolation into an HTML string.
 *
 * Prefer building DOM with textContent. This exists for the few places that
 * must assemble markup, and for rendering user text into a downloadable file.
 */
export function escapeHTML(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Per-key rate limiting, so one slow analysis cannot lock out another tool.
 * Returns false when the caller should skip this run.
 */
export function createRateLimiter(
  now: () => number = () => Date.now(),
  defaultIntervalMs = 300,
): (key: string, intervalMs?: number) => boolean {
  const lastRunByKey = new Map<string, number>();

  return (key, intervalMs) => {
    const k = key || "default";
    const interval = intervalMs ?? defaultIntervalMs;
    const timestamp = now();
    const last = lastRunByKey.get(k) ?? 0;

    if (timestamp - last < interval) return false;
    lastRunByKey.set(k, timestamp);
    return true;
  };
}

/** Every key this site may write to localStorage. */
export const OWNED_KEYS: readonly string[] = [THEME_KEY, LANG_KEY];

/**
 * Remove only this site's keys. Never clears storage wholesale: the same
 * origin may host other things the user cares about.
 */
export function wipeLocalData(
  local: Pick<Storage, "removeItem"> | null,
  session: Pick<Storage, "removeItem"> | null,
): boolean {
  try {
    for (const key of OWNED_KEYS) {
      local?.removeItem(key);
      session?.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
