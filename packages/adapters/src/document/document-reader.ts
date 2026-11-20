/**
 * El adaptador de `DocumentReaderPort`: .txt y .docx aquí, PDF por un lector
 * que se inyecta.
 *
 * El lector de PDF llega como función porque pdf.js pesa varios MB y solo se
 * descarga cuando alguien carga un PDF: quien construye este adaptador decide
 * cómo importarlo. Sin lector de PDF, un PDF es un formato no admitido, no un
 * fallo silencioso.
 */
import {
  type DocumentFormat,
  type DocumentReaderPort,
  type DocumentReadError,
  type ExtractedDocument,
  type Result,
  detectDocumentFormat,
  err,
  ok,
} from "@lingualab/core";
import { docxXmlToText } from "./docx";
import { readZipEntry } from "./zip";

/** El XML de un .docx de 10 MB no llega a esto; un ZIP que lo pasa es una bomba. */
const MAX_DOCX_XML_BYTES = 64 * 1024 * 1024;

export type PdfTextReader = (
  bytes: Uint8Array,
) => Promise<Result<{ readonly text: string; readonly pages: number }, DocumentReadError>>;

/** UTF-8 si lo es; si no, Windows-1252, que es lo que guarda un Bloc de notas antiguo. */
export const decodePlainText = (bytes: Uint8Array): string => {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
};

const readDocx = async (bytes: Uint8Array): Promise<Result<string, DocumentReadError>> => {
  const entry = await readZipEntry(bytes, "word/document.xml", MAX_DOCX_XML_BYTES);
  if (!entry.ok) {
    // Un ZIP sin `word/document.xml` no es un .docx (puede ser un .xlsx o un .odt).
    if (entry.error.code === "missing-entry") return err({ code: "unsupported-format" });
    return err({ code: "corrupt", detail: entry.error.code });
  }
  return ok(docxXmlToText(new TextDecoder().decode(entry.value)));
};

type Extracted = { readonly text: string; readonly pages?: number };

const extract = async (
  format: DocumentFormat,
  bytes: Uint8Array,
  readPdf: PdfTextReader | undefined,
): Promise<Result<Extracted, DocumentReadError>> => {
  if (format === "txt") return ok({ text: decodePlainText(bytes) });
  if (format === "docx") {
    const docx = await readDocx(bytes);
    return docx.ok ? ok({ text: docx.value }) : docx;
  }
  return readPdf === undefined ? err({ code: "unsupported-format" }) : readPdf(bytes);
};

export const createDocumentReader = (
  options: { readonly readPdf?: PdfTextReader } = {},
): DocumentReaderPort => ({
  read: async (name, bytes) => {
    const format = detectDocumentFormat(name, bytes);
    if (!format.ok) return format;
    const extracted = await extract(format.value, bytes, options.readPdf);
    if (!extracted.ok) return extracted;

    const { text, pages } = extracted.value;
    if (text.trim() === "") return err({ code: "no-text" });
    const document: ExtractedDocument =
      pages === undefined
        ? { name, format: format.value, text }
        : { name, format: format.value, text, pages };
    return ok(document);
  },
});
