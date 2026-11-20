import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createDocumentReader } from "./document-reader";
import { createPdfTextReader, joinHyphenated, pageText, type PdfjsLike } from "./pdf";

const fixture = (name: string): Promise<Uint8Array> =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url));

/** La compilación de pdf.js para Node; en el navegador se carga con su worker. */
const loadNodePdfjs = async (): Promise<PdfjsLike> =>
  (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsLike;

const reader = createDocumentReader({ readPdf: createPdfTextReader(loadNodePdfjs) });

/** Las palabras, sin los espacios y saltos que cada extractor reparte a su manera. */
const words = (text: string): string[] => text.split(/\s+/).filter((word) => word !== "");

describe("reading a PDF made by xelatex", () => {
  it("extracts the same words as poppler's pdftotext, in the same order", async () => {
    const reference = new TextDecoder().decode(await fixture("sample.pdf.txt"));
    const result = await reader.read("sample.pdf", await fixture("sample.pdf"));
    if (!result.ok) throw new Error(`expected text, got ${result.error.code}`);

    expect(result.value.format).toBe("pdf");
    expect(result.value.pages).toBe(1);
    expect(words(result.value.text)).toEqual(words(reference));
    expect(result.value.text).toContain("Ñandú, pingüino");
  });

  it("refuses a PDF that only has an image, the way a scanned page looks", async () => {
    expect(await reader.read("escaneado.pdf", await fixture("image-only.pdf"))).toEqual({
      ok: false,
      error: { code: "no-text" },
    });
  });

  it("reports a broken PDF as corrupt instead of returning empty text", async () => {
    const whole = await fixture("sample.pdf");
    const result = await reader.read("roto.pdf", whole.subarray(0, 400));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toMatch(/^(corrupt|no-text)$/);
  });
});

describe("pdf text assembly", () => {
  it("turns end-of-line marks into line breaks", () => {
    expect(pageText([{ str: "una", hasEOL: true }, { str: "dos" }, { str: " tres" }])).toBe(
      "una\ndos tres",
    );
  });

  it("joins a word split by a hyphen only when the next line starts in lowercase", () => {
    expect(joinHyphenated("socio-\nlingüística")).toBe("sociolingüística");
    expect(joinHyphenated("Colombia-\nEcuador")).toBe("Colombia-\nEcuador");
    expect(joinHyphenated("pre-\nÉpoca")).toBe("pre-\nÉpoca");
  });

  it("names a reader that could not be downloaded, so the page can say to retry", async () => {
    const offline = createPdfTextReader(async () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    expect(await offline(new Uint8Array([1]))).toEqual({
      ok: false,
      error: { code: "reader-unavailable" },
    });
  });

  it("names a password-protected PDF instead of calling it corrupt", async () => {
    const locked: PdfjsLike = {
      getDocument: () => ({
        promise: Promise.reject(
          Object.assign(new Error("No password given"), { name: "PasswordException" }),
        ),
        destroy: async () => {},
      }),
    };
    expect(await createPdfTextReader(async () => locked)(new Uint8Array([1]))).toEqual({
      ok: false,
      error: { code: "encrypted" },
    });
  });
});
