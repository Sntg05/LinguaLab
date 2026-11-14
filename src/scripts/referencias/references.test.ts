import { checkScholarlySupport } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { parseReferences, REFERENCES, referencesOf, SUPPORTED_TOOLS } from "./references";

/**
 * Nada está «porque sí»: cada herramienta integrada explica su teoría y cita
 * fuentes que existen, que se pueden abrir y que alguien verificó.
 */
describe("el respaldo académico del sitio", () => {
  it("cada herramienta integrada tiene teoría y referencias completas", () => {
    expect(SUPPORTED_TOOLS.length).toBeGreaterThan(0);
    expect(checkScholarlySupport(SUPPORTED_TOOLS, REFERENCES)).toEqual([]);
  });

  it("entrega las referencias de una herramienta en el orden en que las cita", () => {
    const tool = SUPPORTED_TOOLS.find((candidate) => candidate.id === "arboles");
    expect(tool).toBeDefined();
    if (tool) {
      expect(referencesOf(tool).map((reference) => reference.id)).toEqual(tool.references);
    }
  });

  it("rechaza una bibliografía mal escrita en vez de publicarla a medias", () => {
    expect(() => parseReferences({ references: [{ id: "x", authors: "A", title: "T" }] })).toThrow(/x/);
    expect(() => parseReferences({})).toThrow(/references/);
  });
});
