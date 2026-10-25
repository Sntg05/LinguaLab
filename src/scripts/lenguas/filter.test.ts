/**
 * Pruebas del filtrado del mapa: familia linguistica y busqueda por nombre.
 *
 * El mapa es estatico y el script solo alterna `hidden`, asi que la regla que
 * decide que queda visible tiene que ser una funcion pura y probada aqui. Es la
 * misma regla que usa `/catalogo` (`src/scripts/tools/catalogue.ts`): un solo
 * modelo de filtrado en el sitio, no dos que se parecen.
 */
import { describe, expect, it } from "vitest";
import { NO_FAMILY, filterLanguages } from "./filter";

const languages = [
  { name: "Wayuu", family: "Arawakan" },
  { name: "Páez", family: null },
  { name: "Cubeo", family: "Tucanoan" },
  { name: "Desano", family: "Tucanoan" },
];

const names = (filters: { family: string; query: string }): string[] =>
  filterLanguages(languages, filters).map((language) => language.name);

describe("filterLanguages", () => {
  it("sin filtros deja todas las lenguas, en el orden del dato", () => {
    expect(names({ family: "", query: "" })).toEqual(["Wayuu", "Páez", "Cubeo", "Desano"]);
  });

  it("filtra por familia y descarta las demas", () => {
    expect(names({ family: "Tucanoan", query: "" })).toEqual(["Cubeo", "Desano"]);
  });

  it("encuentra una lengua por su nombre aunque se escriba sin tildes", () => {
    expect(names({ family: "", query: "paez" })).toEqual(["Páez"]);
  });

  it("encuentra una lengua por un fragmento del nombre, sin distinguir mayusculas", () => {
    expect(names({ family: "", query: "WAY" })).toEqual(["Wayuu"]);
  });

  it("combina familia y busqueda en vez de elegir una", () => {
    expect(names({ family: "Tucanoan", query: "desa" })).toEqual(["Desano"]);
    expect(names({ family: "Tucanoan", query: "wayuu" })).toEqual([]);
  });

  it("deja elegir las lenguas que Glottolog no asigna a ninguna familia", () => {
    expect(names({ family: NO_FAMILY, query: "" })).toEqual(["Páez"]);
  });

  it("devuelve una lista vacia cuando nada coincide", () => {
    expect(names({ family: "", query: "inexistente" })).toEqual([]);
  });
});
