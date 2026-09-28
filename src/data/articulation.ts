/* ============================================================
   LinguaLab — articulatory model
   Maps a phonetic symbol to a drawable state of the vocal tract.

   The diagram is a mid-sagittal cross-section: the face points LEFT
   (lips at the front, pharynx and larynx at the back), which is the
   convention used in the phonetics literature.

   Everything here is pure data and pure functions, so the chart page can
   assert that all 108 symbols resolve to a drawable diagram.
   ============================================================ */

import type { IpaSymbol } from "./ipa-chart";

/* ---------------------------------------------------------------
   Drawing space
   The SVG uses a 320 x 240 viewBox. These anchors are the shared
   reference points that both the static anatomy and the dynamic tongue
   shapes are built from, so the two always line up.
   --------------------------------------------------------------- */
export const VIEW = { width: 320, height: 240 } as const;

/** Named landmarks of the tract in viewBox coordinates. */
export const ANATOMY = {
  /** Between the lips, where bilabials constrict. */
  lips: { x: 36, y: 112 },
  upperTeeth: { x: 52, y: 102 },
  alveolarRidge: { x: 74, y: 92 },
  hardPalate: { x: 112, y: 82 },
  /** Velum / soft palate, the nasal-oral valve. */
  velum: { x: 150, y: 86 },
  uvula: { x: 184, y: 120 },
  pharynxWall: { x: 192, y: 148 },
  glottis: { x: 184, y: 192 },
} as const;

/**
 * Where each place of articulation constricts, as a point on the tract
 * wall, plus the label anchor for the highlight marker.
 */
export type PlaceKey =
  | "bilabial"
  | "labiodental"
  | "dental"
  | "alveolar"
  | "postalveolar"
  | "retroflex"
  | "alveoloPalatal"
  | "palatal"
  | "labialVelar"
  | "labialPalatal"
  | "velopalatal"
  | "velar"
  | "uvular"
  | "pharyngeal"
  | "epiglottal"
  | "glottal"
  | "none";

export interface Constriction {
  /** Constriction centre in viewBox coordinates. */
  x: number;
  y: number;
  place: PlaceKey;
}

/* ---------------------------------------------------------------
   Tongue shapes
   Consonants need to control the tongue TIP independently of the body,
   which a single hump cannot express, so consonant shapes are authored
   explicitly. Vowels only vary the hump, so they are generated.
   --------------------------------------------------------------- */
export type TongueShape =
  | "rest"
  | "tipDental"
  | "tipAlveolar"
  | "bladePostalveolar"
  | "tipRetroflex"
  | "frontAlveoloPalatal"
  | "frontPalatal"
  | "backVelar"
  | "backUvular"
  | "rootPharyngeal"
  | "epiglottal"
  | "vowelHighFront"
  | "vowelHighCentral"
  | "vowelHighBack"
  | "vowelMidFront"
  | "vowelMidCentral"
  | "vowelMidBack"
  | "vowelLowMidFront"
  | "vowelLowMidCentral"
  | "vowelLowMidBack"
  | "vowelLowFront"
  | "vowelLowCentral"
  | "vowelLowBack";

/**
 * Tongue outlines, as closed paths over the floor of the mouth.
 * Each runs tip -> front -> back -> root along the upper surface, then
 * back along the floor to close.
 */
export const TONGUE_PATHS: Readonly<Record<TongueShape, string>> = {
  // Neutral: the surface runs gently back, tip just behind the lower teeth.
  rest: "M54 124 C 78 130, 110 136, 140 140 C 162 143, 178 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",

  // Coronals: the tip or blade rises towards the front of the palate.
  tipDental:
    "M50 108 C 66 116, 96 130, 132 138 C 158 143, 176 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 60 164, 48 138, 50 108 Z",
  tipAlveolar:
    "M56 102 C 70 108, 98 128, 134 138 C 160 143, 176 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 62 164, 52 134, 56 102 Z",
  bladePostalveolar:
    "M64 104 C 80 100, 100 122, 136 138 C 160 144, 176 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 64 162, 56 130, 64 104 Z",
  tipRetroflex:
    "M74 98 C 76 112, 92 128, 132 138 C 158 144, 176 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 66 160, 62 122, 74 98 Z",
  frontAlveoloPalatal:
    "M68 102 C 88 96, 108 118, 140 136 C 162 143, 178 143, 186 140 L188 168 C 164 174, 116 176, 80 170 C 66 160, 60 128, 68 102 Z",
  frontPalatal:
    "M76 104 C 98 90, 122 112, 148 134 C 166 142, 180 142, 186 140 L188 168 C 164 174, 116 176, 80 170 C 68 158, 66 126, 76 104 Z",

  // Dorsals: the back of the tongue rises towards the velum or uvula.
  backVelar:
    "M56 124 C 80 132, 106 126, 134 112 C 158 100, 176 108, 184 122 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 56 124 Z",
  backUvular:
    "M56 126 C 82 136, 110 132, 140 124 C 164 118, 182 124, 190 136 L192 168 C 166 176, 116 178, 80 172 C 62 168, 52 150, 56 126 Z",

  // Radicals: the root is pulled back towards the pharynx wall.
  rootPharyngeal:
    "M56 128 C 86 140, 116 146, 148 152 C 172 158, 186 164, 194 160 L196 178 C 170 186, 118 188, 82 180 C 62 174, 52 154, 56 128 Z",
  epiglottal:
    "M56 128 C 88 142, 120 150, 152 158 C 176 164, 190 172, 198 170 L200 186 C 172 194, 120 192, 84 182 C 64 176, 52 154, 56 128 Z",

  // Vowels: the body carries the shape and the tip stays low.
  vowelHighFront:
    "M54 124 C 76 108, 104 96, 134 110 C 158 122, 178 136, 186 142 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelHighCentral:
    "M54 124 C 80 112, 112 100, 140 112 C 162 122, 180 138, 186 144 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelHighBack:
    "M54 124 C 84 118, 116 104, 146 104 C 166 106, 182 132, 186 144 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelMidFront:
    "M54 124 C 78 112, 106 108, 136 118 C 158 128, 178 138, 186 144 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelMidCentral:
    "M54 124 C 80 118, 112 114, 140 122 C 160 130, 180 140, 186 146 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelMidBack:
    "M54 124 C 84 124, 116 116, 146 118 C 166 122, 182 138, 186 146 L188 168 C 164 174, 116 176, 80 170 C 62 166, 52 148, 54 124 Z",
  vowelLowMidFront:
    "M54 126 C 78 122, 108 122, 138 130 C 158 136, 178 142, 186 148 L188 170 C 164 176, 116 178, 80 172 C 62 168, 52 150, 54 126 Z",
  vowelLowMidCentral:
    "M54 128 C 82 128, 112 128, 142 134 C 162 139, 180 144, 186 150 L188 170 C 164 176, 116 178, 80 172 C 62 168, 52 152, 54 128 Z",
  vowelLowMidBack:
    "M54 128 C 86 132, 116 130, 146 134 C 166 138, 182 144, 186 150 L188 170 C 164 176, 116 178, 80 172 C 62 168, 52 152, 54 128 Z",
  vowelLowFront:
    "M54 134 C 78 132, 108 134, 138 142 C 158 147, 178 150, 186 154 L188 172 C 164 178, 116 180, 80 174 C 62 170, 52 156, 54 134 Z",
  vowelLowCentral:
    "M54 136 C 82 138, 112 142, 142 148 C 162 152, 180 155, 186 158 L188 174 C 164 180, 116 182, 80 176 C 62 172, 52 158, 54 136 Z",
  vowelLowBack:
    "M54 136 C 86 142, 116 146, 146 150 C 166 153, 182 156, 186 158 L188 174 C 164 180, 116 182, 80 176 C 62 172, 52 158, 54 136 Z",
};

/** Lip configuration, which matters for rounded vowels and bilabials. */
export type LipShape = "neutral" | "spread" | "rounded" | "closed";

/** Where the air escapes. */
export type VelumState = "raised" | "lowered";

/** Vocal-fold state. */
export type GlottisState = "vibrating" | "open" | "closed";

/** How the symbol should be presented by the diagram. */
export type ArticulationKind = "consonant" | "vowel" | "modifier";

export interface Articulation {
  kind: ArticulationKind;
  tongue: TongueShape;
  /** One entry normally; two for doubly-articulated sounds. */
  constrictions: Constriction[];
  lips: LipShape;
  velum: VelumState;
  glottis: GlottisState;
  /** True when the sound is produced without air from the lungs. */
  nonPulmonic: boolean;
}

/* ---------------------------------------------------------------
   Derivation from the chart's own vocabulary
   --------------------------------------------------------------- */

const PLACE_BY_EN: Readonly<Record<string, PlaceKey>> = {
  Bilabial: "bilabial",
  Labiodental: "labiodental",
  Dental: "dental",
  Alveolar: "alveolar",
  Postalveolar: "postalveolar",
  Retroflex: "retroflex",
  "Alveolo-palatal": "alveoloPalatal",
  Palatal: "palatal",
  "Labial-velar": "labialVelar",
  "Labial-palatal": "labialPalatal",
  Velopalatal: "velopalatal",
  Velar: "velar",
  Uvular: "uvular",
  Pharyngeal: "pharyngeal",
  Epiglottal: "epiglottal",
  Glottal: "glottal",
  "—": "none",
};

/** Constriction point for each place, taken from the anatomy anchors. */
const CONSTRICTION_BY_PLACE: Readonly<Record<Exclude<PlaceKey, "none">, Constriction>> = {
  bilabial: { x: 36, y: 112, place: "bilabial" },
  labiodental: { x: 50, y: 100, place: "labiodental" },
  dental: { x: 55, y: 100, place: "dental" },
  alveolar: { x: 74, y: 94, place: "alveolar" },
  postalveolar: { x: 88, y: 90, place: "postalveolar" },
  retroflex: { x: 84, y: 88, place: "retroflex" },
  alveoloPalatal: { x: 100, y: 86, place: "alveoloPalatal" },
  palatal: { x: 122, y: 82, place: "palatal" },
  velar: { x: 152, y: 88, place: "velar" },
  uvular: { x: 184, y: 110, place: "uvular" },
  pharyngeal: { x: 192, y: 148, place: "pharyngeal" },
  epiglottal: { x: 192, y: 172, place: "epiglottal" },
  glottal: { x: 184, y: 192, place: "glottal" },
  labialVelar: { x: 152, y: 88, place: "labialVelar" },
  labialPalatal: { x: 122, y: 82, place: "labialPalatal" },
  velopalatal: { x: 138, y: 84, place: "velopalatal" },
};

const TONGUE_BY_PLACE: Readonly<Record<Exclude<PlaceKey, "none">, TongueShape>> = {
  bilabial: "rest",
  labiodental: "rest",
  dental: "tipDental",
  alveolar: "tipAlveolar",
  postalveolar: "bladePostalveolar",
  retroflex: "tipRetroflex",
  alveoloPalatal: "frontAlveoloPalatal",
  palatal: "frontPalatal",
  velar: "backVelar",
  uvular: "backUvular",
  pharyngeal: "rootPharyngeal",
  epiglottal: "epiglottal",
  glottal: "rest",
  labialVelar: "backVelar",
  labialPalatal: "frontPalatal",
  velopalatal: "backVelar",
};

/** Doubly-articulated sounds need a second constriction marker. */
const SECONDARY_CONSTRICTION: Partial<
  Record<Exclude<PlaceKey, "none">, Exclude<PlaceKey, "none">>
> = {
  labialVelar: "bilabial",
  labialPalatal: "bilabial",
  velopalatal: "palatal",
};

/** Vowel hump: height (from manner_en) drives y, backness (place_en) drives x. */
const VOWEL_HEIGHT_Y: Readonly<Record<string, number>> = {
  Close: 106,
  "Near-close": 114,
  "Close-mid": 124,
  Mid: 134,
  "Open-mid": 142,
  "Near-open": 148,
  Open: 156,
};

const VOWEL_BACKNESS_X: Readonly<Record<string, number>> = {
  Front: 116,
  Central: 138,
  Back: 156,
};

const VOWEL_TONGUE: Readonly<Record<string, Readonly<Record<string, TongueShape>>>> = {
  Front: {
    Close: "vowelHighFront",
    "Near-close": "vowelHighFront",
    "Close-mid": "vowelMidFront",
    Mid: "vowelMidFront",
    "Open-mid": "vowelLowMidFront",
    "Near-open": "vowelLowFront",
    Open: "vowelLowFront",
  },
  Central: {
    Close: "vowelHighCentral",
    "Near-close": "vowelHighCentral",
    "Close-mid": "vowelMidCentral",
    Mid: "vowelMidCentral",
    "Open-mid": "vowelLowMidCentral",
    "Near-open": "vowelLowCentral",
    Open: "vowelLowCentral",
  },
  Back: {
    Close: "vowelHighBack",
    "Near-close": "vowelHighBack",
    "Close-mid": "vowelMidBack",
    Mid: "vowelMidBack",
    "Open-mid": "vowelLowMidBack",
    "Near-open": "vowelLowBack",
    Open: "vowelLowBack",
  },
};

/**
 * Lip rounding.
 *
 * The Spanish wording is a trap: "sin redondeo" (unrounded) CONTAINS
 * "redondeo", so a naive substring test marks every unrounded vowel as
 * rounded. Matching on "redondead" hits only redondeada/redondeado, and
 * "unrounded" is tested before "rounded" for the same reason in English.
 */
function isRounded(symbol: IpaSymbol): boolean {
  const text = `${symbol.es} ${symbol.en}`.toLowerCase();
  if (text.includes("sin redondeo") || text.includes("unrounded")) return false;
  return text.includes("redondead") || text.includes("rounded");
}

function isNasal(symbol: IpaSymbol): boolean {
  const text = `${symbol.es} ${symbol.en} ${symbol.manner_en}`.toLowerCase();
  return text.includes("nasal") || text.includes("nasales");
}

function isNonPulmonic(symbol: IpaSymbol): boolean {
  const text = `${symbol.en} ${symbol.manner_en}`.toLowerCase();
  return text.includes("click") || text.includes("implosive") || text.includes("ejective");
}

/**
 * Resolve a chart entry to a drawable articulation.
 * Always returns a usable state: an unknown place degrades to the neutral
 * diagram rather than failing to render.
 */
export function articulationFor(symbol: IpaSymbol, categoryId: string): Articulation {
  const voicing = symbol.voicing;
  const glottis: GlottisState =
    voicing === "sorda" ? "open" : voicing === "sonora" ? "vibrating" : "open";

  if (categoryId === "vowels") {
    const height = VOWEL_HEIGHT_Y[symbol.manner_en] ?? 138;
    const backness = VOWEL_BACKNESS_X[symbol.place_en] ?? 136;
    const tongue = VOWEL_TONGUE[symbol.place_en]?.[symbol.manner_en] ?? "vowelMidCentral";

    return {
      kind: "vowel",
      tongue,
      // The vowel "constriction" reads as the highest point of the tongue.
      constrictions: [{ x: backness, y: height, place: "none" }],
      // Unrounded is the default for vowels, so schwa reads as spread rather
      // than neutral.
      lips: isRounded(symbol) ? "rounded" : "spread",
      velum: isNasal(symbol) ? "lowered" : "raised",
      glottis,
      nonPulmonic: false,
    };
  }

  if (categoryId === "diacritics") {
    // Diacritics and suprasegmentals modify a segment; they have no
    // constriction of their own, so the diagram shows the resting tract.
    return {
      kind: "modifier",
      tongue: "rest",
      constrictions: [],
      lips: "neutral",
      velum: "raised",
      glottis: "open",
      nonPulmonic: false,
    };
  }

  const resolved = PLACE_BY_EN[symbol.place_en] ?? "none";

  if (resolved === "none") {
    return {
      kind: "consonant",
      tongue: "rest",
      constrictions: [],
      lips: "neutral",
      velum: "raised",
      glottis,
      nonPulmonic: isNonPulmonic(symbol),
    };
  }

  // Annotated so the index types below are provably free of "none".
  const place: Exclude<PlaceKey, "none"> = resolved;

  const constrictions: Constriction[] = [CONSTRICTION_BY_PLACE[place]];
  const secondary = SECONDARY_CONSTRICTION[place];
  if (secondary) constrictions.push(CONSTRICTION_BY_PLACE[secondary]);

  return {
    kind: "consonant",
    tongue: TONGUE_BY_PLACE[place],
    constrictions,
    lips:
      symbol.manner_en === "Stop" && place === "bilabial"
        ? "closed"
        : isRounded(symbol)
          ? "rounded"
          : "neutral",
    velum: isNasal(symbol) ? "lowered" : "raised",
    glottis,
    nonPulmonic: isNonPulmonic(symbol),
  };
}

/** Every place key the model understands, for coverage tests. */
export const KNOWN_PLACES: readonly PlaceKey[] = Object.values(PLACE_BY_EN);

export { PLACE_BY_EN, VOWEL_BACKNESS_X, VOWEL_HEIGHT_Y, isRounded };

/**
 * Which part of the tongue is the active articulator for each shape.
 * Used to describe a phoneme in words, for the diagram caption and for
 * screen readers.
 */
export const TONGUE_REGION_BY_SHAPE: Readonly<Record<TongueShape, import("./articulation-labels").TongueRegion>> = {
  rest: "front",
  tipDental: "tip",
  tipAlveolar: "tip",
  bladePostalveolar: "blade",
  tipRetroflex: "tip",
  frontAlveoloPalatal: "front",
  frontPalatal: "front",
  backVelar: "back",
  backUvular: "back",
  rootPharyngeal: "root",
  epiglottal: "root",
  vowelHighFront: "front",
  vowelHighCentral: "front",
  vowelHighBack: "back",
  vowelMidFront: "front",
  vowelMidCentral: "front",
  vowelMidBack: "back",
  vowelLowMidFront: "front",
  vowelLowMidCentral: "front",
  vowelLowMidBack: "back",
  vowelLowFront: "front",
  vowelLowCentral: "front",
  vowelLowBack: "back",
};
