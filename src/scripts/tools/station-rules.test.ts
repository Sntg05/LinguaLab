import { describe, expect, it } from "vitest";
import { statistics } from "./analysis";
import { NGRAM_DEFAULTS } from "./ngram-settings";
import { readability } from "./readability";
import {
  analysisReady,
  concordanceNote,
  counterLabel,
  exportPayload,
  fileErrorMessage,
  frequencyRows,
  gramLabel,
  gramLabelSingular,
  measureLabel,
  noRepeatsMessage,
  readabilityRows,
  sizeErrorMessage,
  statsRows,
} from "./station-rules";
import { tokenizeDetailed } from "./tokenize";

const TEXT = "El gato come. El gato duerme. El perro come y el gato mira al perro.";
const { tokens, sentences } = tokenizeDetailed(TEXT);

describe("rótulos de n-gramas", () => {
  it("nombra bigramas y trigramas, y numera los demás", () => {
    expect(gramLabel(2, true)).toBe("bigramas");
    expect(gramLabel(3, false)).toBe("trigrams");
    expect(gramLabel(4, true)).toBe("4-gramas");
    expect(gramLabelSingular(2, false)).toBe("Bigram");
    expect(gramLabelSingular(5, true)).toBe("5-grama");
  });

  it("cada medida tiene su nombre habitual; el recuento se traduce", () => {
    expect(measureLabel("logDice", true)).toBe("log-Dice");
    expect(measureLabel("pmi", true)).toBe("PMI");
    expect(measureLabel("tScore", true)).toBe("t-score");
    expect(measureLabel("logLikelihood", true)).toBe("G²");
    expect(measureLabel("count", true)).toBe("recuento");
    expect(measureLabel("count", false)).toBe("count");
  });

  it("sin repeticiones, dice qué ajuste lo explica, en singular o plural", () => {
    expect(noRepeatsMessage(2, 1, true)).toMatch(/^Ningún bigrama se repite al menos 1 vez\./);
    expect(noRepeatsMessage(3, 2, false)).toMatch(/^No trigram repeats at least 2 times\./);
  });
});

describe("concordancias", () => {
  it("cuenta las líneas y avisa cuando solo se muestran las primeras 100", () => {
    expect(concordanceNote(12, true)).toBe("12 concordancias");
    expect(concordanceNote(150, false)).toBe("150 concordances (first 100)");
  });
});

describe("filas de las tablas", () => {
  it("la frecuencia lleva rango, forma, recuento, relativa y dispersión", () => {
    const [first] = frequencyRows(tokens, "none");
    expect(first?.cells).toEqual([
      "1",
      // Se agrupa sin mayúsculas y se muestra la grafía más frecuente: «El» va 3 a 1.
      "El",
      "4",
      expect.stringMatching(/^0\.\d{4}$/),
      expect.stringMatching(/^\d\.\d{2}$/),
    ]);
    expect(first?.count).toBe(4);
  });

  it("las estadísticas dan doce filas con el formato de cada medida", () => {
    const rows = statsRows(statistics(tokens, { stopwords: "none", sentences: sentences.length }), true);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual(["Palabras (tokens)", String(tokens.length)]);
    expect(rows[2]?.[1]).toMatch(/^\d\.\d{4}$/);
    expect(rows[10]?.[0]).toBe("Letras por palabra");
  });

  it("la legibilidad da los recuentos y los diez índices con su banda", () => {
    const rows = readabilityRows(readability(TEXT, "es"), "es");
    expect(rows).toHaveLength(15);
    expect(rows[0]?.[0]).toBe("Oraciones");
    expect(rows[5]?.[0]).toBe("Fernández-Huerta");
    expect(rows[5]?.[1]).toMatch(/^-?\d+\.\d · \S/);
    expect(rows[14]?.[0]).toBe("Coleman–Liau");
  });
});

describe("avisos", () => {
  it("el texto demasiado largo dice cuánto pesa", () => {
    expect(sizeErrorMessage(204_800, true)).toBe("El texto supera el límite de 100 KB (200.0 KB).");
  });

  it("un archivo rechazado dice por qué", () => {
    expect(fileErrorMessage("guardrail.err.ext", true)).toBe("Extensión no permitida.");
    expect(fileErrorMessage("guardrail.err.size", false)).toBe("The file exceeds the 100 KB limit.");
  });

  it("el contador da tamaño y palabras; un texto en blanco tiene cero", () => {
    expect(counterLabel("uno dos  tres", true)).toBe("0.0 KB · 3 palabras");
    expect(counterLabel("   ", false)).toBe("0.0 KB · 0 words");
  });

  it("el aviso de análisis listo dice cuántas palabras", () => {
    expect(analysisReady(42, true)).toBe("Análisis listo: 42 palabras.");
  });
});

describe("exportPayload", () => {
  const payload = exportPayload({
    tokens,
    sentences: sentences.length,
    text: TEXT,
    locale: "es",
    stopwords: "none",
    settings: NGRAM_DEFAULTS,
    readabilityLang: "es",
    generated: "2026-11-17T00:00:00.000Z",
  });

  it("conserva las claves de antes del constructor, para que las exportaciones viejas sigan leyéndose", () => {
    expect(Object.keys(payload)).toEqual([
      "tool",
      "generated",
      "lang",
      "stopwords",
      "statistics",
      "frequency",
      "bigrams",
      "trigrams",
      "ngrams",
      "readability",
    ]);
    expect(payload.tool).toBe("LinguaLab text station");
  });

  it("declara los ajustes del constructor que produjeron su resultado", () => {
    expect(payload.ngrams).toMatchObject(NGRAM_DEFAULTS);
    expect(Array.isArray(payload.ngrams.results)).toBe(true);
  });
});
