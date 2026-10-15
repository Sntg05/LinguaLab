import { describe, expect, it } from "vitest";
import type { G2PRule } from "../domain/g2p-rule";
import { convertLayer } from "./convert-layer";
import type { CasePolicy } from "./types";

/**
 * Pruebas del algoritmo de coincidencia.
 *
 * Cubren las tres propiedades que la especificacion S7 no puede dejar
 * implicititas (desempate, cobertura y determinismo) y las decisiones de caso.
 */

const phonemic = (
  rules: readonly G2PRule[],
  text: string,
  classes: Readonly<Record<string, readonly string[]>> = {},
  casePolicy: CasePolicy = "fold",
): ReturnType<typeof convertLayer> =>
  convertLayer(text, rules, { layer: "phonemic", casePolicy, classes });

describe("desempate de reglas", () => {
  it("gana el grafema mas largo: el digrafo vence a la letra suelta", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "a", ipa: "A" },
      { grapheme: "ab", ipa: "X" },
      { grapheme: "b", ipa: "B" },
    ];

    const result = phonemic(rules, "ab");

    expect(result.output).toBe("X");
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0]?.grapheme).toBe("ab");
  });

  it("gana el contexto mas especifico a igual longitud", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "c", ipa: "K" },
      { grapheme: "c", ipa: "S", after: "[ei]" },
    ];

    expect(phonemic(rules, "ce").output).toBe("Se");
    expect(phonemic(rules, "ca").output).toBe("Ka");
  });

  it("gana la prioridad mas alta a igual longitud y contexto", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "x", ipa: "baja", priority: 1 },
      { grapheme: "x", ipa: "alta", priority: 5 },
    ];

    expect(phonemic(rules, "x").output).toBe("alta");
  });

  it("a igual prioridad gana la regla mas temprana de la tabla", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "x", ipa: "primera" },
      { grapheme: "x", ipa: "segunda" },
    ];

    expect(phonemic(rules, "x").output).toBe("primera");
  });
});

describe("grafemas eliminados y sin cobertura", () => {
  it("un ipa vacio elimina el grafema pero lo cubre", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "h", ipa: "" },
      { grapheme: "a", ipa: "a" },
    ];

    const result = phonemic(rules, "ha");

    expect(result.output).toBe("a");
    expect(result.trace).toHaveLength(2);
    expect(result.trace[0]?.ipa).toBe("");
    expect(result.uncovered).toHaveLength(0);
  });

  it("un caracter sin regla se copia y se registra como hueco", () => {
    const result = phonemic([{ grapheme: "a", ipa: "a" }], "ab");

    expect(result.output).toBe("ab");
    expect(result.uncovered).toEqual([{ layer: "phonemic", inputIndex: 1, grapheme: "b" }]);
  });
});

describe("politica de caso", () => {
  const rules: readonly G2PRule[] = [{ grapheme: "a", ipa: "a" }];

  it("fold compara sin distinguir mayusculas", () => {
    expect(phonemic(rules, "A").output).toBe("a");
  });

  it("preserve deja la mayuscula sin cobertura", () => {
    const result = phonemic(rules, "A", {}, "preserve");

    expect(result.output).toBe("A");
    expect(result.uncovered).toHaveLength(1);
  });
});

describe("clases nombradas", () => {
  it("`{V}` se resuelve contra las clases de la tabla", () => {
    const rules: readonly G2PRule[] = [
      { grapheme: "c", ipa: "S", after: "{V}" },
      { grapheme: "c", ipa: "K" },
    ];
    const classes = { V: ["e", "i"] };

    expect(phonemic(rules, "ce", classes).output).toBe("Se");
    expect(phonemic(rules, "ca", classes).output).toBe("Ka");
  });

  it("una clase inexistente no coincide en silencio", () => {
    const rules: readonly G2PRule[] = [{ grapheme: "c", ipa: "S", after: "{NOPE}" }];

    const result = phonemic(rules, "ce");

    expect(result.output).toBe("ce");
    expect(result.uncovered).toHaveLength(2);
  });
});

describe("propiedades", () => {
  const rules: readonly G2PRule[] = [
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "a", ipa: "a" },
    { grapheme: "b", ipa: "b" },
  ];

  it("la cobertura particiona la entrada", () => {
    const text = "chab";
    const result = phonemic(rules, text);

    const consumed = result.trace.reduce(
      (total, entry) => total + Array.from(entry.grapheme).length,
      0,
    );

    expect(consumed + result.uncovered.length).toBe(Array.from(text).length);
  });

  it("dos corridas producen el mismo resultado", () => {
    const first = phonemic(rules, "chab");
    const second = phonemic(rules, "chab");

    expect(second.output).toBe(first.output);
    expect(second.trace).toEqual(first.trace);
    expect(second.uncovered).toEqual(first.uncovered);
  });
});
