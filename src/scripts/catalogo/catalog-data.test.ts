/**
 * Pruebas del lector del catalogo.
 *
 * No se limita a comprobar que el JSON real carga: eso solo dice que hoy esta
 * bien. Comprueba que un catalogo ROTO falla, que es la propiedad que evita que
 * una ficha mal escrita llegue al build en silencio.
 */
import { describe, expect, it } from "vitest";
import rawCatalog from "../../data/tools.json";
import { TOOLS, parseToolCatalog } from "./catalog-data";

const baseTool = () => ({
  id: "ejemplo",
  name: { es: "Ejemplo", en: "Example" },
  area: "fonetica",
  integration: "embedded",
  status: "planned",
  languages: [],
});

describe("parseToolCatalog", () => {
  it("carga el catalogo del sitio sin perdidas", () => {
    expect(TOOLS).toHaveLength(20);
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(TOOLS.length);
  });

  it("toda ficha alojada fuera declara una url https, y ninguna otra la declara", () => {
    // Se lee el dato crudo a proposito: el lector ya valida esto, pero mirar el
    // JSON dice ademas QUE urls se publican, que es lo que alguien revisa a mano.
    for (const tool of rawCatalog.tools as readonly {
      id?: unknown;
      integration?: unknown;
      status?: unknown;
      url?: unknown;
    }[]) {
      if (tool.integration === "external-link" && tool.status !== "planned") {
        expect(typeof tool.url, `la ficha ${String(tool.id)} es un enlace externo`).toBe("string");
        expect(String(tool.url), `la ficha ${String(tool.id)}`).toMatch(/^https:\/\//);
      } else {
        expect(tool, `la ficha ${String(tool.id)} no deberia declarar url`).not.toHaveProperty(
          "url",
        );
      }
    }
  });

  it("rechaza una version no soportada", () => {
    expect(() => parseToolCatalog({ version: 2, tools: [] })).toThrow(/version no soportada/);
  });

  it("rechaza un area que el dominio no conoce", () => {
    const tool = { ...baseTool(), area: "inventada" };
    expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/area desconocida/);
  });

  it("rechaza una integracion que el dominio no conoce", () => {
    const tool = { ...baseTool(), integration: "mágica" };
    expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/integracion desconocida/);
  });

  it("rechaza una ficha integrada que declara url", () => {
    const tool = { ...baseTool(), url: "https://ejemplo.test" };
    expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/no es un enlace externo/);
  });

  it("rechaza un enlace externo disponible sin url", () => {
    const tool = { ...baseTool(), integration: "external-link", status: "stable" };
    expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/no trae una url https/);
  });

  it("acepta un enlace externo previsto sin url: es una fuente sin verificar", () => {
    const tool = { ...baseTool(), integration: "external-link", status: "planned" };
    const parsed = parseToolCatalog({ version: 1, tools: [tool] });

    expect(parsed[0]?.url).toBeUndefined();
  });

  it("rechaza un enlace externo que no es https", () => {
    for (const url of ["http://ejemplo.test", "ftp://ejemplo.test", "ejemplo.test"]) {
      const tool = { ...baseTool(), integration: "external-link", url };
      expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/url https/);
    }
  });

  it("acepta un enlace externo con su url https", () => {
    const tool = { ...baseTool(), integration: "external-link", url: "https://ejemplo.test" };
    const parsed = parseToolCatalog({ version: 1, tools: [tool] });

    expect(parsed[0]?.url).toBe("https://ejemplo.test");
  });

  it("rechaza dos fichas con el mismo id", () => {
    expect(() =>
      parseToolCatalog({ version: 1, tools: [baseTool(), baseTool()] }),
    ).toThrow(/id repetido/);
  });
});
