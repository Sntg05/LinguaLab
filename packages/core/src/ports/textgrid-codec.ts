import type { AnnotationDocument } from "../domain/index";
import type { Result } from "../result";

/**
 * Fallos al leer o escribir un TextGrid.
 *
 * `line` es opcional y de base 1: un archivo mal formado casi siempre se
 * explica en una linea concreta, y sin ese numero el mensaje obliga a la
 * persona a buscar a mano. `gap-detected` no implica que el archivo sea
 * invalido en abstracto, sino que rompe una invariante que este modelo exige.
 */
export type TextGridError =
  | { readonly code: "empty" }
  | { readonly code: "unreadable-encoding"; readonly detail?: string }
  | { readonly code: "malformed-header"; readonly detail: string; readonly line?: number }
  | { readonly code: "malformed-tier"; readonly detail: string; readonly line?: number }
  | { readonly code: "unsupported-object-class"; readonly detail: string; readonly line?: number }
  | { readonly code: "gap-detected"; readonly detail: string; readonly line?: number };

/**
 * Puerto de lectura y escritura de TextGrid de Praat.
 *
 * `parse` es sincrono a proposito: el analisis del texto ya esta en memoria,
 * no hay E/S que esperar y devolver una promesa solo agregaria ruido. Si un
 * adaptador necesitara asincronia real, seria senal de que esta haciendo algo
 * que no le toca.
 */
export interface TextGridCodecPort {
  parse(bytes: Uint8Array): Result<AnnotationDocument, TextGridError>;
  serialize(doc: AnnotationDocument): string;
}
