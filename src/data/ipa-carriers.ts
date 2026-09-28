/* ============================================================
   LinguaLab — carrier words for speech synthesis

   Speech synthesis cannot pronounce an IPA glyph: handing it "θ" makes it
   say "theta", and handing it "/θ/" makes it read punctuation. The only way
   to get the actual sound from the system voice is to speak a real word that
   contains it.

   These are the words the synthesizer is asked to say when no licensed
   recording exists for a symbol.
   ============================================================ */

import type { Locale } from "../i18n";

export interface Carriers {
  es?: string;
  en?: string;
}

export const CARRIERS: Readonly<Record<string, Carriers>> = {
  // Plosives
  p: { es: "pato", en: "pat" },
  b: { es: "boca", en: "bat" },
  t: { es: "taza", en: "tap" },
  d: { es: "dado", en: "dog" },
  k: { es: "casa", en: "cat" },
  "ɡ": { es: "gato", en: "go" },
  q: {},
  "ʔ": { en: "uh oh" },

  // Fricatives
  f: { es: "foca", en: "fish" },
  v: { en: "van" },
  "θ": { es: "zapato", en: "think" },
  "ð": { es: "nada", en: "this" },
  s: { es: "sopa", en: "see" },
  z: { es: "mismo", en: "zoo" },
  "ʃ": { es: "chico", en: "she" },
  "ʒ": { en: "measure" },
  x: { es: "jota", en: "loch" },
  "ɣ": { es: "amigo" },
  h: { es: "hola", en: "hat" },

  // Nasals
  m: { es: "mano", en: "man" },
  n: { es: "nube", en: "no" },
  "ŋ": { es: "tango", en: "sing" },
  "ɲ": { es: "niño" },

  // Liquids and glides
  l: { es: "luna", en: "leaf" },
  "ɾ": { es: "pera", en: "butter" },
  r: { es: "perro" },
  j: { es: "yate", en: "yes" },
  w: { es: "huevo", en: "we" },
  "ʎ": { es: "llave" },
  "ʝ": { es: "yate" },

  // Vowels
  i: { es: "sí", en: "see" },
  e: { es: "mesa", en: "bed" },
  a: { es: "casa", en: "father" },
  o: { es: "solo", en: "more" },
  u: { es: "luna", en: "food" },
  "ɛ": { en: "bed" },
  "ɔ": { en: "thought" },
  "ə": { en: "about" },
};

/**
 * The word to speak for a symbol, or null when none is known.
 * Returns null rather than falling back to the glyph itself, because speaking
 * the glyph name would be actively misleading.
 */
export function carrierFor(symbol: string, locale: Locale): string | null {
  const carriers = CARRIERS[symbol];
  if (!carriers) return null;
  return carriers[locale] ?? null;
}
