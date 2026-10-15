import { describe, expect, it } from "vitest";
import { SPANISH_DEMO_YEISMO } from "../data/demo-tables";
import type { OrthographyTable } from "../domain/orthography-table";
import type {
  OrthographyRepositoryError,
  OrthographyRepositoryPort,
} from "../ports/orthography-repository";
import { err, isErr, isOk, ok, type Result } from "../result";
import { InMemoryOrthographyRepository } from "../testing/fakes/in-memory-orthography-repository";
import { createConvertOrthographyToIpa } from "./convert-orthography-to-ipa";

const minimalTable = (
  id: string,
  allophonic?: readonly { grapheme: string; ipa: string }[],
): OrthographyTable => ({
  id,
  languageId: "spa",
  name: "minima",
  version: 1,
  classes: {},
  rules: [
    { grapheme: "a", ipa: "a" },
    { grapheme: "b", ipa: "b" },
  ],
  ...(allophonic !== undefined ? { allophonic } : {}),
  status: "draft",
});

const erroringRepository: OrthographyRepositoryPort = {
  list: async (): Promise<Result<readonly never[], OrthographyRepositoryError>> =>
    err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
  get: async () => err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
  save: async () => err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
  remove: async () => err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
  exportJson: async () => err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
  importJson: async () => err({ code: "storage-unavailable", detail: "sin almacenamiento" }),
};

describe("createConvertOrthographyToIpa: errores tipados", () => {
  it("texto vacio devuelve empty-input", async () => {
    const convert = createConvertOrthographyToIpa({ tables: new InMemoryOrthographyRepository() });

    const result = await convert({ text: "", tableId: "x" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("empty-input");
    }
  });

  it("una tabla inexistente devuelve table-not-found", async () => {
    const convert = createConvertOrthographyToIpa({ tables: new InMemoryOrthographyRepository() });

    const result = await convert({ text: "hola", tableId: "no-existe" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual({ code: "table-not-found", tableId: "no-existe" });
    }
  });

  it("una tabla con errores de validacion devuelve table-unusable con las incidencias", async () => {
    const broken: OrthographyTable = {
      ...minimalTable("rota"),
      rules: [
        { grapheme: "a", ipa: "a" },
        { grapheme: "a", ipa: "e" },
      ],
    };
    const convert = createConvertOrthographyToIpa({
      tables: new InMemoryOrthographyRepository([broken]),
    });

    const result = await convert({ text: "a", tableId: "rota" });

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.code === "table-unusable") {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues.every((issue) => issue.severity === "error")).toBe(true);
    }
  });

  it("un fallo de almacenamiento no se disfraza de tabla inexistente", async () => {
    const convert = createConvertOrthographyToIpa({ tables: erroringRepository });

    const result = await convert({ text: "hola", tableId: "x" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("storage-failure");
    }
  });
});

describe("createConvertOrthographyToIpa: capas", () => {
  const convert = createConvertOrthographyToIpa({
    tables: new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]),
  });

  it("por defecto solo aplica la capa fonemica", async () => {
    const result = await convert({ text: "abogado", tableId: SPANISH_DEMO_YEISMO.id });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ipa).toBe("abo\u0261ado");
      expect(result.value.layerOutputs.allophonic).toBeUndefined();
    }
  });

  it("con la capa alofonica pedida devuelve las aproximantes", async () => {
    const result = await convert({
      text: "abogado",
      tableId: SPANISH_DEMO_YEISMO.id,
      options: { layers: ["phonemic", "allophonic"] },
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ipa).toBe("a\u03b2o\u0263a\u00f0o");
      expect(result.value.layerOutputs.phonemic).toBe("abo\u0261ado");
      expect(result.value.layerOutputs.allophonic).toBe("a\u03b2o\u0263a\u00f0o");
    }
  });

  it("pedir solo la alofonica sigue ejecutando la fonemica como entrada", async () => {
    const result = await convert({
      text: "abogado",
      tableId: SPANISH_DEMO_YEISMO.id,
      options: { layers: ["allophonic"] },
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ipa).toBe("a\u03b2o\u0263a\u00f0o");
      expect(result.value.layerOutputs.phonemic).toBeUndefined();
    }
  });

  it("una tabla sin capa alofonica no marca todo como sin cobertura", async () => {
    const table = minimalTable("sin-alofonica");
    const convertMinimal = createConvertOrthographyToIpa({
      tables: new InMemoryOrthographyRepository([table]),
    });

    const result = await convertMinimal({
      text: "ab",
      tableId: table.id,
      options: { layers: ["allophonic"] },
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ipa).toBe("ab");
      expect(result.value.uncovered).toHaveLength(0);
      // La salida principal si cae a la fonemica, porque es lo mejor disponible,
      // pero la clave de la capa alofonica NO se publica: la tabla no declara
      // ninguna regla alofonica, y publicarla aqui atribuiria a esa capa un
      // resultado que no produjo. Es una prueba de honestidad, no de formato.
      expect(result.value.layerOutputs.allophonic).toBeUndefined();
    }
  });
});

describe("createConvertOrthographyToIpa: resultado completo", () => {
  it("devuelve rastro y huecos de la conversion", async () => {
    const repository = new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]);
    const convert = createConvertOrthographyToIpa({ tables: repository });

    const result = await convert({ text: "chico", tableId: SPANISH_DEMO_YEISMO.id });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.trace).toHaveLength(4);
      expect(result.value.trace[0]?.grapheme).toBe("ch");
      expect(result.value.trace[0]?.ipa).toBe("t\u0283");
      expect(result.value.uncovered).toHaveLength(0);
    }
  });

  it("un fallo del repositorio despues de resolver se conserva como Result", async () => {
    const convert = createConvertOrthographyToIpa({
      tables: {
        ...erroringRepository,
        get: async () => err({ code: "not-found", id: "x" }),
      },
    });

    const result = await convert({ text: "hola", tableId: "x" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("table-not-found");
    }
  });

  it("ok se puede construir sin usar el repositorio para nada mas", async () => {
    const convert = createConvertOrthographyToIpa({
      tables: {
        ...erroringRepository,
        get: async () => ok(minimalTable("ok")),
      },
    });

    const result = await convert({ text: "ab", tableId: "ok" });

    expect(isOk(result)).toBe(true);
  });
});
