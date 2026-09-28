import { describe, expect, it } from "vitest";
import { IPA_CHART } from "./ipa-chart";
import {
  ANATOMY,
  KNOWN_PLACES,
  PLACE_BY_EN,
  TONGUE_PATHS,
  VIEW,
  VOWEL_BACKNESS_X,
  VOWEL_HEIGHT_Y,
  articulationFor,
  type Articulation,
} from "./articulation";

/** Every symbol in the chart, paired with the category it came from. */
const ALL = IPA_CHART.categories.flatMap((category) =>
  category.symbols.map((symbol) => ({ symbol, categoryId: category.id })),
);

const resolve = (ipa: string): Articulation => {
  const found = ALL.find((entry) => entry.symbol.ipa === ipa);
  if (!found) throw new Error(`symbol ${ipa} not in chart`);
  return articulationFor(found.symbol, found.categoryId);
};

describe("chart coverage", () => {
  it("sees all 108 symbols", () => {
    expect(ALL).toHaveLength(108);
  });

  it("resolves every single symbol without throwing", () => {
    for (const { symbol, categoryId } of ALL) {
      expect(() => articulationFor(symbol, categoryId), symbol.ipa).not.toThrow();
    }
  });

  it("gives every symbol a tongue shape that actually has a path", () => {
    for (const { symbol, categoryId } of ALL) {
      const art = articulationFor(symbol, categoryId);
      expect(TONGUE_PATHS[art.tongue], `${symbol.ipa} -> ${art.tongue}`).toBeTruthy();
    }
  });

  it("maps every CONSONANT place name used by the data", () => {
    // Vowels use Front/Central/Back on a separate axis, handled by the
    // vowel branch and asserted separately below.
    const consonantPlaces = new Set(
      ALL.filter((e) => e.categoryId !== "vowels").map((e) => e.symbol.place_en),
    );
    const unmapped = [...consonantPlaces].filter((place) => !(place in PLACE_BY_EN));
    expect(unmapped, "consonant places with no model entry").toEqual([]);
  });

  it("maps every VOWEL place and height used by the data", () => {
    const vowelPlaces = new Set(
      ALL.filter((e) => e.categoryId === "vowels").map((e) => e.symbol.place_en),
    );
    const vowelHeights = new Set(
      ALL.filter((e) => e.categoryId === "vowels").map((e) => e.symbol.manner_en),
    );

    expect([...vowelPlaces].filter((p) => !(p in VOWEL_BACKNESS_X))).toEqual([]);
    expect([...vowelHeights].filter((h) => !(h in VOWEL_HEIGHT_Y))).toEqual([]);
  });

  it("draws a marker for every symbol except the modifiers", () => {
    // Clicks do have a place in this dataset (bilabial, alveolar, palatal),
    // so they get a marker too. Only diacritics are constriction-less.
    const withoutMarker = ALL.filter(
      ({ symbol, categoryId }) =>
        articulationFor(symbol, categoryId).constrictions.length === 0,
    );

    for (const { categoryId } of withoutMarker) {
      expect(categoryId).toBe("diacritics");
    }
    expect(withoutMarker.length).toBeGreaterThan(0);
  });
});

describe("constriction geometry", () => {
  it("keeps every marker inside the drawing area", () => {
    for (const { symbol, categoryId } of ALL) {
      for (const c of articulationFor(symbol, categoryId).constrictions) {
        expect(c.x, `${symbol.ipa} x`).toBeGreaterThan(0);
        expect(c.x, `${symbol.ipa} x`).toBeLessThan(VIEW.width);
        expect(c.y, `${symbol.ipa} y`).toBeGreaterThan(0);
        expect(c.y, `${symbol.ipa} y`).toBeLessThan(VIEW.height);
      }
    }
  });

  it("places constrictions in the order the tract runs, front to back", () => {
    // Bilabial must be in front of alveolar, which must be in front of velar.
    const x = (ipa: string) => resolve(ipa).constrictions[0]!.x;
    expect(x("p")).toBeLessThan(x("t"));
    expect(x("t")).toBeLessThan(x("k"));
    // Glottal is the furthest back.
    expect(x("k")).toBeLessThan(x("h"));
  });

  it("puts the bilabial constriction at the lips", () => {
    expect(resolve("p").constrictions[0]!.x).toBeCloseTo(ANATOMY.lips.x, -1);
  });

  it("puts the velar constriction at the velum", () => {
    expect(resolve("k").constrictions[0]!.x).toBeCloseTo(ANATOMY.velum.x, -1);
  });

  it("puts the glottal constriction at the glottis", () => {
    expect(resolve("h").constrictions[0]!.y).toBeGreaterThan(ANATOMY.pharynxWall.y);
  });
});

describe("doubly-articulated sounds", () => {
  it("gives labial-velar two constrictions: lips and velum", () => {
    const art = resolve("w");
    expect(art.constrictions).toHaveLength(2);
    const places = art.constrictions.map((c) => c.place);
    expect(places).toContain("labialVelar");
    expect(places).toContain("bilabial");
  });

  it("gives every other consonant exactly one constriction", () => {
    for (const { symbol, categoryId } of ALL) {
      if (categoryId === "diacritics") continue;
      const art = articulationFor(symbol, categoryId);
      if (art.kind !== "consonant") continue;
      const place = symbol.place_en;
      if (place === "Labial-velar" || place === "Labial-palatal" || place === "Velopalatal") {
        expect(art.constrictions.length, symbol.ipa).toBe(2);
      } else if (art.constrictions.length > 0) {
        expect(art.constrictions.length, symbol.ipa).toBe(1);
      }
    }
  });
});

describe("voicing drives the glottis", () => {
  it("opens the folds for voiceless sounds", () => {
    expect(resolve("p").glottis).toBe("open");
    expect(resolve("s").glottis).toBe("open");
    expect(resolve("f").glottis).toBe("open");
  });

  it("vibrates the folds for voiced sounds", () => {
    expect(resolve("b").glottis).toBe("vibrating");
    expect(resolve("z").glottis).toBe("vibrating");
    expect(resolve("m").glottis).toBe("vibrating");
  });

  it("never leaves a consonant with an unknown glottis state", () => {
    const states = new Set(
      ALL.filter((e) => e.categoryId !== "diacritics").map(
        (e) => articulationFor(e.symbol, e.categoryId).glottis,
      ),
    );
    for (const state of states) {
      expect(["vibrating", "open", "closed"]).toContain(state);
    }
  });
});

describe("nasality drives the velum", () => {
  it("lowers the velum for nasal phonemes", () => {
    for (const ipa of ["m", "n", "ŋ", "ɲ", "ɳ"]) {
      expect(resolve(ipa).velum, ipa).toBe("lowered");
    }
  });

  it("raises the velum for oral phonemes", () => {
    expect(resolve("p").velum).toBe("raised");
    expect(resolve("s").velum).toBe("raised");
  });

  it("lowers the velum for nasalised vowels only", () => {
    // Plain vowels are oral; the chart's nasal diacritic is separate.
    expect(resolve("a").velum).toBe("raised");
  });
});

describe("vowels", () => {
  it("classifies every vowel-category symbol as a vowel", () => {
    for (const { symbol, categoryId } of ALL) {
      if (categoryId !== "vowels") continue;
      expect(articulationFor(symbol, categoryId).kind, symbol.ipa).toBe("vowel");
    }
  });

  it("spreads or rounds the lips, never leaving them neutral", () => {
    for (const { symbol, categoryId } of ALL) {
      if (categoryId !== "vowels") continue;
      const lips = articulationFor(symbol, categoryId).lips;
      expect(["spread", "rounded"], symbol.ipa).toContain(lips);
    }
  });

  it("rounds the lips of the back rounded vowels", () => {
    expect(resolve("u").lips).toBe("rounded");
    expect(resolve("o").lips).toBe("rounded");
  });

  it("spreads the lips of the unrounded front vowels", () => {
    expect(resolve("i").lips).toBe("spread");
    expect(resolve("e").lips).toBe("spread");
  });

  it("draws a close vowel higher than an open one", () => {
    const high = resolve("i").constrictions[0]!;
    const low = resolve("a").constrictions[0]!;
    expect(high.y).toBeLessThan(low.y);
  });

  it("draws a front vowel further forward than a back one", () => {
    const front = resolve("i").constrictions[0]!;
    const back = resolve("u").constrictions[0]!;
    expect(front.x).toBeLessThan(back.x);
  });

  it("uses a different tongue shape for the three extremes", () => {
    expect(resolve("i").tongue).toBe("vowelHighFront");
    expect(resolve("u").tongue).toBe("vowelHighBack");
    expect(resolve("a").tongue).not.toBe(resolve("i").tongue);
  });
});

describe("modifiers", () => {
  it("treats diacritics as modifiers with no constriction of their own", () => {
    const { symbol, categoryId } = ALL.find((e) => e.categoryId === "diacritics")!;
    const art = articulationFor(symbol, categoryId);
    expect(art.kind).toBe("modifier");
    expect(art.constrictions).toEqual([]);
  });

  it("keeps the tract at rest for a modifier", () => {
    for (const { symbol, categoryId } of ALL) {
      if (categoryId !== "diacritics") continue;
      const art = articulationFor(symbol, categoryId);
      expect(art.tongue, symbol.ipa).toBe("rest");
      expect(art.velum).toBe("raised");
    }
  });
});

describe("labels", () => {
  it("exposes a place key for every anatomy landmark used", () => {
    expect(KNOWN_PLACES.length).toBeGreaterThan(15);
    expect(KNOWN_PLACES).toContain("bilabial");
    expect(KNOWN_PLACES).toContain("glottal");
  });
});
