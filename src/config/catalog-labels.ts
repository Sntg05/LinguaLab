/* ============================================================
   LinguaLab — catalog labels

   The message keys that name each level of analysis and each status.
   The catalog page and the landing both show them, so they live in one
   place instead of two maps that could drift apart.
   ============================================================ */

import type { ToolArea, ToolStatus } from "@lingualab/core";
import type { MessageKey } from "../i18n";

export const AREA_KEYS: Readonly<Record<ToolArea, MessageKey>> = {
  fonetica: "catalog.area.fonetica",
  fonologia: "catalog.area.fonologia",
  morfosintaxis: "catalog.area.morfosintaxis",
  semantica: "catalog.area.semantica",
  pragmatica: "catalog.area.pragmatica",
  psicolinguistica: "catalog.area.psicolinguistica",
  tipologia: "catalog.area.tipologia",
  documentacion: "catalog.area.documentacion",
};

export const STATUS_KEYS: Readonly<Record<ToolStatus, MessageKey>> = {
  stable: "catalog.status.stable",
  experimental: "catalog.status.experimental",
  planned: "catalog.status.planned",
};

export const LANGUAGE_KEYS: Readonly<Record<string, MessageKey>> = {
  es: "catalog.language.es",
  en: "catalog.language.en",
  pt: "catalog.language.pt",
  guc: "catalog.language.guc",
};

/**
 * Splits a catalog note into plain and **strong** runs. The notes use that one
 * piece of Markdown to flag declared limits; shown raw, the asterisks read as
 * noise.
 */
export const strongRuns = (text: string): { readonly text: string; readonly strong: boolean }[] =>
  text
    .split(/\*\*(.+?)\*\*/)
    .map((part, index) => ({ text: part, strong: index % 2 === 1 }))
    .filter((run) => run.text !== "");

/** The host a link goes to, without "www.", for showing where it leads. */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
