import { describe, expect, it } from "vitest";
import {
  readability,
  syllables,
  syllablesEN,
  syllablesES,
} from "./readability";

/* ============================================================
   Spanish syllabifier — table tests
   ============================================================ */

describe("syllablesES", () => {
  it("returns 0 for empty input", () => {
    expect(syllablesES("")).toBe(0);
    expect(syllablesES("   ")).toBe(0);
    expect(syllablesES("123")).toBe(0);
  });

  it("counts at least one syllable for any non-empty word", () => {
    expect(syllablesES("a")).toBe(1);
    expect(syllablesES("b")).toBe(1);
  });

  it("counts known Spanish words correctly", () => {
    const table: [string, number][] = [
      ["aire", 2],
      ["leer", 2],
      ["día", 2],
      ["país", 2],
      ["poeta", 3],
      ["aéreo", 4],
      ["bueno", 2],
      ["ciudad", 2],
      ["guerra", 2],
      ["ahora", 3],
      ["casa", 2],
      ["corazón", 3],
      ["murciélago", 4],
      ["raíz", 2],
      ["baúl", 2],
      ["ahí", 2],
      ["viuda", 2],
      ["cuidar", 2],
      ["guau", 1],
    ];
    for (const [word, expected] of table) {
      expect(syllablesES(word), `syllablesES("${word}")`).toBe(expected);
    }
  });

  it("splits on two adjacent strong vowels (hiatus)", () => {
    expect(syllablesES("leer")).toBe(2); // e-e
    expect(syllablesES("poeta")).toBe(3); // o-e
    expect(syllablesES("aéreo")).toBe(4); // a-é, e-o
    expect(syllablesES("ahora")).toBe(3); // a-o
    expect(syllablesES("casa")).toBe(2); // a-a
  });

  it("does not split weak+weak or weak+strong diphthongs", () => {
    expect(syllablesES("ciudad")).toBe(2); // iu diphthong
    expect(syllablesES("guerra")).toBe(2); // ue diphthong
    expect(syllablesES("bueno")).toBe(2); // ue diphthong
    expect(syllablesES("aire")).toBe(2); // ai diphthong
  });

  it("splits on an accented weak vowel", () => {
    expect(syllablesES("día")).toBe(2); // í-a
    expect(syllablesES("país")).toBe(2); // a-í
    expect(syllablesES("raíz")).toBe(2); // a-í
    expect(syllablesES("baúl")).toBe(2); // a-ú
  });

  it("treats h between vowels as transparent", () => {
    expect(syllablesES("ahí")).toBe(2); // a-í across h
    expect(syllablesES("ahora")).toBe(3); // a-o across h
  });
});

/* ============================================================
   English syllabifier — table tests
   ============================================================ */

describe("syllablesEN", () => {
  it("returns 0 for empty input", () => {
    expect(syllablesEN("")).toBe(0);
    expect(syllablesEN("123")).toBe(0);
  });

  it("counts at least one syllable for any non-empty word", () => {
    expect(syllablesEN("a")).toBe(1);
    expect(syllablesEN("b")).toBe(1);
  });

  it("counts known English words approximately", () => {
    const table: [string, number][] = [
      ["the", 1],
      ["she", 1],
      ["like", 1],
      ["hope", 1],
      ["candle", 2],
      ["apple", 2],
      ["watches", 2],
      ["boxes", 2],
      ["horses", 2],
      ["wanted", 2],
      ["added", 2],
      ["hoped", 1],
      ["tried", 1],
      ["buzzed", 1],
      ["recipe", 2], // approximation: silent-e rule undercounts
      ["beautiful", 3],
      ["extraordinary", 5],
    ];
    for (const [word, expected] of table) {
      expect(syllablesEN(word), `syllablesEN("${word}")`).toBe(expected);
    }
  });

  it("does not subtract for consonant+le endings", () => {
    expect(syllablesEN("candle")).toBe(2);
    expect(syllablesEN("little")).toBe(2);
    expect(syllablesEN("able")).toBe(2);
  });

  it("does not subtract when -ed follows t or d", () => {
    expect(syllablesEN("wanted")).toBe(2);
    expect(syllablesEN("added")).toBe(2);
  });

  it("subtracts silent e in -es/-ed when the e is not syllabic", () => {
    expect(syllablesEN("hoped")).toBe(1);
    expect(syllablesEN("tried")).toBe(1);
    expect(syllablesEN("buzzed")).toBe(1);
  });
});

/* ============================================================
   Dispatch
   ============================================================ */

describe("syllables", () => {
  it("routes to the correct language syllabifier", () => {
    expect(syllables("casa", "es")).toBe(2);
    expect(syllables("house", "en")).toBe(1);
  });
});

/* ============================================================
   Readability — empty / edge-case input
   ============================================================ */

describe("readability empty input", () => {
  it("returns zeroes for empty string", () => {
    const r = readability("", "es");
    expect(r.counts.sentences).toBe(0);
    expect(r.counts.words).toBe(0);
    expect(r.counts.syllables).toBe(0);
    expect(r.counts.syllablesPerWord).toBe(0);
    expect(r.counts.wordsPerSentence).toBe(0);
    expect(Number.isFinite(r.spanish.fernandezHuerta.score)).toBe(true);
    expect(Number.isFinite(r.english.fleschReadingEase.score)).toBe(true);
  });

  it("returns zeroes for whitespace-only string", () => {
    const r = readability("   \n\t  ", "en");
    expect(r.counts.words).toBe(0);
    expect(r.counts.sentences).toBe(0);
    expect(Number.isFinite(r.english.fleschReadingEase.score)).toBe(true);
    expect(Number.isNaN(r.english.fleschReadingEase.score)).toBe(false);
  });

  it("returns zeroes for text with no letters", () => {
    const r = readability("123 . ! ???", "es");
    expect(r.counts.words).toBe(0);
    expect(r.counts.sentences).toBe(0);
    expect(Number.isFinite(r.spanish.inflesz.score)).toBe(true);
  });
});

/* ============================================================
   Readability — sentence counting
   ============================================================ */

describe("readability sentence counting", () => {
  it("does not split on etc.", () => {
    const r = readability("Compré frutas, verduras, etc. Después fui a casa.", "es");
    expect(r.counts.sentences).toBe(2);
  });

  it("does not split on Sr. or Sra.", () => {
    const r = readability("Sr. García y Sra. López llegaron. Fueron recibidos.", "es");
    expect(r.counts.sentences).toBe(2);
  });

  it("does not split on Dr. or p.ej.", () => {
    const r = readability("Dr. Smith dijo, p.ej., que todo está bien. Gracias.", "es");
    expect(r.counts.sentences).toBe(2);
  });

  it("counts multiple terminators", () => {
    const r = readability("¿Cómo estás? ¡Bien! Sí.", "es");
    expect(r.counts.sentences).toBe(3);
  });

  it("counts ellipsis as a terminator", () => {
    const r = readability("Pensó un momento… y decidió.", "es");
    expect(r.counts.sentences).toBe(2);
  });
});

/* ============================================================
   Readability — every index returns a finite number
   ============================================================ */

describe("readability indices on normal prose", () => {
  const spanishText =
    "La casa era grande y luminosa. Tenía muchas ventanas y un jardín amplio. " +
    "Los niños jugaban en el patio todos los días. Era un lugar feliz.";

  const englishText =
    "The house was large and bright. It had many windows and a spacious garden. " +
    "The children played in the yard every day. It was a happy place.";

  it("returns finite Spanish indices", () => {
    const r = readability(spanishText, "es");
    expect(Number.isFinite(r.spanish.fernandezHuerta.score)).toBe(true);
    expect(Number.isFinite(r.spanish.szigrisztPazos.score)).toBe(true);
    expect(Number.isFinite(r.spanish.gutierrezDePolini.score)).toBe(true);
    expect(Number.isFinite(r.spanish.inflesz.score)).toBe(true);
  });

  it("returns finite English indices", () => {
    const r = readability(englishText, "en");
    expect(Number.isFinite(r.english.fleschReadingEase.score)).toBe(true);
    expect(Number.isFinite(r.english.fleschKincaidGrade.score)).toBe(true);
    expect(Number.isFinite(r.english.gunningFog.score)).toBe(true);
    expect(Number.isFinite(r.english.smog.score)).toBe(true);
    expect(Number.isFinite(r.english.ari.score)).toBe(true);
    expect(Number.isFinite(r.english.colemanLiau.score)).toBe(true);
  });

  it("returns positive word and syllable counts", () => {
    const r = readability(spanishText, "es");
    expect(r.counts.words).toBeGreaterThan(0);
    expect(r.counts.syllables).toBeGreaterThan(0);
    expect(r.counts.sentences).toBeGreaterThan(0);
    expect(r.counts.syllablesPerWord).toBeGreaterThan(0);
    expect(r.counts.wordsPerSentence).toBeGreaterThan(0);
  });

  it("provides a band for every index", () => {
    const rEs = readability(spanishText, "es");
    expect(rEs.spanish.fernandezHuerta.band.es.length).toBeGreaterThan(0);
    expect(rEs.spanish.fernandezHuerta.band.en.length).toBeGreaterThan(0);
    expect(rEs.spanish.inflesz.band.es.length).toBeGreaterThan(0);

    const rEn = readability(englishText, "en");
    expect(rEn.english.fleschReadingEase.band.en.length).toBeGreaterThan(0);
    expect(rEn.english.gunningFog.band.en.length).toBeGreaterThan(0);
  });
});

describe("INFLESZ (regression)", () => {
  const TEXT =
    "La lingüística de corpus estudia el lenguaje a partir de datos reales. " +
    "Un corpus reúne textos auténticos que permiten medir frecuencias.";

  it("shares the Szigriszt-Pazos score", () => {
    // INFLESZ is that score read against Spanish bands, not a separate formula.
    const r = readability(TEXT, "es");
    expect(r.spanish.inflesz.score).toBeCloseTo(r.spanish.szigrisztPazos.score, 6);
  });

  it("does not call ordinary prose very difficult", () => {
    // The previous rescaling put normal newspaper-style prose in the lowest
    // band, contradicting its own Szigriszt-Pazos figure.
    const r = readability(TEXT, "es");
    expect(r.spanish.inflesz.score).toBeGreaterThan(35);
    expect(r.spanish.inflesz.band.es).not.toBe("Muy difícil");
  });

  it("keeps the two Spanish scales consistent", () => {
    const r = readability(TEXT, "es");
    const huerta = r.spanish.fernandezHuerta.score;
    const inflesz = r.spanish.inflesz.score;
    // Both are 0-100 "higher is easier" scales, so they should be in the same
    // region rather than 50 points apart.
    expect(Math.abs(huerta - inflesz)).toBeLessThan(30);
  });
});
