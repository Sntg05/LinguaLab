import { describe, expect, it } from "vitest";
import { TREE_EXAMPLES } from "../../data/trees/examples";
import { RETIRED_TREE_TYPES, TREE_TYPES } from "../../data/trees/types";
import { runChecks } from "./checks";
import { buildTree } from "./pipeline";

/** Los hallazgos de un árbol escrito en el formato de su tipo. */
const findings = (typeId: string, text: string) => {
  const type = TREE_TYPES.find((entry) => entry.id === typeId);
  if (type === undefined) throw new Error(`falta ${typeId}`);
  const tree = buildTree(typeId, text).tree;
  return runChecks(tree, { locale: "es", theory: type.theory });
};
const errors = (typeId: string, text: string) =>
  findings(typeId, text)
    .filter((finding) => finding.level === "error")
    .map((finding) => finding.message);
const notes = (typeId: string, text: string) =>
  findings(typeId, text)
    .filter((finding) => finding.level === "note")
    .map((finding) => finding.message);

describe("dependencias: Universal Dependencies v2", () => {
  it("una relación que no está entre las 37 de UD es un error", () => {
    expect(errors("dependency", "1 Ana 2 sujeto PROPN\n2 canta 0 root VERB").join(" ")).toMatch(/sujeto/);
  });
  it("un subtipo «base:subtipo» se acepta si la base es de UD", () => {
    expect(errors("dependency", "1 Ana 2 nsubj:pass PROPN\n2 fue 0 root VERB")).toEqual([]);
  });
  it("la raíz es la palabra con cabeza 0, y solo ella lleva «root»", () => {
    expect(errors("dependency", "1 Ana 2 root PROPN\n2 canta 0 nsubj VERB").join(" ")).toMatch(/root/);
  });
});

describe("constituyentes: Penn Treebank", () => {
  it("una palabra suelta junto a un sintagma se avisa: cada palabra va bajo su categoría", () => {
    expect(notes("constituency", "[S [NP [N Ana]] [VP canta [NP [N ópera]]]]").join(" ")).toMatch(/canta/);
  });
});

describe("X-barra", () => {
  it("un SX sin núcleo de su categoría es un error", () => {
    expect(errors("xbar", "[NP [V' [V lee]]]").join(" ")).toMatch(/NP/);
  });
  it("más de dos hijas es un error, no una nota", () => {
    expect(errors("xbar", "[VP [V' [V da] [NP [N' [N flores]]] [PP [P' [P a] [NP [N' [N Ana]]]]]]]").join(" ")).toMatch(
      /binari/i,
    );
  });
  it("un especificador fuera de un SX es un error", () => {
    expect(errors("xbar", "[NP [N' [Spec [D el]] [N gato]]]").join(" ")).toMatch(/Spec/);
  });
  it("un árbol bien formado no da errores", () => {
    expect(errors("xbar", "[NP [Spec [D el]] [N' [N gato]]]")).toEqual([]);
  });
});

describe("minimalismo: Ensamble", () => {
  it("Ensamble es binario: tres hijas son un error", () => {
    expect(errors("minimalist", "[VP [V da] [DP flores] [PP a Ana]]").join(" ")).toMatch(/binari/i);
  });
  it("las proyecciones intermedias X′ se avisan: no son primitivas en la estructura escueta", () => {
    expect(notes("minimalist", "[VP [V' [V lee] [DP libros]]]").join(" ")).toMatch(/V'/);
  });
});

describe("los ejemplos de cada formalismo validado no tienen errores de su propia teoría", () => {
  for (const type of TREE_TYPES.filter((entry) => entry.theory !== undefined)) {
    (TREE_EXAMPLES[type.id] ?? []).forEach((example, index) => {
      it(`${type.id} #${index} (${example.name_es})`, () => {
        expect(errors(type.id, example.text)).toEqual([]);
      });
    });
  }

  it("el ejemplo de arcos cruzados de verdad cruza arcos", () => {
    const crossing = TREE_EXAMPLES["dependency"]?.find((example) => /cruzados/i.test(example.name_es));
    expect(notes("dependency", crossing?.text ?? "").join(" ")).toMatch(/cruzados/i);
  });
});

describe("los formalismos retirados", () => {
  it("salen del selector, siguen nombrados con su motivo, y sus ejemplos se fueron", () => {
    const retired = RETIRED_TREE_TYPES.map((entry) => entry.id).sort();
    expect(retired).toEqual(
      ["cartography", "ccg", "hpsg", "lfg", "reedkellogg", "relational", "semantic", "tag"],
    );
    for (const entry of RETIRED_TREE_TYPES) {
      expect(TREE_TYPES.some((type) => type.id === entry.id)).toBe(false);
      expect(TREE_EXAMPLES[entry.id]).toBeUndefined();
      expect(entry.reason_es.length).toBeGreaterThan(40);
      expect(entry.reason_en.length).toBeGreaterThan(40);
    }
  });

  it("los seis formalismos lingüísticos que quedan declaran su teoría", () => {
    const theories = TREE_TYPES.filter((type) => type.theory !== undefined).map((type) => type.id);
    expect(theories.sort()).toEqual(["constituency", "dependency", "minimalist", "morphology", "movement", "xbar"]);
  });
});

describe("regresiones del verificador (2026-11-20)", () => {
  it("las etiquetas en español (SN, SV, SP) se leen como proyecciones", () => {
    expect(errors("xbar", "[SN [Spec [D el]] [N' [N gato]]]")).toEqual([]);
    expect(errors("xbar", "[SP [P' [P de] [SN [N' [N Ana]]]]]")).toEqual([]);
    expect(errors("xbar", "[SN [V' [V lee]]]").join(" ")).toMatch(/SN/);
  });

  it("la pista que se muestra al estudiante cumple las reglas de X-barra", () => {
    const xbar = TREE_TYPES.find((type) => type.id === "xbar");
    expect(errors("xbar", xbar?.hint_es ?? "")).toEqual([]);
    expect(errors("xbar", xbar?.hint_en ?? "")).toEqual([]);
  });

  it("la adjunción a SX (un SX hijo de otro de la misma categoría) no es un error", () => {
    expect(errors("xbar", "[VP [VP [V' [V lee]]] [AdvP [Adv' [Adv hoy]]]]")).toEqual([]);
  });
});
