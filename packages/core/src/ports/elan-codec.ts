import type { AnnotationDocument } from "../domain/index";
import type { Result } from "../result";

/** Fallos al leer o escribir un archivo ELAN (.eaf). */
export type ElanError =
  | { readonly code: "empty" }
  | { readonly code: "unreadable-encoding"; readonly detail?: string }
  | { readonly code: "malformed-xml"; readonly detail: string }
  | { readonly code: "unsupported-structure"; readonly detail: string }
  | { readonly code: "runtime-unavailable"; readonly detail?: string };

/**
 * Que se perdio en una conversion ELAN, agrupado por causa.
 *
 * Es un tipo estructurado y no una cadena de registro PORQUE la perdida es
 * informacion de primer nivel: el archivo ELAN admite jerarquias de capas,
 * referencias entre anotaciones y vocabularios controlados que el modelo
 * `AnnotationDocument` no representa, y quien convierte necesita ver la lista
 * exacta —y poder mostrarla— antes de dar por buena la conversion. Un
 * `console.warn` escondido no cumple esa funcion.
 */
export interface ElanLossReport {
  /** Capas con padre: el modelo de anotacion es plano y no puede anidarlas. */
  readonly hierarchicalTiers: readonly string[];
  /** Anotaciones que apuntan a otra anotacion en lugar de a un tramo de tiempo. */
  readonly annotationReferences: readonly string[];
  /** Vocabularios controlados (listas cerradas de valores) sin equivalente. */
  readonly controlledVocabularies: readonly string[];
}

/**
 * Puerto de conversion ELAN. Es asincrono porque el adaptador real carga
 * Pyodide en un worker; la firma ya lo contempla para que cambiar de
 * implementacion no obligue a cambiar a los consumidores.
 */
export interface ElanCodecPort {
  parse(bytes: Uint8Array): Promise<Result<AnnotationDocument, ElanError>>;
  serialize(doc: AnnotationDocument): Promise<Result<string, ElanError>>;
}
