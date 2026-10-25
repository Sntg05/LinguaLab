/**
 * Pruebas del diccionario que viaja al navegador con el mapa.
 *
 * Las dos frases que el script reescribe mientras filtra se serializan ya
 * traducidas en un atributo `data-json`. Se prueban sus dos extremos: que una
 * clave con valor se lea, y que un atributo truncado o manipulado no meta en la
 * pagina un valor que no es texto.
 */
import { describe, expect, it } from "vitest";
import { MAP_STRING_KEYS, createStrings, format, parseStrings } from "./strings";

describe("MAP_STRING_KEYS", () => {
  it("solo lleva claves del mapa", () => {
    for (const key of MAP_STRING_KEYS) {
      expect(key.startsWith("map.")).toBe(true);
    }
  });
});

describe("parseStrings", () => {
  it("lee las claves conocidas de un JSON serializado", () => {
    const parsed = parseStrings(JSON.stringify({ "map.count": "Mostrando {count} de {total}" }));

    expect(parsed["map.count"]).toBe("Mostrando {count} de {total}");
  });

  it("ignora claves desconocidas y valores que no son texto", () => {
    const parsed = parseStrings(
      JSON.stringify({ "map.count": "texto", "map.empty": 3, "otra.clave": "x" }),
    );

    expect(parsed["map.count"]).toBe("texto");
    expect(parsed["map.empty"]).toBeUndefined();
    expect(parsed["otra.clave"]).toBeUndefined();
  });

  it("devuelve un diccionario vacio cuando el atributo falta o esta truncado", () => {
    expect(parseStrings(undefined)).toEqual({});
    expect(parseStrings("")).toEqual({});
    expect(parseStrings('{"map.count":')).toEqual({});
    expect(parseStrings("[1,2,3]")).toEqual({});
  });
});

describe("createStrings", () => {
  it("devuelve la frase de la clave pedida", () => {
    const strings = createStrings({ "map.empty": "Ninguna lengua coincide." });

    expect(strings.text("map.empty")).toBe("Ninguna lengua coincide.");
  });

  it("devuelve la clave cuando falta el valor, que se ve en la pagina", () => {
    expect(createStrings({}).text("map.count")).toBe("map.count");
  });
});

describe("format", () => {
  it("reemplaza los marcadores con sus valores", () => {
    expect(format("Mostrando {count} de {total} lenguas", { count: 3, total: 136 })).toBe(
      "Mostrando 3 de 136 lenguas",
    );
  });

  it("deja intacto un marcador sin valor en vez de escribir 'undefined'", () => {
    expect(format("Mostrando {count} de {total}", { count: 1 })).toBe("Mostrando 1 de {total}");
  });
});
