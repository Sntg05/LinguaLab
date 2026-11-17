/**
 * Lectura de documentos (.txt, .docx y PDF) para la comparación de corpus (S13).
 *
 * Subpath propio (`@lingualab/adapters/document`) por la misma razón que
 * `experiment`: el composition root lo importa en el momento de leer el primer
 * archivo, y una página que nunca compara documentos no lo descarga.
 */
export { createDocumentReader, decodePlainText, type PdfTextReader } from "./document-reader";
