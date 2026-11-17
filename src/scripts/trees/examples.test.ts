import { describe, expect, it } from "vitest";
import { TREE_EXAMPLES } from "../../data/trees/examples";
import { TREE_TYPES } from "../../data/trees/types";
import { checkMovement } from "./checks";
import { buildTree } from "./pipeline";
import { buildWorkbenchTree } from "./workbench-rules";

/**
 * Los ejemplos son lo primero que ve un estudiante: un ejemplo que no se dibuja
 * es un error de la página, no del estudiante. La auditoría del 2026-11-17
 * (T11, Log L36) encontró seis que fallaban y ninguna flecha de movimiento
 * dibujada; esta prueba recorre todos para que no vuelva a pasar.
 */
const drawable = TREE_TYPES.filter((type) => type.mode !== "table");

describe("ejemplos de árboles", () => {
  for (const type of drawable) {
    const examples = TREE_EXAMPLES[type.id] ?? [];
    examples.forEach((example, index) => {
      it(`${type.id} #${index} (${example.name_es}) se dibuja`, () => {
        expect(() => buildTree(type.id, example.text)).not.toThrow();
      });
    });
  }

  it("cada flecha de movimiento de un ejemplo apunta a nodos que existen y respeta el mando-c", () => {
    const failures: string[] = [];
    let arrows = 0;
    for (const type of drawable) {
      for (const example of TREE_EXAMPLES[type.id] ?? []) {
        const built = buildTree(type.id, example.text);
        arrows += built.arrows.length;
        for (const result of checkMovement(built.tree, built.arrows, "es")) {
          if (result.level !== "ok") failures.push(`${type.id} «${example.name_es}»: ${result.message}`);
        }
      }
    }
    expect(failures).toEqual([]);
    // Sin esto, la prueba pasaría por vacío si las flechas dejaran de leerse.
    expect(arrows).toBeGreaterThan(0);
  });

  it("el banco recibe las flechas del texto, no una lista vacía", () => {
    const movement = TREE_TYPES.find((type) => type.id === "movement");
    const sample = TREE_EXAMPLES["movement"]?.[0]?.text ?? "";
    if (!movement) throw new Error("falta el tipo movement");
    expect(buildWorkbenchTree(movement, sample, "text").arrows.length).toBeGreaterThan(0);
  });
});
