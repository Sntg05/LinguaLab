import { describe, expect, it } from "vitest";
import {
  busyMessage,
  compareWithTable,
  describePhonemizeError,
  doneMessage,
  listSkipped,
  phonemizeOptions,
  variantLine,
} from "./rules";

describe("phonemizeOptions", () => {
  it("lee la variedad y el nivel de los selectores", () => {
    expect(phonemizeOptions("castilian", "phonetic")).toEqual({
      variety: "castilian",
      level: "phonetic",
    });
  });

  it("sin selector, o con un valor desconocido, usa el latinoamericano y el nivel fonológico", () => {
    expect(phonemizeOptions(undefined, undefined)).toEqual({
      variety: "latin-american",
      level: "phonemic",
    });
    expect(phonemizeOptions("rioplatense", "narrow")).toEqual({
      variety: "latin-american",
      level: "phonemic",
    });
  });
});

describe("busyMessage", () => {
  it("en inglés avisa de la descarga del diccionario, con su tamaño", () => {
    expect(busyMessage("eng", true)).toMatch(/diccionario de inglés \(~1 MB\)/);
    expect(busyMessage("eng", false)).toMatch(/English dictionary \(~1 MB\)/);
  });

  it("en español no promete ninguna descarga", () => {
    expect(busyMessage("spa", true)).toBe("Transcribiendo…");
    expect(busyMessage("spa", false)).toBe("Transcribing…");
  });
});

describe("doneMessage", () => {
  it("sin palabras saltadas recuerda que es una transcripción de referencia", () => {
    expect(doneMessage(0, true)).toMatch(/^Listo\. Es una transcripción de referencia/);
    expect(doneMessage(0, false)).toMatch(/^Done\. This is a reference transcription/);
  });

  it("con palabras saltadas dice cuántas y cómo se marcan", () => {
    expect(doneMessage(2, true)).toBe(
      "Listo, con 2 palabra(s) sin transcribir: están marcadas entre ⟨ ⟩.",
    );
    expect(doneMessage(1, false)).toBe(
      "Done, with 1 word(s) left untranscribed: they are marked between ⟨ ⟩.",
    );
  });
});

describe("describePhonemizeError", () => {
  it("una lengua no admitida nombra la lengua y no inventa resultado", () => {
    const message = describePhonemizeError(
      { code: "unsupported-language", languageCode: "fra" },
      true,
      "spa",
    );
    expect(message).toContain("«fra»");
    expect(message).toContain("No hay resultado inventado");
  });

  it("sin código de lengua en el error, nombra la elegida en el selector", () => {
    expect(describePhonemizeError({ code: "unsupported-language" }, false, "deu")).toContain(
      "“deu”",
    );
  });

  it("si falta el diccionario, dice que el español no lo necesita y añade el detalle", () => {
    const message = describePhonemizeError(
      { code: "engine-unavailable", detail: "HTTP 404" },
      true,
      "eng",
    );
    expect(message).toContain("el español no lo necesita");
    expect(message).toMatch(/\(HTTP 404\)$/);
  });

  it("cualquier otro fallo lleva su detalle, o lo dice si no lo hay", () => {
    expect(describePhonemizeError({ code: "engine-failed", detail: "boom" }, true, "spa")).toBe(
      "El motor falló al fonemizar: boom.",
    );
    expect(describePhonemizeError({ code: "engine-failed" }, false, "spa")).toBe(
      "The engine failed while phonemizing: no detail.",
    );
  });
});

describe("compareWithTable", () => {
  it("aplica la tabla de demostración de la lengua y da su nombre", () => {
    const result = compareWithTable("casa", "spa", true);
    expect(result.kind).toBe("ok");
    expect(result.output).not.toBe("—");
    expect(result.caption).not.toBe("");
  });

  it("sin tabla para la lengua, no compara y lo dice", () => {
    expect(compareWithTable("bonjour", "fra", true)).toEqual({
      kind: "no-table",
      output: "—",
      caption: "No hay tabla para esta lengua, así que no hay comparación.",
    });
  });

  it("un texto que la tabla deja vacío se muestra como raya, no como resultado en blanco", () => {
    expect(compareWithTable("   ", "spa", false).output).toBe("—");
  });
});

describe("palabras sin resolver", () => {
  it("lista cada palabra saltada una sola vez, en orden de aparición", () => {
    expect(listSkipped(["xyz", "abc", "xyz"])).toBe("xyz, abc");
  });

  it("une las variantes de una palabra con la tilde de alternancia", () => {
    expect(variantLine({ word: "read", ipa: ["ɹiːd", "ɹɛd"] })).toBe("read: ɹiːd ~ ɹɛd");
  });
});
