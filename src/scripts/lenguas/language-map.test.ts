/**
 * Pruebas del lector del mapa de lenguas y del adaptador del puerto.
 *
 * `parseLanguageDataset` valida en el limite: el JSON se commitea y se regenera
 * con un script, asi que un campo mal escrito no puede llegar a la pagina. Las
 * pruebas comprueban las dos mitades que importan: que el dato REAL de hoy
 * cumple las invariantes que la pagina promete, y que un dato ROTO detiene la
 * compilacion en vez de publicarse.
 *
 * Ademas, el adaptador corre el contrato de `LanguageCatalogPort` a su manera:
 * `list` devuelve el catalogo y `byId` responde `null` —no un error— cuando la
 * lengua no existe.
 */
import { describe, expect, it } from "vitest";
import rawDataset from "../../data/languages-co.json";
import {
  GlottologLanguageCatalog,
  LANGUAGE_DATASET,
  kindOf,
  parseLanguageDataset,
} from "./language-map";

const baseEntry = () => ({
  glottocode: "wayu1243",
  name: "Wayuu",
  family: "Arawakan",
  iso639p3: "guc",
  latitude: 11.395566,
  longitude: -72.199791,
  glottologUrl: "https://glottolog.org/resource/languoid/id/wayu1243",
});

const baseDataset = () => ({
  glottologVersion: "5.2.1",
  retrievedAt: "2026-10-25T12:00:00.000Z",
  sourceUrl: "https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/",
  license: "https://creativecommons.org/licenses/by/4.0/",
  citation: "Glottolog 5.2.1",
  sha256: "0".repeat(64),
  languages: [baseEntry()],
});

describe("el mapa de lenguas que se publica", () => {
  const languages = LANGUAGE_DATASET.languages;

  it("declara de donde salio el dato antes de mostrarlo", () => {
    expect(LANGUAGE_DATASET.glottologVersion).toMatch(/^\d+(\.\d+)+$/);
    expect(LANGUAGE_DATASET.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(LANGUAGE_DATASET.sourceUrl.startsWith("https://raw.githubusercontent.com/glottolog/")).toBe(
      true,
    );
    expect(LANGUAGE_DATASET.license).toContain("creativecommons.org");
    expect(LANGUAGE_DATASET.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("publica las lenguas de Colombia que el filtro encontro", () => {
    expect(languages).toHaveLength(136);
    expect(languages.filter((language) => language.latitude !== undefined)).toHaveLength(127);
    expect(languages.filter((language) => language.latitude === undefined)).toHaveLength(9);
  });

  it("no repite ningun glottocode", () => {
    const codes = languages.map((language) => language.glottocode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("viene ordenado por nombre, que es como lo lee la tabla", () => {
    const names = languages.map((language) => language.name);
    expect([...names].sort()).toEqual(names);
  });

  it("arma la ficha de Glottolog con el glottocode de cada lengua", () => {
    for (const language of languages) {
      expect(language.glottologUrl).toBe(
        `https://glottolog.org/resource/languoid/id/${language.glottocode}`,
      );
    }
  });

  it("no publica una coordenada imposible", () => {
    for (const language of languages) {
      if (language.latitude === undefined || language.longitude === undefined) {
        continue;
      }
      expect(Math.abs(language.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(language.longitude)).toBeLessThanOrEqual(180);
    }
  });

  it("declara la ausencia de codigo ISO en vez de dejarla vacia", () => {
    const withoutIso = languages.filter((language) => language.iso639p3 === null);
    expect(withoutIso).toHaveLength(24);
    for (const language of withoutIso) {
      expect(language.iso639p3).toBeNull();
    }
  });
});

describe("parseLanguageDataset", () => {
  it("acepta el dataset real sin cambios", () => {
    // `toEqual` y no `toBe`: lo que se afirma es que el lector no pierde ni
    // agrega nada respecto del archivo, no que devuelva el mismo objeto.
    expect(parseLanguageDataset(rawDataset)).toEqual(LANGUAGE_DATASET);
    expect(LANGUAGE_DATASET).toEqual(rawDataset);
  });

  it("rechaza un dataset sin version de Glottolog", () => {
    expect(() => parseLanguageDataset({ ...baseDataset(), glottologVersion: "" })).toThrow(
      /glottologVersion/,
    );
  });

  it("rechaza un dataset sin fecha de recuperacion", () => {
    expect(() => parseLanguageDataset({ ...baseDataset(), retrievedAt: "ayer" })).toThrow(
      /retrievedAt/,
    );
  });

  it("rechaza dos lenguas con el mismo glottocode", () => {
    const dataset = baseDataset();
    expect(() =>
      parseLanguageDataset({ ...dataset, languages: [baseEntry(), baseEntry()] }),
    ).toThrow(/repetido/);
  });

  it("rechaza una entrada sin nombre", () => {
    expect(() =>
      parseLanguageDataset({
        ...baseDataset(),
        languages: [{ ...baseEntry(), name: "" }],
      }),
    ).toThrow(/name/);
  });

  it("rechaza un glottocode con otra forma que la de Glottolog", () => {
    expect(() =>
      parseLanguageDataset({
        ...baseDataset(),
        languages: [{ ...baseEntry(), glottocode: "Wayuu" }],
      }),
    ).toThrow(/glottocode/);
  });

  it("rechaza una latitud presente sin longitud", () => {
    const { longitude: _longitude, ...withoutLongitude } = baseEntry();
    expect(() =>
      parseLanguageDataset({ ...baseDataset(), languages: [withoutLongitude] }),
    ).toThrow(/longitude/);
  });

  it("rechaza un enlace de Glottolog que no sea el de su glottocode", () => {
    expect(() =>
      parseLanguageDataset({
        ...baseDataset(),
        languages: [{ ...baseEntry(), glottologUrl: "https://glottolog.org/" }],
      }),
    ).toThrow(/glottologUrl/);
  });

  it("rechaza un archivo que no es un objeto", () => {
    expect(() => parseLanguageDataset([])).toThrow(/no es un objeto/);
  });
});

describe("kindOf", () => {
  it("trata como indigena una lengua de familia no colonial", () => {
    expect(kindOf(LANGUAGE_DATASET.languages.find((l) => l.glottocode === "wayu1243")!)).toBe(
      "indigenous",
    );
  });

  it("trata como nacional el espanol, que es la lengua oficial de Colombia", () => {
    expect(kindOf(LANGUAGE_DATASET.languages.find((l) => l.glottocode === "stan1288")!)).toBe(
      "national",
    );
  });

  it("no llama indigena a una lengua de familia indoeuropea ni a una lengua de senas", () => {
    expect(kindOf(LANGUAGE_DATASET.languages.find((l) => l.glottocode === "port1283")!)).toBe(
      "other",
    );
    expect(kindOf(LANGUAGE_DATASET.languages.find((l) => l.glottocode === "colo1249")!)).toBe(
      "other",
    );
  });
});

describe("GlottologLanguageCatalog", () => {
  const catalog = new GlottologLanguageCatalog(LANGUAGE_DATASET);

  it("lista todas las lenguas del mapa", async () => {
    const listed = await catalog.list();

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(LANGUAGE_DATASET.languages.length);
    }
  });

  it("busca una lengua por su glottocode", async () => {
    const found = await catalog.byId("wayu1243");

    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value).toEqual({ id: "wayu1243", name: "Wayuu", kind: "indigenous" });
    }
  });

  it("una lengua desconocida es null y no un error", async () => {
    const found = await catalog.byId("no-existe");

    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value).toBeNull();
    }
  });
});
