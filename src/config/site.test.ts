import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rawCatalog from "../data/tools.json";
import { SITE_ROUTES } from "./site";

/**
 * El catálogo es la página donde alguien decide si el sitio le sirve. Por eso su
 * regla más importante es que una herramienta planeada no se vea como una que
 * existe, y esa regla tiene dos mitades: el estado que declara la ficha y el
 * enlace que la tarjeta ofrece.
 *
 * Estas pruebas cubren la mitad que faltaba. «Análisis acústico» se anunciaba como
 * **experimental** —no como planificada— y no tenía página: el catálogo prometía
 * una herramienta que no existe, y quien la buscara no encontraba nada. El estado
 * se corrigió; estas pruebas existen para que la próxima no dependa de que alguien
 * se acuerde.
 */
interface CatalogTool {
  readonly id: string;
  readonly status: string;
  readonly integration: string;
}

const tools = (rawCatalog as { tools: readonly CatalogTool[] }).tools;

describe("SITE_ROUTES contra el catálogo", () => {
  it("toda herramienta que no está planificada tiene ruta y página", () => {
    const missing = tools
      .filter((tool) => tool.status !== "planned")
      .filter((tool) => SITE_ROUTES[tool.id] === undefined)
      .map((tool) => `${tool.id} (${tool.status})`);

    // Una ficha `stable` o `experimental` sin ruta es una promesa sin página.
    expect(missing).toEqual([]);
  });

  it("ninguna herramienta planificada tiene ruta", () => {
    const promised = tools
      .filter((tool) => tool.status === "planned")
      .filter((tool) => SITE_ROUTES[tool.id] !== undefined)
      .map((tool) => tool.id);

    // El caso simétrico: una ruta para algo que todavía no existe enlazaría a una
    // página a medio hacer, que es peor que no enlazar.
    expect(promised).toEqual([]);
  });

  it("cada ruta mapeada corresponde a una página que existe en el repositorio", () => {
    const missingPages = Object.entries(SITE_ROUTES)
      .filter(([, route]) => {
        const page = `src/pages${route}.astro`;
        const english = `src/pages/en${route}.astro`;
        return !existsSync(page) || !existsSync(english);
      })
      .map(([id, route]) => `${id} -> ${route}`);

    // Una ruta adivinada enlaza a un 404; esto lo detecta sin compilar el sitio.
    expect(missingPages).toEqual([]);
  });

  it("el mapa no tiene ids que el catálogo desconozca", () => {
    const known = new Set(tools.map((tool) => tool.id));
    const orphans = Object.keys(SITE_ROUTES).filter((id) => !known.has(id));

    expect(orphans).toEqual([]);
  });
});
