import { createCodingSheet, setMark } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { clearProject, loadProject, PROJECT_KEY, saveProject } from "./persistence";

/** Un `localStorage` de mentira, con la misma interfaz. */
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

const project = () => ({
  codebook: [
    { name: "Actitud", definition: "", include: "", exclude: "", example: "" },
    { name: "Positiva", definition: "", include: "", exclude: "", example: "", parent: "Actitud" },
  ],
  material: "uno\ndos",
  mode: "line" as const,
  sheet: setMark(createCodingSheet(["uno", "dos"], ["Actitud", "Positiva"]), 1, 1, true),
});

describe("el proyecto cualitativo sobrevive a recargar la página", () => {
  it("se guarda y se recupera igual", () => {
    const storage = memoryStorage();
    expect(saveProject(storage, project())).toBe(true);
    expect(loadProject(storage)).toEqual(project());
  });

  it("sin nada guardado, no hay proyecto", () => {
    expect(loadProject(memoryStorage())).toBeNull();
  });

  it("lo guardado que no se entiende se ignora en vez de romper la página", () => {
    const storage = memoryStorage();
    storage.setItem(PROJECT_KEY, "{no es json");
    expect(loadProject(storage)).toBeNull();
    storage.setItem(PROJECT_KEY, JSON.stringify({ version: 1, codebookCsv: "code\n", material: 3 }));
    expect(loadProject(storage)).toBeNull();
  });

  it("si el navegador no deja guardar, lo dice con false y no lanza", () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    expect(saveProject(failing, project())).toBe(false);
    expect(saveProject(null, project())).toBe(false);
  });

  it("borrar deja la página como nueva", () => {
    const storage = memoryStorage();
    saveProject(storage, project());
    clearProject(storage);
    expect(loadProject(storage)).toBeNull();
  });
});

describe("regresiones del verificador (2026-11-20)", () => {
  it("dividir el material antes de crear códigos no hace perder el material al recargar", () => {
    const storage = memoryStorage();
    saveProject(storage, {
      codebook: [],
      material: "Ana: hola",
      mode: "line",
      sheet: createCodingSheet(["Ana: hola"], []),
    });
    const back = loadProject(storage);
    expect(back?.material).toBe("Ana: hola");
  });

  it("si una de las partes guardadas no se entiende, se recupera el resto", () => {
    const storage = memoryStorage();
    storage.setItem(
      PROJECT_KEY,
      JSON.stringify({ version: 1, codebookCsv: "code\nA\n", codingCsv: "esto no es una hoja", material: "texto", mode: "line" }),
    );
    const back = loadProject(storage);
    expect(back?.material).toBe("texto");
    expect(back?.codebook.map((code) => code.name)).toEqual(["A"]);
    expect(back?.sheet).toBeNull();
  });
});
