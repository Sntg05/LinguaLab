import { describe, expect, it } from "vitest";
import { IPA_GROUPS, insertSymbol, type IpaSymbolGroup } from "./ipa-keyboard";

/**
 * El teclado IPA y su insercion en el campo de texto.
 *
 * POR QUE LA INSERCION ES UNA FUNCION PURA
 *
 * Insertar un simbolo en la posicion del cursor suena trivial hasta que se
 * prueba con teclado: hay que respetar la seleccion, dejar el cursor DESPUES
 * del simbolo y no romper los emojis ni los caracteres combinantes, que en AFI
 * son la mitad del inventario. Una funcion que solo recibe el texto y dos
 * indices se puede probar con esos casos sin montar un navegador.
 */

describe("insertSymbol", () => {
  it("inserta en la posicion del cursor", () => {
    expect(insertSymbol("kasa", 2, 2, "ˈ")).toEqual({
      value: "kaˈsa",
      selectionStart: 3,
      selectionEnd: 3,
    });
  });

  it("reemplaza el texto seleccionado", () => {
    expect(insertSymbol("kasa", 1, 3, "ʃ")).toEqual({
      value: "kʃa",
      selectionStart: 2,
      selectionEnd: 2,
    });
  });

  it("inserta al principio y al final sin salirse", () => {
    expect(insertSymbol("", 0, 0, "ʈ").value).toBe("ʈ");
    expect(insertSymbol("a", 1, 1, "ː").value).toBe("aː");
  });

  it("recorta indices fuera de rango en vez de romper el texto", () => {
    expect(insertSymbol("ab", -5, 99, "̃").value).toBe("̃");
  });

  it("no separa un par sustituto al insertar en medio", () => {
    // Un caracter fuera del plano basico ocupa dos unidades UTF-16: si el
    // cursor cae entre las dos, insertar ahi parte el emoji y produce basura.
    const result = insertSymbol("a😀b", 2, 2, "ˈ");

    expect(result.value).toBe("a😀ˈb");
  });

  it("deja el cursor despues del simbolo insertado, listo para el siguiente", () => {
    const result = insertSymbol("ka", 2, 2, "ˈ");

    expect(result.value.slice(0, result.selectionStart)).toBe("kaˈ");
  });
});

describe("IPA_GROUPS", () => {
  it("agrupa los simbolos para que el panel se pueda recorrer por secciones", () => {
    expect(IPA_GROUPS.length).toBeGreaterThanOrEqual(4);
    for (const group of IPA_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.symbols.length).toBeGreaterThan(0);
    }
  });

  it("no repite simbolos entre grupos: un boton duplicado confunde al lector", () => {
    const all = IPA_GROUPS.flatMap((group) => group.symbols);
    expect(new Set(all).size).toBe(all.length);
  });

  it("incluye los simbolos que una transcripcion estrecha necesita", () => {
    const all = IPA_GROUPS.flatMap((group) => group.symbols).join("");

    for (const symbol of ["ˈ", "ˌ", "ː", "ə", "ʃ", "β", "ˈ"]) {
      expect(all).toContain(symbol);
    }
  });

  it("el tipo de grupo esta cerrado: no se inventan categorias sobre la marcha", () => {
    const labels: readonly IpaSymbolGroup[] = IPA_GROUPS.map((group) => group.label);
    expect(labels).toEqual(["consonants", "vowels", "diacritics", "prosody"]);
  });
});
