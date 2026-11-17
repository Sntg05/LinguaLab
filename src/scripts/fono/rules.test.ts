import { describe, expect, it } from "vitest";
import {
  articulationRows,
  arrowStep,
  audioNote,
  audioTierBadge,
  coverageText,
  matchesIpaFilters,
  placeName,
  symbolCountLabel,
  symbolFromDataset,
  transcriberFailure,
} from "./rules";

describe("placeName", () => {
  it("traduce un punto de articulación conocido", () => {
    expect(placeName("retroflex", "es")).toBe("Retroflejo");
    expect(placeName("retroflex", "en")).toBe("Retroflex");
  });

  it("un punto desconocido se muestra como raya, no como clave interna", () => {
    expect(placeName("—", "es")).toBe("—");
    expect(placeName("nowhere", "en")).toBe("—");
  });
});

describe("symbolFromDataset", () => {
  const dataset = {
    symbol: "θ",
    place: "dental",
    manner: "fricativa",
    voicing: "sorda",
    description: "fricativa dental sorda",
    category: "pulmonics",
  };

  it("rehace el símbolo y deja la descripción en la lengua de la página", () => {
    const es = symbolFromDataset(dataset, true);
    expect(es.categoryId).toBe("pulmonics");
    expect(es.symbol).toMatchObject({ ipa: "θ", es: "fricativa dental sorda", en: "" });
    expect(symbolFromDataset(dataset, false).symbol).toMatchObject({
      es: "",
      en: "fricativa dental sorda",
    });
  });

  it("sin datos, usa valores que no fingen un rasgo", () => {
    const { symbol, categoryId } = symbolFromDataset({}, true);
    expect(categoryId).toBe("pulmonics");
    expect(symbol).toMatchObject({ ipa: "", place_en: "—", voicing: "—", manner_en: "" });
  });
});

describe("articulationRows", () => {
  it("da punto, modo y sonoridad, con el punto traducido", () => {
    const { symbol } = symbolFromDataset(
      { symbol: "p", place: "bilabial", manner: "plosive", voicing: "voiceless" },
      false,
    );
    expect(articulationRows(symbol, "en")).toEqual([
      ["Place of articulation", "Bilabial"],
      ["Manner", "plosive"],
      ["Voicing", "voiceless"],
    ]);
    expect(articulationRows(symbol, "es")[0]?.[0]).toBe("Punto de articulación");
  });
});

describe("matchesIpaFilters", () => {
  const button = {
    symbol: "ʃ",
    description: "Fricativa postalveolar",
    place: "postalveolar",
    manner: "fricative",
    category: "pulmonics",
  };

  it("todo pasa sin categoría ni búsqueda", () => {
    expect(matchesIpaFilters(button, "all", "")).toBe(true);
  });

  it("filtra por categoría", () => {
    expect(matchesIpaFilters(button, "vowels", "")).toBe(false);
    expect(matchesIpaFilters(button, "pulmonics", "")).toBe(true);
  });

  it("busca en el símbolo, la descripción, el punto y el modo, sin distinguir mayúsculas", () => {
    expect(matchesIpaFilters(button, "all", "ʃ")).toBe(true);
    expect(matchesIpaFilters(button, "all", "  FRICATIVA ")).toBe(true);
    expect(matchesIpaFilters(button, "all", "postalv")).toBe(true);
    expect(matchesIpaFilters(button, "all", "nasal")).toBe(false);
  });
});

describe("symbolCountLabel", () => {
  it("dice cuántos se ven de cuántos hay", () => {
    expect(symbolCountLabel(3, 107, true)).toBe("3 de 107 símbolos");
    expect(symbolCountLabel(3, 107, false)).toBe("3 of 107 symbols");
  });
});

describe("arrowStep", () => {
  it("derecha y abajo avanzan; izquierda y arriba retroceden", () => {
    expect(arrowStep("ArrowRight")).toBe(1);
    expect(arrowStep("ArrowDown")).toBe(1);
    expect(arrowStep("ArrowLeft")).toBe(-1);
    expect(arrowStep("ArrowUp")).toBe(-1);
  });

  it("otra tecla no mueve", () => {
    expect(arrowStep("Enter")).toBeNull();
  });
});

describe("audio", () => {
  it("la etiqueta dice de dónde sale el sonido, y avisa si no hay", () => {
    expect(audioTierBadge("sample", true)).toEqual({ text: "grabación", className: "badge badge--ok" });
    expect(audioTierBadge("speech", false)).toEqual({
      text: "synthetic voice",
      className: "badge badge--ok",
    });
    expect(audioTierBadge("unavailable", true)).toEqual({
      text: "no disponible",
      className: "badge badge--warn",
    });
  });

  it("la nota explica la voz sintética y la falta de audio; una grabación no necesita nota", () => {
    expect(audioNote({ tier: "speech", detail: "sha" }, true)).toBe(
      "Sin grabación con licencia: se pronuncia «sha».",
    );
    expect(audioNote({ tier: "unavailable", detail: "" }, false)).toBe(
      "No recording or voice is available for this symbol.",
    );
    expect(audioNote({ tier: "sample", detail: "x" }, true)).toBe("");
  });

  it("la cobertura dice cuántos símbolos tienen grabación", () => {
    expect(coverageText(12, true)).toBe(
      "12 símbolos tienen grabación con licencia; el resto usa la voz del sistema.",
    );
    expect(coverageText(12, false)).toBe(
      "12 symbols have a licensed recording; the rest use the system voice.",
    );
  });
});

describe("transcriberFailure", () => {
  it("nombra el diccionario de inglés y qué hacer", () => {
    expect(transcriberFailure(true)).toMatch(/diccionario de inglés.*vuelve a intentarlo/);
    expect(transcriberFailure(false)).toMatch(/English dictionary.*try again/);
  });
});
