import { describe, expect, it } from "vitest";
import { codebookToCsv, codeTree, parseCodebookCsv, type QualitativeCode } from "./codebook";
import { createCodingSheet, setMark } from "./coding";
import { segmentsWithCode } from "./retrieval";

const code = (name: string, extra: Partial<QualitativeCode> = {}): QualitativeCode => ({
  name,
  definition: "",
  include: "",
  exclude: "",
  example: "",
  ...extra,
});

describe("jerarquía, color y memo del libro de códigos", () => {
  it("el CSV guarda y lee el código padre, el color y el memo", () => {
    const codes = [
      code("Actitud"),
      code("Actitud positiva", {
        parent: "Actitud",
        color: "#1b7f5a",
        memo: "Revisar con el grupo",
      }),
    ];
    const csv = codebookToCsv(codes);
    expect(csv.split("\n")[0]).toBe("code,definition,include,exclude,example,parent,color,memo");
    const back = parseCodebookCsv(csv);
    expect(back.ok && back.value).toEqual(codes);
  });

  it("un CSV viejo, sin esas columnas, se sigue leyendo", () => {
    const back = parseCodebookCsv("code,definition\nA,primero\n");
    expect(back.ok && back.value[0]).toEqual(code("A", { definition: "primero" }));
  });

  it("un padre que no existe en el libro es un error que nombra la fila", () => {
    expect(parseCodebookCsv("code,parent\nA,\nB,Z\n")).toEqual({
      ok: false,
      error: { code: "unknown-parent", row: 3, name: "Z" },
    });
  });

  it("un ciclo de padres es un error, no un bucle infinito", () => {
    expect(parseCodebookCsv("code,parent\nA,B\nB,A\n")).toEqual({
      ok: false,
      error: { code: "parent-cycle", name: "A" },
    });
  });

  it("un color que no es #rrggbb es un error", () => {
    expect(parseCodebookCsv("code,color\nA,rojo\n")).toEqual({
      ok: false,
      error: { code: "invalid-color", row: 2, value: "rojo" },
    });
  });

  it("el árbol pone cada hijo debajo de su padre, con su profundidad", () => {
    const tree = codeTree([
      code("B", { parent: "A" }),
      code("A"),
      code("C"),
      code("D", { parent: "B" }),
    ]);
    expect(tree.map((node) => [node.code.name, node.depth])).toEqual([
      ["A", 0],
      ["B", 1],
      ["D", 2],
      ["C", 0],
    ]);
  });
});

describe("recuperar los segmentos de un código", () => {
  it("devuelve solo los segmentos marcados con ese código, en orden", () => {
    let sheet = createCodingSheet(["uno", "dos", "tres"], ["A", "B"]);
    sheet = setMark(sheet, 0, 1, true);
    sheet = setMark(sheet, 2, 1, true);
    sheet = setMark(sheet, 1, 0, true);
    expect(segmentsWithCode(sheet, "B").map((segment) => segment.text)).toEqual(["uno", "tres"]);
  });

  it("no distingue mayúsculas ni espacios en el nombre, igual que el libro", () => {
    const sheet = setMark(createCodingSheet(["uno"], ["Actitud"]), 0, 0, true);
    expect(segmentsWithCode(sheet, " actitud ")).toHaveLength(1);
  });

  it("un código que no está en la hoja no devuelve nada", () => {
    expect(segmentsWithCode(createCodingSheet(["uno"], ["A"]), "Z")).toEqual([]);
  });
});
