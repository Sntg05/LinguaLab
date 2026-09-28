/* ============================================================
   LinguaLab — vocal tract diagram driver
   Applies an Articulation to the rendered SVG and produces the textual
   description used for the caption and for assistive technology.
   ============================================================ */

import {
  TONGUE_REGION_BY_SHAPE,
  type Articulation,
  type Constriction,
} from "../../data/articulation";
import {
  PLACE_LABELS,
  TONGUE_REGION_LABELS,
  type TongueRegion,
} from "../../data/articulation-labels";
import type { Locale } from "../../i18n";

/** Toggle `data-active` onto the single element carrying a variant value. */
function setVariant(root: ParentNode, group: string, value: string): void {
  for (const el of root.querySelectorAll<SVGElement>(`[data-${group}]`)) {
    el.removeAttribute("data-active");
  }
  for (const el of root.querySelectorAll<SVGElement>(`[data-${group}="${value}"]`)) {
    el.setAttribute("data-active", "true");
  }
}

/** Rebuild the constriction markers for an articulation. */
function renderMarkers(root: ParentNode, constrictions: readonly Constriction[]): void {
  const group = root.querySelector<SVGGElement>(".tract__markers");
  const template = root.querySelector<SVGGElement>("[data-marker-template]");
  if (!group || !template) return;

  // Remove previous markers but keep the template.
  for (const el of group.querySelectorAll("[data-marker]")) el.remove();

  for (const c of constrictions) {
    const marker = template.cloneNode(true) as SVGGElement;
    marker.classList.remove("marker--template");
    marker.setAttribute("data-marker", "true");
    marker.dataset["place"] = c.place;
    marker.style.setProperty("--mx", String(c.x));
    marker.style.setProperty("--my", String(c.y));
    for (const circle of marker.querySelectorAll<SVGCircleElement>("circle")) {
      circle.setAttribute("cx", String(c.x));
      circle.setAttribute("cy", String(c.y));
    }
    group.append(marker);
  }
}

/** Which tongue region is active, phrased for a caption. */
function activeArticulator(art: Articulation, locale: Locale): string {
  if (art.kind === "vowel") {
    return locale === "es" ? "dorso de la lengua" : "tongue body";
  }
  const region: TongueRegion = TONGUE_REGION_BY_SHAPE[art.tongue];
  return TONGUE_REGION_LABELS[region][locale].toLowerCase();
}

/**
 * A plain-language description of the configuration. Doubles as the SVG
 * `<desc>`, so a screen reader gets the same information as the drawing.
 */
export function describeArticulation(art: Articulation, locale: Locale): string {
  const es = locale === "es";
  const parts: string[] = [];

  if (art.kind === "modifier") {
    return es
      ? "Signo diacrítico: modifica otro sonido, no tiene una articulación propia."
      : "Diacritic: it modifies another sound and has no articulation of its own.";
  }

  const places = art.constrictions
    .filter((c) => c.place !== "none")
    .map((c) => PLACE_LABELS[c.place as keyof typeof PLACE_LABELS][locale].toLowerCase());

  if (art.kind === "vowel") {
    parts.push(
      es
        ? `Vocal: el ${activeArticulator(art, locale)} se acerca al paladar.`
        : `Vowel: the ${activeArticulator(art, locale)} approaches the palate.`,
    );
  } else if (places.length === 2) {
    parts.push(
      es
        ? `Doble articulación: el ${activeArticulator(art, locale)} y los labios actúan a la vez (${places.join(" + ")}).`
        : `Double articulation: the ${activeArticulator(art, locale)} and the lips act together (${places.join(" + ")}).`,
    );
  } else if (places.length === 1) {
    parts.push(
      es
        ? `El ${activeArticulator(art, locale)} se aproxima a la zona ${places[0]}.`
        : `The ${activeArticulator(art, locale)} moves towards the ${places[0]} region.`,
    );
  } else {
    parts.push(es ? "Sin constricción oral marcada." : "No marked oral constriction.");
  }

  parts.push(
    art.glottis === "vibrating"
      ? es
        ? "Las cuerdas vocales vibran: sonido sonoro."
        : "The vocal folds vibrate: a voiced sound."
      : es
        ? "Las cuerdas vocales están abiertas: sonido sordo."
        : "The vocal folds are open: a voiceless sound.",
  );

  if (art.velum === "lowered") {
    parts.push(
      es
        ? "El velo está descendido, así que el aire sale también por la nariz."
        : "The velum is lowered, so air also escapes through the nose.",
    );
  }

  if (art.lips === "rounded") {
    parts.push(es ? "Los labios están redondeados." : "The lips are rounded.");
  } else if (art.lips === "spread") {
    parts.push(es ? "Los labios están extendidos." : "The lips are spread.");
  } else if (art.lips === "closed") {
    parts.push(es ? "Los labios están cerrados." : "The lips are closed.");
  }

  return parts.join(" ");
}

export interface ApplyOptions {
  locale: Locale;
  /** Place label for the caption, already localised. */
  placeText: string;
}

/** Point the whole diagram at a new articulation. */
export function applyArticulation(
  root: HTMLElement,
  art: Articulation,
  { locale, placeText }: ApplyOptions,
): void {
  setVariant(root, "tongue", art.tongue);
  setVariant(root, "velum", art.velum === "raised" ? "raised" : "lowered");
  setVariant(root, "uvula", art.velum === "raised" ? "raised" : "lowered");
  setVariant(root, "glottis", art.glottis);
  setVariant(root, "lips", art.lips);

  // Air follows the oral route unless the nasal port is open.
  for (const el of root.querySelectorAll<SVGElement>("[data-air]")) {
    el.removeAttribute("data-active");
  }
  root
    .querySelector<SVGElement>(`[data-air="${art.velum === "lowered" ? "nasal" : "oral"}"]`)
    ?.setAttribute("data-active", "true");

  renderMarkers(root, art.constrictions);

  const description = describeArticulation(art, locale);
  const desc = root.querySelector<SVGDescElement>("[data-tract-desc]");
  if (desc) desc.textContent = description;

  const note = root.querySelector<HTMLElement>("[data-tract-note]");
  if (note) note.textContent = art.kind === "modifier" ? description : "";

  const place = root.querySelector<HTMLElement>("[data-tract-place]");
  if (place) place.textContent = placeText;
}

/** Read the locale back off the rendered figure. */
export function localeOf(root: HTMLElement): Locale {
  return root.dataset["locale"] === "en" ? "en" : "es";
}

export { describeArticulation as describe };
