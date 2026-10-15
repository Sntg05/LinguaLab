import type { Language } from "../domain/index";
import type { Result } from "../result";

/** Fallos al consultar el catalogo de lenguas. */
export type LanguageCatalogError =
  | { readonly code: "catalog-unavailable"; readonly detail?: string }
  | { readonly code: "unknown"; readonly detail: string };

/**
 * Puerto del catalogo de lenguas.
 *
 * `list` es asincrono aunque el fake lo resuelva al instante porque el
 * adaptador real puede leer un archivo de datos o una base local. `byId`
 * devuelve `null` cuando la lengua no esta en el catalogo: "no la conozco" es
 * una respuesta, no una falla.
 */
export interface LanguageCatalogPort {
  list(): Promise<Result<readonly Language[], LanguageCatalogError>>;
  byId(id: string): Promise<Result<Language | null, LanguageCatalogError>>;
}
