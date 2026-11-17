/* ============================================================
   LinguaLab — FonoLab: reglas de la página
   Filtros de la tabla del AFI, rótulos, navegación con flechas y mensajes
   del audio, sin DOM, para que tengan prueba. El cableado vive en `index.ts`.
   ============================================================ */

import { PLACE_LABELS } from "../../data/articulation-labels";
import type { IpaSymbol } from "../../data/ipa-chart";
import type { Locale } from "../../i18n";
import type { AudioTier, PlayResult } from "./audio";

export const placeName = (place: string, locale: Locale): string =>
  place in PLACE_LABELS ? PLACE_LABELS[place as keyof typeof PLACE_LABELS][locale] : "—";

/** Lo que el botón de un símbolo guarda en sus atributos `data-*`. */
export interface SymbolDataset {
  readonly [key: string]: string | undefined;
}

/** Rehace el `IpaSymbol` que espera el modelo articulatorio a partir del botón. */
export const symbolFromDataset = (
  dataset: SymbolDataset,
  es: boolean,
): { symbol: IpaSymbol; categoryId: string } => {
  const place = dataset["place"] ?? "—";
  const manner = dataset["manner"] ?? "";
  const description = dataset["description"] ?? "";
  return {
    categoryId: dataset["category"] ?? "pulmonics",
    symbol: {
      ipa: dataset["symbol"] ?? "",
      es: es ? description : "",
      en: es ? "" : description,
      place_es: place,
      place_en: place,
      manner_es: manner,
      manner_en: manner,
      voicing: dataset["voicing"] ?? "—",
    },
  };
};

export const articulationRows = (
  symbol: IpaSymbol,
  locale: Locale,
): readonly (readonly [string, string])[] => {
  const es = locale === "es";
  return [
    [es ? "Punto de articulación" : "Place of articulation", placeName(symbol.place_en, locale)],
    [es ? "Modo" : "Manner", symbol.manner_en],
    [es ? "Sonoridad" : "Voicing", symbol.voicing],
  ];
};

/** La búsqueda mira el símbolo, la descripción, el punto y el modo. */
export const matchesIpaFilters = (
  dataset: SymbolDataset,
  category: string,
  query: string,
): boolean => {
  const matchesCategory = category === "all" || dataset["category"] === category;
  const needle = query.trim().toLowerCase();
  const haystack =
    `${dataset["symbol"]} ${dataset["description"]} ${dataset["place"]} ${dataset["manner"]}`.toLowerCase();
  return matchesCategory && (needle === "" || haystack.includes(needle));
};

export const symbolCountLabel = (visible: number, total: number, es: boolean): string =>
  es ? `${visible} de ${total} símbolos` : `${visible} of ${total} symbols`;

/** Cuánto se mueve la selección con cada flecha; `null` si la tecla no es una flecha. */
export const arrowStep = (key: string): 1 | -1 | null => {
  if (key === "ArrowRight" || key === "ArrowDown") return 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return -1;
  return null;
};

export const audioTierBadge = (
  tier: AudioTier,
  es: boolean,
): { readonly text: string; readonly className: string } => {
  const text =
    tier === "sample"
      ? es
        ? "grabación"
        : "recording"
      : tier === "speech"
        ? es
          ? "voz sintética"
          : "synthetic voice"
        : es
          ? "no disponible"
          : "unavailable";
  return { text, className: `badge ${tier === "unavailable" ? "badge--warn" : "badge--ok"}` };
};

export const audioNote = (result: Pick<PlayResult, "tier" | "detail">, es: boolean): string => {
  if (result.tier === "speech") {
    return es
      ? `Sin grabación con licencia: se pronuncia «${result.detail}».`
      : `No licensed recording: speaking “${result.detail}”.`;
  }
  if (result.tier === "unavailable") {
    return es
      ? "No hay grabación ni voz disponible para este símbolo."
      : "No recording or voice is available for this symbol.";
  }
  return "";
};

/** La cobertura de audio, dicha con honestidad: no toda la tabla está grabada. */
export const coverageText = (count: number, es: boolean): string =>
  es
    ? `${count} símbolos tienen grabación con licencia; el resto usa la voz del sistema.`
    : `${count} symbols have a licensed recording; the rest use the system voice.`;

export const transcriberFailure = (es: boolean): string =>
  es
    ? "No se pudo descargar el diccionario de inglés. Revisa la conexión y vuelve a intentarlo."
    : "The English dictionary could not be downloaded. Check the connection and try again.";
