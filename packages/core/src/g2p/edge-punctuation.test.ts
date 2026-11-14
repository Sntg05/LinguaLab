import { describe, expect, it } from "vitest";
import { transcribeEnglish } from "./english";
import { transcribeSpanish } from "./spanish";

/**
 * La limpieza de signos en los bordes de cada palabra no puede ser cuadrática.
 *
 * Se hacía con una expresión regular anclada al final (`[…]+$`), que el motor
 * reintenta desde cada posición: una «palabra» pegada de 50 000 signos tardaba
 * segundos y congelaba la pestaña (CodeQL js/polynomial-redos). El texto lo
 * escribe o lo pega la persona, así que ese caso es real.
 */
const LONG = 50_000;
const timed = (run: () => unknown): number => {
  const start = Date.now();
  run();
  return Date.now() - start;
};

describe("los signos en los bordes de una palabra", () => {
  it("se quitan sin tocar la palabra", () => {
    expect(transcribeSpanish("¡¿«casa»?!").ipa).toBe("ˈka.sa");
    expect(transcribeEnglish("(bird)!", () => ["B ER1 D"]).ipa).toBe("bɝd");
  });

  it("una palabra hecha solo de signos no se transcribe ni se cuelga", () => {
    expect(timed(() => transcribeSpanish("a" + "!".repeat(LONG) + "a"))).toBeLessThan(500);
    expect(
      timed(() => transcribeEnglish("a" + "&".repeat(LONG) + "a", () => undefined)),
    ).toBeLessThan(500);
  });
});
