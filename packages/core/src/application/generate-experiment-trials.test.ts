import { describe, expect, it } from "vitest";
import type { ExperimentItem, ExperimentSpec } from "../domain/experiment";
import { isErr, isOk } from "../result";
import { generateExperimentTrials } from "./generate-experiment-trials";

/**
 * El generador de ensayos es lo unico del experimento que tiene que ser
 * reproducible: el orden que ve un participante queda atado a una semilla que
 * viaja en los resultados. Estas pruebas fijan ese contrato.
 */

const ITEMS: readonly ExperimentItem[] = [
  { id: "a1", condition: "control", text: "El gato duerme." },
  { id: "a2", condition: "control", text: "La niña canta." },
  { id: "a3", condition: "isla", text: "¿Qué crees que dijo quién?" },
  { id: "a4", condition: "isla", text: "¿Quién compró qué?" },
  { id: "a5", condition: "relleno", text: "El tren llegó tarde." },
  { id: "a6", condition: "relleno", text: "Llueve desde ayer." },
  { id: "a7", condition: "control", text: "El perro ladra." },
];

const spec = (
  items: readonly ExperimentItem[] = ITEMS,
  parameters: Readonly<Record<string, string | number | boolean>> = {},
): ExperimentSpec => ({
  id: "aceptabilidad",
  kind: "acceptability",
  items,
  parameters,
});

const idsOf = (trials: readonly { readonly itemId: string }[]): string[] =>
  trials.map((trial) => trial.itemId);

describe("generateExperimentTrials", () => {
  it("la misma semilla produce exactamente el mismo orden", () => {
    const first = generateExperimentTrials(spec(), { seed: 2024 });
    const second = generateExperimentTrials(spec(), { seed: 2024 });

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    if (isOk(first) && isOk(second)) {
      expect(idsOf(second.value.trials)).toEqual(idsOf(first.value.trials));
      expect(second.value).toEqual(first.value);
    }
  });

  it("semillas distintas dan ordenes distintos", () => {
    const first = generateExperimentTrials(spec(), { seed: 1 });
    const second = generateExperimentTrials(spec(), { seed: 2 });

    if (isOk(first) && isOk(second)) {
      expect(idsOf(second.value.trials)).not.toEqual(idsOf(first.value.trials));
    }
  });

  it("conserva todos los items una sola vez, sin inventar ni perder ninguno", () => {
    const result = generateExperimentTrials(spec(), { seed: 7 });

    if (isOk(result)) {
      expect([...idsOf(result.value.trials)].sort()).toEqual(ITEMS.map((item) => item.id).sort());
    }
  });

  it("cuenta los ensayos por condicion", () => {
    const result = generateExperimentTrials(spec(), { seed: 7 });

    if (isOk(result)) {
      expect(result.value.conditionCounts).toEqual({ control: 3, isla: 2, relleno: 2 });
    }
  });

  it("numera los ensayos en el orden en que se presentan", () => {
    const result = generateExperimentTrials(spec(), { seed: 7 });

    if (isOk(result)) {
      expect(result.value.trials.map((trial) => trial.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it("la practica va primero, marcada y fuera del conteo por condicion", () => {
    const result = generateExperimentTrials(spec(), { seed: 7, practiceTrials: 2 });

    if (isOk(result)) {
      const practice = result.value.trials.filter((trial) => trial.practice);
      expect(practice).toHaveLength(2);
      expect(result.value.trials.slice(0, 2).every((trial) => trial.practice)).toBe(true);
      expect(practice.every((trial) => trial.block === 0)).toBe(true);

      // Los dos items de practica no vuelven a aparecer en los bloques reales:
      // repetirlos contaminaria la respuesta que se analiza.
      const main = result.value.trials.filter((trial) => !trial.practice);
      expect(main).toHaveLength(5);
      expect(idsOf(main)).not.toContain(idsOf(practice)[0]);
      expect(result.value.practiceCount).toBe(2);

      const counted = Object.values(result.value.conditionCounts).reduce((sum, n) => sum + n, 0);
      expect(counted).toBe(main.length);
    }
  });

  it("reparte los ensayos en bloques de tamano equilibrado y sin bloques vacios", () => {
    const result = generateExperimentTrials(spec(), { seed: 7, blocks: 3 });

    if (isOk(result)) {
      const sizes = [1, 2, 3].map(
        (block) => result.value.trials.filter((trial) => trial.block === block).length,
      );
      // Los tamanos se diferencian como mucho en uno: un bloque enorme y dos
      // vacios no son tres bloques.
      expect(sizes).toEqual([3, 2, 2]);
      expect(result.value.blockCount).toBe(3);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(Math.min(...sizes)).toBeGreaterThan(0);
    }
  });

  it("alterna condiciones en lugar de dejar tandas de una sola", () => {
    // Con tres condiciones y siete estimulos, la secuencia intercalada pasa de
    // una condicion a otra en cada ensayo hasta que solo queda la mas larga.
    const result = generateExperimentTrials(spec(), { seed: 7 });

    if (isOk(result)) {
      const conditions = result.value.trials.map((trial) => trial.condition);
      const consecutiveRepeats = conditions.filter(
        (condition, index) => index > 0 && condition === conditions[index - 1],
      );
      // Con tres condiciones de tamanos 3, 2 y 2 el ciclo las alterna todas y
      // solo puede repetir al final, cuando la condicion mas larga se queda
      // sola.
      expect(consecutiveRepeats.length).toBeLessThanOrEqual(1);
      expect(new Set(conditions.slice(0, 3)).size).toBe(3);
    }
  });

  it("con un solo bloque todo cae en el bloque 1", () => {
    const result = generateExperimentTrials(spec(), { seed: 7 });

    if (isOk(result)) {
      expect(result.value.trials.every((trial) => trial.block === 1)).toBe(true);
      expect(result.value.blockCount).toBe(1);
    }
  });

  it("arrastra el audio del item cuando lo tiene", () => {
    const withAudio: readonly ExperimentItem[] = [
      { id: "p1", condition: "par", text: "perro", audioFile: "perro.wav" },
      { id: "p2", condition: "par", text: "pero" },
    ];

    const result = generateExperimentTrials(spec(withAudio), { seed: 3 });

    if (isOk(result)) {
      const withFile = result.value.trials.filter((trial) => trial.audioFile !== undefined);
      expect(withFile).toHaveLength(1);
      expect(withFile[0]?.audioFile).toBe("perro.wav");
    }
  });

  it("no reordena la lista de la especificacion que recibe", () => {
    const items = [...ITEMS];
    generateExperimentTrials(spec(items), { seed: 11 });

    expect(items.map((item) => item.id)).toEqual(ITEMS.map((item) => item.id));
  });

  it("rechaza una especificacion sin items", () => {
    const result = generateExperimentTrials(spec([]), { seed: 1 });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });

  it("rechaza identificadores de item repetidos", () => {
    const repeated: readonly ExperimentItem[] = [
      { id: "x1", condition: "control", text: "uno" },
      { id: "x1", condition: "isla", text: "dos" },
    ];

    const result = generateExperimentTrials(spec(repeated), { seed: 1 });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
      expect(result.error.detail).toContain("x1");
    }
  });

  it("rechaza mas bloques que ensayos", () => {
    const result = generateExperimentTrials(spec(), { seed: 1, blocks: 8 });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });

  it("rechaza una practica que se queda con todos los ensayos", () => {
    const result = generateExperimentTrials(spec(), { seed: 1, practiceTrials: ITEMS.length });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });

  it("rechaza una semilla que no es un numero finito", () => {
    const result = generateExperimentTrials(spec(), { seed: Number.NaN });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });
});
