/* ============================================================
   LinguaLab — articulatory vocabulary labels
   Bilingual names for the places of articulation and for the anatomical
   landmarks drawn in the mid-sagittal diagram.
   ============================================================ */

import type { PlaceKey } from "./articulation";

export interface Bilingual {
  es: string;
  en: string;
}

/** Place of articulation, as named on the diagram. */
export const PLACE_LABELS: Readonly<Record<Exclude<PlaceKey, "none">, Bilingual>> = {
  bilabial: { es: "Bilabial", en: "Bilabial" },
  labiodental: { es: "Labiodental", en: "Labiodental" },
  dental: { es: "Dental", en: "Dental" },
  alveolar: { es: "Alveolar", en: "Alveolar" },
  postalveolar: { es: "Postalveolar", en: "Postalveolar" },
  retroflex: { es: "Retroflejo", en: "Retroflex" },
  alveoloPalatal: { es: "Alveolo-palatal", en: "Alveolo-palatal" },
  palatal: { es: "Palatal", en: "Palatal" },
  velar: { es: "Velar", en: "Velar" },
  velopalatal: { es: "Velopalatal", en: "Velopalatal" },
  uvular: { es: "Uvular", en: "Uvular" },
  pharyngeal: { es: "Faringal", en: "Pharyngeal" },
  epiglottal: { es: "Epiglotal", en: "Epiglottal" },
  glottal: { es: "Glotal", en: "Glottal" },
  labialVelar: { es: "Labiovelar", en: "Labial-velar" },
  labialPalatal: { es: "Labiopalatal", en: "Labial-palatal" },
};

export type AnatomyKey =
  | "nasalCavity"
  | "lips"
  | "teeth"
  | "alveolarRidge"
  | "hardPalate"
  | "velum"
  | "uvula"
  | "tongue"
  | "pharynx"
  | "glottis"
  | "jaw";

/** Anatomical landmarks, labelled on the diagram. */
export const ANATOMY_LABELS: Readonly<Record<AnatomyKey, Bilingual>> = {
  nasalCavity: { es: "Cavidad nasal", en: "Nasal cavity" },
  lips: { es: "Labios", en: "Lips" },
  teeth: { es: "Dientes", en: "Teeth" },
  alveolarRidge: { es: "Alvéolos", en: "Alveolar ridge" },
  hardPalate: { es: "Paladar duro", en: "Hard palate" },
  velum: { es: "Velo del paladar", en: "Soft palate (velum)" },
  uvula: { es: "Úvula", en: "Uvula" },
  tongue: { es: "Lengua", en: "Tongue" },
  pharynx: { es: "Faringe", en: "Pharynx" },
  glottis: { es: "Cuerdas vocales", en: "Vocal folds" },
  jaw: { es: "Mandíbula", en: "Jaw" },
};

/** Tongue regions, used to name the active articulator. */
export type TongueRegion = "tip" | "blade" | "front" | "back" | "root";

export const TONGUE_REGION_LABELS: Readonly<Record<TongueRegion, Bilingual>> = {
  tip: { es: "Ápice (punta)", en: "Tip (apex)" },
  blade: { es: "Lámina", en: "Blade (lamina)" },
  front: { es: "Dorso anterior", en: "Front (dorsum)" },
  back: { es: "Dorso posterior", en: "Back (dorsum)" },
  root: { es: "Raíz", en: "Root" },
};
