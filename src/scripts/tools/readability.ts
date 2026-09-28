/* ============================================================
   LinguaLab — readability and syllabification

   Spanish syllables are counted with vowel-strength rules that
   distinguish diphthongs from hiatus. English syllables are an
   intentional approximation documented as such.

   Readability indices are computed with their standard published
   formulas. Every ratio is guarded so empty input never produces
   NaN or Infinity.
   ============================================================ */

import { splitSentences } from "./tokenize";

/** Vowels recognised by the Spanish syllabifier. */
const ES_VOWELS = "aeiouáéíóúü";

/** Strong vowels: a, e, o and their accented forms. */
const ES_STRONG = "aeoáéó";

/** Accented weak vowels: í, ú. These force a hiatus. */
const ES_WEAK_ACCented = "íú";

/** English vowels including y, which frequently acts as a vowel. */
const EN_VOWELS = "aeiouy";




/** Bilingual label for an interpretation band. */
export interface BandLabel {
  es: string;
  en: string;
}

/** Score plus human-readable band for a single readability index. */
export interface IndexResult {
  score: number;
  band: BandLabel;
}

/** Complete readability analysis for a text. */
export interface ReadabilityResult {
  counts: {
    sentences: number;
    words: number;
    syllables: number;
    syllablesPerWord: number;
    wordsPerSentence: number;
  };
  spanish: {
    fernandezHuerta: IndexResult;
    szigrisztPazos: IndexResult;
    gutierrezDePolini: IndexResult;
    inflesz: IndexResult;
  };
  english: {
    fleschReadingEase: IndexResult;
    fleschKincaidGrade: IndexResult;
    gunningFog: IndexResult;
    smog: IndexResult;
    ari: IndexResult;
    colemanLiau: IndexResult;
  };
}

/* ---------- Helpers ---------- */

function isVowelES(ch: string): boolean {
  return ES_VOWELS.includes(ch);
}

function isStrongVowel(ch: string): boolean {
  return ES_STRONG.includes(ch);
}

function isWeakAccented(ch: string): boolean {
  return ES_WEAK_ACCented.includes(ch);
}

function extractWords(text: string): string[] {
  const m = text.match(/[a-záéíóúüñ0-9'’-]+/gi);
  if (!m) return [];
  return m.filter((w) => /[a-záéíóúüñ]/i.test(w));
}

function countLetters(text: string): number {
  const m = text.match(/[a-záéíóúüñ]/gi);
  return m ? m.length : 0;
}

/**
 * Sentence counting is delegated to the tokenizer, which segments with
 * abbreviation handling and offsets. Keeping a second implementation here
 * would let the two drift, and a readability score is only as good as its
 * sentence count.
 */
function countSentences(text: string): number {
  return splitSentences(text).length;
}

/* ---------- Band helpers ---------- */

function fleschBand(score: number): BandLabel {
  if (score >= 90) return { es: "Muy fácil", en: "Very easy" };
  if (score >= 80) return { es: "Fácil", en: "Easy" };
  if (score >= 70) return { es: "Bastante fácil", en: "Fairly easy" };
  if (score >= 60) return { es: "Normal", en: "Standard" };
  if (score >= 50) return { es: "Bastante difícil", en: "Fairly difficult" };
  if (score >= 30) return { es: "Difícil", en: "Difficult" };
  return { es: "Muy difícil", en: "Very difficult" };
}

function gradeBand(score: number): BandLabel {
  if (score <= 5) return { es: "Primaria", en: "Elementary school" };
  if (score <= 8) return { es: "ESO", en: "Middle school" };
  if (score <= 12) return { es: "Bachillerato", en: "High school" };
  if (score <= 16) return { es: "Grado universitario", en: "Undergraduate" };
  return { es: "Posgrado", en: "Graduate" };
}

function gutierrezDePoliniBand(score: number): BandLabel {
  if (score >= 75) return { es: "Muy fácil", en: "Very easy" };
  if (score >= 65) return { es: "Fácil", en: "Easy" };
  if (score >= 55) return { es: "Medio", en: "Medium" };
  if (score >= 45) return { es: "Difícil", en: "Difficult" };
  return { es: "Muy difícil", en: "Very difficult" };
}

function infleszBand(score: number): BandLabel {
  if (score >= 80) return { es: "Muy fácil", en: "Very easy" };
  if (score >= 65) return { es: "Fácil", en: "Easy" };
  if (score >= 50) return { es: "Medio", en: "Medium" };
  if (score >= 35) return { es: "Difícil", en: "Difficult" };
  return { es: "Muy difícil", en: "Very difficult" };
}

/* ---------- Syllabifiers ---------- */

/**
 * Count syllables in a Spanish word using vowel-strength rules.
 *
 * Vowels are split into STRONG (a, e, o, and accented á é ó) and
 * WEAK (i, u, and accented í ú; ü is weak).
 *
 * Rules implemented:
 * 1. A sequence of vowels forms one syllable when it contains at least
 *    one weak vowel and no two strong vowels are adjacent.
 * 2. Two adjacent strong vowels are a hiatus → two syllables.
 * 3. An accented weak vowel (í, ú) forces a hiatus.
 * 4. `h` between vowels is transparent and does not block a diphthong.
 * 5. Every word has at least one syllable.
 *
 * Note: the letter `y` is treated as a consonant, which may undercount
 * words such as "Uruguay" where `y` functions as a vowel.
 */
export function syllablesES(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñh]/g, "");
  if (!w) return 0;

  const groups: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    if (ch === undefined) continue;

    if (isVowelES(ch)) {
      current.push(ch);
    } else if (ch === "h" && current.length > 0) {
      const next = w[i + 1];
      if (next !== undefined && isVowelES(next)) {
        // h between vowels is transparent; skip it.
        continue;
      }
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
    } else {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
    }
  }

  if (current.length > 0) {
    groups.push(current);
  }

  let count = 0;
  for (const group of groups) {
    if (group.length <= 1) {
      count += 1;
      continue;
    }

    let splits = 0;
    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i];
      const b = group[i + 1];
      if (a === undefined || b === undefined) continue;

      if (isStrongVowel(a) && isStrongVowel(b)) {
        splits += 1;
      } else if (isWeakAccented(a) || isWeakAccented(b)) {
        splits += 1;
      }
    }
    count += 1 + splits;
  }

  return Math.max(1, count);
}

/**
 * Approximate English syllable count.
 *
 * English has no reliable rule-based syllabifier. This implementation
 * counts vowel groups, subtracts one for a silent final `e` when the
 * word has more than one vowel group and does not end in `le` preceded
 * by a consonant, and does not count a final `es`/`ed` as a syllable
 * when the `e` is silent (i.e. when the preceding sound is not one that
 * makes the `e` syllabic: t/d for `-ed`, or s/z/x/ch/sh for `-es`).
 *
 * The result is an approximation and will be wrong for many words.
 */
export function syllablesEN(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;

  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;

  const hasFinalE = /e[ds]?$/.test(w);
  if (count > 1 && hasFinalE) {
    const beforeE = w[w.length - 2];
    const isConsonantLE =
      beforeE !== undefined &&
      !EN_VOWELS.includes(beforeE) &&
      w.endsWith("le");

    if (!isConsonantLE) {
      if (w.endsWith("es") || w.endsWith("ed")) {
        const preceding = w[w.length - 3];
        const isSyllabicED =
          w.endsWith("ed") && preceding !== undefined && /[td]/.test(preceding);
        const isSyllabicES =
          w.endsWith("es") && preceding !== undefined && /[szx]/.test(preceding);
        const isDigraphBeforeES =
          w.endsWith("es") &&
          (w.endsWith("ches") || w.endsWith("shes") || w.endsWith("xes"));

        if (!isSyllabicED && !isSyllabicES && !isDigraphBeforeES) {
          count -= 1;
        }
      } else {
        count -= 1;
      }
    }
  }

  return Math.max(1, count);
}

/** Dispatch to the language-appropriate syllabifier. */
export function syllables(word: string, lang: "es" | "en"): number {
  return lang === "en" ? syllablesEN(word) : syllablesES(word);
}

/* ---------- Readability ---------- */

/**
 * Compute readability indices for a text.
 *
 * Spanish indices: Fernández-Huerta, Szigriszt-Pazos, Gutiérrez de Polini,
 * INFLESZ. INFLESZ shares the Szigriszt-Pazos score and differs only in the
 * interpretation bands, which are calibrated on a Spanish population.
 *
 * English indices: Flesch Reading Ease, Flesch–Kincaid Grade, Gunning Fog,
 * SMOG, Automated Readability Index, Coleman–Liau.
 *
 * Sentence counting splits on `.`, `!`, `?`, `…` and treats `¿`/`¡` as
 * openers. Abbreviations such as `etc.`, `Sr.`, `Dr.`, `p.ej.` are not
 * counted as sentence ends.
 *
 * Empty or whitespace-only input returns zero for all counts and scores.
 */
export function readability(text: string, lang: "es" | "en"): ReadabilityResult {
  const words = extractWords(text);
  const wordCount = words.length;
  const sentenceCount = countSentences(text);

  if (wordCount === 0) {
    const zeroBand = { es: "—", en: "—" };
    return {
      counts: {
        sentences: 0,
        words: 0,
        syllables: 0,
        syllablesPerWord: 0,
        wordsPerSentence: 0,
      },
      spanish: {
        fernandezHuerta: { score: 0, band: zeroBand },
        szigrisztPazos: { score: 0, band: zeroBand },
        gutierrezDePolini: { score: 0, band: zeroBand },
        inflesz: { score: 0, band: zeroBand },
      },
      english: {
        fleschReadingEase: { score: 0, band: zeroBand },
        fleschKincaidGrade: { score: 0, band: zeroBand },
        gunningFog: { score: 0, band: zeroBand },
        smog: { score: 0, band: zeroBand },
        ari: { score: 0, band: zeroBand },
        colemanLiau: { score: 0, band: zeroBand },
      },
    };
  }

  const safeSentences = Math.max(1, sentenceCount);
  const safeWords = Math.max(1, wordCount);

  const syllableFn = lang === "en" ? syllablesEN : syllablesES;
  const syllableCount = words.reduce((sum, w) => sum + syllableFn(w), 0);

  const syllablesPerWord = syllableCount / wordCount;
  const wordsPerSentence = wordCount / safeSentences;
  const letters = countLetters(text);
  const lettersPerWord = letters / wordCount;

  const wOverS = wordCount / safeSentences;
  const sOverW = syllableCount / safeWords;

  // Spanish indices
  const fernandezHuerta = 206.835 - 1.02 * wOverS - 60.265 * sOverW;
  const szigrisztPazos = 206.835 - 62.3 * sOverW - wOverS;
  const gutierrezDePolini =
    95.2 - 9.7 * sOverW - 0.35 * wOverS - 2.85 * lettersPerWord;
  // INFLESZ (Barrio-Cantalejo et al., 2008) is the Szigriszt-Pazos score read
  // against Spanish population bands — it is not a separate formula. The
  // previous implementation used a rescaling that put ordinary prose in the
  // "very difficult" band, contradicting its own Szigriszt-Pazos figure.
  const inflesz = szigrisztPazos;

  // English indices
  const fleschReadingEase = 206.835 - 1.015 * wOverS - 84.6 * sOverW;
  const fleschKincaidGrade = 0.39 * wOverS + 11.8 * sOverW - 15.59;

  const complexWords = words.filter((w) => syllableFn(w) >= 3).length;
  const gunningFog = 0.4 * (wOverS + 100 * (complexWords / safeWords));

  const smog = 1.043 * Math.sqrt(complexWords * (30 / safeSentences)) + 3.1291;
  const ari = 4.71 * lettersPerWord + 0.5 * wOverS - 21.43;
  const colemanLiau = 5.88 * lettersPerWord - 29.6 * (safeSentences / safeWords) - 15.8;

  const clean = (n: number): number => (Number.isFinite(n) ? n : 0);

  return {
    counts: {
      sentences: sentenceCount,
      words: wordCount,
      syllables: syllableCount,
      syllablesPerWord: clean(syllablesPerWord),
      wordsPerSentence: clean(wordsPerSentence),
    },
    spanish: {
      fernandezHuerta: {
        score: clean(fernandezHuerta),
        band: fleschBand(clean(fernandezHuerta)),
      },
      szigrisztPazos: {
        score: clean(szigrisztPazos),
        band: fleschBand(clean(szigrisztPazos)),
      },
      gutierrezDePolini: {
        score: clean(gutierrezDePolini),
        band: gutierrezDePoliniBand(clean(gutierrezDePolini)),
      },
      inflesz: {
        score: clean(inflesz),
        band: infleszBand(clean(inflesz)),
      },
    },
    english: {
      fleschReadingEase: {
        score: clean(fleschReadingEase),
        band: fleschBand(clean(fleschReadingEase)),
      },
      fleschKincaidGrade: {
        score: clean(fleschKincaidGrade),
        band: gradeBand(clean(fleschKincaidGrade)),
      },
      gunningFog: {
        score: clean(gunningFog),
        band: gradeBand(clean(gunningFog)),
      },
      smog: {
        score: clean(smog),
        band: gradeBand(clean(smog)),
      },
      ari: {
        score: clean(ari),
        band: gradeBand(clean(ari)),
      },
      colemanLiau: {
        score: clean(colemanLiau),
        band: gradeBand(clean(colemanLiau)),
      },
    },
  };
}
