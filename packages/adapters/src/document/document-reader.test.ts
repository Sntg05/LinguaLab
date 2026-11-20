import { readFile } from "node:fs/promises";
import { detectDocumentFormat, MAX_DOCUMENT_BYTES, ok } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { createDocumentReader, decodePlainText } from "./document-reader";
import { docxXmlToText } from "./docx";
import { readZipEntry } from "./zip";

const fixture = (name: string): Promise<Uint8Array> =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url));

/** El texto que escribió pandoc a partir de `fixtures/source.md`. */
const SAMPLE_TEXT = [
  "Informe de campo",
  "La lengua se habla en la casa, con la abuela.",
  "En la escuela solo se usaba el español; los niños callaban.",
  'Precio: 5 € & "comillas" <etiqueta> — Ñandú, pingüino.',
].join("\n");

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("detectDocumentFormat", () => {
  it("decides by content, not by extension", () => {
    expect(detectDocumentFormat("informe.txt", bytes("%PDF-1.7 ..."))).toEqual(ok("pdf"));
    expect(detectDocumentFormat("informe.pdf", new Uint8Array([0x50, 0x4b, 3, 4]))).toEqual(
      ok("docx"),
    );
    expect(detectDocumentFormat("notas.TXT", bytes("hola"))).toEqual(ok("txt"));
    expect(detectDocumentFormat("informe.pdf", bytes("no soy un pdf"))).toEqual({
      ok: false,
      error: { code: "unsupported-format" },
    });
  });

  it("refuses a file over the limit before reading it", () => {
    expect(detectDocumentFormat("big.txt", new Uint8Array(MAX_DOCUMENT_BYTES + 1))).toEqual({
      ok: false,
      error: { code: "too-large", bytes: MAX_DOCUMENT_BYTES + 1, limit: MAX_DOCUMENT_BYTES },
    });
  });
});

describe("reading a .docx made by pandoc", () => {
  const reader = createDocumentReader();

  it("returns the paragraphs in order, with entities and non-ASCII letters decoded", async () => {
    expect(await reader.read("sample.docx", await fixture("sample.docx"))).toEqual(
      ok({ name: "sample.docx", format: "docx", text: SAMPLE_TEXT }),
    );
  });

  it("reads the same text when the entries are stored without compression", async () => {
    const result = await reader.read("stored.docx", await fixture("stored.docx"));
    expect(result.ok && result.value.text).toBe(SAMPLE_TEXT);
  });

  it("stops decompressing past the size limit instead of trusting the archive", async () => {
    const result = await readZipEntry(await fixture("sample.docx"), "word/document.xml", 100);
    expect(result).toEqual({ ok: false, error: { code: "too-large", limit: 100 } });
  });

  it("treats a ZIP without word/document.xml as another format", async () => {
    const result = await readZipEntry(await fixture("sample.docx"), "word/missing.xml", 1000);
    expect(result).toEqual({
      ok: false,
      error: { code: "missing-entry", name: "word/missing.xml" },
    });
  });

  it("reports a truncated .docx as corrupt", async () => {
    const whole = await fixture("sample.docx");
    expect(await reader.read("cut.docx", whole.subarray(0, 2000))).toEqual({
      ok: false,
      error: { code: "corrupt", detail: "not-a-zip" },
    });
  });
});

describe("docxXmlToText", () => {
  it("keeps tabs and line breaks, and drops deleted text and fallback copies", () => {
    const xml = [
      '<w:body><w:p><w:r><w:t>uno</w:t><w:tab/><w:t xml:space="preserve"> dos</w:t></w:r></w:p>',
      "<w:p><w:r><w:t>tres</w:t><w:br/><w:t>cuatro</w:t><w:delText>borrado</w:delText></w:r></w:p>",
      "<w:p><mc:AlternateContent><mc:Choice><w:t>cuadro</w:t></mc:Choice>",
      "<mc:Fallback><w:t>cuadro</w:t></mc:Fallback></mc:AlternateContent></w:p>",
      "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>celda &#241; &#xE9;</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>",
    ].join("");
    expect(docxXmlToText(xml)).toBe("uno\t dos\ntres\ncuatro\ncuadro\ncelda ñ é");
  });
});

describe("docxXmlToText with hostile entities", () => {
  it("leaves a character number outside Unicode as written instead of throwing", () => {
    expect(docxXmlToText("<w:p><w:t>a &#x110000; b &#99999999;</w:t></w:p>")).toBe(
      "a &#x110000; b &#99999999;",
    );
  });
});

describe("plain text", () => {
  it("reads UTF-8, drops the byte-order mark, and falls back to Windows-1252", () => {
    expect(decodePlainText(bytes("﻿niño"))).toBe("niño");
    expect(decodePlainText(new Uint8Array([0x6e, 0x69, 0xf1, 0x6f]))).toBe("niño");
  });

  it("refuses an empty document and an unknown format, and a PDF without a PDF reader", async () => {
    const reader = createDocumentReader();
    expect(await reader.read("vacio.txt", bytes("  \n "))).toEqual({
      ok: false,
      error: { code: "no-text" },
    });
    expect(await reader.read("datos.bin", bytes("xyz"))).toEqual({
      ok: false,
      error: { code: "unsupported-format" },
    });
    expect(await reader.read("a.pdf", bytes("%PDF-1.4"))).toEqual({
      ok: false,
      error: { code: "unsupported-format" },
    });
  });

  it("passes a PDF to the injected reader and keeps its page count", async () => {
    const reader = createDocumentReader({ readPdf: async () => ok({ text: "hola", pages: 3 }) });
    expect(await reader.read("a.pdf", bytes("%PDF-1.4"))).toEqual(
      ok({ name: "a.pdf", format: "pdf", text: "hola", pages: 3 }),
    );
  });
});
