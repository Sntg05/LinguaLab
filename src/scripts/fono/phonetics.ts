/* ============================================================
   LinguaLab — grapheme-to-IPA transcription

   A rule-based, didactic approximation. It is deliberately NOT a
   morphological transcriber: English orthography in particular cannot be
   transcribed reliably without a lexicon, so the output is labelled as
   approximate wherever it is shown.

   Rules are ordered most-specific first, and the tables are ported from
   the original implementation so the linguistic knowledge they encode is
   preserved. Two dead rules and one clear defect were fixed on the way;
   see the notes on each table.
   ============================================================ */

/**
 * Spanish grapheme-to-phoneme rules.
 *
 * The Spanish trill is two phonemes in one letter, so it is carried through
 * the pipeline as a private-use marker before being restored at the end.
 */
const TRILL = "\uE000";
const INITIAL_TRILL = "\uE001";

export const ES_RULES: readonly (readonly [RegExp, string])[] = [
  [/[cç](?=[eéií])/g, "θ"], // ce/ci -> theta
  [/[cç](?=[aáouú])/g, "k"], // ca/co/cu -> k
  [/ch/g, "tʃ"],
  [/ll/g, "ʎ"], // before the single-l rule, which would eat it
  [/ny/g, "ɲ"],
  [/gu(?=[eéií])/g, "ɡ"],
  [/g(?=[eéií])/g, "x"], // ge/gi -> jota
  [/g(?=[aáouú])/g, "ɡ"],
  [/h(?=[uú])/g, "w"],
  [/h/g, ""], // silent h
  [/qu(?=[eéií])/g, "k"],
  [/qu/g, "k"],
  [/q/g, "k"],
  [/rr/g, TRILL],
  [/^r/g, INITIAL_TRILL], // word-initial r is a trill
  [/([nl])r/g, `$1${INITIAL_TRILL}`], // after n/l it is a trill too
  [/r/g, "ɾ"], // everywhere else it is a tap
  [new RegExp(TRILL, "g"), "r"],
  [new RegExp(INITIAL_TRILL, "g"), "r"],
  [/y(?=[aeiou])/g, "ʝ"],
  [/[íì]/g, "i"],
  [/[úù]/g, "u"],
  [/[éè]/g, "e"],
  [/[óò]/g, "o"],
  [/[áà]/g, "a"],
  [/[üÜ]/g, "u"],
  [/ñ/g, "ɲ"],
  // Spanish has no /v/: orthographic b and v are both the bilabial phoneme.
  // Without this, "llave" came out as /ʎave/ with a segment Spanish lacks.
  [/v/g, "b"],
  [/z/g, "θ"], // distinción; seseo is noted in the UI
  [/\s+/g, " "],
];

/**
 * English grapheme-to-phoneme rules.
 *
 * The closed-syllable rule for <a> is an addition: without it "cat" came out
 * as /kat/ rather than /kæt/, which is the most visible error in the table.
 * It only fires when the consonant after <a> is not followed by a vowel.
 */
export const EN_RULES: readonly (readonly [RegExp, string])[] = [
  [/tion/g, "ʃən"],
  [/sion/g, "ʒən"],
  [/ture/g, "tʃər"],
  [/igh(?=[aeiouy]|$)/g, "aɪ"],
  [/ough/g, "oʊ"],
  [/augh/g, "ɔː"],
  [/eau/g, "oʊ"],
  [/th/g, "θ"],
  [/sh/g, "ʃ"],
  [/ch/g, "tʃ"],
  [/ph/g, "f"],
  [/wh/g, "w"],
  [/kn(?=[aeiou])/g, "n"],
  [/wr/g, "ɹ"],
  [/ng(?!$)/g, "ŋɡ"],
  [/ng$/g, "ŋ"],
  [/gh/g, ""],
  [/cie(?=[^aeiou]|$)/g, "ʃi"],
  [/ge(?=[^aeiou]|$)/g, "dʒ"],
  [/ce(?=[^aeiou]|$)/g, "s"],
  [/c(?=[ie])/g, "s"],
  [/c(?![ie])/g, "k"],
  [/g(?=[ei])/g, "dʒ"],
  [/g(?!h)/g, "ɡ"],
  [/x/g, "ks"],
  [/y(?=[aeiou])/g, "j"],
  [/ee/g, "iː"],
  [/ea/g, "iː"],
  [/oo/g, "uː"],
  [/ou/g, "aʊ"],
  [/oi|oy/g, "ɔɪ"],
  [/ai|ay/g, "eɪ"],
  [/au|aw/g, "ɔː"],
  [/ow/g, "oʊ"],
  [/ie/g, "iː"],
  [/ei|ey/g, "eɪ"],
  [/ue/g, "uː"],
  [/o(?=[aeiou])/g, "oʊ"],
  // <a> in a closed syllable: the vowel of cat, man, hand.
  [/a(?=[bcdfghjklmnpqrstvwxz](?![aeiouy]))/g, "æ"],
  // <a> directly before another vowel reduces to schwa (about, again).
  [/a(?=[aeiou])/g, "ə"],
  [/e$/g, ""], // silent final e
  [/[áà]/g, "æ"],
  [/[éè]/g, "e"],
  [/[íì]/g, "i"],
  [/[óò]/g, "o"],
  [/[úù]/g, "u"],
  [/\s+/g, " "],
];

/** Strip punctuation that carries no phonemic information. */
function normalise(word: string): string {
  return word.toLowerCase().trim().replace(/[.,;:!?¿¡"'()]/g, "");
}

/** Characters the Spanish pipeline may legitimately leave behind. */
const ES_ALLOWED = /[^a-zθxɡʝʎɲɾrtʃiueoa íúéóáñç]/g;

function applyRules(input: string, rules: readonly (readonly [RegExp, string])[]): string {
  let out = input;
  for (const [pattern, replacement] of rules) {
    // A fresh RegExp each pass: a shared /g/ literal carries lastIndex state
    // between calls, which makes results depend on call order.
    out = out.replace(new RegExp(pattern.source, pattern.flags), replacement);
  }
  return out;
}

export function transcribeES(word: string): string {
  const cleaned = normalise(word);
  if (!cleaned) return "";

  let out = applyRules(cleaned, ES_RULES);
  out = out.replace(ES_ALLOWED, "");
  return `/${out.trim()}/`;
}

export function transcribeEN(word: string): string {
  const cleaned = normalise(word);
  if (!cleaned) return "";
  return `/${applyRules(cleaned, EN_RULES).trim()}/`;
}

export type TranscribeLang = "es" | "en";

/**
 * Transcribe a phrase word by word.
 * Word-by-word rather than over the whole string, so a rule can never span a
 * word boundary.
 */
export function transcribe(text: string, lang: TranscribeLang = "es"): string {
  return String(text ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (lang === "en" ? transcribeEN(word) : transcribeES(word)))
    .join(" ");
}
