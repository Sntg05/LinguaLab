import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BIBLIOGRAPHY } from "./bibliography";
import { GLOSSARY } from "./glossary";
import { IPA_CHART } from "./ipa-chart";
import { IPA_AUDIO_FILES } from "./ipa-audio";
import { TREE_EXAMPLES } from "./trees/examples";
import { PHONEMES, markContext, phonemeForDate } from "./phoneme-of-day";

/**
 * These assertions are the reason the counts shown in the UI are trustworthy.
 * The legacy site advertised "170 IPA symbols" while shipping 104; pinning the
 * real numbers here means a data regression fails the build instead of quietly
 * producing a false claim on the landing page.
 */
describe("IPA chart", () => {
  const symbols = IPA_CHART.categories.flatMap((c) => c.symbols);

  it("ships 108 symbols across 4 categories", () => {
    expect(IPA_CHART.categories).toHaveLength(4);
    expect(symbols).toHaveLength(108);
  });

  it("declares a licence", () => {
    expect(IPA_CHART.license).toMatch(/CC|Public/i);
  });

  it("gives every symbol a label in both locales", () => {
    for (const s of symbols) {
      expect(s.ipa.length, `symbol ${s.ipa} has no glyph`).toBeGreaterThan(0);
      expect(s.es.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate glyphs", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const s of symbols) {
      if (seen.has(s.ipa)) dupes.push(s.ipa);
      seen.add(s.ipa);
    }
    expect(dupes).toEqual([]);
  });

  it("has unique category ids", () => {
    const ids = IPA_CHART.categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("IPA audio manifest", () => {
  it("maps symbols to .wav filenames", () => {
    const entries = Object.entries(IPA_AUDIO_FILES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [symbol, file] of entries) {
      expect(symbol.length).toBeGreaterThan(0);
      expect(file).toMatch(/\.wav$/);
    }
  });

  it("only references symbols that exist in the chart", () => {
    const known = new Set(IPA_CHART.categories.flatMap((c) => c.symbols.map((s) => s.ipa)));
    const orphans = Object.keys(IPA_AUDIO_FILES).filter((s) => !known.has(s));
    expect(orphans).toEqual([]);
  });
});

describe("glossary", () => {
  it("ships 16 bilingual entries", () => {
    expect(GLOSSARY).toHaveLength(16);
  });

  it("has unique ids", () => {
    const ids = GLOSSARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fills every bilingual field", () => {
    for (const e of GLOSSARY) {
      for (const key of ["term_es", "term_en", "def_es", "def_en"] as const) {
        expect(e[key].length, `${e.id}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});

describe("bibliography", () => {
  it("ships 54 entries", () => {
    expect(BIBLIOGRAPHY).toHaveLength(54);
  });

  it("declares a licence and a year for every entry", () => {
    for (const e of BIBLIOGRAPHY) {
      expect(e.license.length, `${e.id} has no licence`).toBeGreaterThan(0);
      expect(Number.isInteger(e.year)).toBe(true);
      expect(e.year).toBeGreaterThan(1900);
    }
  });

  it("provides at least one of file or url", () => {
    for (const e of BIBLIOGRAPHY) {
      expect(Boolean(e.file || e.url), `${e.id} is unreachable`).toBe(true);
    }
  });

  it("points every declared file at a real file in public/", () => {
    /* The assertion above passes for any non-empty string, so three entries
       shipped download links to PDFs that were never added to public/ and
       nobody noticed. A path that does not resolve is not a resource. */
    const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));
    for (const e of BIBLIOGRAPHY) {
      if (!e.file) continue;
      expect(
        existsSync(`${publicDir}${e.file}`),
        `${e.id} declares file "${e.file}", which is not in public/`,
      ).toBe(true);
    }
  });
});

describe("tree examples", () => {
  it("covers 23 tree types", () => {
    expect(Object.keys(TREE_EXAMPLES)).toHaveLength(23);
  });

  it("gives every example bilingual names", () => {
    for (const [type, examples] of Object.entries(TREE_EXAMPLES)) {
      expect(examples.length, `${type} has no examples`).toBeGreaterThan(0);
      for (const example of examples) {
        expect(example.name_es.length).toBeGreaterThan(0);
        expect(example.name_en.length).toBeGreaterThan(0);
      }
    }
  });

  it("supplies editor input for every type except the comparison table", () => {
    // "comparison" renders a static table of the data-structure trees, so it
    // legitimately has no free-text input.
    const withoutInput = Object.entries(TREE_EXAMPLES)
      .filter(([, examples]) => examples.every((e) => !e.text.trim()))
      .map(([type]) => type);

    expect(withoutInput).toEqual(["comparison"]);
  });

  it("only marks numeric input as a boolean flag", () => {
    for (const examples of Object.values(TREE_EXAMPLES)) {
      for (const example of examples) {
        if (example.numeric !== undefined) {
          expect(typeof example.numeric).toBe("boolean");
        }
      }
    }
  });
});

describe("phoneme of the day", () => {
  it("rotates deterministically within one day", () => {
    const morning = phonemeForDate(new Date("2026-03-01T08:00:00Z"));
    const evening = phonemeForDate(new Date("2026-03-01T21:00:00Z"));
    expect(evening.id).toBe(morning.id);
  });

  it("advances on consecutive days", () => {
    const day1 = phonemeForDate(new Date("2026-03-01T12:00:00Z"));
    const day2 = phonemeForDate(new Date("2026-03-02T12:00:00Z"));
    expect(day2.id).not.toBe(day1.id);
  });

  it("always returns an entry, including for dates before the epoch", () => {
    expect(phonemeForDate(new Date("1969-01-01"))).toBeDefined();
    expect(PHONEMES.length).toBe(5);
  });

  it("marks {target} words in a context sentence", () => {
    const parts = markContext("El sonido de {cielo} y {zapato}.");
    expect(parts.filter((p) => p.hit).map((p) => p.word)).toEqual(["cielo", "zapato"]);
  });

  it("leaves an unmarked sentence untouched", () => {
    const parts = markContext("Sin marcas.");
    expect(parts).toEqual([{ word: "Sin marcas.", hit: false }]);
  });
});
