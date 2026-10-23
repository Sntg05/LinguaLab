import type { AnnotationDocument } from "../domain/index";
import type { Result } from "../result";

/** Fallos del almacenamiento local de anotaciones. */
export type AnnotationStorageError =
  | { readonly code: "storage-unavailable"; readonly detail?: string }
  | { readonly code: "quota-exceeded"; readonly detail?: string }
  | { readonly code: "unknown"; readonly detail: string }
  /**
   * Lo guardado bajo esa clave no tiene forma de proyecto de anotacion. Lo
   * produce `load` cuando el registro no pasa el guard de forma: otro proyecto,
   * un documento a medio escribir o una capa sin contenido. Quien consume el
   * puerto tiene que poder distinguirlo de un fallo de la base y NO borrar el
   * registro: lo anterior se pierde solo si la persona lo decide.
   */
  | { readonly code: "invalid-record"; readonly detail: string }
  /**
   * Lo guardado viene de una version de esquema que este codigo no sabe leer.
   * Lo produce `load`, y lleva los dos numeros: `version` es la que se
   * encontro en disco y `supportedVersion` la que este codigo entiende. Sin
   * los dos, quien lee no sabe si migrar hacia adelante o no tocar nada.
   */
  | {
      readonly code: "unsupported-schema-version";
      readonly version: number;
      readonly supportedVersion: number;
      readonly detail: string;
    };

/**
 * Puerto de persistencia de anotaciones por proyecto.
 *
 * Igual que en el repositorio de tablas, `load` devuelve `null` cuando el
 * proyecto no existe: abrir un proyecto nuevo es un caso normal y no debe
 * llegar como error. `list` devuelve solo los identificadores porque lo unico
 * que hace falta para pintar el selector de proyectos.
 */
export interface AnnotationStoragePort {
  load(projectId: string): Promise<Result<AnnotationDocument | null, AnnotationStorageError>>;
  save(projectId: string, doc: AnnotationDocument): Promise<Result<void, AnnotationStorageError>>;
  list(): Promise<Result<readonly string[], AnnotationStorageError>>;
  remove(projectId: string): Promise<Result<void, AnnotationStorageError>>;
}
