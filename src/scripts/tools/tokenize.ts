/* ============================================================
   LinguaLab — tokenisation, sentence segmentation and stopwords

   This is the foundation every other text tool builds on, so it is the one
   place that decides what a token and a sentence are.

   Two things the original did not do, both of which the rest of the station
   needs:
     - tokens carry their character offsets, so KWIC can highlight the exact
       match instead of rebuilding the line from split words;
     - sentences are segmented once, with abbreviation handling, and every
       token records which sentence it came from.
   ============================================================ */

import type { Locale } from "../../i18n";

/* ---------------------------------------------------------------
   Sentence segmentation
   --------------------------------------------------------------- */

/**
 * Abbreviations that are ALWAYS mid-sentence: a title or a citation marker
 * cannot end a sentence, so their full stop is never a break.
 * A closed list is a heuristic, not a parser, but it covers the cases that
 * appear at the corpus sizes this tool handles.
 */
const TITLES: ReadonlySet<string> = new Set([
  // Spanish
  "sr", "sra", "srta", "dr", "dra", "prof", "gral", "cap", "tte", "ud", "uds",
  "p.ej", "ej", "aprox", "núm", "núms", "pág", "págs", "vol", "fig",
  "ee.uu", "eeuu", "a.c", "d.c", "s.xix",
  // English
  "mr", "mrs", "ms", "dr", "prof", "st", "vs", "e.g", "i.e", "cf",
  "fig", "no", "vol", "approx", "inc", "ltd", "jr", "sr",
]);

/**
 * Abbreviations that MAY end a sentence. `etc.` before a capital starts a
 * new sentence; `etc.` before a comma or a lower-case word does not.
 * Treating these as always-mid-sentence silently merged sentences, which
 * changes every readability score.
 */
const FINAL_CAPABLE: ReadonlySet<string> = new Set(["etc", "am", "pm"]);

const TERMINATORS = new Set([".", "!", "?", "…"]);
/** Spanish opens a clause with these; they never end one. */
const OPENERS = new Set(["¿", "¡"]);

export interface Sentence {
  /** Index in the returned array. */
  index: number;
  /** Character offset of the first character. */
  start: number;
  /** Character offset just past the last character. */
  end: number;
  text: string;
}

/** True when the full stop at `index` belongs to an abbreviation. */
function isAbbreviationStop(text: string, index: number): boolean {
  if (text[index] !== ".") return false;

  const isWordChar = (char: string | undefined): boolean =>
    char !== undefined && /[\p{L}\p{N}.]/u.test(char);

  // Scan the WHOLE dotted token around this stop, in both directions.
  // Walking backwards only sees "p" at the first dot of "p.ej.", which made
  // that dot look like a sentence end and split the sentence wrongly.
  let start = index;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;

  let end = index + 1;
  while (end < text.length && isWordChar(text[end])) end += 1;

  const candidate = text.slice(start, end).toLowerCase().replace(/\.+$/g, "");
  if (candidate === "") return false;

  // A single letter followed by a dot is an initial: "J. R. Tolkien".
  if (candidate.length === 1 && /\p{Lu}/u.test(text[start] ?? "")) return true;

  const word = candidate.replace(/^\.+|\.+$/g, "");
  if (TITLES.has(word)) return true;

  if (FINAL_CAPABLE.has(word)) {
    // Mid-sentence only when what follows continues the same sentence.
    const rest = text.slice(index + 1);
    const next = rest.replace(/^\s+/, "")[0] ?? "";
    return next === "" ? false : next === next.toLowerCase() || next === ",";
  }

  return false;
}

/**
 * Split text into sentences, keeping character offsets.
 *
 * Newlines always break, so a list or a poem is not read as one sentence.
 */
export function splitSentences(text: string): Sentence[] {
  const source = String(text ?? "");
  const out: Sentence[] = [];

  let start = 0;
  let i = 0;

  const push = (end: number): void => {
    const raw = source.slice(start, end);
    const trimmed = raw.trim();
    if (trimmed) {
      const leading = raw.length - raw.trimStart().length;
      out.push({
        index: out.length,
        start: start + leading,
        end: start + leading + trimmed.length,
        text: trimmed,
      });
    }
  };

  while (i < source.length) {
    const char = source[i] ?? "";

    if (char === "\n") {
      push(i);
      start = i + 1;
      i += 1;
      continue;
    }

    if (TERMINATORS.has(char) && !OPENERS.has(char)) {
      if (char === "." && isAbbreviationStop(source, i)) {
        i += 1;
        continue;
      }

      // Consume a run of terminators, so "?!" is one break.
      let end = i + 1;
      while (end < source.length && TERMINATORS.has(source[end] ?? "")) end += 1;

      // A closing quote or bracket belongs to the sentence.
      while (end < source.length && /["'”’)\]]/.test(source[end] ?? "")) end += 1;

      push(end);
      start = end;
      i = end;
      continue;
    }

    i += 1;
  }

  push(source.length);
  return out;
}

/* ---------------------------------------------------------------
   Stopwords
   --------------------------------------------------------------- */

/**
 * Spanish function words.
 *
 * Kept separate from the English list. The original concatenated both into a
 * single set, so analysing Spanish text removed English stopwords and vice
 * versa, which quietly distorted every frequency table.
 */
export const STOPWORDS_ES: readonly string[] = [
  "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por",
  "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero",
  "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando",
  "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien",
  "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra",
  "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes",
  "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto",
  "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco",
  "ella", "estar", "estas", "algunas", "algo", "nosotros", "mi", "mis",
  "tú", "te", "ti", "tu", "tus", "nosotras", "vosotros", "vosotras", "os",
  "mío", "mía", "tuyo", "suya", "nuestro", "vuestro", "esos", "esas",
  "estoy", "estás", "está", "estamos", "estáis", "están", "era", "fue",
  "son", "ser", "han", "ha", "he", "hemos", "tiene", "tienen", "hacer",
  "puede", "pueden", "sino", "tan", "cada", "sea", "así", "aunque", "solo",
  "sólo", "tras", "mediante", "según", "cabe", "hacia", "bajo",
];

/** English function words. */
export const STOPWORDS_EN: readonly string[] = [
  "the", "of", "and", "to", "in", "a", "is", "that", "it", "for", "as",
  "with", "was", "on", "be", "at", "by", "i", "this", "from", "or", "an",
  "but", "not", "are", "were", "has", "have", "had", "they", "you", "one",
  "all", "we", "can", "her", "there", "been", "if", "more", "when", "will",
  "would", "who", "so", "no", "out", "up", "into", "do", "what", "about",
  "than", "its", "his", "their", "she", "only", "other", "time", "new",
  "some", "these", "may", "first", "then", "any", "my", "now", "such",
  "like", "our", "over", "man", "even", "most", "made", "after", "also",
  "did", "many", "before", "must", "through", "back", "years", "where",
  "much", "your", "way", "well", "down", "should", "because", "each",
  "just", "those", "people", "mr", "how", "too", "little", "state", "good",
  "very", "make", "world", "still", "own", "see", "men", "work", "long",
  "get", "here", "between", "both", "life", "being", "under", "never",
  "day", "same", "another", "know", "while", "last", "might", "us",
  "great", "old", "year", "off", "come", "since", "against", "go", "came",
  "right", "used", "take", "three", "them", "him", "he", "am",
  "does", "doing", "having", "theirs", "ours", "yours", "myself", "itself",
];

/**
 * Lookup sets, built from the ACCENT-FOLDED forms.
 *
 * Tokens are matched on their normalised form, which has accents removed, so
 * an accented entry like "más" could never match the token "mas" and was
 * silently never treated as a stopword. The readable lists above keep their
 * accents; these sets are what actually match.
 */
const STOP_SETS: Record<Locale, ReadonlySet<string>> = {
  es: new Set(STOPWORDS_ES.map(normalise)),
  en: new Set(STOPWORDS_EN.map(normalise)),
};

/** Every stopword of both languages, for the "ignore both" option. */
const STOP_BOTH: ReadonlySet<string> = new Set([
  ...STOPWORDS_ES.map(normalise),
  ...STOPWORDS_EN.map(normalise),
]);

export type StopwordMode = "none" | Locale | "both";

export function isStopword(normalised: string, mode: StopwordMode): boolean {
  if (mode === "none") return false;
  if (mode === "both") return STOP_BOTH.has(normalised);
  return STOP_SETS[mode].has(normalised);
}

/* ---------------------------------------------------------------
   Normalisation
   --------------------------------------------------------------- */

/**
 * Fold a word for matching: lower case, and accents removed so that `casa`
 * and `casa` match however the text was typed.
 *
 * The surface form is always kept on the token, so displays show what the
 * author actually wrote.
 */
export function foldAccents(word: string): string {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalise(word: string): string {
  return foldAccents(word.toLowerCase());
}

/* ---------------------------------------------------------------
   Tokenisation
   --------------------------------------------------------------- */

export type TokenKind = "word" | "number" | "punctuation";

export interface Token {
  /** Exactly as it appears in the source. */
  text: string;
  /** Lower-cased, accent-folded form, for matching and counting. */
  normalised: string;
  start: number;
  end: number;
  /** Index into the sentence list. */
  sentence: number;
  kind: TokenKind;
}

/**
 * A word is a run of letters, optionally with internal apostrophes or hyphens
 * and digits. Unicode-aware, so `ñ`, `ü` and accented vowels are letters.
 */
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

export interface TokenizeOptions {
  /** Keep punctuation and numbers as tokens. Default false: words only. */
  includeNonWords?: boolean;
}

export interface TokenizeResult {
  tokens: Token[];
  sentences: Sentence[];
}

/** Tokenise text, assigning each token to the sentence that contains it. */
export function tokenizeDetailed(text: string, options: TokenizeOptions = {}): TokenizeResult {
  const source = String(text ?? "");
  const sentences = splitSentences(source);

  // A cursor over the sentence list, so the mapping is linear rather than a
  // search per token.
  let sentenceCursor = 0;

  const sentenceAt = (offset: number): number => {
    while (
      sentenceCursor < sentences.length - 1 &&
      offset >= (sentences[sentenceCursor]?.end ?? 0)
    ) {
      sentenceCursor += 1;
    }
    const current = sentences[sentenceCursor];
    if (!current) return 0;
    return offset >= current.start && offset < current.end ? current.index : sentenceCursor;
  };

  const tokens: Token[] = [];

  for (const match of source.matchAll(WORD_PATTERN)) {
    const value = match[0];
    const start = match.index ?? 0;

    tokens.push({
      text: value,
      normalised: normalise(value),
      start,
      end: start + value.length,
      sentence: sentenceAt(start),
      kind: /^\d+$/.test(value) ? "number" : "word",
    });
  }

  if (options.includeNonWords) {
    // Punctuation runs, for anyone who needs the full token stream.
    const punctuation = /[^\p{L}\p{N}\s]+/gu;
    for (const match of source.matchAll(punctuation)) {
      const value = match[0];
      const start = match.index ?? 0;
      if (tokens.some((t) => t.start === start)) continue;
      tokens.push({
        text: value,
        normalised: value,
        start,
        end: start + value.length,
        sentence: sentenceAt(start),
        kind: "punctuation",
      });
    }
    tokens.sort((a, b) => a.start - b.start);
  }

  return { tokens, sentences };
}

/** Just the tokens, which is what most callers want. */
export function tokenize(text: string, options: TokenizeOptions = {}): Token[] {
  return tokenizeDetailed(text, options).tokens;
}

/** The words of a text as plain strings. */
export function words(text: string): string[] {
  return tokenize(text).map((token) => token.normalised);
}
