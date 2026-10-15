import type { G2PRule } from "./g2p-rule";

/**
 * `OrthographyTable`: la tabla de reglas grafema -> AFI de una lengua.
 *
 * Es una entidad, no un archivo: la version, el estado y las notas viajan con
 * ella. El formato de serializacion (JSON) es cosa del adaptador, no de este
 * tipo (ver `OrthographyRepositoryPort`).
 */

export type OrthographyTableStatus = "draft" | "reviewed";

export interface OrthographyTable {
  readonly id: string;
  readonly languageId: string;
  readonly name: string;
  readonly version: number;
  /**
   * Clases con nombre, por ejemplo `{ V: ["a", "e", "i", "o", "u"] }`. Las
   * reglas referencian estas clases en `before`/`after` con corchetes, asi que
   * el vocabulario lo define la tabla y no el motor: anadir una vocal nueva a
   * una lengua no exige tocar codigo.
   */
  readonly classes: Readonly<Record<string, readonly string[]>>;
  /** Reglas de la capa fonemica; la que se aplica por defecto. */
  readonly rules: readonly G2PRule[];
  /**
   * Segunda pasada alofonica opcional (especificacion S7): sobre la salida de
   * la capa fonemica, reemplaza alofonos por sus variantes contextuales. Es
   * opcional a proposito, porque una tabla util se puede construir sin ella.
   */
  readonly allophonic?: readonly G2PRule[];
  readonly notes?: string;
  /**
   * Nace en `"draft"` a proposito para lenguas indigenas (especificacion S10):
   * una tabla sin validar con hablantes no puede presentarse como revisada.
   * Solo pasa a `"reviewed"` cuando existe evidencia citable que la respalde.
   */
  readonly status: OrthographyTableStatus;
}
