import type { OrthographyTable, OrthographyTableStatus } from "../domain/index";
import type { Result } from "../result";

/**
 * Version resumida de una tabla para las listas de la interfaz.
 *
 * Existe para que `list()` no tenga que cargar `rules` y `classes` de todas
 * las tablas solo para dibujar el catalogo: `ruleCount` es el unico dato
 * derivado que la lista necesita.
 */
export interface OrthographyTableSummary {
  readonly id: string;
  readonly name: string;
  readonly languageId: string;
  readonly status: OrthographyTableStatus;
  readonly ruleCount: number;
}

/** Fallos del almacenamiento de tablas de ortografia. */
export type OrthographyRepositoryError =
  | { readonly code: "not-found"; readonly id: string }
  | { readonly code: "invalid-json"; readonly detail: string }
  | { readonly code: "invalid-table"; readonly detail: string }
  | { readonly code: "storage-unavailable"; readonly detail?: string }
  | { readonly code: "quota-exceeded"; readonly detail?: string }
  | { readonly code: "unknown"; readonly detail: string };

/**
 * Puerto de persistencia de tablas de ortografia.
 *
 * `get` devuelve `null` en lugar de un error cuando la tabla no existe PORQUE
 * la ausencia es una respuesta normal, no un fallo: preguntar por una tabla
 * que aun no se ha creado es el primer paso del flujo de creacion, y obligar a
 * quien llama a distinguir "no esta" de "se rompio el almacenamiento" mediante
 * una excepcion o un codigo especial es justo lo que este tipo evita. Los
 * errores quedan reservados para lo que si fallo: almacenamiento caido, cupo
 * agotado, JSON ilegible.
 *
 * `exportJson` e `importJson` viven en el puerto y no en un caso de uso porque
 * el formato de serializacion es una decision del adaptador: manana puede ser
 * un JSON distinto sin tocar al consumidor.
 */
export interface OrthographyRepositoryPort {
  list(): Promise<Result<readonly OrthographyTableSummary[], OrthographyRepositoryError>>;
  get(id: string): Promise<Result<OrthographyTable | null, OrthographyRepositoryError>>;
  save(table: OrthographyTable): Promise<Result<OrthographyTable, OrthographyRepositoryError>>;
  remove(id: string): Promise<Result<void, OrthographyRepositoryError>>;
  exportJson(id: string): Promise<Result<string, OrthographyRepositoryError>>;
  importJson(text: string): Promise<Result<OrthographyTable, OrthographyRepositoryError>>;
}
