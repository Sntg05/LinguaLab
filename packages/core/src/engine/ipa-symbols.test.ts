import { describe, expect, it } from "vitest";
import { isReasonableIpa } from "./ipa-symbols";

describe("isReasonableIpa", () => {
  it("acepta ASCII, extensiones AFI y modificadores", () => {
    expect(isReasonableIpa("t")).toBe(true);
    expect(isReasonableIpa("t\u0283")).toBe(true); // tʃ
    expect(isReasonableIpa("\u0261")).toBe(true); // ɡ
    expect(isReasonableIpa("\u0272")).toBe(true); // ɲ
    expect(isReasonableIpa("a\u0303")).toBe(true); // a + tilde combinante
    expect(isReasonableIpa("t\u0361\u0283")).toBe(true); // barra de union
    expect(isReasonableIpa("e\u026a")).toBe(true); // eɪ, diptongo
  });

  it("acepta las excepciones griegas y latin-1 que el AFI usa", () => {
    expect(isReasonableIpa("\u03b2")).toBe(true); // β
    expect(isReasonableIpa("\u03b8")).toBe(true); // θ
    expect(isReasonableIpa("\u03c7")).toBe(true); // χ
    expect(isReasonableIpa("\u00f0")).toBe(true); // ð
    expect(isReasonableIpa("\u014b")).toBe(true); // ŋ
  });

  it("la cadena vacia es valida: es un grafema que se elimina", () => {
    expect(isReasonableIpa("")).toBe(true);
  });

  it("rechaza caracteres de otros alfabetos y digitos", () => {
    expect(isReasonableIpa("\u6c49")).toBe(false);
    expect(isReasonableIpa("\u20ac")).toBe(false);
    expect(isReasonableIpa("1")).toBe(false);
  });
});
