import type { DocumentReadError, ExtractedDocument } from "../domain/document";
import type { Result } from "../result";

/**
 * Puerto de lectura de documentos: bytes de un archivo → su texto.
 *
 * La comparación de documentos (S13) recibe .txt, .docx y PDF. El núcleo no
 * sabe descomprimir un ZIP ni leer un PDF: eso es de los adaptadores. Lo que sí
 * decide el núcleo es el contrato —qué formatos existen, cuánto puede pesar un
 * archivo y qué fallos son esperados— para que la interfaz los nombre sin
 * conocer al adaptador.
 */

export interface DocumentReaderPort {
  read(name: string, bytes: Uint8Array): Promise<Result<ExtractedDocument, DocumentReadError>>;
}
