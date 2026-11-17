/**
 * Documentos de texto para la comparación de corpus (S13): formatos, tope y
 * fallos esperados. Lo que lee los bytes es un adaptador
 * (`ports/document-reader.ts`); aquí vive lo que se decide sin abrirlos.
 */
import { err, ok, type Result } from "../result";

export type DocumentFormat = "txt" | "docx" | "pdf";

export interface ExtractedDocument {
  readonly name: string;
  readonly format: DocumentFormat;
  readonly text: string;
  /** Páginas de un PDF; los demás formatos no las tienen. */
  readonly pages?: number;
}

export type DocumentReadError =
  | { readonly code: "unsupported-format" }
  | { readonly code: "too-large"; readonly bytes: number; readonly limit: number }
  /** El archivo dice ser .docx o PDF pero no se puede abrir. */
  | { readonly code: "corrupt"; readonly detail: string }
  /** PDF con contraseña: su texto no se puede leer sin ella. */
  | { readonly code: "encrypted" }
  /** Abre, pero no trae texto: un PDF escaneado o un documento vacío. */
  | { readonly code: "no-text" }
  /** El lector (pdf.js) no se pudo descargar: se puede volver a intentar. */
  | { readonly code: "reader-unavailable" };

/**
 * Tope por archivo. Un .docx o un PDF de texto de 10 MB ya son cientos de
 * páginas; por encima casi siempre son imágenes, que no aportan texto y sí
 * memoria.
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value);

/** `PK\x03\x04`: un ZIP, que es lo que es un .docx por dentro. */
const ZIP = [0x50, 0x4b, 0x03, 0x04];
/** `%PDF-` */
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * El formato se decide por el contenido y no por la extensión: un .pdf que no
 * empieza por `%PDF-` no es un PDF, aunque se llame así. La extensión solo
 * decide si un archivo sin firma se lee como texto plano.
 */
export const detectDocumentFormat = (
  name: string,
  bytes: Uint8Array,
): Result<DocumentFormat, DocumentReadError> => {
  if (bytes.length > MAX_DOCUMENT_BYTES) {
    return err({ code: "too-large", bytes: bytes.length, limit: MAX_DOCUMENT_BYTES });
  }
  if (startsWith(bytes, PDF)) return ok("pdf");
  if (startsWith(bytes, ZIP)) return ok("docx");
  if (/\.(txt|md|text)$/i.test(name)) return ok("txt");
  return err({ code: "unsupported-format" });
};
