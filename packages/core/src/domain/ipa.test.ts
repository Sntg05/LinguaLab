import { describe, expect, it } from "vitest";
import { tokenizeIpa } from "./ipa";

describe("tokenizeIpa", () => {
  it("separa una cadena AFI simple en un fono por caracter", () => {
    expect(tokenizeIpa("tako")).toEqual(["t", "a", "k", "o"]);
  });

  it("mantiene unida una africada escrita como un solo caracter", () => {
    // ʤ (U+02A7) es la version heredada de un solo punto de codigo de la
    // africada [d͡ʒ]: aqui el caracter ya es la unidad, no hay nada que unir.
    expect(tokenizeIpa("ʤaɾo")).toEqual(["ʤ", "a", "ɾ", "o"]);
  });

  it("mantiene pegada una marca diacritica a su fono base", () => {
    // La tilde combinante U+0303 va despues de la "a": si se separara, el
    // resultado tendria una "a" oral y una tilde suelta, que no es un fono.
    expect(tokenizeIpa("a\u0303")).toEqual(["a\u0303"]);
  });

  it("devuelve una lista vacia para la cadena vacia", () => {
    expect(tokenizeIpa("")).toEqual([]);
  });

  it("mantiene unida una africada escrita con barra de union", () => {
    // t + U+0361 (barra de union) + ʃ es UN fono: la barra obliga a que el
    // caracter siguiente no abra un token nuevo.
    expect(tokenizeIpa("t\u0361ʃ")).toEqual(["t\u0361ʃ"]);
  });
});
