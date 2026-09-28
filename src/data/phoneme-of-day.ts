/* ============================================================
   LinguaLab — phoneme of the day
   Ported from the inline TERMS array in legacy/js/home/term-day.js.
   Each entry carries both locales, so the page renders either one at
   build time with no runtime dictionary.
   ============================================================ */

export interface PhonemeOfDay {
  id: string;
  /** The glyph, e.g. "θ". */
  symbol: string;
  /** Approximate sound-alike for learners, e.g. "th". */
  sound: string;
  ipa_es: string;
  ipa_en: string;
  name_es: string;
  name_en: string;
  /** Uses {braces} to mark the target words. */
  ctx_es: string;
  ctx_en: string;
  why_es: string;
  why_en: string;
  rel_es: string[];
  rel_en: string[];
  /** Diagram variant for the articulatory illustration. */
  viz: string;
}

export const PHONEMES: readonly PhonemeOfDay[] = [
  {
    "id": "theta",
    "symbol": "θ",
    "sound": "th",
    "ipa_es": "/θ/",
    "ipa_en": "/θ/",
    "name_es": "fricativa dental sorda",
    "name_en": "voiceless dental fricative",
    "ctx_es": "El sonido de «c» en cierta pronunciación: {cielo}, {zapato}.",
    "ctx_en": "The sound of «th» in English: {think}, {path}.",
    "why_es": "Es uno de los rasgos más estudiados del español: su realización varía [θ]~[s] según región (distinción y seseo).",
    "why_en": "One of the most studied Spanish features: its realisation varies [θ]~[s] by region (distinción and seseo).",
    "rel_es": [
      "sibilantes",
      "seseo",
      "ceceo"
    ],
    "rel_en": [
      "sibilants",
      "seseo",
      "ceceo"
    ],
    "viz": "dental"
  },
  {
    "id": "schwa",
    "symbol": "ə",
    "sound": "uh",
    "ipa_es": "/ə/",
    "ipa_en": "/ə/",
    "name_es": "vocal neutra (schwa)",
    "name_en": "mid central vowel (schwa)",
    "ctx_es": "En inglés átono: {about}, {sofa}. En español solo en articulación relajada.",
    "ctx_en": "Unstressed English: {about}, {sofa}. In Spanish only in casual speech.",
    "why_es": "La vocal más frecuente del mundo: aparece en casi todas las lenguas en posición átona.",
    "why_en": "The most frequent vowel worldwide: it appears in almost every language unstressed.",
    "rel_es": [
      "reducción vocálica",
      "átono"
    ],
    "rel_en": [
      "vowel reduction",
      "unstressed"
    ],
    "viz": "vowel"
  },
  {
    "id": "ng",
    "symbol": "ŋ",
    "sound": "ng",
    "ipa_es": "/ŋ/",
    "ipa_en": "/ŋ/",
    "name_es": "nasal velar sonora",
    "name_en": "voiced velar nasal",
    "ctx_es": "Final de sílaba: {canto} [ˈkanto], y en inglés {sing} [sɪŋ].",
    "ctx_en": "Syllable-final: {sing} [sɪŋ], Spanish {canto} [ˈkanto].",
    "why_es": "Existe en español solo como alófono ante /k, g/: «banco» [ˈbanko]. Es un caso claro de alofonía condicionada.",
    "why_en": "In Spanish only as an allophone before /k, g/: «banco» [ˈbanko]. A clear case of conditioned alophony.",
    "rel_es": [
      "nasales",
      "alófono",
      "catalanismo"
    ],
    "rel_en": [
      "nasals",
      "allophone",
      "velar"
    ],
    "viz": "nasal"
  },
  {
    "id": "tap",
    "symbol": "ɾ",
    "sound": "rr",
    "ipa_es": "/ɾ/",
    "ipa_en": "/ɾ/",
    "name_es": "vibrante simple",
    "name_en": "tap",
    "ctx_es": "La «r» intervocálica: {caro} [ˈkaɾo] frente a {carro} [ˈkaro].",
    "ctx_en": "Intervocalic Spanish «r»: {caro} [ˈkaɾo] vs {carro} [ˈkaro].",
    "why_es": "Contrasta con la vibrante múltiple /r/: {caro} vs {carro}. Un mínimo fonémico clásico.",
    "why_en": "Contrasts with the trill /r/: {caro} vs {carro}. A classic phonemic minimal pair.",
    "rel_es": [
      "vibrantes",
      "mínimo fonémico"
    ],
    "rel_en": [
      "rhotics",
      "minimal pair"
    ],
    "viz": "liquid"
  },
  {
    "id": "tsh",
    "symbol": "tʃ",
    "sound": "ch",
    "ipa_es": "/tʃ/",
    "ipa_en": "/tʃ/",
    "name_es": "africada post-alveolar sorda",
    "name_en": "voiceless post-alveolar affricate",
    "ctx_es": "La «ch» de {chico} [ˈtʃiko].",
    "ctx_en": "The «ch» of {chair} [tʃɛə].",
    "why_es": "Fonema en español y catalán, pero no en portugués: buena entrada al estudio contrastivo.",
    "why_en": "A phoneme in Spanish and Catalan, but not Portuguese: a good entry into contrastive study.",
    "rel_es": [
      "africadas",
      "contrastivo"
    ],
    "rel_en": [
      "affricates",
      "contrastive"
    ],
    "viz": "affricate"
  }
];

/**
 * Pick the entry for a given day, deterministically and without bias.
 * Days since the Unix epoch keep the rotation stable across reloads.
 */
export function phonemeForDate(date: Date): PhonemeOfDay {
  const day = Math.floor(date.getTime() / 86_400_000);
  const index = ((day % PHONEMES.length) + PHONEMES.length) % PHONEMES.length;
  // PHONEMES is non-empty by construction, but guard anyway.
  return PHONEMES[index] ?? PHONEMES[0]!;
}

/** Highlight {target} words in a context sentence. */
export function markContext(sentence: string): { word: string; hit: boolean }[] {
  return sentence.split(/({[^}]*})/g).map((chunk) => {
    const hit = chunk.startsWith("{") && chunk.endsWith("}");
    return { word: hit ? chunk.slice(1, -1) : chunk, hit };
  });
}
