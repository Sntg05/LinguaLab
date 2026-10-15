/* ============================================================
   LinguaLab — ToolCatalog runtime strings

   The build-time dictionaries in `src/i18n/messages` never reach the browser:
   each locale is its own statically rendered route, which is what keeps the
   translation payload out of the bundle (see `src/i18n/index.ts`). The filter
   script still needs the two sentences it rewrites while filtering.

   So the component serialises exactly the keys in this list, already
   translated, into one `data-json` attribute. `CATALOG_STRING_KEYS` is
   `satisfies readonly MessageKey[]`, so a key that is misspelled or missing
   from `src/i18n/messages/es.ts` fails `npm run check` instead of showing a
   raw key to a student.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = ["catalog.count", "catalog.empty"] as const satisfies readonly MessageKey[];

export const CATALOG_STRING_KEYS: readonly MessageKey[] = KEYS;

export type CatalogStringKey = (typeof KEYS)[number];

/**
 * A translator closed over the already-translated values. A key that somehow
 * arrives without a value returns itself, which is visible on the page and
 * impossible to mistake for a real sentence.
 */
export type CatalogStrings = Readonly<{ text: (key: CatalogStringKey) => string }>;

export const createStrings = (values: Readonly<Record<string, string>>): CatalogStrings => ({
  text: (key) => values[key] ?? key,
});

/**
 * Read what the component serialised. Every key is copied only when it is
 * really a string, so a truncated or tampered attribute cannot put a non-string
 * into the UI.
 */
export const parseStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
  if (raw === undefined || raw === "") {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const key of KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      values[key] = value;
    }
  }
  return values;
};

/**
 * Replace `{name}` placeholders. Deliberately tiny: the catalog needs a count
 * and the list of active filters inside a sentence, not a template engine.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
