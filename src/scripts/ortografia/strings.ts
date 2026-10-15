/* ============================================================
   LinguaLab — OrthographyLab runtime strings

   The build-time dictionaries in `src/i18n/messages` never reach the browser:
   each locale is its own statically rendered route, which is what keeps the
   translation payload out of the bundle (see `src/i18n/index.ts`). The client
   script still needs a handful of sentences that only exist at runtime — a
   failed save, an uncovered character, why the store degraded.

   So the component serialises exactly the keys in this list, server-rendered
   and already translated, into one `data-json` attribute. `EDITOR_STRING_KEYS`
   is `satisfies readonly MessageKey[]`, so a key that is misspelled or missing
   from `src/i18n/messages/es.ts` fails `npm run check` instead of showing a
   raw key to a student.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "ortho.rules.count",
  "ortho.rules.empty",
  "ortho.rules.up",
  "ortho.rules.down",
  "ortho.rules.remove",
  "ortho.trace.empty",
  "ortho.trace.position",
  "ortho.trace.rule",
  "ortho.trace.via",
  "ortho.trace.context",
  "ortho.trace.boundary",
  "ortho.trace.noRule",
  "ortho.trace.layer",
  "ortho.coverage.all",
  "ortho.coverage.missing",
  "ortho.coverage.note",
  "ortho.layers.phonemic",
  "ortho.layers.allophonic",
  "ortho.layers.absent",
  "ortho.issue.error",
  "ortho.issue.warning",
  "ortho.validation.none",
  "ortho.validation.summary",
  "ortho.test.empty",
  "ortho.error.emptyInput",
  "ortho.error.tableNotFound",
  "ortho.error.tableUnusable",
  "ortho.error.storage",
  "ortho.data.none",
  "ortho.data.new",
  "ortho.meta.untitled",
  "ortho.data.current",
  "ortho.data.load",
  "ortho.data.delete",
  "ortho.data.saved",
  "ortho.data.saveError",
  "ortho.data.deleted",
  "ortho.data.deleteError",
  "ortho.data.imported",
  "ortho.data.importError",
  "ortho.csv.header",
  "ortho.csv.empty",
  "ortho.csv.row",
  "ortho.csv.priority",
  "ortho.share.ready",
  "ortho.share.loaded",
  "ortho.share.invalid",
  "ortho.share.long",
  "ortho.persistence.ok",
  "ortho.persistence.memory",
  "ortho.persistence.reason.noIndexeddb",
  "ortho.persistence.reason.openFailed",
  "ortho.persistence.reason.quotaExceeded",
] as const satisfies readonly MessageKey[];

export const EDITOR_STRING_KEYS: readonly MessageKey[] = KEYS;

export type EditorStringKey = (typeof KEYS)[number];

/**
 * A translator closed over the already-translated values. A key that somehow
 * arrives without a value returns itself, which is visible on the page and
 * impossible to mistake for a real sentence.
 */
export type EditorStrings = Readonly<{ text: (key: EditorStringKey) => string }>;

export const createStrings = (values: Readonly<Record<string, string>>): EditorStrings => ({
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
 * Replace `{name}` placeholders. Deliberately tiny: the editor needs counts and
 * details inside sentences, not a template engine.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
