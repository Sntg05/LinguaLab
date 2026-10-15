import { describe, expect, it } from "vitest";
import { convertLayer } from "../engine/convert-layer";
import {
  DEMO_TABLES,
  ENGLISH_DEMO,
  SPANISH_DEMO_DISTINCION,
  SPANISH_DEMO_YEISMO,
} from "./demo-tables";

describe("DEMO_TABLES", () => {
  it("contiene las dos variantes de espanol y la de ingles", () => {
    expect(DEMO_TABLES).toHaveLength(3);
    expect(DEMO_TABLES).toContain(SPANISH_DEMO_YEISMO);
    expect(DEMO_TABLES).toContain(SPANISH_DEMO_DISTINCION);
    expect(DEMO_TABLES).toContain(ENGLISH_DEMO);
  });

  it("todas se rotulan como demo en las notas", () => {
    for (const table of DEMO_TABLES) {
      expect(table.notes ?? "").toMatch(/demo/i);
    }
  });

  it("las dos variantes de espanol solo se diferencian en el grafema ll", () => {
    const yeismo = SPANISH_DEMO_YEISMO.rules;
    const distincion = SPANISH_DEMO_DISTINCION.rules;

    expect(distincion).toHaveLength(yeismo.length);

    for (let index = 0; index < yeismo.length; index += 1) {
      const left = yeismo[index];
      const right = distincion[index];
      if (left === undefined || right === undefined) {
        continue;
      }
      if (left.grapheme === "ll") {
        continue;
      }
      expect(right).toEqual(left);
    }

    const llYeismo = yeismo.find((rule) => rule.grapheme === "ll");
    const llDistincion = distincion.find((rule) => rule.grapheme === "ll");
    expect(llYeismo?.ipa).toBe("\u029d");
    expect(llDistincion?.ipa).toBe("\u028e");
  });
});

describe("ENGLISH_DEMO", () => {
  it("transcribe un digrafo antes de la letra suelta", () => {
    const result = convertLayer("shop", ENGLISH_DEMO.rules, {
      layer: "phonemic",
      casePolicy: "fold",
      classes: ENGLISH_DEMO.classes,
    });

    expect(result.output).toBe("\u0283\u0251p");
  });
});
