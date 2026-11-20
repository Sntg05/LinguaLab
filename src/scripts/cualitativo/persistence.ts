/* ============================================================
   LinguaLab — el proyecto cualitativo sobrevive a recargar la página

   Se guarda en el `localStorage` de este navegador: el material no sale del
   equipo (ADR 0002) y un trabajo de curso cabe de sobra. Se guarda en los mismos
   CSV que la persona descarga, y al leerlo pasa por los mismos lectores: lo que
   no se entiende se ignora y la página arranca vacía, en vez de romperse.
   ============================================================ */

import {
  type CodingSheet,
  codebookToCsv,
  codingToCsv,
  parseCodebookCsv,
  parseCodingCsv,
  type QualitativeCode,
  type SegmentMode,
} from "@lingualab/core";

export const PROJECT_KEY = "lingualab:qualitative:v1";

/** Lo que hace falta de `localStorage`; `null` cuando el navegador no lo da. */
export type ProjectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export interface QualitativeProject {
  readonly codebook: readonly QualitativeCode[];
  readonly material: string;
  readonly mode: SegmentMode;
  readonly sheet: CodingSheet | null;
}

interface Stored {
  readonly version: 1;
  readonly codebookCsv: string;
  readonly codingCsv: string | null;
  readonly material: string;
  readonly mode: SegmentMode;
}

/** Devuelve `false` si no se pudo guardar (modo privado, cuota llena). Nunca lanza. */
export const saveProject = (storage: ProjectStorage, project: QualitativeProject): boolean => {
  if (storage === null) return false;
  const stored: Stored = {
    version: 1,
    codebookCsv: project.codebook.length > 0 ? codebookToCsv(project.codebook) : "",
    codingCsv: project.sheet === null ? null : codingToCsv(project.sheet),
    material: project.material,
    mode: project.mode,
  };
  try {
    storage.setItem(PROJECT_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

const isStored = (value: unknown): value is Stored => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate["version"] === 1 &&
    typeof candidate["codebookCsv"] === "string" &&
    (candidate["codingCsv"] === null || typeof candidate["codingCsv"] === "string") &&
    typeof candidate["material"] === "string" &&
    (candidate["mode"] === "line" || candidate["mode"] === "paragraph")
  );
};

/** El proyecto guardado, o `null` si no hay nada o no se entiende. Nunca lanza. */
export const loadProject = (storage: ProjectStorage): QualitativeProject | null => {
  if (storage === null) return null;
  let stored: unknown;
  try {
    const raw = storage.getItem(PROJECT_KEY);
    if (raw === null) return null;
    stored = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isStored(stored)) return null;
  let codebook: readonly QualitativeCode[] = [];
  if (stored.codebookCsv !== "") {
    const parsed = parseCodebookCsv(stored.codebookCsv);
    if (!parsed.ok) return null;
    codebook = parsed.value;
  }
  let sheet: CodingSheet | null = null;
  if (stored.codingCsv !== null) {
    const parsed = parseCodingCsv(stored.codingCsv);
    if (!parsed.ok) return null;
    sheet = parsed.value;
  }
  return { codebook, material: stored.material, mode: stored.mode, sheet };
};

export const clearProject = (storage: ProjectStorage): void => {
  try {
    storage?.removeItem(PROJECT_KEY);
  } catch {
    // Si no se puede borrar, tampoco se pudo guardar: no hay nada que limpiar.
  }
};

/** `localStorage`, o `null` si el navegador lo bloquea (lanza al tocarlo). */
export const browserStorage = (): ProjectStorage => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
