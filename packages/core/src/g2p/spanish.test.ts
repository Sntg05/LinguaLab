import { describe, expect, it } from "vitest";
import { transcribeSpanish } from "./spanish";

const es = (text: string, options = {}) => transcribeSpanish(text, options).ipa;

/**
 * Transcripciones de referencia según la descripción de Hualde (2013): nivel
 * fonémico, acento delante de la sílaba tónica y punto entre sílabas.
 */
describe("transcriptor de español: nivel fonémico, variedad latinoamericana", () => {
  it.each([
    ["casa", "ˈka.sa"],
    ["perro", "ˈpe.ro"],
    ["pero", "ˈpe.ɾo"],
    ["zapato", "sa.ˈpa.to"],
    ["cielo", "ˈsje.lo"],
    ["llave", "ˈʝa.be"],
    ["allá", "a.ˈʝa"],
    ["pingüino", "pin.ˈɡwi.no"],
    ["guerra", "ˈɡe.ra"],
    ["guitarra", "ɡi.ˈta.ra"],
    ["queso", "ˈke.so"],
    ["hueso", "ˈwe.so"],
    ["examen", "ek.ˈsa.men"],
    ["ciudad", "sju.ˈdad"],
    ["jamón", "xa.ˈmon"],
    ["honra", "ˈon.ra"],
    ["niño", "ˈni.ɲo"],
    ["chico", "ˈt͡ʃi.ko"],
    ["país", "pa.ˈis"],
    ["día", "ˈdi.a"],
    ["estoy", "es.ˈtoj"],
    ["transporte", "tɾans.ˈpoɾ.te"],
    ["abogado", "a.bo.ˈɡa.do"],
    ["jardín", "xaɾ.ˈdin"],
    ["águila", "ˈa.ɡi.la"],
    ["cuidado", "kwi.ˈda.do"],
    ["rey", "rej"],
    ["alrededor", "al.re.de.ˈdoɾ"],
  ])("%s → %s", (word, ipa) => {
    expect(es(word)).toBe(ipa);
  });

  it("lee la x de los topónimos mexicanos como /x/ y la x inicial como /s/", () => {
    expect(es("México")).toBe("ˈme.xi.ko");
    expect(es("xilófono")).toBe("si.ˈlo.fo.no");
  });

  it("transcribe una frase palabra por palabra y conserva el orden", () => {
    expect(es("El niño juega en el jardín.")).toBe("el ˈni.ɲo ˈxwe.ɡa en el xaɾ.ˈdin");
  });
});

describe("transcriptor de español: opciones", () => {
  it("con distinción, c y z ante e, i dan /θ/", () => {
    expect(es("zapato cielo", { variety: "castilian" })).toBe("θa.ˈpa.to ˈθje.lo");
  });

  it("en el nivel fonético muestra las aproximantes y la asimilación de nasales", () => {
    const phonetic = { level: "phonetic" as const };
    expect(es("abogado", phonetic)).toBe("a.βo.ˈɣa.ðo");
    expect(es("un vaso", phonetic)).toBe("um ˈba.so");
    expect(es("ángel", phonetic)).toBe("ˈaŋ.xel");
    expect(es("el dedo", phonetic)).toBe("el ˈde.ðo");
  });

  it("informa lo que no pudo transcribir en vez de inventarlo", () => {
    const result = transcribeSpanish("casa 123 ¿qué?");
    expect(result.ipa).toBe("ˈka.sa ke");
    expect(result.skipped).toEqual(["123"]);
  });
});
