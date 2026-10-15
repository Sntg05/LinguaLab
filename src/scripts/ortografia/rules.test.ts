import type { G2PRule } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { addRule, describeRule, moveRule, removeRule, rulesOf, setRule, withPriority, withRules, withTextField } from "./rules";
import { EMPTY_DRAFT, type TableDraft } from "./state";

const draft = (rules: readonly G2PRule[]): TableDraft => ({ ...EMPTY_DRAFT, rules });

describe("withTextField", () => {
  it("quita el contexto cuando se borra el campo, en vez de guardar cadena vacía", () => {
    // Una cadena vacía como patrón no coincide nunca: un campo borrado pasaría a
    // ser una regla que dejó de funcionar sin decir nada.
    const rule = withTextField({ grapheme: "c", ipa: "k", after: "[ei]" }, "after", "");

    expect(rule).toEqual({ grapheme: "c", ipa: "k" });
  });

  it("conserva el grafema y la transcripción vacíos, que sí son valores reales", () => {
    expect(withTextField({ grapheme: "h", ipa: "h" }, "ipa", "")).toEqual({ grapheme: "h", ipa: "" });
    expect(withTextField({ grapheme: "h", ipa: "" }, "grapheme", "")).toEqual({ grapheme: "", ipa: "" });
  });

  it("no toca los otros campos", () => {
    const rule = withTextField({ grapheme: "c", ipa: "k", priority: 3, note: "seseo" }, "ipa", "s");

    expect(rule).toEqual({ grapheme: "c", ipa: "s", priority: 3, note: "seseo" });
  });
});

describe("withPriority", () => {
  it("quita la prioridad cuando se deja vacía", () => {
    expect(withPriority({ grapheme: "c", ipa: "k", priority: 2 }, undefined)).toEqual({
      grapheme: "c",
      ipa: "k",
    });
  });
});

describe("moveRule", () => {
  const three = draft([{ grapheme: "a", ipa: "a" }, { grapheme: "b", ipa: "b" }, { grapheme: "c", ipa: "c" }]);

  it("intercambia con el vecino", () => {
    expect(rulesOf(moveRule(three, "phonemic", 0, 1), "phonemic").map((rule) => rule.grapheme)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("no hace nada en los bordes", () => {
    // Llegar al extremo con el atajo de teclado es normal, no un error que haya
    // que reportar.
    expect(moveRule(three, "phonemic", 0, -1)).toBe(three);
    expect(moveRule(three, "phonemic", 2, 1)).toBe(three);
  });
});

describe("addRule / removeRule / setRule", () => {
  it("añade una regla vacía al final de la capa indicada", () => {
    const next = addRule(EMPTY_DRAFT, "phonemic");

    expect(next.rules).toEqual([{ grapheme: "", ipa: "" }]);
    expect(next.allophonic).toEqual([]);
  });

  it("añade a la capa alofónica cuando es la que se está editando", () => {
    const next = addRule(EMPTY_DRAFT, "allophonic");

    expect(next.rules).toEqual([]);
    expect(next.allophonic).toEqual([{ grapheme: "", ipa: "" }]);
  });

  it("ignora un índice fuera de rango en vez de romper la lista", () => {
    const one = draft([{ grapheme: "a", ipa: "a" }]);

    expect(removeRule(one, "phonemic", 5)).toBe(one);
    expect(setRule(one, "phonemic", 5, { grapheme: "z", ipa: "z" })).toBe(one);
  });

  it("devuelve un borrador nuevo y no muta el anterior", () => {
    const one = draft([{ grapheme: "a", ipa: "a" }]);
    const two = withRules(one, "phonemic", [...one.rules, { grapheme: "b", ipa: "b" }]);

    // El historial guarda borradores por referencia: mutar el anterior
    // reescribiría el pasado y «deshacer» devolvería la tabla editada.
    expect(one.rules).toHaveLength(1);
    expect(two.rules).toHaveLength(2);
  });
});

describe("describeRule", () => {
  it("escribe la notación lingüística habitual", () => {
    expect(describeRule({ grapheme: "c", ipa: "k" })).toBe("c");
    expect(describeRule({ grapheme: "c", ipa: "s", after: "[eéií]" })).toBe("c /  _ [eéií]");
    expect(describeRule({ grapheme: "b", ipa: "β", before: "V", after: "V" })).toBe("b / V _ V");
  });
});
