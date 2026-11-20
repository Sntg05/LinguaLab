/**
 * Lectura de documentos (.txt, .docx y PDF) para la comparación de corpus (S13).
 *
 * Subpath propio (`@lingualab/adapters/document`) por la misma razón que
 * `experiment`: el composition root lo importa en el momento de leer el primer
 * archivo, y una página que nunca compara documentos no lo descarga. pdf.js va
 * un paso más lejos: solo se pide al leer el primer PDF.
 */
import { createDocumentReader } from "./document-reader";
import { createPdfTextReader } from "./pdf";
import { loadBrowserPdfjs } from "./pdf-browser";

export { createDocumentReader, decodePlainText, type PdfTextReader } from "./document-reader";
export { createPdfTextReader, type PdfjsLike } from "./pdf";

/** El lector que usa el sitio: .txt y .docx aquí, PDF con pdf.js y su worker. */
export const createBrowserDocumentReader = () =>
  createDocumentReader({ readPdf: createPdfTextReader(loadBrowserPdfjs) });
