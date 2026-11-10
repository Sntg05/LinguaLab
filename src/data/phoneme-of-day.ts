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
    "ctx_es": "La «z» y la «c» ante e, i en el centro y el norte de España: {zapato} [θaˈpato], {cielo} [ˈθjelo].",
    "ctx_en": "English «th» in {think} [θɪŋk] and {path} [pæθ].",
    "why_es": "Es uno de los rasgos más estudiados del español: la distinción entre [θ] y [s] es peninsular, y en Colombia, como en toda América, se usa [s] (seseo).",
    "why_en": "One of the most studied Spanish features: the [θ]–[s] distinction is Peninsular, while Colombia, like all of Latin America, uses [s] (seseo).",
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
    "name_es": "vocal media central (schwa)",
    "name_en": "mid central vowel (schwa)",
    "ctx_es": "En inglés, en sílabas átonas: {about} [əˈbaʊt], {sofa} [ˈsoʊfə].",
    "ctx_en": "Unstressed English syllables: {about} [əˈbaʊt], {sofa} [ˈsoʊfə].",
    "why_es": "Es la vocal más frecuente del inglés y el resultado típico de la reducción vocálica. El español no la tiene como fonema: sus cinco vocales conservan en gran medida su timbre aunque sean átonas.",
    "why_en": "It is the most frequent vowel in English and the typical result of vowel reduction. Spanish has no schwa phoneme: its five vowels largely keep their quality even when unstressed.",
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
    "ctx_es": "La «n» ante consonante velar: {banco} [ˈbaŋko], {tengo} [ˈteŋɡo]; en inglés, {sing} [sɪŋ].",
    "ctx_en": "Spanish «n» before a velar: {banco} [ˈbaŋko], {tengo} [ˈteŋɡo]; English {sing} [sɪŋ].",
    "why_es": "En inglés es fonema ({sin} frente a {sing}); en español es el alófono de /n/ ante velar, y en la costa caribe colombiana aparece también a final de palabra: «pan» [paŋ].",
    "why_en": "In English it is a phoneme ({sin} vs {sing}); in Spanish it is the allophone of /n/ before a velar, and on the Colombian Caribbean coast it also appears word-finally: «pan» [paŋ].",
    "rel_es": [
      "nasales",
      "alófono",
      "asimilación"
    ],
    "rel_en": [
      "nasals",
      "allophone",
      "assimilation"
    ],
    "viz": "nasal"
  },
  {
    "id": "tap",
    "symbol": "ɾ",
    "sound": "r",
    "ipa_es": "/ɾ/",
    "ipa_en": "/ɾ/",
    "name_es": "vibrante simple alveolar",
    "name_en": "alveolar tap",
    "ctx_es": "La «r» entre vocales: {caro} [ˈkaɾo], {pero} [ˈpeɾo].",
    "ctx_en": "Spanish «r» between vowels: {caro} [ˈkaɾo]; American English «tt» in {butter} [ˈbʌɾɚ].",
    "why_es": "Contrasta con la vibrante múltiple /r/ solo entre vocales: {caro} frente a {carro} es un par mínimo clásico.",
    "why_en": "It contrasts with the trill /r/ only between vowels: {caro} vs {carro} is a classic minimal pair.",
    "rel_es": [
      "vibrantes",
      "par mínimo"
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
    "name_es": "africada postalveolar sorda",
    "name_en": "voiceless postalveolar affricate",
    "ctx_es": "La «ch» de {chico} [ˈtʃiko] y {noche} [ˈnotʃe].",
    "ctx_en": "The «ch» of {cheese} [tʃiːz] and Spanish {chico} [ˈtʃiko].",
    "why_es": "En español es fonema. En portugués brasileño el mismo sonido es alófono de /t/ ante [i]: {tia} [ˈtʃiɐ]. Un mismo sonido puede tener distinto estatus fonológico.",
    "why_en": "In Spanish it is a phoneme. In Brazilian Portuguese the same sound is an allophone of /t/ before [i]: {tia} [ˈtʃiɐ]. One sound can have a different phonological status.",
    "rel_es": [
      "africadas",
      "alófono"
    ],
    "rel_en": [
      "affricates",
      "allophone"
    ],
    "viz": "affricate"
  },
  {
    "id": "enye",
    "symbol": "ɲ",
    "sound": "ny",
    "ipa_es": "/ɲ/",
    "ipa_en": "/ɲ/",
    "name_es": "nasal palatal sonora",
    "name_en": "voiced palatal nasal",
    "ctx_es": "La «ñ» de {año} [ˈaɲo] y {niño} [ˈniɲo].",
    "ctx_en": "Spanish «ñ» in {año} [ˈaɲo]; English {canyon} has the sequence [nj] instead.",
    "why_es": "Es fonema en español: {cana} frente a {caña} es un par mínimo. El inglés no lo tiene y lo aproxima con la secuencia [nj].",
    "why_en": "It is a Spanish phoneme: {cana} vs {caña} is a minimal pair. English lacks it and approximates it with the sequence [nj].",
    "rel_es": [
      "nasales",
      "palatal",
      "par mínimo"
    ],
    "rel_en": [
      "nasals",
      "palatal",
      "minimal pair"
    ],
    "viz": "nasal"
  },
  {
    "id": "jota",
    "symbol": "x",
    "sound": "kh",
    "ipa_es": "/x/",
    "ipa_en": "/x/",
    "name_es": "fricativa velar sorda",
    "name_en": "voiceless velar fricative",
    "ctx_es": "La «j», y la «g» ante e, i: {jamón} [xaˈmon], {gente} [ˈxente].",
    "ctx_en": "Spanish «j»: {jamón} [xaˈmon]; Scottish {loch} [lɔx].",
    "why_es": "En el Caribe y en buena parte de Colombia se realiza como glotal [h]: «jamón» [haˈmon]. Es la misma unidad fonológica con realizaciones regionales distintas.",
    "why_en": "In the Caribbean and much of Colombia it is realised as glottal [h]: «jamón» [haˈmon]. One phonological unit, different regional realisations.",
    "rel_es": [
      "fricativas",
      "variación dialectal"
    ],
    "rel_en": [
      "fricatives",
      "dialect variation"
    ],
    "viz": "dental"
  },
  {
    "id": "trill",
    "symbol": "r",
    "sound": "rr",
    "ipa_es": "/r/",
    "ipa_en": "/r/",
    "name_es": "vibrante múltiple alveolar sonora",
    "name_en": "voiced alveolar trill",
    "ctx_es": "La «rr» y la «r» inicial: {perro} [ˈpero], {rosa} [ˈrosa].",
    "ctx_en": "Spanish «rr» and word-initial «r»: {perro} [ˈpero], {rosa} [ˈrosa].",
    "why_es": "Solo contrasta con /ɾ/ entre vocales ({pero} frente a {perro}); a principio de palabra solo aparece la múltiple. Es un caso de neutralización.",
    "why_en": "It only contrasts with /ɾ/ between vowels ({pero} vs {perro}); word-initially only the trill occurs. A case of neutralisation.",
    "rel_es": [
      "vibrantes",
      "neutralización"
    ],
    "rel_en": [
      "rhotics",
      "neutralisation"
    ],
    "viz": "liquid"
  },
  {
    "id": "eth",
    "symbol": "ð",
    "sound": "dh",
    "ipa_es": "[ð]",
    "ipa_en": "[ð]",
    "name_es": "fricativa dental sonora",
    "name_en": "voiced dental fricative",
    "ctx_es": "La «d» entre vocales: {nada} [ˈnaða], {todo} [ˈtoðo].",
    "ctx_en": "English «th» in {this} [ðɪs] and {mother} [ˈmʌðɚ].",
    "why_es": "En español no es fonema sino alófono de /d/, más exactamente una aproximante [ð̞]. En inglés sí es fonema: {they} frente a {day}.",
    "why_en": "In Spanish it is not a phoneme but an allophone of /d/, more precisely an approximant [ð̞]. In English it is a phoneme: {they} vs {day}.",
    "rel_es": [
      "alófono",
      "lenición"
    ],
    "rel_en": [
      "allophone",
      "lenition"
    ],
    "viz": "dental"
  },
  {
    "id": "yeismo",
    "symbol": "ʝ",
    "sound": "y",
    "ipa_es": "/ʝ/",
    "ipa_en": "/ʝ/",
    "name_es": "fricativa palatal sonora",
    "name_en": "voiced palatal fricative",
    "ctx_es": "La «y» y, con yeísmo, la «ll»: {yo} [ʝo], {lluvia} [ˈʝuβja].",
    "ctx_en": "Spanish «y» and, with yeísmo, «ll»: {yo} [ʝo], {lluvia} [ˈʝuβja].",
    "why_es": "Con el yeísmo, mayoritario en Colombia y en casi todo el mundo hispanohablante, {haya} y {halla} suenan igual: dos grafías, un solo fonema.",
    "why_en": "With yeísmo, the majority pattern in Colombia and most of the Spanish-speaking world, {haya} and {halla} sound the same: two spellings, one phoneme.",
    "rel_es": [
      "yeísmo",
      "palatales"
    ],
    "rel_en": [
      "yeísmo",
      "palatals"
    ],
    "viz": "affricate"
  }
];

/**
 * Pick the entry for a given day, deterministically and without bias.
 * Days since the Unix epoch keep the rotation stable across reloads.
 */
/** Index of the entry for a given day, out of `length`, stable across reloads. */
export function dayIndex(date: Date, length: number): number {
  const day = Math.floor(date.getTime() / 86_400_000);
  return ((day % length) + length) % length;
}

export function phonemeForDate(date: Date): PhonemeOfDay {
  // PHONEMES is non-empty by construction, but guard anyway.
  return PHONEMES[dayIndex(date, PHONEMES.length)] ?? PHONEMES[0]!;
}

/** Highlight {target} words in a context sentence. */
export function markContext(sentence: string): { word: string; hit: boolean }[] {
  return sentence.split(/({[^}]*})/g).map((chunk) => {
    const hit = chunk.startsWith("{") && chunk.endsWith("}");
    return { word: hit ? chunk.slice(1, -1) : chunk, hit };
  });
}
