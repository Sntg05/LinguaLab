/* ============================================================
   LinguaLab — etiquetado POS: lo que se decide sin DOM

   Cómo se parte el texto antes de etiquetarlo, cómo se resumen y se exportan
   las etiquetas, y cómo se llama cada categoría para un estudiante.
   ============================================================ */

import { tokenizeDetailed } from "../tools/tokenize";

export interface TaggableToken {
  readonly text: string;
  /** Si la palabra salió de separar una contracción («del» → «de» + «el»). */
  readonly contraction?: string;
}

/**
 * AnCora analiza «del» como «de» + «el» y «al» como «a» + «el», y el modelo
 * aprendió con esas palabras: se separan igual antes de etiquetar. Se conserva
 * la mayúscula inicial («Del» → «De» + «el»).
 */
const SPANISH_CONTRACTIONS: Readonly<Record<string, readonly [string, string]>> = {
  del: ["de", "el"],
  al: ["a", "el"],
};

export const splitForTagging = (text: string, language: string): TaggableToken[] =>
  tokenizeDetailed(text, { includeNonWords: true }).tokens.flatMap((token): TaggableToken[] => {
    const parts = language === "es" ? SPANISH_CONTRACTIONS[token.text.toLowerCase()] : undefined;
    if (parts === undefined) return [{ text: token.text }];
    const first = /^\p{Lu}/u.test(token.text) ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : parts[0];
    return [
      { text: first, contraction: token.text },
      { text: parts[1], contraction: token.text },
    ];
  });

export interface TagCount {
  readonly tag: string;
  readonly count: number;
  readonly share: number;
}

/** Cuántas veces sale cada categoría, de mayor a menor (empates, por nombre). */
export const tagSummary = (tags: readonly string[]): TagCount[] => {
  const counts = new Map<string, number>();
  for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count, share: count / tags.length }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : 1));
};

const csvCell = (value: string): string => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

export const posRowsToCsv = (rows: readonly { readonly word: string; readonly tag: string }[]): string =>
  `word,upos\n${rows.map((row) => `${csvCell(row.word)},${csvCell(row.tag)}`).join("\n")}\n`;

/** Los nombres de las 17 categorías de UD (universaldependencies.org/u/pos/). */
const NAMES: Readonly<Record<string, readonly [string, string]>> = {
  ADJ: ["adjetivo", "adjective"],
  ADP: ["adposición (preposición)", "adposition (preposition)"],
  ADV: ["adverbio", "adverb"],
  AUX: ["verbo auxiliar", "auxiliary verb"],
  CCONJ: ["conjunción coordinante", "coordinating conjunction"],
  DET: ["determinante", "determiner"],
  INTJ: ["interjección", "interjection"],
  NOUN: ["sustantivo", "noun"],
  NUM: ["numeral", "numeral"],
  PART: ["partícula", "particle"],
  PRON: ["pronombre", "pronoun"],
  PROPN: ["nombre propio", "proper noun"],
  PUNCT: ["puntuación", "punctuation"],
  SCONJ: ["conjunción subordinante", "subordinating conjunction"],
  SYM: ["símbolo", "symbol"],
  VERB: ["verbo", "verb"],
  X: ["otro", "other"],
};

export const uposName = (tag: string, locale: "es" | "en"): string =>
  NAMES[tag]?.[locale === "es" ? 0 : 1] ?? tag;
