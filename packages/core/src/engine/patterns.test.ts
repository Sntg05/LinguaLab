import { describe, expect, it } from "vitest";
import { classReferenceName, matchContextPattern, patternCharacters } from "./patterns";
import type { PatternEnvironment } from "./patterns";

const environment: PatternEnvironment = {
  classes: { V: ["a", "e", "i", "o", "u"] },
  casePolicy: "fold",
};

describe("classReferenceName", () => {
  it("reconoce una referencia a clase", () => {
    expect(classReferenceName("{V}")).toBe("V");
  });

  it("no confunde un literal con una referencia", () => {
    expect(classReferenceName("[aeiou]")).toBeNull();
    expect(classReferenceName("#")).toBeNull();
  });
});

describe("patternCharacters", () => {
  it("desarrolla un conjunto literal", () => {
    expect(patternCharacters("[abc]", environment.classes)).toEqual(["a", "b", "c"]);
  });

  it("devuelve la clase nombrada", () => {
    expect(patternCharacters("{V}", environment.classes)).toEqual(["a", "e", "i", "o", "u"]);
  });

  it("el limite de palabra no es un conjunto", () => {
    expect(patternCharacters("#", environment.classes)).toBeNull();
  });

  it("una clase inexistente no es un conjunto vacio", () => {
    expect(patternCharacters("{NOPE}", environment.classes)).toBeUndefined();
  });
});

describe("matchContextPattern", () => {
  it("# coincide al inicio del texto", () => {
    expect(matchContextPattern("#", undefined, environment).kind).toBe("matched");
  });

  it("# coincide ante un caracter no alfabetico", () => {
    expect(matchContextPattern("#", " ", environment).kind).toBe("matched");
    expect(matchContextPattern("#", "1", environment).kind).toBe("matched");
  });

  it("# no coincide ante una letra", () => {
    expect(matchContextPattern("#", "a", environment).kind).toBe("not-matched");
  });

  it("[...] coincide con cualquiera de sus caracteres", () => {
    expect(matchContextPattern("[aeiou]", "e", environment).kind).toBe("matched");
    expect(matchContextPattern("[aeiou]", "z", environment).kind).toBe("not-matched");
  });

  it("{V} coincide con un miembro de la clase de la tabla", () => {
    expect(matchContextPattern("{V}", "i", environment).kind).toBe("matched");
  });

  it("una clase inexistente se reporta como error de tabla, no como no-coincidencia", () => {
    expect(matchContextPattern("{NOPE}", "i", environment)).toEqual({
      kind: "undefined-class",
      className: "NOPE",
    });
  });

  it("un caracter literal coincide consigo mismo", () => {
    expect(matchContextPattern("s", "s", environment).kind).toBe("matched");
    expect(matchContextPattern("s", "t", environment).kind).toBe("not-matched");
  });

  it("fold compara el contexto sin distinguir mayusculas", () => {
    expect(matchContextPattern("[ei]", "E", environment).kind).toBe("matched");
  });
});
