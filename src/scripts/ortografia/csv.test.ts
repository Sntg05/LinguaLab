import { describe, expect, it } from "vitest";
import { CSV_HEADER, parseRulesCsv, rulesToCsv } from "./csv";

/**
 * El CSV es un formato de intercambio con personas, no un detalle interno: lo
 * que se prueba aquí es que lo que sale se puede volver a meter y que un
 * archivo que no encaja se rechaza DICIENDO POR QUÉ.
 */

describe("rulesToCsv", () => {
  it("cita los campos que llevan coma, comilla o salto de línea", () => {
    const csv = rulesToCsv([{ grapheme: "a", ipa: "a", note: 'dice "hola", y sigue\nen otra línea' }]);

    expect(csv).toContain('"dice ""hola"", y sigue\nen otra línea"');
  });

  it("escribe el encabezado aunque no haya ninguna regla", () => {
    expect(rulesToCsv([])).toBe(`${CSV_HEADER}\n`);
  });

  it("deja vacía la prioridad que la regla no declara", () => {
    const [, row] = rulesToCsv([{ grapheme: "c", ipa: "k" }]).split("\n");

    expect(row).toBe("c,k,,,,");
  });
});

describe("parseRulesCsv", () => {
  it("reconstruye las reglas y omite los campos que venían vacíos", () => {
    const parsed = parseRulesCsv(`${CSV_HEADER}\nc,s,,[eéií],,seseo\nb,β,[aeiou],[aeiou],2,\n`);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.value).toEqual([
      { grapheme: "c", ipa: "s", after: "[eéií]", note: "seseo" },
      { grapheme: "b", ipa: "β", before: "[aeiou]", after: "[aeiou]", priority: 2 },
    ]);
  });

  it("rechaza un encabezado distinto y lo devuelve tal como llegó", () => {
    const parsed = parseRulesCsv("letra,sonido\nx,ks\n");

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toEqual({
      code: "header",
      expected: CSV_HEADER,
      received: "letra,sonido",
    });
  });

  it("rechaza una fila con un número de campos distinto", () => {
    const parsed = parseRulesCsv(`${CSV_HEADER}\nc,s\n`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toEqual({ code: "row", row: 2, count: 2, expected: 6 });
  });

  it("rechaza una prioridad que no es un número", () => {
    const parsed = parseRulesCsv(`${CSV_HEADER}\nc,s,,,alta,\n`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toEqual({ code: "priority", row: 2, value: "alta" });
  });

  it("acepta finales de línea de Windows", () => {
    const parsed = parseRulesCsv(`${CSV_HEADER}\r\nc,k,,,,\r\n`);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.value).toEqual([{ grapheme: "c", ipa: "k" }]);
  });

  it("rechaza un archivo sin encabezado", () => {
    const parsed = parseRulesCsv("");

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toEqual({ code: "empty" });
  });

  it("conserva la transcripción vacía de un grafema mudo", () => {
    const parsed = parseRulesCsv(`${CSV_HEADER}\nh,,,,,muda\n`);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.value).toEqual([{ grapheme: "h", ipa: "", note: "muda" }]);
  });
});
