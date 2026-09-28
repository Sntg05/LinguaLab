/* ============================================================
   LinguaLab — catalogue filtering

   Shared by the glossary and the bibliography: both are lists of records
   with a free-text search, a category filter and a count.

   Kept separate from the pages so the matching rules are testable and the
   two catalogues cannot drift apart.
   ============================================================ */

import { foldAccents } from "./tokenize";

/** Fold for comparison, so "analisis" finds "análisis". */
export function fold(value: string): string {
  return foldAccents(String(value ?? "").toLowerCase()).trim();
}

/**
 * True when every whitespace-separated term of the query appears somewhere
 * in the haystack.
 *
 * All terms must match, in any order and any field, which is what people
 * expect from a search box: "fonetica corpus" finds a record mentioning both.
 */
export function matchesQuery(haystack: readonly string[], query: string): boolean {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const hay = fold(haystack.join(" "));
  return terms.every((term) => hay.includes(term));
}

export interface CatalogueFilter<T> {
  /** Values of the facet, with "" meaning "all". */
  facet?: string;
  query?: string;
  /** Which record fields the free-text search looks at. */
  fields: (record: T) => readonly string[];
  /** Which record field the facet compares against. */
  facetValue?: (record: T) => string;
}

/** Apply a search query and a facet selection to a list of records. */
export function filterCatalogue<T>(
  records: readonly T[],
  options: CatalogueFilter<T>,
): T[] {
  const facet = options.facet ?? "";
  const query = options.query ?? "";

  return records.filter((record) => {
    if (facet !== "") {
      const value = options.facetValue?.(record) ?? "";
      if (fold(value) !== fold(facet)) return false;
    }
    return matchesQuery(options.fields(record), query);
  });
}

/**
 * Distinct facet values in the order they first appear.
 *
 * First-appearance order keeps the data file's own grouping rather than
 * imposing an alphabetical one, which for topics reads better than a
 * random-looking alphabetical list.
 */
export function facetValues<T>(records: readonly T[], value: (record: T) => string): string[] {
  const seen: string[] = [];
  const known = new Set<string>();

  for (const record of records) {
    const raw = value(record);
    const key = fold(raw);
    if (key === "" || known.has(key)) continue;
    known.add(key);
    seen.push(raw);
  }

  return seen;
}

/** Count occurrences of each facet value. */
export function facetCounts<T>(
  records: readonly T[],
  value: (record: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = fold(value(record));
    if (key === "") continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
