import { describe, expect, it } from "vitest";
import type { AnnotationDocument } from "../domain/annotation";
import { FixedClock } from "../testing/fakes/fixed-clock";
import { InMemoryAnnotationStorage } from "../testing/fakes/in-memory-annotation-storage";
import { isErr, isOk } from "../result";
import {
  createListAnnotationProjects,
  createLoadAnnotationProject,
  createSaveAnnotationProject,
  summarizeAnnotation,
} from "./annotation-project";

/**
 * El autoguardado de anotaciones.
 *
 * Sin servidor, el archivo guardado en este navegador es la unica copia de un
 * trabajo de anotacion. Este caso de uso existe para que guardar tenga una
 * respuesta comprobable —cuando se guardo, que se guardo— en vez de ser un
 * efecto secundario que nadie mira hasta que se pierde.
 */

const document: AnnotationDocument = {
  xmin: 0,
  xmax: 1,
  tiers: [
    {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.5, text: "hola" },
        { start: 0.5, end: 1, text: "mundo" },
      ],
    },
    { name: "marks", kind: "point", points: [{ time: 0.25, text: "H" }] },
  ],
};

describe("summarizeAnnotation", () => {
  it("cuenta capas de intervalos y de puntos por separado", () => {
    const summary = summarizeAnnotation(document);

    expect(summary.tierCount).toBe(2);
    expect(summary.intervalCount).toBe(2);
    expect(summary.pointCount).toBe(1);
  });

  it("un documento vacio resume en ceros", () => {
    expect(summarizeAnnotation({ xmin: 0, xmax: 0, tiers: [] })).toEqual({
      tierCount: 0,
      intervalCount: 0,
      pointCount: 0,
    });
  });
});

describe("createSaveAnnotationProject", () => {
  it("guarda el documento y devuelve cuando se guardo", async () => {
    const storage = new InMemoryAnnotationStorage();
    const savedAt = new Date("2025-01-02T03:04:05Z");
    const save = createSaveAnnotationProject({ storage, clock: new FixedClock(savedAt) });

    const result = await save("proyecto-1", document);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.projectId).toBe("proyecto-1");
      expect(result.value.savedAt).toEqual(savedAt);
      expect(result.value.intervalCount).toBe(2);
    }
  });

  it("lo guardado se puede volver a cargar", async () => {
    const storage = new InMemoryAnnotationStorage();
    const save = createSaveAnnotationProject({ storage, clock: new FixedClock(new Date(0)) });
    const load = createLoadAnnotationProject({ storage });

    await save("proyecto-1", document);
    const loaded = await load("proyecto-1");

    expect(isOk(loaded)).toBe(true);
    if (isOk(loaded)) {
      expect(loaded.value).toEqual(document);
    }
  });

  it("rechaza un identificador vacio antes de tocar el almacenamiento", async () => {
    const storage = new InMemoryAnnotationStorage();
    const save = createSaveAnnotationProject({ storage, clock: new FixedClock(new Date(0)) });

    const result = await save("  ", document);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unknown");
    }
    const listed = await storage.list();
    if (isOk(listed)) {
      expect(listed.value).toEqual([]);
    }
  });
});

describe("createLoadAnnotationProject", () => {
  it("un proyecto que no existe devuelve null y no un error", async () => {
    const load = createLoadAnnotationProject({ storage: new InMemoryAnnotationStorage() });

    const result = await load("no-existe");

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeNull();
    }
  });
});

describe("createListAnnotationProjects", () => {
  it("lista los proyectos guardados", async () => {
    const storage = new InMemoryAnnotationStorage();
    const save = createSaveAnnotationProject({ storage, clock: new FixedClock(new Date(0)) });
    const list = createListAnnotationProjects({ storage });

    await save("proyecto-1", document);
    await save("proyecto-2", document);

    const result = await list();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect([...result.value].sort()).toEqual(["proyecto-1", "proyecto-2"]);
    }
  });
});
