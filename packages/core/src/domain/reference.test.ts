import { describe, expect, it } from "vitest";
import { checkScholarlySupport, referenceLink, type Reference } from "./reference";

const ref = (over: Partial<Reference> = {}): Reference => ({
  id: "demarneffe2021",
  authors: "de Marneffe, M.-C., Manning, C. D., Nivre, J., & Zeman, D.",
  year: 2021,
  title: "Universal Dependencies",
  source: "Computational Linguistics, 47(2), 255–308",
  doi: "10.1162/coli_a_00402",
  verifiedOn: "2026-11-10",
  ...over,
});

const tool = (over: { id?: string; references?: readonly string[]; theory?: boolean } = {}) => ({
  id: over.id ?? "arboles",
  references: over.references ?? ["demarneffe2021"],
  theory: over.theory === false ? undefined : { es: "Teoría.", en: "Theory." },
});

describe("checkScholarlySupport", () => {
  it("no encuentra nada cuando cada herramienta cita referencias que existen", () => {
    expect(checkScholarlySupport([tool()], [ref()])).toEqual([]);
  });

  it("señala la herramienta que no explica su teoría o no cita nada", () => {
    const issues = checkScholarlySupport(
      [tool({ theory: false }), tool({ id: "fono", references: [] })],
      [ref()],
    );
    expect(issues).toEqual([
      { code: "missing-theory", toolId: "arboles" },
      { code: "no-references", toolId: "fono" },
    ]);
  });

  it("señala la cita a una referencia que no está en la bibliografía", () => {
    expect(checkScholarlySupport([tool({ references: ["fantasma1999"] })], [ref()])).toEqual([
      { code: "unknown-reference", toolId: "arboles", referenceId: "fantasma1999" },
      { code: "unused-reference", referenceId: "demarneffe2021" },
    ]);
  });

  it("señala la referencia que nadie puede abrir ni fue verificada", () => {
    const loose = ref({ doi: undefined, url: undefined, verifiedOn: "" });
    expect(checkScholarlySupport([tool()], [loose])).toEqual([
      { code: "no-locator", referenceId: "demarneffe2021" },
      { code: "not-verified", referenceId: "demarneffe2021" },
    ]);
  });

  it("no acepta un enlace que no sea https ni un identificador repetido", () => {
    const issues = checkScholarlySupport(
      [tool()],
      [ref({ doi: undefined, url: "http://x.org" }), ref()],
    );
    expect(issues.map((issue) => issue.code)).toEqual(["no-locator", "duplicate-reference"]);
  });
});

describe("referenceLink", () => {
  it("prefiere el DOI, que no cambia, a la URL", () => {
    expect(referenceLink(ref({ url: "https://example.org/a" }))).toBe(
      "https://doi.org/10.1162/coli_a_00402",
    );
    expect(referenceLink(ref({ doi: undefined, url: "https://example.org/a" }))).toBe(
      "https://example.org/a",
    );
  });
});
