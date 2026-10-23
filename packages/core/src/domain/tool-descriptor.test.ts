import { describe, expect, it } from "vitest";
import { ANALYSIS_LEVELS } from "./tool-descriptor";

/**
 * El orden de las areas es lo que hace que el catalogo se lea como un programa
 * de linguistica y no como una lista de tarjetas. La prueba fija la secuencia
 * completa a proposito: el tipo `ToolArea` se deriva de esta misma constante, y
 * sin una expectativa explicita un reordenamiento accidental pasaria inadvertido
 * porque el compilador no tiene opinion sobre el orden.
 */
describe("ANALYSIS_LEVELS", () => {
  it("va del sonido hacia los flujos de trabajo, en el orden de la disciplina", () => {
    expect(ANALYSIS_LEVELS).toEqual([
      "fonetica",
      "fonologia",
      "morfosintaxis",
      "semantica",
      "pragmatica",
      "tipologia",
      "psicolinguistica",
      "documentacion",
    ]);
  });
});
