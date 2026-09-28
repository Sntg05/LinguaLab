import { describe, expect, it } from "vitest";
import { carrierFor } from "../../data/ipa-carriers";
import { IPA_CHART } from "../../data/ipa-chart";
import { pickVoice, sampleCount, sampleFile, sampleUrl, SAMPLE_BASE } from "./audio";

const ALL = IPA_CHART.categories.flatMap((c) => c.symbols.map((s) => s.ipa));

/** Minimal stand-in for a SpeechSynthesisVoice. */
function voice(lang: string, opts: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return { lang, localService: true, default: false, name: lang, voiceURI: lang, ...opts } as SpeechSynthesisVoice;
}

describe("sample manifest", () => {
  it("resolves every manifest entry to a real file name", () => {
    for (const symbol of ALL) {
      const file = sampleFile(symbol);
      if (file === null) continue;
      expect(file, symbol).toMatch(/^[0-9a-f]+\.(ogg|wav|mp3)$/);
    }
  });

  it("builds a URL under the sample base", () => {
    const url = sampleUrl("p");
    if (url !== null) {
      expect(url.startsWith(SAMPLE_BASE)).toBe(true);
      expect(url.endsWith(".ogg") || url.endsWith(".wav")).toBe(true);
    }
  });

  it("returns null rather than a broken URL for a symbol with no sample", () => {
    expect(sampleUrl("\u0000definitely-not-a-symbol")).toBeNull();
    expect(sampleFile("\u0000definitely-not-a-symbol")).toBeNull();
  });

  it("covers a useful share of the chart, but not all of it", () => {
    // A guard against silently losing samples, and against pretending the
    // chart is fully recorded when it is not.
    expect(sampleCount()).toBeGreaterThan(25);
    expect(sampleCount()).toBeLessThan(ALL.length);
  });

  it("only names files whose extension the browser can play", () => {
    for (const symbol of ALL) {
      const file = sampleFile(symbol);
      if (file) expect(["ogg", "wav", "mp3"]).toContain(file.split(".").pop());
    }
  });
});

describe("pickVoice", () => {
  it("returns null when there are no voices", () => {
    expect(pickVoice([], "es")).toBeNull();
  });

  it("prefers an exact regional match", () => {
    const voices = [voice("fr-FR"), voice("es-ES"), voice("es-MX")];
    expect(pickVoice(voices, "es")?.lang).toBe("es-ES");
  });

  it("falls back to any voice for the language", () => {
    const voices = [voice("fr-FR"), voice("es-MX")];
    expect(pickVoice(voices, "es")?.lang).toBe("es-MX");
  });

  it("picks the English voice when English is requested", () => {
    const voices = [voice("es-ES"), voice("en-GB")];
    expect(pickVoice(voices, "en")?.lang).toBe("en-GB");
  });

  it("returns null when no voice matches the language at all", () => {
    expect(pickVoice([voice("fr-FR"), voice("de-DE")], "es")).toBeNull();
  });

  it("prefers a local voice over a network one", () => {
    const voices = [
      voice("es-ES", { localService: false, name: "remote" }),
      voice("es-ES", { localService: true, name: "local" }),
    ];
    expect(pickVoice(voices, "es")?.name).toBe("local");
  });

  it("normalises underscore language tags", () => {
    expect(pickVoice([voice("es_ES")], "es")?.lang).toBe("es_ES");
  });

  it("does not mutate the array it is given", () => {
    const voices = [voice("fr-FR"), voice("es-ES")];
    const before = voices.map((v) => v.lang);
    pickVoice(voices, "es");
    expect(voices.map((v) => v.lang)).toEqual(before);
  });
});

describe("carrier words", () => {
  it("gives a carrier for the common consonants", () => {
    for (const symbol of ["p", "t", "k", "s", "m", "n", "l", "f", "θ", "ʃ"]) {
      expect(carrierFor(symbol, "es") ?? carrierFor(symbol, "en"), symbol).toBeTruthy();
    }
  });

  it("gives a carrier for the cardinal vowels", () => {
    for (const symbol of ["i", "e", "a", "o", "u"]) {
      expect(carrierFor(symbol, "es"), symbol).toBeTruthy();
      expect(carrierFor(symbol, "en"), symbol).toBeTruthy();
    }
  });

  it("never returns the IPA glyph itself, which synthesis would misread", () => {
    for (const symbol of ALL) {
      for (const locale of ["es", "en"] as const) {
        const carrier = carrierFor(symbol, locale);
        if (carrier === null) continue;
        expect(carrier, `${symbol}/${locale}`).not.toBe(symbol);
        expect(carrier).toMatch(/^[a-záéíóúñü' -]+$/i);
      }
    }
  });

  it("returns null for symbols with no carrier rather than guessing", () => {
    expect(carrierFor("ʘ", "es")).toBeNull();
    expect(carrierFor("q", "en")).toBeNull();
  });

  it("gives Spanish carriers that actually contain the sound", () => {
    // A spot check that the words were chosen for the phoneme, not at random.
    expect(carrierFor("θ", "es")).toBe("zapato");
    expect(carrierFor("ɲ", "es")).toBe("niño");
    expect(carrierFor("r", "es")).toBe("perro");
    expect(carrierFor("ɾ", "es")).toBe("pera");
  });
});

describe("pickVoice language gating (regression)", () => {
  it("never returns a voice from an unrelated language, even a local one", () => {
    // A `localService` bonus previously qualified any voice, so a French
    // voice could be chosen for Spanish.
    const voices = [voice("fr-FR", { localService: true, default: true })];
    expect(pickVoice(voices, "es")).toBeNull();
    expect(pickVoice(voices, "en")).toBeNull();
  });

  it("does not confuse a similar language tag for a match", () => {
    // Estonian is "et", not "es": prefix matching would have accepted it.
    expect(pickVoice([voice("et-EE")], "es")).toBeNull();
  });

  it("still finds a match when an unrelated voice is also present", () => {
    const voices = [voice("fr-FR"), voice("de-DE"), voice("en-US")];
    expect(pickVoice(voices, "en")?.lang).toBe("en-US");
  });
});
