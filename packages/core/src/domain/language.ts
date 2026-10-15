/**
 * `Language`: la lengua como entidad del catalogo.
 *
 * El `id` es un codigo ISO 639-3 (tres letras, por ejemplo `spa`) o un
 * Glottocode (por ejemplo `wayu1243`). La ambiguedad es deliberada: ISO 639-3
 * cubre lenguas con codigo asignado, pero muchas lenguas indigenas de Colombia
 * solo tienen Glottocode o su codigo ISO esta en revision. El consumidor no
 * debe asumir cual de los dos esquemas recibio; si necesita distinguirlos, la
 * fuente debe decirlo aparte.
 *
 * `name` es el nombre con el que una persona reconoce la lengua —como aparece
 * en un catalogo o en una busqueda—, no necesariamente el autónimo que usan
 * sus hablantes. El autónimo es un dato linguisticamente distinto y merece su
 * propio campo el dia que haga falta.
 */

/** Las tres familias de la audiencia: indigenas, nacionales y el resto. */
export type LanguageKind = "indigenous" | "national" | "other";

export interface Language {
  readonly id: string;
  readonly name: string;
  readonly kind: LanguageKind;
}
