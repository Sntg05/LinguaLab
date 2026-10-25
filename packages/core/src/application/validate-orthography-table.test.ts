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

/** El tipo del aviso que se busca, para poder leer sus datos sin adivinar. */
const find = <Code extends OrthographyIssueCode>(
  issues: readonly OrthographyIssue[],
  code: Code,
): Extract<OrthographyIssue, { code: Code }> => {
  const found = issues.find((issue) => issue.code === code);
  if (found === undefined) {
    throw new Error(`no se reporto ${code}: ${JSON.stringify(issues)}`);
  }
  return found as Extract<OrthographyIssue, { code: Code }>;
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
    expect(issue.className).toBe("V");
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

describe("validateOrthographyTable: el aviso es codigo y datos, nunca prosa", () => {
  /**
   * Una tabla que produce los seis codigos a la vez.
   *
   * Los numeros de regla importan: la frase que arma la capa de presentacion
   * empieza por el numero de fila, y ese numero solo es correcto si el aviso
   * lo trae como dato en vez de llevarlo escrito.
   */
  const broken = (): readonly OrthographyIssue[] =>
    validateOrthographyTable(
      table([
        { grapheme: "a", ipa: "a" },
        { grapheme: "", ipa: "x" },
        { grapheme: "c", ipa: "s", after: "[aeiou]" },
        { grapheme: "c", ipa: "s", after: "a" },
        { grapheme: "g", ipa: "x", before: "{V}" },
        { grapheme: "h", ipa: "\u6c49" },
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "ch", ipa: "x" },
      ]),
    );

  it("ningun aviso lleva la frase redactada", () => {
    const issues = broken();

    expect(issues).toHaveLength(6);
    for (const issue of issues) {
      expect(issue).not.toHaveProperty("message");
    }
  });

  it("duplicate-rule y contradictory-rule llevan el grafema de la regla senalada", () => {
    const issues = broken();

    expect(find(issues, "duplicate-rule")).toMatchObject({
      ruleIndex: 7,
      grapheme: "ch",
    });
    expect(find(issues, "contradictory-rule")).toMatchObject({
      ruleIndex: 8,
      grapheme: "ch",
    });
  });

  it("undefined-class lleva el nombre de la clase, sin las llaves que pone la frase", () => {
    const issues = broken();

    expect(find(issues, "undefined-class")).toMatchObject({
      ruleIndex: 4,
      className: "V",
    });
  });

  it("symbol-outside-ipa lleva el simbolo exacto que no es AFI", () => {
    const issues = broken();

    expect(find(issues, "symbol-outside-ipa")).toMatchObject({
      ruleIndex: 5,
      symbol: "\u6c49",
    });
  });

  it("empty-grapheme y unreachable-rule no llevan datos de mas", () => {
    const issues = broken();
    const exactKeys = ["code", "ruleIndex", "severity"];

    expect(Object.keys(find(issues, "empty-grapheme")).sort()).toEqual(exactKeys);
    expect(Object.keys(find(issues, "unreachable-rule")).sort()).toEqual(exactKeys);
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
