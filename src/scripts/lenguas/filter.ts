/* ============================================================
   LinguaLab — filtrado del mapa de lenguas

   POR QUE ESTA REGLA VIVE ACA Y NO EN EL COMPONENTE

   El mapa y la tabla se renderizan en el servidor; el navegador solo alterna
   `hidden`. Eso deja una sola decision que probar —que queda visible al elegir
   una familia y al escribir en el buscador— y esa decision es una funcion pura,
   probable sin DOM.

   La regla NO se reescribe: se delega en `filterCatalogue`, el mismo modulo que
   usan el catalogo de herramientas, el glosario y la bibliografia. Dos filtrados
   que se parecen terminan divergiendo en el detalle que alguien nota (tildes,
   mayusculas, varios terminos), y ese detalle es justo el que se prueba.
   ============================================================ */

import { filterCatalogue } from "../tools/catalogue";

/**
 * Valor de familia para las lenguas que Glottolog deja sin familia (aisladas).
 *
 * No puede ser la cadena vacia: en un `<select>` la cadena vacia ya significa
 * "todas las familias", y esas dos cosas son distintas para la persona que
 * filtra.
 */
export const NO_FAMILY = "sin-familia";

/** Lo que el filtro necesita saber de una lengua. */
export interface FilterableLanguage {
  readonly name: string;
  readonly family: string | null;
}

/** Estado de los dos controles del mapa. `""` significa "sin restringir". */
export interface LanguageFilters {
  readonly family: string;
  readonly query: string;
}

/**
 * Las lenguas que sobreviven a los filtros, en el orden recibido.
 *
 * Es generica en `T` para que el script del navegador pueda pasar filas del DOM
 * junto con su nombre y su familia, y recibir las mismas filas: asi no hay dos
 * representaciones que mantener en sincronia.
 */
export const filterLanguages = <T extends FilterableLanguage>(
  languages: readonly T[],
  filters: LanguageFilters,
): T[] =>
  filterCatalogue(languages, {
    facet: filters.family,
    query: filters.query,
    fields: (language) => [language.name],
    facetValue: (language) => language.family ?? NO_FAMILY,
  });
