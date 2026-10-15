/* ============================================================
   LinguaLab — OrthographyLab wiring

   Everything here is event handling, sequencing and honesty about failure.
   The decisions live in the pure modules beside it (`state`, `rules`, `csv`,
   `share`, `render`), which is what lets the rules of the editor be tested
   without a browser.

   The editor talks to the hexagon through `lingualab` and nothing else: it
   never touches `@lingualab/adapters` (that is `src/composition-root.ts`'
   job) and it never re-implements the engine. Even the "explain" output comes
   from the use case's `trace` rather than from a second conversion written
   here, because two implementations of a rule engine is one too many.
   ============================================================ */

import {
  DEMO_TABLES,
  INDIGENOUS_TEMPLATES,
  type ConversionLayer,
  type OrthographyTable,
  orthographyTableFromJson,
  orthographyTableToJson,
  validateOrthographyTable,
} from "@lingualab/core";
import { lingualab } from "../../composition-root";
import { type CsvError, parseRulesCsv, rulesToCsv } from "./csv";
import {
  type PersistenceStatus,
  renderCoverage,
  renderIssues,
  renderPersistence,
  renderRules,
  renderStoredTables,
  renderTrace,
  traceItems,
} from "./render";
import { addRule, moveRule, removeRule, rulesOf, setRule, withPriority, withRules, withTextField } from "./rules";
import {
  decodeTable,
  encodeTable,
  readShareCode,
  shareUrl,
  LONG_URL_LIMIT,
  SHARE_HASH_PREFIX,
} from "./share";
import {
  type EditableLayer,
  type TableDraft,
  EMPTY_DRAFT,
  type DraftHistory,
  EMPTY_HISTORY,
  asTable,
  draftOf,
  record,
  redo,
  toSaveDraft,
  toTable,
  undo,
} from "./state";
import { createStrings, type EditorStringKey, type EditorStrings, format, parseStrings } from "./strings";

/** Long enough that typing does not write on every keystroke, short enough that
 * a reload right after a change still finds the table. */
const AUTOSAVE_DELAY_MS = 400;

const ALL_TEMPLATES: readonly OrthographyTable[] = [...DEMO_TABLES, ...INDIGENOUS_TEMPLATES];

const templateById = (id: string): OrthographyTable | null =>
  ALL_TEMPLATES.find((table) => table.id === id) ?? null;

/** The repository error union, read without importing the port type by hand. */
const errorDetail = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return "unknown";
};

export const initOrthographyLab = (): void => {
  void start();
};

const start = async (): Promise<void> => {
  const root = document.querySelector<HTMLElement>("[data-ortholab]");
  if (root === null) {
    return;
  }

  /**
   * A missing hook means this template and this script disagree about the
   * contract. Failing loudly inside `safeInit` names the selector that moved,
   * which is far cheaper to debug than an editor that silently does nothing.
   */
  const need = <T extends HTMLElement>(selector: string): T => {
    const node = root.querySelector<T>(selector);
    if (node === null) {
      throw new Error(`OrthographyLab is missing [${selector}]`);
    }
    return node;
  };

  const strings: EditorStrings = createStrings(
    parseStrings(need<HTMLElement>("[data-ortho-strings]").dataset["json"]),
  );

  const statusLine = need<HTMLElement>("[data-status]");
  const persistenceBox = need<HTMLElement>("[data-persistence]");
  const nameInput = need<HTMLInputElement>("[data-meta-name]");
  const languageInput = need<HTMLInputElement>("[data-meta-language]");
  const rulesBody = need<HTMLElement>("[data-rules-body]");
  const rulesCount = need<HTMLElement>("[data-rules-count]");
  const issuesBox = need<HTMLElement>("[data-issues]");
  const outputBox = need<HTMLElement>("[data-output]");
  const traceBox = need<HTMLElement>("[data-trace]");
  const coverageBox = need<HTMLElement>("[data-coverage]");
  const layerNote = need<HTMLElement>("[data-layer-note]");
  const testInput = need<HTMLTextAreaElement>("[data-test-input]");
  const explainToggle = need<HTMLInputElement>("[data-explain]");
  const savedList = need<HTMLElement>("[data-saved-list]");
  const shareBox = need<HTMLElement>("[data-share-box]");
  const shareInput = need<HTMLInputElement>("[data-share-url]");
  const jsonFile = need<HTMLInputElement>("[data-import-json-file]");
  const csvFile = need<HTMLInputElement>("[data-import-csv-file]");

  const editLayerButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-edit-layer]")];
  const outputLayerButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-output-layer]")];
  const columnLabels = [...root.querySelectorAll("[data-rules-head] th")].map(
    (cell) => cell.textContent ?? "",
  );

  let draft: TableDraft = EMPTY_DRAFT;
  let history: DraftHistory = EMPTY_HISTORY;
  /** The state the last recorded history entry belongs to. */
  let committed: TableDraft = EMPTY_DRAFT;
  let editLayer: EditableLayer = "phonemic";
  let outputLayers: readonly ConversionLayer[] = ["phonemic"];
  let saveTimer: number | null = null;
  /** Bumped on every edit; a save records the revision it persisted. */
  let revision = 0;
  let savedRevision = 0;
  /** Bumped per conversion so a slower, older read cannot overwrite a newer one. */
  let conversion = 0;

  const status = (message: string): void => {
    statusLine.textContent = message;
  };

  const say = (key: EditorStringKey, values: Readonly<Record<string, string | number>> = {}): void => {
    status(format(strings.text(key), values));
  };

  /* ---------------- rendering ---------------- */

  const refreshRules = (focusIndex: number | null): void => {
    const rules = rulesOf(draft, editLayer);
    renderRules(rulesBody, rules, strings, columnLabels, focusIndex);
    rulesCount.textContent = format(strings.text("ortho.rules.count"), { count: rules.length });
  };

  const refreshValidation = (): void => {
    // An unsaved draft still has to be validated, so it is materialised with a
    // placeholder id: `id` plays no part in any validation rule.
    const issues = validateOrthographyTable(asTable(draft, draft.id === "" ? "draft" : draft.id));
    renderIssues(issuesBox, issues, strings);
  };

  /**
   * Say that an absent allophonic layer is absent. The use case publishes no
   * `layerOutputs.allophonic` in that case, and an empty box would read as
   * "the layer ran and produced nothing", which is a different claim.
   */
  const refreshLayerNote = (): void => {
    const missingAllophonic = draft.allophonic.length === 0 && outputLayers.includes("allophonic");
    layerNote.textContent = missingAllophonic ? strings.text("ortho.layers.absent") : "";
  };

  const refreshMeta = (): void => {
    nameInput.value = draft.name;
    languageInput.value = draft.languageId;
  };

  const refreshSaved = async (): Promise<void> => {
    const listed = await lingualab.listOrthographyTables();
    if (!listed.ok) {
      say("ortho.data.importError", { detail: errorDetail(listed.error) });
      return;
    }
    renderStoredTables(savedList, listed.value, draft.id, strings);
  };

  /** Re-read the backend after a real operation, not only at load time. */
  const refreshPersistence = (): void => {
    const current: PersistenceStatus = lingualab.persistence();
    renderPersistence(persistenceBox, current, strings);
  };

  const renderAll = (): void => {
    refreshMeta();
    refreshRules(null);
    refreshValidation();
    refreshLayerNote();
    void runConversion();
  };

  /* ---------------- persistence ---------------- */

  const isDirty = (): boolean => revision !== savedRevision;

  const scheduleSave = (): void => {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void persist().catch(reportFailure);
    }, AUTOSAVE_DELAY_MS);
  };

  const markChanged = (): void => {
    revision += 1;
    scheduleSave();
  };

  const reportFailure = (error: unknown): void => {
    const detail = error instanceof Error ? error.message : String(error);
    say("ortho.data.saveError", { detail });
  };

  interface PersistOutcome {
    readonly ok: boolean;
    /** The table exists but the use case refused it because it has errors. */
    readonly invalid: boolean;
    readonly detail: string;
  }

  const persist = async (): Promise<PersistOutcome> => {
    if (!isDirty() && draft.id !== "") {
      return { ok: true, invalid: false, detail: "" };
    }

    const at = revision;
    const result = await lingualab.saveOrthographyTable(toSaveDraft(draft));
    refreshPersistence();

    if (!result.ok) {
      const invalid = result.error.code === "table-invalid";
      void refreshSaved();
      return { ok: false, invalid, detail: errorDetail(result.error) };
    }

    // Adopt the id the use case minted without touching anything typed while
    // the write was in flight: only the identity changes here.
    if (draft.id === "") {
      draft = { ...draft, id: result.value.table.id };
      committed = { ...committed, id: result.value.table.id };
    }
    savedRevision = Math.max(savedRevision, at);
    void refreshSaved();
    return { ok: true, invalid: false, detail: "" };
  };

  /** Write immediately, so a conversion never reads a table that is a keystroke behind. */
  const flushSave = async (): Promise<PersistOutcome> => {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
    return persist();
  };

  const commit = (): void => {
    if (committed !== draft) {
      history = record(history, committed);
      committed = draft;
    }
  };

  /* ---------------- conversion ---------------- */

  const clearExplain = (): void => {
    renderTrace(traceBox, [], strings);
    renderCoverage(coverageBox, [], strings);
  };

  const runConversion = async (): Promise<void> => {
    const text = testInput.value;
    conversion += 1;
    const current = conversion;

    if (text.trim() === "") {
      outputBox.textContent = strings.text("ortho.test.empty");
      clearExplain();
      return;
    }

    const saved = await flushSave();
    if (!saved.ok) {
      outputBox.textContent = saved.invalid
        ? strings.text("ortho.error.tableUnusable")
        : format(strings.text("ortho.error.storage"), { detail: saved.detail });
      clearExplain();
      return;
    }

    const result = await lingualab.convertOrthographyToIpa({
      text,
      tableId: draft.id,
      options: { layers: outputLayers },
    });

    // A newer keystroke already asked for its own conversion; this answer is
    // about a state the person can no longer see.
    if (current !== conversion) {
      return;
    }

    if (!result.ok) {
      const error = result.error;
      switch (error.code) {
        case "empty-input":
          outputBox.textContent = strings.text("ortho.error.emptyInput");
          break;
        case "table-not-found":
          outputBox.textContent = strings.text("ortho.error.tableNotFound");
          break;
        case "table-unusable":
          outputBox.textContent = strings.text("ortho.error.tableUnusable");
          renderIssues(issuesBox, error.issues, strings);
          break;
        case "storage-failure":
          outputBox.textContent = format(strings.text("ortho.error.storage"), {
            detail: error.detail,
          });
          break;
      }
      clearExplain();
      return;
    }

    const items = traceItems(result.value.trace, result.value.uncovered);
    // A silent grapheme ("h" in Spanish) legitimately produces no output. An
    // empty box would look like a failure, so it is shown as an explicit
    // "nothing came out" mark instead of as blank space.
    outputBox.textContent = result.value.ipa === "" ? "∅" : result.value.ipa;
    renderTrace(traceBox, items, strings);
    renderCoverage(coverageBox, items, strings);
  };

  /* ---------------- table loading ---------------- */

  const loadDraft = (next: TableDraft): void => {
    draft = next;
    history = EMPTY_HISTORY;
    committed = next;
    editLayer = "phonemic";
    // Loading is a change like any other, so the next flush stores what was
    // loaded. Demos and templates carry an id but are not in the repository:
    // without this, converting one would report `table-not-found`.
    revision += 1;
    scheduleSave();
    syncLayerButtons();
    renderAll();
  };

  const loadTemplate = (id: string): void => {
    const table = templateById(id);
    if (table === null) {
      return;
    }
    loadDraft(draftOf(table));
  };

  const loadStored = async (id: string): Promise<void> => {
    // Loading goes through `exportJson` because the composition root exposes the
    // use cases, and the JSON is the core's own portable form: parsing it here
    // means the store is read exactly the way an imported file is read.
    const exported = await lingualab.exportOrthographyTable(id);
    if (!exported.ok) {
      say("ortho.data.importError", { detail: errorDetail(exported.error) });
      return;
    }
    const parsed = orthographyTableFromJson(exported.value);
    if (!parsed.ok) {
      say("ortho.data.importError", { detail: parsed.error.detail });
      return;
    }
    loadDraft(draftOf(parsed.value));
  };

  const deleteStored = async (id: string): Promise<void> => {
    const result = await lingualab.removeOrthographyTable(id);
    if (!result.ok) {
      say("ortho.data.deleteError", { detail: errorDetail(result.error) });
      return;
    }
    if (draft.id === id) {
      // The draft keeps its content but loses its identity: it is no longer
      // stored, and the next save must create it instead of silently
      // resurrecting the table the person just deleted.
      draft = { ...draft, id: "" };
      committed = { ...committed, id: "" };
      revision += 1;
    }
    say("ortho.data.deleted");
    await refreshSaved();
  };

  /* ---------------- import / export ---------------- */

  const fileName = (extension: string): string => {
    const base = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${base === "" ? "tabla" : base}.${extension}`;
  };

  const download = (name: string, mime: string, text: string): void => {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.rel = "noopener";
    link.click();
    URL.revokeObjectURL(url);
  };

  /** A table that can be exported or shared even if it was never stored. */
  const exportable = (): OrthographyTable => toTable(draft) ?? asTable(draft, `local-${Date.now()}`);

  const exportJson = (): void => {
    download(fileName("json"), "application/json", orthographyTableToJson(exportable()));
  };

  const importJson = async (text: string): Promise<void> => {
    const result = await lingualab.importOrthographyTable(text);
    if (!result.ok) {
      say("ortho.data.importError", { detail: errorDetail(result.error) });
      return;
    }
    loadDraft(draftOf(result.value));
    say("ortho.data.imported", { name: result.value.name });
  };

  const csvMessage = (error: CsvError): string => {
    switch (error.code) {
      case "empty":
        return strings.text("ortho.csv.empty");
      case "header":
        return format(strings.text("ortho.csv.header"), {
          expected: error.expected,
          received: error.received,
        });
      case "row":
        return format(strings.text("ortho.csv.row"), {
          row: error.row,
          count: error.count,
          expected: error.expected,
        });
      case "priority":
        return format(strings.text("ortho.csv.priority"), { row: error.row, value: error.value });
    }
  };

  const exportCsv = (): void => {
    download(fileName("csv"), "text/csv", rulesToCsv(rulesOf(draft, editLayer)));
  };

  const importCsv = (text: string): void => {
    const parsed = parseRulesCsv(text);
    if (!parsed.ok) {
      status(csvMessage(parsed.error));
      return;
    }
    draft = withRules(draft, editLayer, parsed.value);
    commit();
    markChanged();
    refreshRules(null);
    refreshValidation();
    void runConversion();
  };

  const share = async (): Promise<void> => {
    const code = await encodeTable(exportable());
    const url = shareUrl(window.location, code);
    // replaceState keeps the shared link out of the back-button history: the
    // person did not navigate anywhere, the page just learned a table.
    window.history.replaceState(null, "", SHARE_HASH_PREFIX + code);
    shareBox.hidden = false;
    shareInput.value = url;
    if (url.length > LONG_URL_LIMIT) {
      say("ortho.share.long", { length: url.length });
      return;
    }
    say("ortho.share.ready");
  };

  /* ---------------- field editing ---------------- */

  const rowIndexOf = (target: Element): number | null => {
    const raw = target.closest<HTMLElement>("[data-rule-row]")?.dataset["index"];
    const index = raw === undefined ? Number.NaN : Number(raw);
    return Number.isInteger(index) ? index : null;
  };

  const editRuleField = (input: HTMLInputElement, index: number): void => {
    const field = input.dataset["ruleField"];
    const rule = rulesOf(draft, editLayer)[index];
    if (rule === undefined) {
      return;
    }

    let next = rule;
    switch (field) {
      case "grapheme":
      case "ipa":
      case "before":
      case "after":
      case "note":
        next = withTextField(rule, field, input.value);
        break;
      case "priority":
        next = withPriority(rule, Number.isNaN(input.valueAsNumber) ? undefined : input.valueAsNumber);
        break;
      default:
        return;
    }

    draft = setRule(draft, editLayer, index, next);
    markChanged();
    refreshValidation();
    void runConversion();
  };

  const structuralChange = (next: TableDraft, focusIndex: number | null): void => {
    draft = next;
    commit();
    markChanged();
    refreshRules(focusIndex);
    refreshValidation();
    void runConversion();
  };

  const syncLayerButtons = (): void => {
    for (const button of editLayerButtons) {
      button.setAttribute(
        "aria-pressed",
        button.dataset["editLayer"] === editLayer ? "true" : "false",
      );
    }
    for (const button of outputLayerButtons) {
      button.setAttribute(
        "aria-pressed",
        button.dataset["outputLayer"] === outputKey() ? "true" : "false",
      );
    }
  };

  const outputKey = (): string =>
    outputLayers.length === 1 ? (outputLayers[0] ?? "phonemic") : "both";

  const setOutputLayers = (key: string): void => {
    outputLayers =
      key === "both"
        ? ["phonemic", "allophonic"]
        : [key === "allophonic" ? "allophonic" : "phonemic"];
    syncLayerButtons();
    refreshLayerNote();
    void runConversion();
  };

  const applyHistory = (step: ReturnType<typeof undo>): void => {
    if (step === null) {
      return;
    }
    draft = step.draft;
    history = step.history;
    committed = draft;
    markChanged();
    refreshMeta();
    refreshRules(null);
    refreshValidation();
    void runConversion();
  };

  /* ---------------- events ---------------- */

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const template = target.closest<HTMLElement>("[data-template-id]");
    if (template !== null && template.dataset["templateId"] !== undefined) {
      loadTemplate(template.dataset["templateId"]);
      return;
    }

    const load = target.closest<HTMLElement>("[data-load-id]");
    if (load !== null && load.dataset["loadId"] !== undefined) {
      void loadStored(load.dataset["loadId"]);
      return;
    }

    const removeStored = target.closest<HTMLElement>("[data-delete-id]");
    if (removeStored !== null && removeStored.dataset["deleteId"] !== undefined) {
      void deleteStored(removeStored.dataset["deleteId"]);
      return;
    }

    const action = target.closest<HTMLElement>("[data-rule-action]");
    if (action !== null) {
      const index = rowIndexOf(action);
      const which = action.dataset["ruleAction"];
      if (index === null) {
        return;
      }
      if (which === "remove") {
        structuralChange(removeRule(draft, editLayer, index), null);
      } else {
        const delta = which === "up" ? -1 : 1;
        structuralChange(moveRule(draft, editLayer, index, delta), index + delta);
      }
      return;
    }

    const editLayerButton = target.closest<HTMLElement>("[data-edit-layer]");
    if (editLayerButton !== null) {
      const layer = editLayerButton.dataset["editLayer"];
      if (layer === "phonemic" || layer === "allophonic") {
        editLayer = layer;
        syncLayerButtons();
        refreshRules(null);
      }
      return;
    }

    const outputLayerButton = target.closest<HTMLElement>("[data-output-layer]");
    if (outputLayerButton !== null && outputLayerButton.dataset["outputLayer"] !== undefined) {
      setOutputLayers(outputLayerButton.dataset["outputLayer"]);
      return;
    }

    if (target.closest("[data-rule-add]") !== null) {
      const next = addRule(draft, editLayer);
      structuralChange(next, rulesOf(next, editLayer).length - 1);
      return;
    }
    if (target.closest("[data-undo]") !== null) {
      applyHistory(undo(history, draft));
      return;
    }
    if (target.closest("[data-redo]") !== null) {
      applyHistory(redo(history, draft));
      return;
    }
    if (target.closest("[data-save]") !== null) {
      void flushSave().then((outcome) => {
        if (outcome.ok) {
          say("ortho.data.saved");
        } else if (!outcome.invalid) {
          say("ortho.data.saveError", { detail: outcome.detail });
        }
      });
      return;
    }
    if (target.closest("[data-new-table]") !== null) {
      // A new table is stored immediately, while it is still empty and
      // therefore valid: that mints its id through the use case, so the first
      // rule anyone types is an update and never a rejected creation.
      draft = { ...EMPTY_DRAFT, name: strings.text("ortho.meta.untitled") };
      loadDraft(draft);
      void persist();
      return;
    }
    if (target.closest("[data-export-json]") !== null) {
      exportJson();
      return;
    }
    if (target.closest("[data-export-csv]") !== null) {
      exportCsv();
      return;
    }
    if (target.closest("[data-import-json]") !== null) {
      jsonFile.click();
      return;
    }
    if (target.closest("[data-import-csv]") !== null) {
      csvFile.click();
      return;
    }
    if (target.closest("[data-share]") !== null) {
      void share().catch(reportFailure);
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target === testInput) {
      void runConversion();
      return;
    }
    if (target === nameInput) {
      draft = { ...draft, name: target.value };
      markChanged();
      return;
    }
    if (target === languageInput) {
      draft = { ...draft, languageId: target.value };
      markChanged();
      return;
    }

    const field = target.dataset["ruleField"];
    if (field !== undefined && target instanceof HTMLInputElement) {
      const index = rowIndexOf(target);
      if (index !== null) {
        editRuleField(target, index);
      }
    }
  });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    // Field edits record one undo step per editing burst (focus in, several
    // keystrokes, blur out) rather than one per character.
    if (target.dataset["ruleField"] !== undefined) {
      commit();
      return;
    }

    if (target === explainToggle) {
      traceBox.hidden = !explainToggle.checked;
      if (explainToggle.checked) {
        void runConversion();
      }
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const accel = event.ctrlKey || event.metaKey;
    if (accel && event.key.toLowerCase() === "z") {
      event.preventDefault();
      applyHistory(event.shiftKey ? redo(history, draft) : undo(history, draft));
      return;
    }

    if (!event.altKey) {
      return;
    }

    const row = target.closest<HTMLElement>("[data-rule-row]");
    const index = rowIndexOf(target);
    if (row === null || index === null) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? -1 : 1;
      structuralChange(moveRule(draft, editLayer, index, delta), index + delta);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      structuralChange(removeRule(draft, editLayer, index), null);
    }
  });

  jsonFile.addEventListener("change", () => {
    const file = jsonFile.files?.[0];
    if (file === undefined) {
      return;
    }
    void file
      .text()
      .then(importJson)
      .finally(() => {
        // Clearing lets the same file be chosen twice in a row.
        jsonFile.value = "";
      });
  });

  csvFile.addEventListener("change", () => {
    const file = csvFile.files?.[0];
    if (file === undefined) {
      return;
    }
    void file
      .text()
      .then((text) => {
        importCsv(text);
      })
      .finally(() => {
        csvFile.value = "";
      });
  });

  /* ---------------- first paint ---------------- */

  const shared = readShareCode(window.location.hash);
  if (shared !== null) {
    const decoded = await decodeTable(shared);
    if (decoded.ok) {
      loadDraft(draftOf(decoded.value));
      say("ortho.share.loaded");
    } else {
      say("ortho.share.invalid");
    }
  }

  syncLayerButtons();
  traceBox.hidden = !explainToggle.checked;
  await refreshSaved();
  refreshPersistence();
  renderAll();
};
