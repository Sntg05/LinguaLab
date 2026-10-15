/**
 * Contrato del puerto de registro contra el adaptador estatico.
 *
 * La suite no se reescribe: se importa `runToolRegistryPortContract` del
 * nucleo. El ADR 0001 fija que un adaptador no esta terminado hasta que pasa
 * LA MISMA suite que ya pasaba el fake; una copia local podria divergir y dejar
 * al adaptador "probado" contra un contrato que nadie mas cumple.
 *
 * Ademas del contrato se comprueban las combinaciones de filtro —que el
 * contrato no cubre: solo prueba un area— y el orden por `id`, que es lo que
 * hace comparables dos renders del mismo filtro.
 */
import { describe, expect, it } from "vitest";
import { type ToolDescriptor, isOk } from "@lingualab/core";
import { runToolRegistryPortContract } from "@lingualab/core/testing";
import { createStaticToolRegistry } from "./static-tool-registry";

const FIXTURE: readonly ToolDescriptor[] = [
  {
    id: "zeta",
    name: { es: "Zeta", en: "Zeta" },
    area: "fonetica",
    integration: "embedded",
    status: "stable",
    languages: ["es", "en"],
  },
  {
    id: "alpha",
    name: { es: "Alfa", en: "Alpha" },
    area: "morfosintaxis",
    integration: "embedded",
    status: "planned",
    languages: ["es"],
  },
  {
    id: "beta",
    name: { es: "Beta", en: "Beta" },
    area: "fonetica",
    integration: "needs-backend",
    status: "experimental",
    languages: [],
  },
  {
    id: "gamma",
    name: { es: "Gamma", en: "Gamma" },
    area: "documentacion",
    integration: "external-link",
    status: "stable",
    languages: ["en"],
  },
];

const createAdapter = () => createStaticToolRegistry(FIXTURE);

/** Los ids de una lista, para comparar sin arrastrar el resto de la ficha. */
const ids = async (filter?: Parameters<ReturnType<typeof createAdapter>["list"]>[0]) => {
  const result = await createAdapter().list(filter);
  if (!isOk(result)) {
    throw new Error("el registro devolvio un error donde se esperaba una lista");
  }
  return result.value.map((tool) => tool.id);
};

describe("StaticToolRegistry", () => {
  runToolRegistryPortContract(createAdapter);

  it("ordena por id aunque los datos lleguen en otro orden", async () => {
    expect(await ids()).toEqual(["alpha", "beta", "gamma", "zeta"]);
  });

  it("combina area y lengua con AND", async () => {
    expect(await ids({ area: "fonetica", language: "es" })).toEqual(["zeta"]);
  });

  it("combina area e integracion con AND", async () => {
    expect(await ids({ area: "fonetica", integration: "embedded" })).toEqual(["zeta"]);
  });

  it("la lengua vacia no coincide con ninguna herramienta independiente de la lengua", async () => {
    // `beta` declara `languages: []` porque es independiente de la lengua: solo
    // aparece bajo "todas", nunca al filtrar por una lengua concreta.
    expect(await ids({ language: "es" })).toEqual(["alpha", "zeta"]);
    expect(await ids({ language: "en" })).toEqual(["gamma", "zeta"]);
  });

  it("un filtro sin coincidencias devuelve una lista vacia, no un error", async () => {
    expect(await ids({ area: "fonetica", language: "fr" })).toEqual([]);
  });

  it("no muta el catalogo que recibe", async () => {
    const owner: ToolDescriptor[] = [...FIXTURE];
    const adopter = createStaticToolRegistry(owner);

    owner.reverse();
    const listed = await adopter.list();

    expect(isOk(listed)).toBe(true);
    if (isOk(listed)) {
      expect(listed.value.map((tool) => tool.id)).toEqual(["alpha", "beta", "gamma", "zeta"]);
    }
  });

  it("byId encuentra una ficha y devuelve null para una desconocida", async () => {
    const adapter = createAdapter();

    const found = await adapter.byId("beta");
    const missing = await adapter.byId("no-existe");

    expect(isOk(found) && found.value?.area).toBe("fonetica");
    expect(isOk(missing) && missing.value).toBeNull();
  });
});
