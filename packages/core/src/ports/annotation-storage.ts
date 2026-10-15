import type { AnnotationDocument } from "../domain/index";
import type { Result } from "../result";

/** Fallos del almacenamiento local de anotaciones. */
export type AnnotationStorageError =
  | { readonly code: "storage-unavailable"; readonly detail?: string }
  | { readonly code: "quota-exceeded"; readonly detail?: string }
  | { readonly code: "unknown"; readonly detail: string };

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
