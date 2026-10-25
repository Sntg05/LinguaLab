import { describe, expect, it } from "vitest";
import { SPANISH_DEMO_YEISMO } from "../data/demo-tables";
import { isErr, isOk } from "../result";
import { FixedClock } from "../testing/fakes/fixed-clock";
import { InMemoryOrthographyRepository } from "../testing/fakes/in-memory-orthography-repository";
import { SequentialIdGenerator } from "../testing/fakes/sequential-id-generator";
import {
  createExportOrthographyTable,
  createImportOrthographyTable,
  createListOrthographyTables,
  createRemoveOrthographyTable,
  createSaveOrthographyTable,
  type OrthographyTableDraft,
} from "./orthography-tables";

const validDraft = (): OrthographyTableDraft => ({
  languageId: "spa",
  name: "Borrador",
  classes: { V: ["a", "e", "i", "o", "u"] },
  rules: [{ grapheme: "ch", ipa: "t\u0283" }],
});

describe("createSaveOrthographyTable", () => {
  it("una tabla nueva recibe id, nace en version 1 y en estado draft", async () => {
    const repository = new InMemoryOrthographyRepository();
    const save = createSaveOrthographyTable({
      tables: repository,
      ids: new SequentialIdGenerator("tabla"),
      clock: new FixedClock(new Date(0)),
    });

    const result = await save(validDraft());

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.table.id).toBe("tabla-1");
      expect(result.value.table.version).toBe(1);
      expect(result.value.table.status).toBe("draft");
      expect(result.value.savedAt).toBe("1970-01-01T00:00:00.000Z");
    }
  });

  it("una tabla nueva con errores se rechaza con las incidencias y no llega al almacenamiento", async () => {
    const repository = new InMemoryOrthographyRepository();
    const save = createSaveOrthographyTable({
      tables: repository,
      ids: new SequentialIdGenerator("tabla"),
      clock: new FixedClock(new Date(0)),
    });

    const result = await save({ ...validDraft(), rules: [{ grapheme: "", ipa: "a" }] });

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.code === "table-invalid") {
      expect(result.error.issues.some((issue) => issue.code === "empty-grapheme")).toBe(true);
    }

    const listed = await repository.list();
    if (isOk(listed)) {
      expect(listed.value).toHaveLength(0);
    }
  });

  it("el rechazo sigue siendo table-invalid y cada incidencia llega como codigo y datos", async () => {
    const repository = new InMemoryOrthographyRepository();
    const save = createSaveOrthographyTable({
      tables: repository,
      ids: new SequentialIdGenerator("tabla"),
      clock: new FixedClock(new Date(0)),
    });

    const result = await save({
      ...validDraft(),
      rules: [
        { grapheme: "ch", ipa: "t\u0283" },
        { grapheme: "", ipa: "a" },
        { grapheme: "c", ipa: "s", after: "{C}" },
      ],
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.code === "table-invalid") {
      // La puerta de creacion no cambio: los mismos dos errores, en el mismo
      // orden de fila. Lo unico distinto es que ahora viajan sin redactar.
      expect(result.error.issues.map((issue) => issue.code)).toEqual([
        "empty-grapheme",
        "undefined-class",
      ]);
      expect(result.error.issues).toEqual([
        { code: "empty-grapheme", severity: "error", ruleIndex: 1 },
        { code: "undefined-class", severity: "error", ruleIndex: 2, className: "C" },
      ]);
    }
  });
});

describe("casos de uso que delegan en el repositorio", () => {
  it("list devuelve el resumen de las tablas guardadas", async () => {
    const repository = new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]);
    const list = createListOrthographyTables({ tables: repository });

    const result = await list();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContainEqual({
        id: SPANISH_DEMO_YEISMO.id,
        name: SPANISH_DEMO_YEISMO.name,
        languageId: SPANISH_DEMO_YEISMO.languageId,
        status: SPANISH_DEMO_YEISMO.status,
        ruleCount: SPANISH_DEMO_YEISMO.rules.length,
      });
    }
  });

  it("remove borra la tabla", async () => {
    const repository = new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]);
    const remove = createRemoveOrthographyTable({ tables: repository });

    const removed = await remove(SPANISH_DEMO_YEISMO.id);
    const loaded = await repository.get(SPANISH_DEMO_YEISMO.id);

    expect(isOk(removed)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toBeNull();
    }
  });

  it("export e import hacen un viaje de ida y vuelta entre casos de uso", async () => {
    const repository = new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]);
    const exportTable = createExportOrthographyTable({ tables: repository });
    const importTable = createImportOrthographyTable({ tables: repository });

    const exported = await exportTable(SPANISH_DEMO_YEISMO.id);
    expect(isOk(exported)).toBe(true);
    if (!isOk(exported)) {
      return;
    }
    await repository.remove(SPANISH_DEMO_YEISMO.id);

    const imported = await importTable(exported.value);

    expect(isOk(imported)).toBe(true);
    if (isOk(imported)) {
      expect(imported.value).toEqual(SPANISH_DEMO_YEISMO);
    }
  });

  it("export de una tabla inexistente devuelve not-found", async () => {
    const repository = new InMemoryOrthographyRepository();
    const exportTable = createExportOrthographyTable({ tables: repository });

    const result = await exportTable("no-existe");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("not-found");
    }
  });
});
