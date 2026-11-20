/* ============================================================
   LinguaLab — comparing two or three documents (S13)

   Pure functions over the station's own tokenizer, frequency list and lexical
   statistics: a word is the same word here as in the single-text tabs.

   - Each document against the others put together ("one against the rest"),
     the usual design when there is no external reference corpus: the
     keywords of a document are the words it uses more than the rest do.
   - Corpus sizes count every word, stopwords included; stopwords are only
     hidden from the lists. Removing them from the counts would change the
     relative frequencies the measures compare.
   ============================================================ */

import {
  type FrequencyEntry,
  type LexicalStats,
  frequency,
  kwic,
  statistics,
  type Concordance,
} from "./analysis";
import { chiSquareOneDfUpperTail, logLikelihood, logRatio } from "./keyness";
import { type StopwordMode, type Token, isStopword, tokenizeDetailed } from "./tokenize";

export interface CorpusDocument {
  readonly name: string;
  readonly text: string;
}

export interface PreparedDocument {
  readonly name: string;
  readonly tokens: readonly Token[];
  readonly sentences: number;
  /** Every word, stopwords included: the denominator of every relative frequency. */
  readonly size: number;
  readonly counts: ReadonlyMap<string, number>;
  readonly entries: readonly FrequencyEntry[];
}

export const prepareDocument = (document: CorpusDocument): PreparedDocument => {
  const { tokens, sentences } = tokenizeDetailed(document.text);
  const entries = frequency(tokens, { stopwords: "none" });
  return {
    name: document.name,
    tokens,
    sentences: sentences.length,
    size: tokens.length,
    counts: new Map(entries.map((entry) => [entry.word, entry.count])),
    entries,
  };
};

/** Occurrences per 10 000 words, the unit that makes documents of different lengths comparable. */
export const perTenThousand = (count: number, size: number): number =>
  size === 0 ? 0 : (count / size) * 10_000;

/* ---------------------------------------------------------------
   Keywords: one document against the rest
   --------------------------------------------------------------- */

export interface Keyword {
  readonly word: string;
  readonly display: string;
  /** Occurrences in this document and in the rest. */
  readonly here: number;
  readonly rest: number;
  readonly herePer10k: number;
  readonly restPer10k: number;
  readonly g2: number;
  readonly p: number;
  readonly logRatio: number;
}

export interface KeywordOptions {
  readonly stopwords: StopwordMode;
  /** Words seen fewer times than this, across all documents, are not tested. */
  readonly minCount: number;
  /** Rows kept per direction. */
  readonly limit: number;
  /** Only words with p below this are listed. */
  readonly alpha: number;
}

export interface KeywordList {
  /** Used more here than in the rest. */
  readonly positive: readonly Keyword[];
  /** Used less here than in the rest. */
  readonly negative: readonly Keyword[];
  /** How many words were tested: what a stricter threshold would correct for. */
  readonly tested: number;
}

const byStrength = (left: Keyword, right: Keyword): number =>
  right.g2 - left.g2 || (left.word < right.word ? -1 : left.word > right.word ? 1 : 0);

/** The most frequent spelling of each word, looking first in the target document. */
const displayForms = (documents: readonly PreparedDocument[]): Map<string, string> => {
  const display = new Map<string, string>();
  for (const document of documents) {
    for (const entry of document.entries) {
      if (!display.has(entry.word)) display.set(entry.word, entry.display);
    }
  }
  return display;
};

const keywordRow = (
  word: string,
  display: string,
  [here, rest]: readonly [number, number],
  [size, restSize]: readonly [number, number],
): Keyword => {
  const g2 = logLikelihood(here, rest, size, restSize);
  return {
    word,
    display,
    here,
    rest,
    herePer10k: perTenThousand(here, size),
    restPer10k: perTenThousand(rest, restSize),
    g2,
    p: chiSquareOneDfUpperTail(g2),
    logRatio: logRatio(here, rest, size, restSize),
  };
};

export const keywords = (
  documents: readonly PreparedDocument[],
  index: number,
  options: KeywordOptions,
): KeywordList => {
  const target = documents[index];
  if (target === undefined) return { positive: [], negative: [], tested: 0 };
  const others = documents.filter((_, at) => at !== index);
  const sizes = [target.size, others.reduce((sum, document) => sum + document.size, 0)] as const;

  const positive: Keyword[] = [];
  const negative: Keyword[] = [];
  let tested = 0;
  for (const [word, display] of displayForms([target, ...others])) {
    const here = target.counts.get(word) ?? 0;
    const rest = others.reduce((sum, document) => sum + (document.counts.get(word) ?? 0), 0);
    if (isStopword(word, options.stopwords) || here + rest < options.minCount) continue;
    tested += 1;
    const row = keywordRow(word, display, [here, rest], sizes);
    if (row.p >= options.alpha) continue;
    (row.herePer10k >= row.restPer10k ? positive : negative).push(row);
  }
  return {
    positive: positive.sort(byStrength).slice(0, options.limit),
    negative: negative.sort(byStrength).slice(0, options.limit),
    tested,
  };
};

/* ---------------------------------------------------------------
   Vocabulary: what the documents share and what only one has
   --------------------------------------------------------------- */

export interface VocabularyComparison {
  /** Words (types) every document uses, by combined frequency. */
  readonly shared: readonly string[];
  /** Words only this document uses, by frequency, one list per document. */
  readonly unique: readonly (readonly string[])[];
  /** Jaccard similarity of each pair of vocabularies: |A ∩ B| / |A ∪ B|. */
  readonly jaccard: readonly { readonly left: number; readonly right: number; readonly value: number }[];
}

const vocabularyOf = (document: PreparedDocument, mode: StopwordMode): Set<string> =>
  new Set([...document.counts.keys()].filter((word) => !isStopword(word, mode)));

export const compareVocabulary = (
  documents: readonly PreparedDocument[],
  stopwords: StopwordMode,
): VocabularyComparison => {
  const sets = documents.map((document) => vocabularyOf(document, stopwords));
  const total = (word: string): number =>
    documents.reduce((sum, document) => sum + (document.counts.get(word) ?? 0), 0);
  const byTotal = (left: string, right: string): number =>
    total(right) - total(left) || (left < right ? -1 : left > right ? 1 : 0);
  const displayOf = (word: string): string => {
    for (const document of documents) {
      const entry = document.entries.find((candidate) => candidate.word === word);
      if (entry !== undefined) return entry.display;
    }
    return word;
  };

  const [first = new Set<string>()] = sets;
  const shared = [...first].filter((word) => sets.every((set) => set.has(word))).sort(byTotal);
  const unique = sets.map((set, index) =>
    [...set]
      .filter((word) => sets.every((other, at) => at === index || !other.has(word)))
      .sort((left, right) => {
        const counts = documents[index]?.counts;
        return (counts?.get(right) ?? 0) - (counts?.get(left) ?? 0) || (left < right ? -1 : 1);
      })
      .map(displayOf),
  );

  const jaccard: { left: number; right: number; value: number }[] = [];
  for (let left = 0; left < sets.length; left += 1) {
    for (let right = left + 1; right < sets.length; right += 1) {
      const a = sets[left] ?? new Set<string>();
      const b = sets[right] ?? new Set<string>();
      const both = [...a].filter((word) => b.has(word)).length;
      const union = a.size + b.size - both;
      jaccard.push({ left, right, value: union === 0 ? 0 : both / union });
    }
  }
  return { shared: shared.map(displayOf), unique, jaccard };
};

/* ---------------------------------------------------------------
   Per-document profile, frequency table and concordance
   --------------------------------------------------------------- */

export const documentProfile = (document: PreparedDocument, stopwords: StopwordMode): LexicalStats =>
  statistics(document.tokens, { stopwords, sentences: document.sentences });

export interface ComparedFrequency {
  readonly word: string;
  readonly display: string;
  readonly counts: readonly number[];
  readonly per10k: readonly number[];
}

/** The `top` most frequent words of each document, side by side in every document. */
export const frequencyTable = (
  documents: readonly PreparedDocument[],
  stopwords: StopwordMode,
  top: number,
): readonly ComparedFrequency[] => {
  const chosen = new Map<string, string>();
  for (const document of documents) {
    for (const entry of document.entries.filter((candidate) => !isStopword(candidate.word, stopwords)).slice(0, top)) {
      if (!chosen.has(entry.word)) chosen.set(entry.word, entry.display);
    }
  }
  const rows = [...chosen].map(([word, display]) => {
    const counts = documents.map((document) => document.counts.get(word) ?? 0);
    return {
      word,
      display,
      counts,
      per10k: counts.map((count, index) => perTenThousand(count, documents[index]?.size ?? 0)),
    };
  });
  const total = (row: ComparedFrequency): number => row.per10k.reduce((sum, value) => sum + value, 0);
  return rows.sort((left, right) => total(right) - total(left) || (left.word < right.word ? -1 : 1));
};

export interface DocumentConcordance {
  readonly document: string;
  readonly lines: readonly Concordance[];
}

export const concordanceByDocument = (
  documents: readonly PreparedDocument[],
  keyword: string,
  window = 6,
): readonly DocumentConcordance[] =>
  documents.map((document) => ({ document: document.name, lines: kwic(document.tokens, keyword, { window }) }));
