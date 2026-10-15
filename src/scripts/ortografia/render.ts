/* ============================================================
   LinguaLab — OrthographyLab views

   The one hard rule of this file: text reaches the DOM through `textContent`
   and `value`, never through `innerHTML`. The site's invariant is that user
   text is inserted as text nodes, and `scripts/verify-build.mjs` fails the
   build if a page ever stops honouring its CSP. A rule table is nothing but
   user text, so this is the place where that invariant would be easiest to
   break and most damaging if broken.
   ============================================================ */

import type {
  ConversionTraceEntry,
  G2PRule,
  OrthographyIssue,
  OrthographyTableSummary,
  UncoveredPosition,
} from "@lingualab/core";
import type { LinguaLab } from "../../composition-root";
import { describeRule, type RuleTextField } from "./rules";
import type { EditableLayer } from "./state";
import { type EditorStrings, format } from "./strings";

/**
 * One column of the rendered table. It is `RuleTextField` plus `priority`: the
 * text fields are set by `withTextField`, while priority is a number and goes
 * through `withPriority`, so it is deliberately NOT part of the text union.
 */
type ColumnField = RuleTextField | "priority";

/**
 * The persistence status is derived from the composition root instead of being
 * imported from `@lingualab/adapters`. Reaching for the adapter package from a
 * view — even for a type — is exactly the edge `npm run deps:check` forbids:
 * the moment a view can name an adapter, the next change puts adapter logic in
 * the view.
 */
export type PersistenceStatus = ReturnType<LinguaLab["persistence"]>;

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className !== undefined) {
    node.className = className;
  }
  return node;
};

const paragraph = (text: string, className: string): HTMLParagraphElement => {
  const node = element("p", className);
  node.textContent = text;
  return node;
};

/* ------------------------------------------------------------------
   Trace + coverage view model
   ------------------------------------------------------------------ */

export interface TraceItem {
  readonly inputIndex: number;
  readonly grapheme: string;
  /** `null` when no rule covered this position. */
  readonly ipa: string | null;
  readonly rule: G2PRule | null;
  readonly before: string;
  readonly after: string;
  readonly layer: ConversionTraceEntry["layer"];
}

/**
 * The trace only lists positions a rule won; uncovered positions live in their
 * own list. "Explain" has to read as a left-to-right account of the whole
 * input, so the two are merged here and ordered by input position — a gap in
 * the list would read as a missing explanation instead of a missing rule.
 */
export const traceItems = (
  trace: readonly ConversionTraceEntry[],
  uncovered: readonly UncoveredPosition[],
): readonly TraceItem[] => {
  const covered: TraceItem[] = trace.map((entry) => ({
    inputIndex: entry.inputIndex,
    grapheme: entry.grapheme,
    ipa: entry.ipa,
    rule: entry.rule ?? null,
    before: entry.before,
    after: entry.after,
    layer: entry.layer,
  }));

  const gaps: TraceItem[] = uncovered.map((entry) => ({
    inputIndex: entry.inputIndex,
    grapheme: entry.grapheme,
    ipa: null,
    rule: null,
    before: "",
    after: "",
    layer: entry.layer,
  }));

  return [...covered, ...gaps].sort((left, right) => left.inputIndex - right.inputIndex);
};

/* ------------------------------------------------------------------
   Rule table
   ------------------------------------------------------------------ */

const fieldInput = (
  field: ColumnField,
  value: string,
  label: string,
  className: string,
): HTMLInputElement => {
  const input = element("input", className);
  if (field === "priority") {
    // Priority is a tie-breaker, not a measurement: a decimal would suggest a
    // precision the engine does not have.
    input.type = "number";
    input.step = "1";
  } else {
    input.type = "text";
  }
  input.value = value;
  input.dataset["ruleField"] = field;
  input.setAttribute("aria-label", label);
  return input;
};

const rowAction = (
  action: "up" | "down" | "remove",
  index: number,
  label: string,
  glyph: string,
): HTMLButtonElement => {
  const button = element("button", "btn btn--quiet btn--sm");
  button.type = "button";
  button.dataset["ruleAction"] = action;
  button.dataset["index"] = String(index);
  button.setAttribute("aria-label", `${label} ${index + 1}`);
  button.title = `${label} ${index + 1}`;
  button.textContent = glyph;
  return button;
};

/**
 * Rebuild the rule rows.
 *
 * `focusIndex` is not cosmetic: the caller re-renders after a structural change
 * (move, remove, undo), and without restoring focus the keyboard user loses
 * their place on every reorder.
 */
export const renderRules = (
  body: HTMLElement,
  rules: readonly G2PRule[],
  strings: EditorStrings,
  columnLabels: readonly string[],
  focusIndex: number | null,
): void => {
  const label = (position: number, column: number): string =>
    `${columnLabels[column] ?? ""} ${position + 1}`.trim();

  const rows: HTMLTableRowElement[] = rules.map((rule, index) => {
    const row = element("tr");
    row.dataset["ruleRow"] = "true";
    row.dataset["index"] = String(index);

    const cells: readonly HTMLInputElement[] = [
      fieldInput("grapheme", rule.grapheme, label(index, 0), "mono"),
      fieldInput("ipa", rule.ipa, label(index, 1), "ipa"),
      fieldInput("before", rule.before ?? "", label(index, 2), "mono"),
      fieldInput("after", rule.after ?? "", label(index, 3), "mono"),
      fieldInput(
        "priority",
        rule.priority === undefined ? "" : String(rule.priority),
        label(index, 4),
        "mono",
      ),
      fieldInput("note", rule.note ?? "", label(index, 5), ""),
    ];

    for (const input of cells) {
      const cell = element("td");
      cell.append(input);
      row.append(cell);
    }

    const actions = element("td", "cluster");
    actions.append(
      rowAction("up", index, strings.text("ortho.rules.up"), "↑"),
      rowAction("down", index, strings.text("ortho.rules.down"), "↓"),
      rowAction("remove", index, strings.text("ortho.rules.remove"), "✕"),
    );
    row.append(actions);
    return row;
  });

  if (rows.length === 0) {
    const empty = element("tr");
    const cell = element("td");
    cell.colSpan = columnLabels.length + 1;
    cell.className = "muted";
    cell.textContent = strings.text("ortho.rules.empty");
    empty.append(cell);
    rows.push(empty);
  }

  body.replaceChildren(...rows);

  if (focusIndex !== null) {
    const target = body.querySelector<HTMLInputElement>(
      `[data-rule-row][data-index="${focusIndex}"] [data-rule-field="grapheme"]`,
    );
    target?.focus();
  }
};

/* ------------------------------------------------------------------
   Explain panel
   ------------------------------------------------------------------ */

const layerName = (layer: EditableLayer, strings: EditorStrings): string =>
  strings.text(layer === "phonemic" ? "ortho.layers.phonemic" : "ortho.layers.allophonic");

export const renderTrace = (
  container: HTMLElement,
  items: readonly TraceItem[],
  strings: EditorStrings,
): void => {
  if (items.length === 0) {
    container.replaceChildren(paragraph(strings.text("ortho.trace.empty"), "muted"));
    return;
  }

  const boundary = strings.text("ortho.trace.boundary");
  const list = element("ol", "stack");

  for (const item of items) {
    const entry = element("li");

    const head = paragraph(
      `${format(strings.text("ortho.trace.position"), { index: item.inputIndex })}: ${format(
        strings.text("ortho.trace.rule"),
        { grapheme: item.grapheme, ipa: item.ipa ?? "" },
      )}`,
      "mono",
    );

    const detail =
      item.rule === null
        ? paragraph(strings.text("ortho.trace.noRule"), "faint")
        : paragraph(
            `${format(strings.text("ortho.trace.via"), {
              rule: describeRule(item.rule),
            })} · ${format(strings.text("ortho.trace.layer"), {
              layer: layerName(item.layer, strings),
            })}`,
            "faint",
          );

    const context = paragraph(
      format(strings.text("ortho.trace.context"), {
        before: item.before === "" ? boundary : item.before,
        after: item.after === "" ? boundary : item.after,
      }),
      "faint",
    );

    entry.append(head, detail, context);
    list.append(entry);
  }

  container.replaceChildren(list);
};

export const renderCoverage = (
  container: HTMLElement,
  items: readonly TraceItem[],
  strings: EditorStrings,
): void => {
  const missing = items.filter((item) => item.ipa === null);
  const children: HTMLElement[] = [];

  if (missing.length === 0) {
    children.push(paragraph(strings.text("ortho.coverage.all"), "muted"));
  } else {
    const characters = [...new Set(missing.map((item) => item.grapheme))].join(" ");
    children.push(
      paragraph(format(strings.text("ortho.coverage.missing"), { characters }), "muted mono"),
    );
  }

  children.push(paragraph(strings.text("ortho.coverage.note"), "faint"));
  container.replaceChildren(...children);
};

/* ------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------ */

export const renderIssues = (
  container: HTMLElement,
  issues: readonly OrthographyIssue[],
  strings: EditorStrings,
): void => {
  if (issues.length === 0) {
    container.replaceChildren(paragraph(strings.text("ortho.validation.none"), "muted"));
    return;
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;

  const summary = paragraph(
    format(strings.text("ortho.validation.summary"), { errors, warnings }),
    errors > 0 ? "badge badge--warn" : "badge",
  );

  const list = element("ul", "stack");
  for (const issue of issues) {
    const item = element("li");
    const badge = element("span", issue.severity === "error" ? "badge badge--warn" : "badge");
    badge.textContent = strings.text(
      issue.severity === "error" ? "ortho.issue.error" : "ortho.issue.warning",
    );
    const message = element("span");
    // The message comes from the core validator, which writes it in Spanish on
    // purpose: it is the same sentence the specification and the tests use.
    message.textContent = ` ${issue.message}`;
    item.append(badge, message);
    list.append(item);
  }

  container.replaceChildren(summary, list);
};

/* ------------------------------------------------------------------
   Persistence + stored tables
   ------------------------------------------------------------------ */

const REASON_KEYS: Record<NonNullable<PersistenceStatus["reason"]>, "ortho.persistence.reason.noIndexeddb" | "ortho.persistence.reason.openFailed" | "ortho.persistence.reason.quotaExceeded"> = {
  "no-indexeddb": "ortho.persistence.reason.noIndexeddb",
  "open-failed": "ortho.persistence.reason.openFailed",
  "quota-exceeded": "ortho.persistence.reason.quotaExceeded",
};

/**
 * Say out loud which store is holding the tables. "Saved" that does not
 * survive a reload is the single most misleading thing this editor could do,
 * and the adapter already tells us when it degraded — the only failure mode
 * left is not asking, or asking only once at load time.
 */
export const renderPersistence = (
  container: HTMLElement,
  status: PersistenceStatus,
  strings: EditorStrings,
): void => {
  if (status.backend === "indexeddb") {
    container.replaceChildren(paragraph(strings.text("ortho.persistence.ok"), "faint"));
    return;
  }

  const reason = status.reason === undefined ? "" : ` ${strings.text(REASON_KEYS[status.reason])}`;
  container.replaceChildren(
    paragraph(`${strings.text("ortho.persistence.memory")}${reason}`, "callout callout--warn"),
  );
};

export const renderStoredTables = (
  container: HTMLElement,
  summaries: readonly OrthographyTableSummary[],
  currentId: string,
  strings: EditorStrings,
): void => {
  if (summaries.length === 0) {
    container.replaceChildren(paragraph(strings.text("ortho.data.none"), "muted"));
    return;
  }

  const list = element("ul", "stack");
  for (const summary of summaries) {
    const item = element("li", "cluster");

    const name = element("span", "mono");
    name.textContent = summary.name === "" ? summary.id : summary.name;

    const count = element("span", "badge");
    count.textContent = format(strings.text("ortho.rules.count"), { count: summary.ruleCount });

    item.append(name, count);

    if (summary.id === currentId) {
      item.append(paragraph(strings.text("ortho.data.current"), "faint"));
    }

    const load = element("button", "btn btn--quiet btn--sm");
    load.type = "button";
    load.dataset["loadId"] = summary.id;
    load.textContent = strings.text("ortho.data.load");

    const remove = element("button", "btn btn--quiet btn--sm");
    remove.type = "button";
    remove.dataset["deleteId"] = summary.id;
    remove.textContent = strings.text("ortho.data.delete");

    item.append(load, remove);
    list.append(item);
  }

  container.replaceChildren(list);
};
