/* ============================================================
   LinguaLab — rule list editing (pure)

   Every operation returns a NEW draft and never mutates its input: the undo
   history holds previous drafts by reference, so an in-place edit would
   silently rewrite the past and make "undo" return the edited table.
   ============================================================ */

import type { G2PRule } from "@lingualab/core";
import type { EditableLayer, TableDraft } from "./state";

/** The rule list of one layer. */
export const rulesOf = (
  draft: TableDraft,
  layer: EditableLayer,
): readonly G2PRule[] =>
  layer === "phonemic" ? draft.rules : draft.allophonic;

/** The same draft with one layer's rules replaced. */
export const withRules = (
  draft: TableDraft,
  layer: EditableLayer,
  rules: readonly G2PRule[],
): TableDraft =>
  layer === "phonemic" ? { ...draft, rules } : { ...draft, allophonic: rules };

export const blankRule = (): G2PRule => ({ grapheme: "", ipa: "" });

export const addRule = (draft: TableDraft, layer: EditableLayer): TableDraft =>
  withRules(draft, layer, [...rulesOf(draft, layer), blankRule()]);

export const removeRule = (
  draft: TableDraft,
  layer: EditableLayer,
  index: number,
): TableDraft => {
  const rules = rulesOf(draft, layer);
  if (index < 0 || index >= rules.length) {
    return draft;
  }
  return withRules(
    draft,
    layer,
    rules.filter((_, position) => position !== index),
  );
};

/**
 * Move a rule one slot up or down. Out-of-range moves are no-ops rather than
 * errors: the keyboard shortcut that reaches for the edge of the list is a
 * normal thing to do, not a mistake to report.
 */
export const moveRule = (
  draft: TableDraft,
  layer: EditableLayer,
  index: number,
  delta: number,
): TableDraft => {
  const rules = rulesOf(draft, layer);
  const target = index + delta;
  if (index < 0 || index >= rules.length || target < 0 || target >= rules.length) {
    return draft;
  }

  const moved = [...rules];
  const [item] = moved.splice(index, 1);
  if (item === undefined) {
    return draft;
  }
  moved.splice(target, 0, item);
  return withRules(draft, layer, moved);
};

export const setRule = (
  draft: TableDraft,
  layer: EditableLayer,
  index: number,
  rule: G2PRule,
): TableDraft => {
  const rules = rulesOf(draft, layer);
  if (index < 0 || index >= rules.length) {
    return draft;
  }
  return withRules(
    draft,
    layer,
    rules.map((current, position) => (position === index ? rule : current)),
  );
};

/** The six editable columns, named exactly as the CSV header names them. */
export type RuleTextField = "grapheme" | "ipa" | "before" | "after" | "note";

type MutableRule = {
  grapheme: string;
  ipa: string;
  before?: string;
  after?: string;
  priority?: number;
  note?: string;
};

const toMutable = (rule: G2PRule): MutableRule => ({
  grapheme: rule.grapheme,
  ipa: rule.ipa,
  ...(rule.before !== undefined ? { before: rule.before } : {}),
  ...(rule.after !== undefined ? { after: rule.after } : {}),
  ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
  ...(rule.note !== undefined ? { note: rule.note } : {}),
});

/**
 * Set one text column.
 *
 * An empty `before`/`after`/`note` REMOVES the key instead of storing `""`.
 * The engine treats an absent pattern as "no restriction" and an empty string
 * as a pattern that can never match, so storing the empty string would turn a
 * cleared field into a rule that silently stops working. `grapheme` and `ipa`
 * keep their empty strings: there, empty is a real (if invalid) value that the
 * validator has to see in order to report it.
 */
export const withTextField = (
  rule: G2PRule,
  field: RuleTextField,
  value: string,
): G2PRule => {
  const next = toMutable(rule);
  switch (field) {
    case "grapheme":
      next.grapheme = value;
      break;
    case "ipa":
      next.ipa = value;
      break;
    case "before":
    case "after":
    case "note":
      if (value === "") {
        delete next[field];
      } else {
        next[field] = value;
      }
      break;
  }
  return next;
};

export const withPriority = (rule: G2PRule, value: number | undefined): G2PRule => {
  const next = toMutable(rule);
  if (value === undefined) {
    delete next.priority;
  } else {
    next.priority = value;
  }
  return next;
};

/**
 * A rule written in the notation linguists already read: `c / [eéií] _ `.
 * It is deliberately wordless so the same string works in both locales.
 */
export const describeRule = (rule: G2PRule): string => {
  if (rule.before === undefined && rule.after === undefined) {
    return rule.grapheme;
  }
  return `${rule.grapheme} / ${rule.before ?? ""} _ ${rule.after ?? ""}`;
};
