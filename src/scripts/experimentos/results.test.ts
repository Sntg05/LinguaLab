import type { ExperimentResults } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  buildResultsCsv,
  createParticipantId,
  RESULTS_COLUMNS,
  seedFrom,
} from "./results";

/**
 * El CSV de resultados es la unica copia que queda de una sesion: si una fila no
 * se puede atribuir a un participante, a una semilla y a una version, el archivo
 * no sirve para el analisis ni para reproducirlo.
 */

const RESULTS: ExperimentResults = {
  seed: 31415,
  toolVersion: "3.0.0",
  trials: [
    {
      participantId: "p-0001",
      trialId: "e1",
      condition: "control",
      response: "4",
      reactionTimeMs: 812,
      toolVersion: "3.0.0",
      seed: 31415,
    },
    {
      participantId: "p-0001",
      trialId: "e2",
      condition: "isla",
      response: "pero, pero",
      reactionTimeMs: 1203,
      toolVersion: "3.0.0",
      seed: 31415,
    },
  ],
};

describe("buildResultsCsv", () => {
  it("documenta las columnas que escribe", () => {
    expect(RESULTS_COLUMNS).toEqual([
      "participant",
      "trial",
      "condition",
      "response",
      "rt_ms",
      "tool_version",
      "seed",
    ]);
  });

  it("escribe la cabecera y una fila por ensayo, en el orden en que se presentaron", () => {
    const lines = buildResultsCsv(RESULTS).trimEnd().split("\n");

    expect(lines[0]).toBe("participant,trial,condition,response,rt_ms,tool_version,seed");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("p-0001,e1,control,4,812,3.0.0,31415");
  });

  it("entrecomilla los campos que traen coma y duplica las comillas", () => {
    const lines = buildResultsCsv(RESULTS).trimEnd().split("\n");

    expect(lines[2]).toContain('"pero, pero"');
  });

  it("entrecomilla un campo con salto de linea", () => {
    const withNewline: ExperimentResults = {
      ...RESULTS,
      trials: [{ ...RESULTS.trials[0]!, response: "uno\ndos" }],
    };

    expect(buildResultsCsv(withNewline)).toContain('"uno\ndos"');
  });

  it("escribe la semilla y la version en cada fila, no solo en un comentario", () => {
    const rows = buildResultsCsv(RESULTS).trimEnd().split("\n").slice(1);

    for (const row of rows) {
      expect(row).toContain("3.0.0");
      expect(row).toContain("31415");
    }
  });
});

describe("createParticipantId", () => {
  it("genera un identificador anonimo con prefijo estable", () => {
    const id = createParticipantId(() => 0.5);

    expect(id.startsWith("p-")).toBe(true);
    // Sin nombre, sin correo, sin fecha de nacimiento: solo un codigo.
    expect(id).toMatch(/^p-[a-z0-9]+$/);
  });

  it("con la misma fuente da el mismo codigo, y con otra distinta cambia", () => {
    expect(createParticipantId(() => 0.25)).toBe(createParticipantId(() => 0.25));
    expect(createParticipantId(() => 0.25)).not.toBe(createParticipantId(() => 0.75));
  });
});

describe("seedFrom", () => {
  it("acepta un entero positivo y lo conserva", () => {
    expect(seedFrom("2024", () => 0.5)).toBe(2024);
  });

  it("sustituye por una semilla nueva lo que no es un numero", () => {
    expect(seedFrom("", () => 0.5)).toBe(seedFrom("x", () => 0.5));
    expect(seedFrom("x", () => 0.5)).not.toBe(0);
  });
});
