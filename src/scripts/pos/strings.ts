/* ============================================================
   LinguaLab — cadenas en tiempo de ejecución del etiquetado POS

   Solo estas claves viajan al navegador, ya traducidas (ADR 0004).
   ============================================================ */

import type { MessageKey } from "../../i18n";

export const POS_STRING_KEYS = [
  "pos.contractionNote",
  "pos.status.ready",
  "pos.status.loading",
  "pos.status.done",
  "pos.status.empty",
  "pos.status.error",
] as const satisfies readonly MessageKey[];

export interface PosStrings {
  text(key: (typeof POS_STRING_KEYS)[number]): string;
  format(key: (typeof POS_STRING_KEYS)[number], holes: Readonly<Record<string, string | number>>): string;
}

export const createPosStrings = (raw: string | undefined): PosStrings => {
  let values: Record<string, string> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? "");
    if (typeof parsed === "object" && parsed !== null) values = parsed as Record<string, string>;
  } catch {
    values = {};
  }
  return {
    text: (key) => values[key] ?? key,
    format: (key, holes) =>
      (values[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) => String(holes[name] ?? whole)),
  };
};
