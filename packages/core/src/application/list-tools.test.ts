import { describe, expect, it } from "vitest";
import type { ToolDescriptor } from "../domain/tool-descriptor";
import { isOk } from "../result";
import { InMemoryToolRegistry } from "../testing/fakes/in-memory-tool-registry";
import { createListTools } from "./list-tools";

const tools: readonly ToolDescriptor[] = [
  {
    id: "orthography",
    name: { es: "Ortografia", en: "Orthography" },
    area: "fonetica",
    integration: "embedded",
    status: "experimental",
    languages: ["spa", "eng"],
  },
  {
    id: "treebank",
    name: { es: "Arboles", en: "Trees" },
    area: "morfosintaxis",
    integration: "external-link",
    status: "stable",
    languages: ["spa"],
  },
];

describe("createListTools", () => {
  it("sin filtro devuelve el catalogo completo", async () => {
    const listTools = createListTools({ registry: new InMemoryToolRegistry(tools) });

    const result = await listTools();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
    }
  });

  it("combina area e integracion con AND", async () => {
    const listTools = createListTools({ registry: new InMemoryToolRegistry(tools) });

    const result = await listTools({ area: "fonetica", integration: "embedded" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.map((tool) => tool.id)).toEqual(["orthography"]);
    }
  });
});
