import { isErr, isOk } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_COLUMNS,
  MAX_STIMULUS_BYTES,
  parseStimulusCsv,
} from "./csv";

/**
 * La lista de estimulos es la entrada del experimento, y un error de lectura se
 * paga con una sesion entera de un participante: por eso el analizador dice la
 * linea y la columna en vez de descartar filas en silencio.
 */

describe("parseStimulusCsv", () => {
  it("lee las cuatro columnas documentadas", () => {
    const raw = [
      "id,condition,text,audio",
      "e1,control,El gato duerme.,",
      "e2,isla,¿Quién dijo qué?,isla.wav",
    ].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toEqual({
        id: "e1",
        condition: "control",
        text: "El gato duerme.",
      });
      expect(result.value[1]).toEqual({
        id: "e2",
        condition: "isla",
        text: "¿Quién dijo qué?",
        audioFile: "isla.wav",
      });
    }
  });

  it("documenta las columnas que acepta", () => {
    expect(EXPERIMENT_COLUMNS).toEqual(["id", "condition", "text", "audio"]);
  });

  it("acepta comas, comillas y saltos de linea dentro de un campo entre comillas", () => {
    const raw = [
      "id,condition,text,audio",
      'e1,control,"Uno, dos, ""tres"",",',
      'e2,isla,"Primera linea\nsegunda linea",',
    ].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value[0]?.text).toBe('Uno, dos, "tres",');
      expect(result.value[1]?.text).toBe("Primera linea\nsegunda linea");
    }
  });

  it("acepta CRLF, BOM y una linea final vacia", () => {
    const raw = "\ufeffid,condition,text\r\ne1,control,Uno\r\n";

    const result = parseStimulusCsv(raw);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("e1");
    }
  });

  it("no depende del orden de las columnas ni de las mayusculas del encabezado", () => {
    const raw = ["text,ID,Condition", "Hola,e1,control"].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value[0]).toEqual({ id: "e1", condition: "control", text: "Hola" });
    }
  });

  it("rechaza una lista vacia y lo dice", () => {
    const result = parseStimulusCsv("  \n \n");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("empty");
    }
  });

  it("rechaza un encabezado al que le falta una columna obligatoria", () => {
    const result = parseStimulusCsv("id,text\n e1,Hola");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("header");
      expect(result.error.detail).toContain("condition");
    }
  });

  it("rechaza una columna desconocida en vez de ignorarla", () => {
    const result = parseStimulusCsv("id,condition,text,audio,color\ne1,control,Hola,,rojo");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("header");
      expect(result.error.detail).toContain("color");
    }
  });

  it("dice en que linea falta un dato obligatorio", () => {
    const raw = ["id,condition,text", "e1,control,Hola", "e2,,Adios"].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("row");
      expect(result.error.line).toBe(3);
      expect(result.error.detail).toContain("condition");
    }
  });

  it("rechaza identificadores repetidos y nombra el que se repite", () => {
    const raw = ["id,condition,text", "e1,control,Hola", "e1,isla,Adios"].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("duplicate");
      expect(result.error.line).toBe(3);
      expect(result.error.detail).toContain("e1");
    }
  });

  it("rechaza una fila con menos columnas de las declaradas", () => {
    const raw = ["id,condition,text", "e1,control"].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("row");
      expect(result.error.line).toBe(2);
    }
  });

  it("rechaza comillas sin cerrar en vez de inventar el resto del campo", () => {
    const raw = ['id,condition,text', 'e1,control,"Hola'].join("\n");

    const result = parseStimulusCsv(raw);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("row");
    }
  });

  it("rechaza una lista por encima del tope de tamano", () => {
    const result = parseStimulusCsv(`id,condition,text\n${"a".repeat(MAX_STIMULUS_BYTES + 1)}`);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("size");
    }
  });
});
