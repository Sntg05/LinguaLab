/* ============================================================
   LinguaLab — huecos de un TextGrid importado

   Un TextGrid puede traer capas que no cubren todo el documento. El visor no
   los rellena por su cuenta: los avisa, bloquea la exportacion mientras sigan
   ahi y los rellena solo cuando la persona lo pide. Aqui vive la parte que no
   necesita DOM —que capas se rellenan y como se resume el aviso— para probarla
   en Node.
   ============================================================ */

import { type AnnotationDocument, fillTierGaps, isIntervalTier } from "@lingualab/core";
import { formatSeconds } from "./strings";

/** Un hueco detectado al importar: la capa por nombre y el tramo sin cubrir. */
export interface PendingGap {
  readonly tier: string;
  readonly start: number;
  readonly end: number;
}

/** Cuantos huecos se nombran en el aviso; el resto lo dice el total. */
const LISTED_GAPS = 4;

/** Un archivo soltado sobre el visor es un TextGrid si su extension lo dice. */
export const isTextGridFileName = (name: string): boolean => /\.(textgrid|tg)$/i.test(name);

/** Los primeros huecos, legibles: «capa: inicio–fin · capa: inicio–fin». */
export const describeGapList = (gaps: readonly PendingGap[]): string =>
  gaps
    .slice(0, LISTED_GAPS)
    .map((gap) => `${gap.tier}: ${formatSeconds(gap.start)}–${formatSeconds(gap.end)}`)
    .join(" · ");

/**
 * Rellena los huecos de las capas nombradas y devuelve el documento nuevo.
 *
 * Una capa que ya no existe, que no es de intervalos o que ya no tiene huecos se
 * salta: entre la importacion y el clic la persona pudo haber editado.
 */
export const fillDocumentGaps = (
  doc: AnnotationDocument,
  gaps: readonly PendingGap[],
): AnnotationDocument => {
  let next = doc;
  for (const gap of gaps) {
    const index = next.tiers.findIndex((tier) => tier.name === gap.tier);
    const tier = next.tiers[index];
    if (index === -1 || tier === undefined || !isIntervalTier(tier)) {
      continue;
    }
    const filled = fillTierGaps(tier, next.xmin, next.xmax);
    if (filled === tier) {
      continue;
    }
    next = {
      ...next,
      tiers: next.tiers.map((current, position) => (position === index ? filled : current)),
    };
  }
  return next;
};
