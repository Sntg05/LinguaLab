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
    expect(TOOLS).toHaveLength(10);
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(TOOLS.length);
  });

  it("el JSON no declara url en ninguna ficha", () => {
    // Se lee el dato crudo a proposito: el lector rechaza un `url`, asi que
    // mirar el JSON es la unica forma de comprobar que hoy no hay ninguno.
    for (const tool of rawCatalog.tools as readonly { id?: unknown }[]) {
      expect(tool, `la ficha ${String(tool.id)} no deberia declarar url`).not.toHaveProperty("url");
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

  it("rechaza una ficha con url, en lugar de publicar un enlace sin verificar", () => {
    const tool = { ...baseTool(), url: "https://ejemplo.test" };
    expect(() => parseToolCatalog({ version: 1, tools: [tool] })).toThrow(/declara url/);
  });

  it("rechaza dos fichas con el mismo id", () => {
    expect(() =>
      parseToolCatalog({ version: 1, tools: [baseTool(), baseTool()] }),
    ).toThrow(/id repetido/);
  });
});
