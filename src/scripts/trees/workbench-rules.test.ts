import { describe, expect, it } from "vitest";
import { TREE_EXAMPLES } from "../../data/trees/examples";
import { treeType } from "../../data/trees/types";
import { ParseError } from "./parse";
import {
  buildWorkbenchTree,
  canUseSentence,
  clampZoom,
  copyStatus,
  errorMessage,
  exampleOptions,
  fitZoom,
  nextZoom,
  pngFailure,
  zoomLabel,
} from "./workbench-rules";

const constituency = treeType("constituency");
const dependency = treeType("dependency");
if (!constituency || !dependency) throw new Error("faltan los tipos de árbol de la prueba");

describe("zoom", () => {
  it("queda entre 20 % y 300 %", () => {
    expect(clampZoom(10)).toBe(3);
    expect(clampZoom(0.01)).toBe(0.2);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it("acercar y alejar van de a 1,2; otra orden vuelve al tamaño real", () => {
    expect(nextZoom("in", 1)).toBeCloseTo(1.2);
    expect(nextZoom("out", 1.2)).toBeCloseTo(1);
    expect(nextZoom("in", 3)).toBe(3);
    expect(nextZoom("actual", 2)).toBe(1);
  });

  it("ajustar cabe en el marco con su margen y nunca agranda", () => {
    expect(fitZoom(1000, 532)).toBeCloseTo(0.5);
    expect(fitZoom(200, 1000)).toBe(1);
  });

  it("sin ancho legible, ajusta suponiendo 800 px", () => {
    expect(fitZoom(0, 432)).toBeCloseTo(0.5);
  });

  it("el rótulo es un porcentaje redondeado", () => {
    expect(zoomLabel(1.2)).toBe("120 %");
    expect(zoomLabel(0.833)).toBe("83 %");
  });
});

describe("canUseSentence", () => {
  it("solo los tipos de corchetes aceptan una frase sin notación", () => {
    expect(canUseSentence(constituency)).toBe(true);
    expect(canUseSentence(dependency)).toBe(false);
  });
});

describe("exampleOptions", () => {
  it("abre con la invitación y numera los ejemplos en orden", () => {
    const options = exampleOptions("constituency", true);
    expect(options[0]).toEqual({ label: "Cargar ejemplo…", value: "" });
    expect(options[1]).toEqual({ label: "Frase simple (ES)", value: "0" });
  });

  it("un tipo sin ejemplos solo trae la invitación", () => {
    expect(exampleOptions("no-existe", false)).toEqual([{ label: "Load example…", value: "" }]);
  });
});

describe("buildWorkbenchTree", () => {
  it("en modo texto lee la notación del tipo", () => {
    const { tree } = buildWorkbenchTree(constituency, "[S [N a] [V b]]", "text");
    expect(tree.label).toBe("S");
    expect(tree.children).toHaveLength(2);
  });

  it("en modo frase arma el árbol desde una oración", () => {
    expect(buildWorkbenchTree(constituency, "el perro ladra", "easy").tree.label).not.toBe("");
  });

  it("en un tipo que no es de corchetes, el modo frase se ignora y se lee la notación", () => {
    const sample = TREE_EXAMPLES["dependency"]?.[0]?.text ?? "";
    expect(sample).not.toBe("");
    expect(buildWorkbenchTree(dependency, sample, "easy")).toEqual(
      buildWorkbenchTree(dependency, sample, "text"),
    );
  });
});

describe("mensajes", () => {
  it("un error de análisis dice dónde está", () => {
    expect(errorMessage(new ParseError("falta «]»", 1, 9))).toBe("falta «]» (línea 1, columna 9)");
  });

  it("cualquier otro error muestra su texto", () => {
    expect(errorMessage(new Error("raro"))).toBe("raro");
    expect(errorMessage("texto")).toBe("texto");
  });

  it("si el PNG no se pudo crear, lo dice y ofrece el SVG", () => {
    expect(pngFailure(true)).toMatch(/No se pudo crear el PNG.*SVG/);
    expect(pngFailure(false)).toMatch(/could not create the PNG.*SVG/);
  });

  it("copiar dice si salió o no", () => {
    expect(copyStatus(true, true)).toBe("SVG copiado.");
    expect(copyStatus(false, false)).toBe("Could not copy to the clipboard.");
  });
});
