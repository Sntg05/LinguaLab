/* ============================================================
   LinguaLab — OrthographyLab editor state

   Pure: no DOM, no ports. Everything the editor needs to decide lives here and
   is unit tested directly, which is why the wiring in `index.ts` can stay a
   thin layer of event handlers.

   The editor edits a `TableDraft`, not the domain `OrthographyTable`. The one
   real difference is `id`: a table that has never been stored has no id yet,
   and pretending otherwise (`id: ""`) would produce a `G2PRule`-shaped object
   that the repository would accept and the JSON format would reject. So the
   empty id means "not stored yet" and is materialised only when something
   needs a real table: saving, exporting or sharing.
   ============================================================ */

import type { G2PRule, OrthographyTable, OrthographyTableDraft } from "@lingualab/core";

/** The two rule lists of a table, named as the engine names them. */
export type EditableLayer = "phonemic" | "allophonic";

export interface TableDraft {
  /** Empty while the table has never been stored. */
  readonly id: string;
  readonly languageId: string;
  readonly name: string;
  readonly version: number;
  readonly classes: Readonly<Record<string, readonly string[]>>;
  readonly rules: readonly G2PRule[];
  readonly allophonic: readonly G2PRule[];
  readonly notes: string;
  readonly status: OrthographyTable["status"];
}

export const EMPTY_DRAFT: TableDraft = {
  id: "",
  languageId: "",
  name: "",
  version: 1,
  classes: {},
  rules: [],
  allophonic: [],
  notes: "",
  status: "draft",
};

/** Build an editor draft from any table: a demo, a template, or the store. */
export const draftOf = (table: OrthographyTable): TableDraft => ({
  id: table.id,
  languageId: table.languageId,
  name: table.name,
  version: table.version,
  classes: table.classes,
  rules: table.rules,
  allophonic: table.allophonic ?? [],
  notes: table.notes ?? "",
  status: table.status,
});

/**
 * Materialise a real table. `allophonic`, `notes` and `id` are omitted when
 * empty because the domain treats their absence as meaningful: an absent
 * allophonic layer is not the same as an empty one (the conversion publishes no
 * `layerOutputs.allophonic` for it) and `orthographyTableFromJson` rejects an
 * empty id.
 */
export const asTable = (draft: TableDraft, id: string): OrthographyTable => ({
  id,
  languageId: draft.languageId,
  name: draft.name,
  version: draft.version,
  classes: draft.classes,
  rules: draft.rules,
  ...(draft.allophonic.length > 0 ? { allophonic: draft.allophonic } : {}),
  ...(draft.notes !== "" ? { notes: draft.notes } : {}),
  status: draft.status,
});

/** The stored table behind a draft, or `null` when it has not been stored yet. */
export const toTable = (draft: TableDraft): OrthographyTable | null =>
  draft.id === "" ? null : asTable(draft, draft.id);

/** The shape `createSaveOrthographyTable` expects. */
export const toSaveDraft = (draft: TableDraft): OrthographyTableDraft => ({
  ...(draft.id === "" ? {} : { id: draft.id }),
  languageId: draft.languageId,
  name: draft.name,
  version: draft.version,
  classes: draft.classes,
  rules: draft.rules,
  ...(draft.allophonic.length > 0 ? { allophonic: draft.allophonic } : {}),
  ...(draft.notes !== "" ? { notes: draft.notes } : {}),
  status: draft.status,
});

/**
 * An id for a table that is being exported or shared without ever having been
 * stored. It is not a second id generator for the repository — the use case
 * still mints the stored id — but a download with an empty id would be a file
 * that cannot be imported back, which defeats the point of exporting it.
 */
export const fallbackId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/* ------------------------------------------------------------------
   Undo / redo

   Snapshots of the whole draft rather than inverse operations: a table is
   small, and an inverse operation per field would be a second implementation
   of every edit that can drift from the first.
   ------------------------------------------------------------------ */

export interface DraftHistory {
  readonly past: readonly TableDraft[];
  readonly future: readonly TableDraft[];
}

export const EMPTY_HISTORY: DraftHistory = { past: [], future: [] };

/** Deep enough for a working session, bounded so a long edit cannot grow forever. */
export const HISTORY_LIMIT = 60;

/** A new edit invalidates the redo stack: the future it described no longer exists. */
export const record = (history: DraftHistory, previous: TableDraft): DraftHistory => ({
  past: [...history.past, previous].slice(-HISTORY_LIMIT),
  future: [],
});

export interface HistoryStep {
  readonly history: DraftHistory;
  readonly draft: TableDraft;
}

export const undo = (history: DraftHistory, current: TableDraft): HistoryStep | null => {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) {
    return null;
  }
  return {
    draft: previous,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
  };
};

export const redo = (history: DraftHistory, current: TableDraft): HistoryStep | null => {
  const next = history.future[0];
  if (next === undefined) {
    return null;
  }
  return {
    draft: next,
    history: { past: [...history.past, current], future: history.future.slice(1) },
  };
};
