/* ============================================================
   LinguaLab — etiquetado POS: lo que se decide sin DOM

   Cómo se parte el texto antes de etiquetarlo, cómo se resumen y se exportan
   las etiquetas, y cómo se llama cada categoría para un estudiante.
   ============================================================ */


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

/**
 * Una palabra (con apóstrofos y guiones internos), un número con su coma o
 * punto decimal, o un signo suelto. Se tokeniza aquí y no con la estación,
 * porque la estación cuenta palabras y aquí cada signo es una fila etiquetada:
 * un apóstrofo interno no puede volver a salir como palabra aparte.
 */
const TOKEN = /\d+(?:[.,]\d+)+|[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*|[^\s\p{L}\p{M}\p{N}]/gu;

/**
 * EWT separa los clíticos del inglés: «don't» → «do» + «n't», «can't» →
 * «ca» + «n't», «John's» → «John» + «'s». El modelo aprendió así.
 */
const splitEnglishClitic = (word: string): string[] => {
  const normal = word.replace("’", "'");
  const negation = /^(.+)(n't)$/i.exec(normal);
  if (negation?.[1] !== undefined && negation[2] !== undefined) return [negation[1], negation[2]];
  const clitic = /^(.+)('(?:s|m|re|ve|ll|d))$/i.exec(normal);
  if (clitic?.[1] !== undefined && clitic[2] !== undefined) return [clitic[1], clitic[2]];
  return [word];
};

export const splitForTagging = (text: string, language: string): TaggableToken[] =>
  [...text.matchAll(TOKEN)].flatMap(([word]): TaggableToken[] => {
    if (language === "en") {
      const parts = splitEnglishClitic(word);
      return parts.length === 1 ? [{ text: word }] : parts.map((part) => ({ text: part, contraction: word }));
    }
    const parts = language === "es" ? SPANISH_CONTRACTIONS[word.toLowerCase()] : undefined;
    if (parts === undefined) return [{ text: word }];
    const first = /^\p{Lu}/u.test(word) ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : parts[0];
    return [
      { text: first, contraction: word },
      { text: parts[1], contraction: word },
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
