import { describe, expect, it } from "vitest";
import { IPA_CHART } from "../../data/ipa-chart";
import { articulationFor } from "../../data/articulation";
import { describeArticulation } from "./vocal-tract";
import type { Locale } from "../../i18n";

const ALL = IPA_CHART.categories.flatMap((category) =>
  category.symbols.map((symbol) => ({ symbol, categoryId: category.id })),
);

const find = (ipa: string) => {
  const entry = ALL.find((e) => e.symbol.ipa === ipa);
  if (!entry) throw new Error(`no ${ipa}`);
  return articulationFor(entry.symbol, entry.categoryId);
};

const LOCALES: Locale[] = ["es", "en"];

describe("describeArticulation", () => {
  it("returns a usable sentence for every symbol in every locale", () => {
    for (const locale of LOCALES) {
      for (const { symbol, categoryId } of ALL) {
        const text = describeArticulation(articulationFor(symbol, categoryId), locale);
        expect(text.length, `${symbol.ipa} (${locale})`).toBeGreaterThan(20);
        expect(text.endsWith("."), `${symbol.ipa} (${locale})`).toBe(true);
      }
    }
  });

  it("never leaks a raw data token into the prose", () => {
    for (const locale of LOCALES) {
      for (const { symbol, categoryId } of ALL) {
        const text = describeArticulation(articulationFor(symbol, categoryId), locale);
        expect(text, `${symbol.ipa}`).not.toMatch(/undefined|\[object|_en|_es/);
      }
    }
  });

  it("reports voicing", () => {
    expect(describeArticulation(find("p"), "es")).toMatch(/sordo/);
    expect(describeArticulation(find("b"), "es")).toMatch(/sonoro/);
    expect(describeArticulation(find("p"), "en")).toMatch(/voiceless/);
    expect(describeArticulation(find("b"), "en")).toMatch(/voiced/);
  });

  it("mentions the nasal route only for nasal sounds", () => {
    expect(describeArticulation(find("m"), "es")).toMatch(/nariz/);
    expect(describeArticulation(find("m"), "en")).toMatch(/nose/);
    expect(describeArticulation(find("p"), "es")).not.toMatch(/nariz/);
    expect(describeArticulation(find("p"), "en")).not.toMatch(/nose/);
  });

  it("mentions lip rounding for rounded vowels and not for unrounded ones", () => {
    expect(describeArticulation(find("u"), "es")).toMatch(/redondead/);
    expect(describeArticulation(find("i"), "es")).toMatch(/extendidos/);
    expect(describeArticulation(find("i"), "es")).not.toMatch(/redondead/);
  });

  it("names the active tongue region for coronal sounds", () => {
    // The alveolar symbol is produced with the tongue tip.
    expect(describeArticulation(find("t"), "es")).toMatch(/punta|ápice/);
    expect(describeArticulation(find("t"), "en")).toMatch(/tip/);
  });

  it("explains that a modifier has no articulation of its own", () => {
    const modifier = ALL.find((e) => e.categoryId === "diacritics")!;
    const art = articulationFor(modifier.symbol, modifier.categoryId);
    expect(describeArticulation(art, "es")).toMatch(/diacr|modifica/i);
    expect(describeArticulation(art, "en")).toMatch(/diacritic|modifies/i);
  });

  it("describes a double articulation as such", () => {
    const art = find("w");
    expect(art.constrictions.length).toBe(2);
    expect(describeArticulation(art, "es")).toMatch(/[Dd]oble articulación/);
    expect(describeArticulation(art, "en")).toMatch(/[Dd]ouble articulation/);
  });

  it("produces different prose for a consonant and a vowel", () => {
    expect(describeArticulation(find("p"), "es")).not.toBe(describeArticulation(find("a"), "es"));
    expect(describeArticulation(find("a"), "es")).toMatch(/[Vv]ocal/);
  });
});
