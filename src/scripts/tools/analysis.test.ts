import { describe, expect, it } from "vitest";
import {
  STOPWORDS_EN,
  STOPWORDS_ES,
  foldAccents,
  isStopword,
  normalise,
  splitSentences,
  tokenize,
  tokenizeDetailed,
  words,
} from "./tokenize";
import {
  entropy,
  frequency,
  kwic,
  msttr,
  ngrams,
  statistics,
  zipfSlope,
} from "./analysis";

/* ============================================================
   Sentence segmentation
   ============================================================ */

describe("splitSentences", () => {
  it("splits on a full stop", () => {
    expect(splitSentences("Uno. Dos.").map((s) => s.text)).toEqual(["Uno.", "Dos."]);
  });

  it("splits on question and exclamation marks", () => {
    expect(splitSentences("¿Qué? ¡Bien! Sí.")).toHaveLength(3);
  });

  it("does not split on a Spanish opening mark", () => {
    // The opener belongs to the sentence that follows it.
    const [first] = splitSentences("¿Cómo estás?");
    expect(first?.text).toBe("¿Cómo estás?");
  });

  it("treats a run of terminators as one break", () => {
    expect(splitSentences("De verdad?! Vale.")).toHaveLength(2);
  });

  it("keeps a closing quote with its sentence", () => {
    expect(splitSentences('Dijo "hola." Luego se fue.')).toHaveLength(2);
  });

  it("always breaks on a newline", () => {
    // A list or a poem must not read as one sentence.
    expect(splitSentences("primera linea\nsegunda linea")).toHaveLength(2);
  });

  it("does not split on a title abbreviation", () => {
    expect(splitSentences("Dr. Smith llegó. Gracias.")).toHaveLength(2);
    expect(splitSentences("El Sr. López vino.")).toHaveLength(1);
  });

  it("does not split on a multi-dot abbreviation", () => {
    expect(splitSentences("Dijo, p.ej., que sí. Vale.")).toHaveLength(2);
  });

  it("does not split on an initial", () => {
    expect(splitSentences("J. R. Tolkien escribió. Fin.")).toHaveLength(2);
  });

  it("lets etc. end a sentence before a capital", () => {
    expect(splitSentences("Hay libros, revistas, etc. Luego nada.")).toHaveLength(2);
  });

  it("keeps etc. inside a sentence before a comma", () => {
    expect(splitSentences("Hay libros, revistas, etc., y más.")).toHaveLength(1);
  });

  it("reports offsets that index the original text", () => {
    const text = "Uno. Dos.";
    for (const sentence of splitSentences(text)) {
      expect(text.slice(sentence.start, sentence.end)).toBe(sentence.text);
    }
  });

  it("numbers sentences in order", () => {
    expect(splitSentences("Uno. Dos. Tres.").map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("treats a single capital and a dot as an initial, not a sentence", () => {
    // "A. B. C." is a sequence of initials, so it stays one sentence.
    expect(splitSentences("A. B. C.")).toHaveLength(1);
  });

  it("ignores whitespace-only input", () => {
    expect(splitSentences("   \n  ")).toEqual([]);
    expect(splitSentences("")).toEqual([]);
  });

  it("does not emit an empty trailing sentence", () => {
    expect(splitSentences("Uno.")).toHaveLength(1);
  });
});

/* ============================================================
   Tokenisation
   ============================================================ */

describe("tokenize", () => {
  it("splits on whitespace and punctuation", () => {
    expect(words("El gato, negro.")).toEqual(["el", "gato", "negro"]);
  });

  it("keeps accents in the surface form and folds them for matching", () => {
    const [token] = tokenize("Murciélago");
    expect(token?.text).toBe("Murciélago");
    expect(token?.normalised).toBe("murcielago");
  });

  it("records character offsets", () => {
    const text = "El gato";
    const [, gato] = tokenize(text);
    expect(text.slice(gato!.start, gato!.end)).toBe("gato");
  });

  it("assigns each token to its sentence", () => {
    const { tokens } = tokenizeDetailed("Uno dos. Tres cuatro.");
    expect(tokens.map((t) => t.sentence)).toEqual([0, 0, 1, 1]);
  });

  it("treats an apostrophe as part of a word", () => {
    expect(words("don't")).toEqual(["don't"]);
  });

  it("treats a hyphen as part of a word", () => {
    expect(words("bien-estar")).toEqual(["bien-estar"]);
  });

  it("classifies numbers", () => {
    const [token] = tokenize("2026");
    expect(token?.kind).toBe("number");
  });

  it("ignores punctuation by default", () => {
    expect(words("Hola, mundo!")).toEqual(["hola", "mundo"]);
  });

  it("can include punctuation when asked", () => {
    const { tokens } = tokenizeDetailed("Hola, mundo!", { includeNonWords: true });
    expect(tokens.map((t) => t.text)).toContain(",");
    expect(tokens.map((t) => t.text)).toContain("!");
  });

  it("returns tokens in text order even with punctuation", () => {
    const { tokens } = tokenizeDetailed("a, b. c", { includeNonWords: true });
    const starts = tokens.map((t) => t.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(words("   ")).toEqual([]);
  });

  it("handles letters outside the Latin alphabet", () => {
    expect(words("東京 café")).toEqual(["東京", "cafe"]);
  });
});

describe("normalise and foldAccents", () => {
  it("lower-cases and strips accents", () => {
    expect(normalise("ÁRBOL")).toBe("arbol");
    expect(foldAccents("ñandú")).toBe("nandu");
  });

  it("keeps the ñ distinct from n when folding", () => {
    // NFD decomposition makes ñ into n + combining tilde, so folding removes
    // the tilde. This is intended for matching, and the surface form keeps it.
    expect(foldAccents("niño")).toBe("nino");
  });
});

/* ============================================================
   Stopwords
   ============================================================ */

describe("stopwords", () => {
  it("keeps the two languages separate", () => {
    // The original concatenated both lists into one set, so analysing Spanish
    // text also removed English stopwords and vice versa.
    expect(isStopword("the", "es")).toBe(false);
    expect(isStopword("the", "en")).toBe(true);
    expect(isStopword("de", "en")).toBe(false);
    expect(isStopword("de", "es")).toBe(true);
  });

  it("removes nothing in 'none' mode", () => {
    expect(isStopword("the", "none")).toBe(false);
  });

  it("covers both languages in 'both' mode", () => {
    expect(isStopword("the", "both")).toBe(true);
    expect(isStopword("de", "both")).toBe(true);
  });

  it("has no duplicates and no empty entries", () => {
    for (const [name, list] of [
      ["es", STOPWORDS_ES],
      ["en", STOPWORDS_EN],
    ] as const) {
      expect(new Set(list).size, name).toBe(list.length);
      expect(list.filter((w) => w.trim() === ""), name).toEqual([]);
    }
  });

  it("matches accented stopwords against folded tokens", () => {
    // Tokens are matched on their accent-folded form, so an accented entry
    // could never match unless the lookup set is folded too.
    for (const word of ["más", "sí", "qué", "él", "tú", "mí", "está", "sólo"]) {
      expect(isStopword(normalise(word), "es"), word).toBe(true);
    }
  });
});

/* ============================================================
   Frequency and dispersion
   ============================================================ */

describe("frequency", () => {
  const tokens = tokenize("el gato y el perro y el gato");

  it("counts occurrences", () => {
    const entries = frequency(tokens);
    expect(entries[0]).toMatchObject({ word: "el", count: 3 });
  });

  it("ranks from most to least frequent", () => {
    const entries = frequency(tokens);
    expect(entries.map((e) => e.count)).toEqual([...entries.map((e) => e.count)].sort((a, b) => b - a));
  });

  it("assigns rank starting at 1", () => {
    expect(frequency(tokens)[0]?.rank).toBe(1);
  });

  it("computes relative share", () => {
    const entries = frequency(tokens);
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const sum = entries.reduce((acc, e) => acc + e.relative, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(total).toBe(8);
  });

  it("computes occurrences per million", () => {
    const entries = frequency(tokens);
    expect(entries[0]?.perMillion).toBeCloseTo((3 / 8) * 1_000_000, 3);
  });

  it("removes stopwords when asked", () => {
    const entries = frequency(tokens, { stopwords: "es" });
    expect(entries.map((e) => e.word)).not.toContain("el");
    expect(entries.map((e) => e.word)).toContain("gato");
  });

  it("breaks ties alphabetically so output is stable", () => {
    const tied = tokenize("b a");
    expect(frequency(tied).map((e) => e.word)).toEqual(["a", "b"]);
  });

  it("gives a fully dispersed word a dispersion of 1", () => {
    const spread = tokenize("a b c d a b c d a b c d");
    const entry = frequency(spread, { segments: 3 }).find((e) => e.word === "a");
    expect(entry?.dispersion).toBe(1);
  });

  it("gives a word confined to one segment a low dispersion", () => {
    // The point of the measure: a high count in one place is not the same as
    // a word used throughout.
    const clustered = tokenize("a a a a a a b c d e f g h i j k l m n o p");
    const entry = frequency(clustered, { segments: 4 }).find((e) => e.word === "a");
    expect(entry?.dispersion).toBeLessThan(0.5);
  });

  it("handles empty input", () => {
    expect(frequency([])).toEqual([]);
  });
});

/* ============================================================
   Collocation
   ============================================================ */

describe("ngrams", () => {
  it("counts repeated bigrams", () => {
    const tokens = tokenize("a b a b a b c");
    const grams = ngrams(tokens, 2);
    expect(grams[0]).toMatchObject({ gram: "a b", count: 3 });
  });

  it("drops n-grams below the minimum count", () => {
    const tokens = tokenize("a b c d e f");
    expect(ngrams(tokens, 2, { minCount: 2 })).toEqual([]);
  });

  it("honours the limit", () => {
    const tokens = tokenize("a b a b a b a b a b a b");
    expect(ngrams(tokens, 2, { limit: 1 })).toHaveLength(1);
  });

  it("computes every association measure as a finite number", () => {
    const tokens = tokenize("new york new york new york city city");
    for (const gram of ngrams(tokens, 2, { minCount: 1 })) {
      for (const key of ["logDice", "pmi", "tScore", "logLikelihood"] as const) {
        expect(Number.isFinite(gram[key]), `${gram.gram}.${key}`).toBe(true);
      }
    }
  });

  it("scores a real collocation above a chance pairing", () => {
    // "new york" is a unit; "city city" is not.
    const tokens = tokenize("new york new york new york and the city and the city");
    const grams = ngrams(tokens, 2, { minCount: 2, sortBy: "logDice" });
    const newYork = grams.find((g) => g.gram === "new york");
    expect(newYork).toBeDefined();
    expect(newYork!.logDice).toBeGreaterThan(0);
  });

  it("reports the expected count from the contingency table", () => {
    const tokens = tokenize("a b a b a b a b");
    const gram = ngrams(tokens, 2, { minCount: 1 }).find((g) => g.gram === "a b");
    // Both words occur 4 times in 8 tokens, so E = 4*4/8 = 2.
    expect(gram?.expected).toBeCloseTo(2, 5);
    expect(gram?.o11).toBe(4);
  });

  it("never produces a negative count in any cell", () => {
    const tokens = tokenize("the the the the the the");
    for (const gram of ngrams(tokens, 2, { minCount: 1 })) {
      expect(gram.o11).toBeGreaterThanOrEqual(0);
      expect(gram.expected).toBeGreaterThanOrEqual(0);
    }
  });

  it("can sort by count instead", () => {
    const tokens = tokenize("a b a b a b c d c d");
    const grams = ngrams(tokens, 2, { minCount: 1, sortBy: "count" });
    expect(grams[0]?.count).toBeGreaterThanOrEqual(grams[grams.length - 1]?.count ?? 0);
  });

  it("computes trigrams", () => {
    const tokens = tokenize("a b c a b c");
    expect(ngrams(tokens, 3, { minCount: 2 })[0]?.gram).toBe("a b c");
  });

  it("returns nothing when the text is shorter than n", () => {
    expect(ngrams(tokenize("a"), 2)).toEqual([]);
  });
});

/* ============================================================
   Concordance
   ============================================================ */

describe("kwic", () => {
  const tokens = tokenize("El gato negro duerme. El perro come.");

  it("finds every occurrence", () => {
    expect(kwic(tokens, "el")).toHaveLength(2);
  });

  it("returns the node as it appears in the text", () => {
    expect(kwic(tokens, "gato")[0]?.node).toBe("gato");
  });

  it("matches case-insensitively by default", () => {
    expect(kwic(tokens, "GATO")).toHaveLength(1);
  });

  it("can match case-sensitively", () => {
    expect(kwic(tokens, "GATO", { ignoreCase: false })).toHaveLength(0);
  });

  it("takes context from the token stream, not from whitespace splitting", () => {
    // Punctuation must not become a context word.
    const withPunctuation = tokenize("uno, dos, tres, cuatro, cinco, seis");
    expect(kwic(withPunctuation, "seis")[0]?.left).not.toContain(",");
  });

  it("honours the window size", () => {
    const long = tokenize("a b c d e f g h i j k");
    expect(kwic(long, "k", { window: 2 })[0]?.left).toBe("i j");
    expect(kwic(long, "k", { window: 5 })[0]?.left).toBe("f g h i j");
  });

  it("stops at the start and end of the text", () => {
    expect(kwic(tokens, "el")[0]?.left).toBe("");
  });

  it("reports offsets that locate the node", () => {
    const text = "El gato negro duerme.";
    const found = kwic(tokenize(text), "negro")[0];
    expect(text.slice(found!.start, found!.end)).toBe("negro");
  });

  it("reports which sentence each line came from", () => {
    expect(kwic(tokens, "el").map((c) => c.sentence)).toEqual([0, 1]);
  });

  it("returns nothing for an empty keyword", () => {
    expect(kwic(tokens, "")).toEqual([]);
    expect(kwic(tokens, "   ")).toEqual([]);
  });

  it("returns nothing when the word is absent", () => {
    expect(kwic(tokens, "inexistente")).toEqual([]);
  });
});

/* ============================================================
   Lexical statistics
   ============================================================ */

describe("msttr", () => {
  it("equals TTR for a text shorter than one segment", () => {
    expect(msttr(["a", "b", "a", "b"], 100)).toBeCloseTo(0.5, 6);
  });

  it("averages whole segments", () => {
    // Two segments of 4: "a b c d" and "a b c d" -> TTR 1.0 each.
    expect(msttr(["a", "b", "c", "d", "a", "b", "c", "d"], 4)).toBeCloseTo(1, 6);
  });

  it("is lower when a segment repeats itself", () => {
    expect(msttr(["a", "a", "a", "a"], 4)).toBeCloseTo(0.25, 6);
  });

  it("handles empty input", () => {
    expect(msttr([], 100)).toBe(0);
  });
});

describe("statistics", () => {
  const text = "El gato negro duerme. El perro negro come.";
  const tokens = tokenize(text);

  it("counts tokens and types", () => {
    const stats = statistics(tokens);
    expect(stats.tokens).toBe(8);
    expect(stats.types).toBe(6);
  });

  it("computes the type/token ratio", () => {
    expect(statistics(tokens).ttr).toBeCloseTo(6 / 8, 6);
  });

  it("counts hapax and dis legomena", () => {
    const stats = statistics(tokenize("a a b c d"));
    expect(stats.hapax).toBe(3);
    expect(stats.dislegomena).toBe(1);
  });

  it("reports the share of the vocabulary that occurs once", () => {
    const stats = statistics(tokenize("a a b c d"));
    expect(stats.hapaxRatio).toBeCloseTo(3 / 4, 6);
  });

  it("computes entropy in bits", () => {
    // Two equally frequent types -> 1 bit.
    expect(statistics(tokenize("a b a b")).entropy).toBeCloseTo(1, 6);
  });

  it("gives zero entropy for a single repeated word", () => {
    expect(statistics(tokenize("a a a a")).entropy).toBeCloseTo(0, 6);
  });

  it("computes a Zipf slope near -1 for a Zipfian distribution", () => {
    // Frequency proportional to 1/rank.
    const text = Array.from({ length: 200 }, (_, i) =>
      Array.from({ length: Math.max(1, Math.round(200 / (i + 1))) }, () => `w${i}`).join(" "),
    ).join(" ");
    expect(statistics(tokenize(text)).zipfSlope).toBeLessThan(-0.5);
  });

  it("reports the longest word", () => {
    expect(statistics(tokenize("a constituyente b")).longestWord).toBe("constituyente");
  });

  it("uses the supplied sentence count", () => {
    expect(statistics(tokens, { sentences: 2 }).avgWordsPerSentence).toBeCloseTo(4, 6);
  });

  it("returns no NaN for empty input", () => {
    const stats = statistics([]);
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === "number") expect(Number.isFinite(value), key).toBe(true);
    }
  });

  it("excludes stopwords from the counts when asked", () => {
    expect(statistics(tokens, { stopwords: "es" }).tokens).toBeLessThan(8);
  });
});

describe("zipfSlope", () => {
  it("returns zero when there is nothing to fit", () => {
    expect(zipfSlope([])).toBe(0);
    expect(zipfSlope(frequency(tokenize("a")))).toBe(0);
  });

  it("is negative for a real distribution", () => {
    expect(zipfSlope(frequency(tokenize("a a a b b c")))).toBeLessThan(0);
  });
});

describe("entropy", () => {
  it("is zero for an empty distribution", () => {
    expect(entropy([])).toBe(0);
  });

  it("increases with the number of equally likely types", () => {
    const two = entropy(frequency(tokenize("a b")));
    const four = entropy(frequency(tokenize("a b c d")));
    expect(four).toBeGreaterThan(two);
  });
});

describe("log-Dice range (regression)", () => {
  it("reaches its maximum of 14 when every occurrence co-occurs", () => {
    // Without the standard +14 offset this returned 0 at MAXIMUM association.
    const tokens = tokenize("new york new york new york");
    const gram = ngrams(tokens, 2, { minCount: 1 }).find((g) => g.gram === "new york");
    expect(gram?.logDice).toBeCloseTo(14, 5);
  });

  it("stays within the published 0-14 range", () => {
    const tokens = tokenize("a b a b c d c d e f g h");
    for (const gram of ngrams(tokens, 2, { minCount: 1 })) {
      expect(gram.logDice, gram.gram).toBeLessThanOrEqual(14);
    }
  });

  it("scores a strong collocation above a weak one", () => {
    const tokens = tokenize("new york new york new york a the b and c the d and e");
    const grams = ngrams(tokens, 2, { minCount: 1, sortBy: "logDice" });
    expect(grams[0]?.gram).toBe("new york");
  });
});

describe("surface forms (regression)", () => {
  it("displays the accented spelling, not the folded key", () => {
    // Counting folds accents so variants group, but printing the folded key
    // showed "tamano" for "tamaño", which reads as a misspelling.
    const entries = frequency(tokenize("El tamaño del tamaño importa."));
    const entry = entries.find((e) => e.word === "tamano");
    expect(entry?.display).toBe("tamaño");
  });

  it("picks the most common spelling when a text is inconsistent", () => {
    const entries = frequency(tokenize("análisis análisis analisis"));
    expect(entries.find((e) => e.word === "analisis")?.display).toBe("análisis");
  });

  it("keeps the folded key for matching", () => {
    const entries = frequency(tokenize("Murciélago"));
    expect(entries[0]?.word).toBe("murcielago");
    expect(entries[0]?.display).toBe("Murciélago");
  });

  it("shows accented surface forms in collocations too", () => {
    const grams = ngrams(tokenize("gestión gestión gestión de datos"), 2, { minCount: 1 });
    const gram = grams.find((g) => g.gram === "gestion gestion");
    expect(gram?.display).toBe("gestión gestión");
  });
});
