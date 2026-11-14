import type { ToolLocalizedText } from "./tool-descriptor";

/**
 * El respaldo académico de una herramienta.
 *
 * Regla del proyecto: nada está «porque sí». Cada herramienta integrada explica
 * en una frase de qué teoría o método sale y cita al menos una fuente que una
 * persona pueda abrir. Esta comprobación es pura para que la misma regla valga
 * en las pruebas, en la compilación y en la página que lista la bibliografía.
 */
export interface Reference {
  readonly id: string;
  /** Autores en formato APA, tal como se muestran. */
  readonly authors: string;
  readonly year: number;
  readonly title: string;
  /** Revista, editorial o actas, con volumen y páginas cuando existen. */
  readonly source: string;
  /** DOI sin prefijo (`10.xxxx/...`). Se prefiere a la URL porque no cambia. */
  readonly doi?: string;
  /** Página estable de la obra, solo https. */
  readonly url?: string;
  /** Fecha (AAAA-MM-DD) en que alguien comprobó que el DOI o la URL abren esta obra. */
  readonly verifiedOn: string;
}

/** Lo mínimo que la comprobación necesita saber de una herramienta. */
export interface SupportedTool {
  readonly id: string;
  readonly theory?: ToolLocalizedText;
  readonly references?: readonly string[];
}

export type ScholarlySupportIssue =
  | { readonly code: "missing-theory"; readonly toolId: string }
  | { readonly code: "no-references"; readonly toolId: string }
  | { readonly code: "unknown-reference"; readonly toolId: string; readonly referenceId: string }
  | { readonly code: "duplicate-reference"; readonly referenceId: string }
  | { readonly code: "no-locator"; readonly referenceId: string }
  | { readonly code: "not-verified"; readonly referenceId: string }
  | { readonly code: "unused-reference"; readonly referenceId: string };

const DOI = /^10\.\d{4,9}\/\S+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const hasLocator = (reference: Reference): boolean =>
  (reference.doi !== undefined && DOI.test(reference.doi)) ||
  (reference.url?.startsWith("https://") ?? false);

/** El enlace que abre la obra: el DOI si lo hay, y si no la URL. */
export const referenceLink = (reference: Reference): string | undefined =>
  reference.doi !== undefined ? `https://doi.org/${reference.doi}` : reference.url;

/**
 * Devuelve todo lo que falta para que el respaldo esté completo: primero lo de
 * las herramientas, en su orden, y después lo de la bibliografía.
 */
export const checkScholarlySupport = (
  tools: readonly SupportedTool[],
  references: readonly Reference[],
): readonly ScholarlySupportIssue[] => {
  const issues: ScholarlySupportIssue[] = [];
  const known = new Set(references.map((reference) => reference.id));
  const cited = new Set<string>();

  for (const tool of tools) {
    if (tool.theory === undefined || tool.theory.es.trim() === "" || tool.theory.en.trim() === "") {
      issues.push({ code: "missing-theory", toolId: tool.id });
    }
    const ids = tool.references ?? [];
    if (ids.length === 0) issues.push({ code: "no-references", toolId: tool.id });
    for (const referenceId of ids) {
      cited.add(referenceId);
      if (!known.has(referenceId)) {
        issues.push({ code: "unknown-reference", toolId: tool.id, referenceId });
      }
    }
  }

  const seen = new Set<string>();
  for (const reference of references) {
    if (seen.has(reference.id)) {
      issues.push({ code: "duplicate-reference", referenceId: reference.id });
      continue;
    }
    seen.add(reference.id);
    if (!hasLocator(reference)) issues.push({ code: "no-locator", referenceId: reference.id });
    if (!ISO_DATE.test(reference.verifiedOn)) {
      issues.push({ code: "not-verified", referenceId: reference.id });
    }
    if (!cited.has(reference.id))
      issues.push({ code: "unused-reference", referenceId: reference.id });
  }

  return issues;
};
