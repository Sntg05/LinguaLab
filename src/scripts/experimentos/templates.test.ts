import { generateExperimentTrials, isOk } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import type { StimulusRow } from "./csv";
import { buildExperimentSpec, DEFAULT_TEMPLATE, TEMPLATES, templateFor } from "./templates";

/**
 * Las cuatro plantillas del segmento: si una produce una especificacion que el
 * nucleo rechaza, el experimento no arranca y el error aparece en la cara de
 * quien lo iba a usar. Esta prueba cruza las dos piezas.
 */

const ITEMS: readonly StimulusRow[] = [
  { id: "e1", condition: "control", text: "El gato duerme." },
  { id: "e2", condition: "isla", text: "¿Quién dijo qué?" },
];

const INPUT = {
  items: ITEMS,
  seed: 4242,
  blocks: 1,
  practiceTrials: 0,
  instructions: "Lee con atencion.",
  continueLabel: "Continuar",
  scaleLeft: "nada natural",
  scaleRight: "muy natural",
  wordLabel: "palabra",
  nonWordLabel: "no palabra",
} as const;

describe("las cuatro plantillas", () => {
  it("son exactamente las del prompt", () => {
    expect(TEMPLATES.map((template) => template.kind)).toEqual([
      "acceptability",
      "two-afc",
      "self-paced-reading",
      "lexical-decision",
    ]);
  });

  it("cada plantilla produce una especificacion que el generador acepta", () => {
    for (const template of TEMPLATES) {
      const spec = buildExperimentSpec({ ...INPUT, kind: template.kind });
      const plan = generateExperimentTrials(spec, { seed: INPUT.seed });

      expect(isOk(plan), `la plantilla ${template.kind} no genera un plan`).toBe(true);
    }
  });

  it("cada plantilla declara su etiqueta, su aviso y sus instrucciones por defecto", () => {
    for (const template of TEMPLATES) {
      expect(template.labelKey.startsWith("exp.")).toBe(true);
      expect(template.noteKey.startsWith("exp.")).toBe(true);
      expect(template.instructionsKey.startsWith("exp.")).toBe(true);
    }
  });

  it("los parametros del diseno viajan en la especificacion, que es lo que se exporta", () => {
    const spec = buildExperimentSpec({ ...INPUT, kind: DEFAULT_TEMPLATE });

    expect(spec.parameters.seed).toBe(4242);
    expect(spec.parameters.blocks).toBe(1);
    expect(spec.parameters.practiceTrials).toBe(0);
    expect(spec.parameters.instructions).toBe("Lee con atencion.");
    expect(spec.parameters.continueLabel).toBe("Continuar");
    expect(spec.parameters.scaleLeft).toBe("nada natural");
    expect(spec.parameters.scaleRight).toBe("muy natural");
    expect(spec.parameters.wordLabel).toBe("palabra");
    expect(spec.parameters.nonWordLabel).toBe("no palabra");
  });

  it("conserva los estimulos tal como se leyeron, con su audio", () => {
    const spec = buildExperimentSpec({
      ...INPUT,
      kind: "two-afc",
      items: [{ id: "p1", condition: "par", text: "perro|pero", audioFile: "perro.wav" }],
    });

    expect(spec.items).toEqual([
      { id: "p1", condition: "par", text: "perro|pero", audioFile: "perro.wav" },
    ]);
  });

  it("templateFor devuelve la plantilla pedida y cae en la primera si no la conoce", () => {
    expect(templateFor("lexical-decision").kind).toBe("lexical-decision");
    expect(templateFor(DEFAULT_TEMPLATE).kind).toBe(DEFAULT_TEMPLATE);
  });
});
