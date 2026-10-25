import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectFormat, formatBytes, suggestedFileName } from "./format";

/**
 * La deteccion de formato se prueba con los MISMOS archivos que usa el e2e y el
 * codec. Si un dia el fixture cambia, esta prueba se entera antes que nadie.
 */
const fixture = (name: string): Uint8Array =>
  readFileSync(fileURLToPath(new URL(`../../../e2e/fixtures/${name}`, import.meta.url)));

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("detectFormat", () => {
  it("reconoce un .eaf por su declaracion XML", () => {
    expect(detectFormat(fixture("simple.eaf"))).toBe("eaf");
  });

  it("reconoce un .eaf truncado: sigue siendo XML aunque este roto", () => {
    expect(detectFormat(fixture("malformado.eaf"))).toBe("eaf");
  });

  it("reconoce un TextGrid por su cabecera", () => {
    expect(detectFormat(fixture("simple.TextGrid"))).toBe("textgrid");
  });

  it("reconoce un TextGrid guardado en UTF-16 por Praat", () => {
    const text = 'File type = "ooTextFile"\nObject class = "TextGrid"\n';
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    for (const [index, char] of [...text].entries()) {
      bytes[2 + index * 2] = char.charCodeAt(0);
    }
    expect(detectFormat(bytes)).toBe("textgrid");
  });

  it("acepta espacios y un BOM antes de la cabecera", () => {
    expect(detectFormat(bytesOf('\ufeff\n  File type = "ooTextFile"\n'))).toBe("textgrid");
    expect(detectFormat(bytesOf('\ufeff  <?xml version="1.0"?><ANNOTATION_DOCUMENT/>'))).toBe("eaf");
  });

  it("acepta un .eaf sin declaracion XML", () => {
    expect(detectFormat(bytesOf("<ANNOTATION_DOCUMENT VERSION=\"2.8\"/>"))).toBe("eaf");
  });

  it("no adivina con un archivo que no es de ninguno de los dos formatos", () => {
    expect(detectFormat(bytesOf("tier\tstart\tend\n"))).toBeNull();
    expect(detectFormat(new Uint8Array(0))).toBeNull();
  });
});

describe("suggestedFileName", () => {
  it("cambia la extension al formato de destino y conserva el nombre", () => {
    expect(suggestedFileName("sesion-01.eaf", "textgrid")).toBe("sesion-01.TextGrid");
    expect(suggestedFileName("sesion-01.TextGrid", "eaf")).toBe("sesion-01.eaf");
  });

  it("no duplica la extension cuando el nombre ya la trae en otra caja", () => {
    expect(suggestedFileName("campo.textgrid", "textgrid")).toBe("campo.TextGrid");
  });

  it("usa un nombre util cuando el archivo no trae ninguno", () => {
    expect(suggestedFileName("", "eaf")).toBe("lingualab.eaf");
  });
});

describe("formatBytes", () => {
  it("usa la unidad que corresponde al tamano", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(2048)).toBe("2 kB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
  });
});
