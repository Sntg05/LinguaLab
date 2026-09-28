/* ============================================================
   LinguaLab — corpus analysis

   Frequency, dispersion, collocation, concordance and lexical statistics.

   The original station advertised log-Dice and dispersion on the landing
   page but never computed either. Both are here (log-Dice with its standard
   14-point offset, so it ranges 0-14 as published), along with the other
   standard association measures, because a frequency list on its own cannot
   distinguish a real collocation from two common words that happen to
   co-occur.
   ============================================================ */

import { isStopword, normalise, type StopwordMode, type Token } from "./tokenize";

/* ---------------------------------------------------------------
   Frequency
   --------------------------------------------------------------- */

export interface FrequencyEntry {
  /** Accent-folded key, used for matching and grouping. */
  word: string;
  /**
   * The surface form to DISPLAY: the spelling that occurs most often.
   * Counting happens on the folded key so that "casa" and "casa" group, but
   * showing the folded key would print "tamano" for "tamaño", which reads as
   * a misspelling to a Spanish speaker.
   */
  display: string;
  count: number;
  /** Share of the counted tokens, 0..1. */
  relative: number;
  /** Occurrences per million tokens. */
  perMillion: number;
  /**
   * Dispersion: the fraction of equal-sized segments of the text that
   * contain the word, 0..1. A word used forty times in one paragraph and
   * nowhere else has a high count and a low dispersion, which the count
   * alone cannot show.
   */
  dispersion: number;
  /** 1-based position in the frequency ordering. */
  rank: number;
}

export interface FrequencyOptions {
  stopwords?: StopwordMode;
  /** Number of segments used for the dispersion measure. */
  segments?: number;
}

/**
 * Rank a token list by frequency.
 *
 * `tokens` must be in text order for dispersion to mean anything.
 */
export function frequency(
  tokens: readonly Token[],
  options: FrequencyOptions = {},
): FrequencyEntry[] {
  const mode = options.stopwords ?? "none";
  const segmentCount = Math.max(1, options.segments ?? 10);

  const kept = tokens.filter((token) => !isStopword(token.normalised, mode));
  const total = kept.length;

  const counts = new Map<string, number>();
  /** Surface spellings per key, so the most common one can be displayed. */
  const surfaces = new Map<string, Map<string, number>>();

  for (const token of kept) {
    counts.set(token.normalised, (counts.get(token.normalised) ?? 0) + 1);

    let forms = surfaces.get(token.normalised);
    if (!forms) {
      forms = new Map();
      surfaces.set(token.normalised, forms);
    }
    forms.set(token.text, (forms.get(token.text) ?? 0) + 1);
  }

  /** The most frequent surface spelling, ties broken alphabetically. */
  const displayFor = (key: string): string => {
    const forms = surfaces.get(key);
    if (!forms) return key;
    let best = key;
    let bestCount = -1;
    for (const [form, count] of forms) {
      if (count > bestCount || (count === bestCount && form.localeCompare(best) < 0)) {
        best = form;
        bestCount = count;
      }
    }
    return best;
  };

  // Which segments each word appears in, for dispersion.
  const segmentSize = Math.max(1, Math.ceil(total / segmentCount));
  const segmentsSeen = new Map<string, Set<number>>();

  kept.forEach((token, index) => {
    const segment = Math.floor(index / segmentSize);
    let set = segmentsSeen.get(token.normalised);
    if (!set) {
      set = new Set();
      segmentsSeen.set(token.normalised, set);
    }
    set.add(segment);
  });

  const usedSegments = Math.max(1, Math.ceil(total / segmentSize));

  const entries: FrequencyEntry[] = [...counts.entries()].map(([word, count]) => ({
    word,
    display: displayFor(word),
    count,
    relative: total > 0 ? count / total : 0,
    perMillion: total > 0 ? (count / total) * 1_000_000 : 0,
    dispersion: (segmentsSeen.get(word)?.size ?? 0) / usedSegments,
    rank: 0,
  }));

  // Most frequent first; ties broken alphabetically so output is stable.
  entries.sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

/* ---------------------------------------------------------------
   Collocation
   --------------------------------------------------------------- */

export interface Collocation {
  /** The n-gram over folded forms, used for grouping. */
  gram: string;
  /** The n-gram as it most often appears, for display. */
  display: string;
  count: number;
  /** Observed co-occurrence count. */
  o11: number;
  /** Expected co-occurrence under independence. */
  expected: number;
  /**
   * log-Dice: `14 + log2(2 * O11 / (f1 + f2))`.
   * The offset is part of the published measure, which is why it is called
   * log-Dice and ranges 0-14. Without it the value is 0 at MAXIMUM
   * association, which reads as "no association at all".
   */
  logDice: number;
  /** Pointwise mutual information, base 2. */
  pmi: number;
  /** t-score: favours high-frequency pairs over rare ones. */
  tScore: number;
  /** Log-likelihood ratio (G²), the standard significance measure. */
  logLikelihood: number;
}

export interface NgramOptions {
  stopwords?: StopwordMode;
  /** Keep only n-grams seen at least this many times. */
  minCount?: number;
  /** How many to return. */
  limit?: number;
  /** Sort key. Defaults to log-likelihood, the significance measure. */
  sortBy?: "logDice" | "pmi" | "tScore" | "logLikelihood" | "count";
}

const LOG2 = Math.log(2);
const log2 = (value: number): number => Math.log(value) / LOG2;

/**
 * Extract n-grams with association measures.
 *
 * The contingency table for a bigram (w1, w2) over N tokens is:
 *
 *            w2      not w2
 *   w1       o11      o12
 *   not w1   o21      o22
 *
 * Every measure below is derived from that table, which is why they disagree
 * with each other in useful ways: PMI overrates rare pairs, t-score overrates
 * frequent ones, and log-likelihood is the usual compromise.
 *
 * Measures are computed for bigrams. For larger n the gram is treated as a
 * unit against its first and last word, which is an approximation, so only
 * the count is trustworthy there.
 */
export function ngrams(
  tokens: readonly Token[],
  n: number,
  options: NgramOptions = {},
): Collocation[] {
  const size = Math.max(2, Math.floor(n));
  const mode = options.stopwords ?? "none";
  const minCount = options.minCount ?? 2;
  const limit = options.limit ?? 30;

  // Work over the kept tokens, preserving order.
  const kept = tokens.filter((token) => !isStopword(token.normalised, mode));
  const total = kept.length;
  if (total < size) return [];

  const unigramCounts = new Map<string, number>();
  for (const token of kept) {
    unigramCounts.set(token.normalised, (unigramCounts.get(token.normalised) ?? 0) + 1);
  }

  const gramCounts = new Map<string, number>();
  const gramSurfaces = new Map<string, Map<string, number>>();

  for (let i = 0; i + size <= total; i += 1) {
    const slice = kept.slice(i, i + size);
    const gram = slice.map((token) => token.normalised).join(" ");
    gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + 1);

    const surface = slice.map((token) => token.text).join(" ");
    let forms = gramSurfaces.get(gram);
    if (!forms) {
      forms = new Map();
      gramSurfaces.set(gram, forms);
    }
    forms.set(surface, (forms.get(surface) ?? 0) + 1);
  }

  const results: Collocation[] = [];

  for (const [gram, count] of gramCounts) {
    if (count < minCount) continue;

    const parts = gram.split(" ");
    const first = parts[0] ?? "";
    const last = parts[parts.length - 1] ?? "";

    const countFirst = unigramCounts.get(first) ?? 0;
    const countLast = unigramCounts.get(last) ?? 0;

    const o11 = count;
    const o12 = Math.max(0, countFirst - o11);
    const o21 = Math.max(0, countLast - o11);
    const o22 = Math.max(0, total - o11 - o12 - o21);

    const expected = total > 0 ? (countFirst * countLast) / total : 0;

    // log-Dice: 14 + log2(2 * o11 / (f1 + f2)), the published measure.
    const diceDenominator = countFirst + countLast;
    const logDice = diceDenominator > 0 ? 14 + log2((2 * o11) / diceDenominator) : 0;

    // PMI: log2(P(w1,w2) / (P(w1) P(w2))).
    const pmi =
      expected > 0 && o11 > 0
        ? log2((o11 / total) / ((countFirst / total) * (countLast / total)))
        : 0;

    // t-score: (observed - expected) / sqrt(observed).
    const tScore = o11 > 0 ? (o11 - expected) / Math.sqrt(o11) : 0;

    // Log-likelihood over the four cells; a cell of 0 contributes nothing.
    let logLikelihood = 0;
    for (const [observed, exp] of [
      [o11, expected],
      [o12, Math.max(0, countFirst - expected)],
      [o21, Math.max(0, countLast - expected)],
      [o22, Math.max(0, total - countFirst - countLast + expected)],
    ] as const) {
      if (observed > 0 && exp > 0) logLikelihood += observed * Math.log(observed / exp);
    }
    logLikelihood *= 2;

    // Most common surface spelling of this n-gram.
    let display = gram;
    let bestCount = -1;
    for (const [form, seen] of gramSurfaces.get(gram) ?? []) {
      if (seen > bestCount) {
        display = form;
        bestCount = seen;
      }
    }

    results.push({
      gram,
      display,
      count,
      o11,
      expected,
      logDice,
      pmi,
      tScore,
      logLikelihood,
    });
  }

  const sortBy = options.sortBy ?? "logLikelihood";
  results.sort((a, b) => {
    const delta = b[sortBy] - a[sortBy];
    return delta !== 0 ? delta : a.gram.localeCompare(b.gram);
  });

  return results.slice(0, limit);
}

/* ---------------------------------------------------------------
   Concordance (KWIC)
   --------------------------------------------------------------- */

export interface Concordance {
  /** Words before the node. */
  left: string;
  /** The node as it appears in the text. */
  node: string;
  /** Words after the node. */
  right: string;
  /** Character offsets of the match, for highlighting. */
  start: number;
  end: number;
  sentence: number;
}

export interface KwicOptions {
  /** Words of context on each side. */
  window?: number;
  /** Match on the folded form, so "Casa" matches "casa". Default true. */
  ignoreCase?: boolean;
}

/**
 * Concordance lines for a search word.
 *
 * Context is taken from the token stream rather than by splitting the
 * sentence on whitespace, so punctuation does not become a context word and
 * the node keeps its exact offsets.
 */
export function kwic(
  tokens: readonly Token[],
  keyword: string,
  options: KwicOptions = {},
): Concordance[] {
  const window = Math.max(1, options.window ?? 5);
  const ignoreCase = options.ignoreCase ?? true;
  const needle = ignoreCase ? normalise(keyword.trim()) : keyword.trim();
  if (!needle) return [];

  const out: Concordance[] = [];

  tokens.forEach((token, index) => {
    const haystack = ignoreCase ? token.normalised : token.text;
    if (haystack !== needle) return;

    const left = tokens
      .slice(Math.max(0, index - window), index)
      .map((t) => t.text)
      .join(" ");
    const right = tokens
      .slice(index + 1, index + 1 + window)
      .map((t) => t.text)
      .join(" ");

    out.push({
      left,
      node: token.text,
      right,
      start: token.start,
      end: token.end,
      sentence: token.sentence,
    });
  });

  return out;
}

/* ---------------------------------------------------------------
   Lexical statistics
   --------------------------------------------------------------- */

export interface LexicalStats {
  tokens: number;
  types: number;
  /** Type/token ratio. Length dependent: compare only equal-sized texts. */
  ttr: number;
  /**
   * Mean segmental TTR: the average TTR of consecutive 100-token segments.
   * This is the measure to compare across texts of different lengths, since
   * raw TTR falls as a text grows even when vocabulary does not.
   */
  msttr: number;
  hapax: number;
  /** Words occurring exactly twice. */
  dislegomena: number;
  /** Share of the vocabulary that occurs only once. */
  hapaxRatio: number;
  /** Shannon entropy of the word distribution, in bits. */
  entropy: number;
  /** Slope of log(frequency) against log(rank). Near -1 in natural language. */
  zipfSlope: number;
  sentences: number;
  avgWordsPerSentence: number;
  avgWordLength: number;
  /** Distinct lemmas are not computed: this station has no lexicon. */
  longestWord: string;
}

/** TTR over fixed-size segments, averaged. */
export function msttr(words: readonly string[], segmentSize = 100): number {
  if (words.length < segmentSize) {
    const types = new Set(words).size;
    return words.length > 0 ? types / words.length : 0;
  }

  const ratios: number[] = [];
  for (let start = 0; start + segmentSize <= words.length; start += segmentSize) {
    const segment = words.slice(start, start + segmentSize);
    ratios.push(new Set(segment).size / segmentSize);
  }

  if (ratios.length === 0) return 0;
  return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
}

/**
 * Least-squares slope of log(frequency) against log(rank).
 * Zipf's law predicts about -1; a flatter slope means a more even vocabulary.
 */
export function zipfSlope(entries: readonly FrequencyEntry[], maxRank = 1000): number {
  const points = entries.slice(0, maxRank).filter((entry) => entry.count > 0 && entry.rank > 0);
  if (points.length < 2) return 0;

  const xs = points.map((entry) => Math.log(entry.rank));
  const ys = points.map((entry) => Math.log(entry.count));
  const n = points.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - meanX;
    numerator += dx * ((ys[i] ?? 0) - meanY);
    denominator += dx * dx;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/** Shannon entropy of the distribution, in bits. */
export function entropy(entries: readonly FrequencyEntry[]): number {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) return 0;

  let value = 0;
  for (const entry of entries) {
    const p = entry.count / total;
    if (p > 0) value -= p * log2(p);
  }
  return value;
}

export interface StatsOptions {
  stopwords?: StopwordMode;
  sentences?: number;
}

export function statistics(
  tokens: readonly Token[],
  options: StatsOptions = {},
): LexicalStats {
  const mode = options.stopwords ?? "none";
  const kept = tokens.filter((token) => !isStopword(token.normalised, mode));
  const forms = kept.map((token) => token.normalised);

  const entries = frequency(tokens, { stopwords: mode });
  const counts = new Map<string, number>();
  for (const form of forms) counts.set(form, (counts.get(form) ?? 0) + 1);

  const hapax = [...counts.values()].filter((count) => count === 1).length;
  const dislegomena = [...counts.values()].filter((count) => count === 2).length;

  const total = forms.length;
  const types = counts.size;

  const sentenceCount = Math.max(1, options.sentences ?? 1);
  const letters = kept.reduce((sum, token) => sum + token.text.replace(/[^\p{L}]/gu, "").length, 0);

  const longest = forms.reduce((best, form) => (form.length > best.length ? form : best), "");

  return {
    tokens: total,
    types,
    ttr: total > 0 ? types / total : 0,
    msttr: msttr(forms),
    hapax,
    dislegomena,
    hapaxRatio: types > 0 ? hapax / types : 0,
    entropy: entropy(entries),
    zipfSlope: zipfSlope(entries),
    sentences: sentenceCount,
    avgWordsPerSentence: total / sentenceCount,
    avgWordLength: total > 0 ? letters / total : 0,
    longestWord: longest,
  };
}
