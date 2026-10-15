/* ============================================================
   LinguaLab — CSV exchange for ONE rule layer

   WHY THE HEADER IS REQUIRED AND CHECKED
   A CSV without a header is a column order nobody declared. Guessing it from
   six unlabelled fields would sooner or later import `ipa` as `grapheme` and
   produce a table that looks authored but transcribes garbage. Rejecting the
   file with the received header in the message tells the person exactly what
   to fix.

   WHY THIS IS A SEPARATE FORMAT FROM THE JSON
   The JSON of a table is the complete entity: classes, both layers, notes,
   status. CSV is the flat, spreadsheet-shaped view of the rules of the layer
   being edited — the format someone fills in with Excel and hands back. It is
   intentionally lossy, and the editor says so next to the buttons.
   ============================================================ */

import { type G2PRule, type Result, err, ok } from "@lingualab/core";

export const CSV_COLUMNS = ["grapheme", "ipa", "before", "after", "priority", "note"] as const;

/** Shown in the header-mismatch message so the fix needs no documentation. */
export const CSV_HEADER: string = CSV_COLUMNS.join(",");

export type CsvError =
  | { readonly code: "empty" }
  | { readonly code: "header"; readonly expected: string; readonly received: string }
  | { readonly code: "row"; readonly row: number; readonly count: number; readonly expected: number }
  | { readonly code: "priority"; readonly row: number; readonly value: string };

/**
 * RFC 4180 quoting: a field is quoted when it contains a comma, a quote or a
 * newline, and a quote inside a quoted field is doubled.
 */
const quote = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const ruleToRow = (rule: G2PRule): string =>
  [
    quote(rule.grapheme),
    quote(rule.ipa),
    quote(rule.before ?? ""),
    quote(rule.after ?? ""),
    rule.priority === undefined ? "" : String(rule.priority),
    quote(rule.note ?? ""),
  ].join(",");

/** Header plus one row per rule, newline-terminated so every editor reads it. */
export const rulesToCsv = (rules: readonly G2PRule[]): string =>
  `${[CSV_HEADER, ...rules.map(ruleToRow)].join("\n")}\n`;

/**
 * Split CSV text into rows of raw fields. Quotes are handled here and nowhere
 * else, so the header check and the row builder cannot disagree about what a
 * field is.
 */
const parseRows = (text: string): readonly (readonly string[])[] => {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (char === undefined) {
      break;
    }

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      // Accept LF, CRLF and a lone CR: a file exported on Windows must import.
      if (char === "\r" && source[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  row.push(field);
  rows.push(row);

  // A trailing newline produces a final row with one empty field; it is not a
  // blank line somebody wrote.
  return rows.filter(
    (candidate) => candidate.length > 1 || (candidate[0] ?? "") !== "",
  );
};

const normalize = (value: string): string => value.trim().toLowerCase();

const fieldAt = (fields: readonly string[], index: number): string => fields[index] ?? "";

/**
 * Parse the rules of one layer. Every failure names the row (1-based, counting
 * the header) because a file with hundreds of rows is otherwise impossible to
 * repair.
 */
export const parseRulesCsv = (text: string): Result<readonly G2PRule[], CsvError> => {
  const rows = parseRows(text);
  const headerRow = rows[0];
  if (headerRow === undefined) {
    return err({ code: "empty" });
  }

  const receivedHeader = headerRow.join(",");
  const columnsMatch = CSV_COLUMNS.every(
    (column, position) => normalize(fieldAt(headerRow, position)) === column,
  );
  if (!columnsMatch || headerRow.length !== CSV_COLUMNS.length) {
    return err({ code: "header", expected: CSV_HEADER, received: receivedHeader });
  }

  const rules: G2PRule[] = [];
  for (const [offset, fields] of rows.slice(1).entries()) {
    // `offset` is index-based (0 = first data row); +2 makes it the line number
    // a person sees in a text editor, where the header is line 1.
    const line = offset + 2;

    if (fields.length !== CSV_COLUMNS.length) {
      return err({
        code: "row",
        row: line,
        count: fields.length,
        expected: CSV_COLUMNS.length,
      });
    }

    const priorityText = fieldAt(fields, 4).trim();
    let priority: number | undefined;
    if (priorityText !== "") {
      const parsedPriority = Number(priorityText);
      if (!Number.isFinite(parsedPriority)) {
        return err({ code: "priority", row: line, value: priorityText });
      }
      priority = parsedPriority;
    }

    const before = fieldAt(fields, 2);
    const after = fieldAt(fields, 3);
    const note = fieldAt(fields, 5);

    rules.push({
      grapheme: fieldAt(fields, 0),
      ipa: fieldAt(fields, 1),
      ...(before !== "" && before.trim() !== "" ? { before } : {}),
      ...(after !== "" && after.trim() !== "" ? { after } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(note !== "" ? { note } : {}),
    });
  }

  return ok(rules);
};
