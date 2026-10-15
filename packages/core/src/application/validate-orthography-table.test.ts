import { describe, expect, it } from "vitest";
import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable } from "../domain/orthography-table";
import {
  validateOrthographyTable,
  type OrthographyIssue,
  type OrthographyIssueCode,
} from "./validate-orthography-table";

const table = (
  rules: readonly G2PRule[],
  classes: Readonly<Record<string, readonly string[]>> = {},
  allophonic?: readonly G2PRule[],
): OrthographyTable => ({
  id: "t",
  languageId: "spa",
  name: "T",
  version: 1,
  classes,
  rules,
  ...(allophonic !== undefined ? { allophonic } : {}),
  status: "draft",
});

const find = (
  issues: readonly OrthographyIssue[],
  code: OrthographyIssueCode,
): OrthographyIssue => {
  const found = issues.find((issue) => issue.code === code);
  if (found === undefined) {
    throw new Error(`no se reporto ${code}: ${JSON.stringify(issues)}`);
  }
  return found;
};

describe("validateOrthographyTable: un caso por codigo", () => {
  it("empty-grapheme es error y apunta a la regla", () => {
    const issues = validateOrthographyTable(table([{ grapheme: "", ipa: "a" }]));
    const issue = find(issues, "empty-grapheme");

    expect(issue.severity).toBe("error");
    expect(issue.ruleIndex).toBe(0);
  });

  it("duplicate-rule es error y apunta a la regla repetida", () => {
    const issues = validateOrthographyTable(
      table([
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "ch", ipa: "t\u0283" },
      ]),
    );
    const issue = find(issues, "duplicate-rule");

    expect(issue.severity).toBe("error");
    expect(issue.ruleIndex).toBe(1);
  });

  it("contradictory-rule es error y apunta a la regla posterior", () => {
    const issues = validateOrthographyTable(
      table([
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "ch", ipa: "x" },
      ]),
    );
    const issue = find(issues, "contradictory-rule");

    expect(issue.severity).toBe("error");
    expect(issue.ruleIndex).toBe(1);
  });

  it("undefined-class es error y nombra la clase que falta", () => {
    const issues = validateOrthographyTable(table([{ grapheme: "c", ipa: "s", after: "{V}" }]));
    const issue = find(issues, "undefined-class");

    expect(issue.severity).toBe("error");
    expect(issue.ruleIndex).toBe(0);
    expect(issue.message).toContain("{V}");
  });

  it("symbol-outside-ipa es aviso y apunta a la regla", () => {
    const issues = validateOrthographyTable(table([{ grapheme: "a", ipa: "\u6c49" }]));
    const issue = find(issues, "symbol-outside-ipa");

    expect(issue.severity).toBe("warning");
    expect(issue.ruleIndex).toBe(0);
  });

  it("unreachable-rule es aviso cuando el contexto anterior cubre al posterior", () => {
    const issues = validateOrthographyTable(
      table([
        { grapheme: "c", ipa: "k", after: "[aeiou]" },
        { grapheme: "c", ipa: "s", after: "a" },
      ]),
    );
    const issue = find(issues, "unreachable-rule");

    expect(issue.severity).toBe("warning");
    expect(issue.ruleIndex).toBe(1);
  });
});

describe("validateOrthographyTable: la capa alofonica y el desplazamiento de indices", () => {
  it("valida la capa alofonica con el indice desplazado a la lista plana del editor", () => {
    const issues = validateOrthographyTable(
      table([{ grapheme: "a", ipa: "a" }], {}, [{ grapheme: "", ipa: "b" }]),
    );
    const issue = find(issues, "empty-grapheme");

    expect(issue.ruleIndex).toBe(1);
  });

  it("una tabla sin problemas no produce avisos", () => {
    const issues = validateOrthographyTable(
      table([
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "a", ipa: "a" },
      ]),
    );

    expect(issues).toHaveLength(0);
  });
});
