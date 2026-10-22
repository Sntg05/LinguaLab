/**
 * The boundary between the n-gram builder's form and the analysis engine.
 *
 * The form is free: a number input can be cleared, typed over, or set outside
 * the range the engine can use, and the sort `<select>` can hold a stale option.
 * This module is the only place that decides what the engine actually receives,
 * which is why the clamping rules live here instead of inside the Astro
 * component, where no test could reach them.
 */
import type { NgramOptions } from "./analysis";

/** Sort keys the engine understands, in the order the builder offers them. */
export const NGRAM_SORT_KEYS = ["logDice", "pmi", "tScore", "logLikelihood", "count"] as const;

export type NgramSortKey = NonNullable<NgramOptions["sortBy"]>;

export interface NgramSettings {
  n: number;
  minCount: number;
  limit: number;
  sortBy: NgramSortKey;
}

/**
 * The exact call the panel made before the builder existed:
 * `ngrams(tokens, 2, { minCount: 2, limit: 25 })`, sorted by the engine's
 * default. Keeping these as the defaults is what makes the builder an addition
 * rather than a change.
 */
export const NGRAM_DEFAULTS: NgramSettings = {
  n: 2,
  minCount: 2,
  limit: 25,
  sortBy: "logLikelihood",
};

interface Bounds {
  readonly min: number;
  readonly max: number;
}

export const NGRAM_BOUNDS: Record<"n" | "minCount" | "limit", Bounds> = {
  n: { min: 2, max: 5 },
  minCount: { min: 1, max: 100 },
  limit: { min: 1, max: 500 },
};

export type NgramSettingsInput = Partial<
  Record<keyof NgramSettings, string | number | null | undefined>
>;

/** A whole number, or null when the raw value cannot give one. */
function toInteger(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.trunc(raw) : null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function clamp(
  raw: string | number | null | undefined,
  bounds: Bounds,
  fallback: number,
): number {
  const value = toInteger(raw);
  if (value === null) return fallback;
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/**
 * Turn whatever the form produced into settings the engine can use.
 *
 * Missing, empty and non-numeric fields fall back to the defaults; numbers are
 * truncated and clamped; an unknown sort key becomes the engine's default rather
 * than an option it would silently misread.
 */
export function normaliseNgramSettings(input: NgramSettingsInput = {}): NgramSettings {
  const sort = input.sortBy;
  return {
    n: clamp(input.n, NGRAM_BOUNDS.n, NGRAM_DEFAULTS.n),
    minCount: clamp(input.minCount, NGRAM_BOUNDS.minCount, NGRAM_DEFAULTS.minCount),
    limit: clamp(input.limit, NGRAM_BOUNDS.limit, NGRAM_DEFAULTS.limit),
    sortBy: (NGRAM_SORT_KEYS as readonly string[]).includes(String(sort))
      ? (sort as NgramSortKey)
      : NGRAM_DEFAULTS.sortBy,
  };
}
