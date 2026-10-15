import type { OrthographyTable } from "../domain/orthography-table";

/**
 * Plantillas vacias para las lenguas indigenas de la audiencia
 * (especificacion S10).
 *
 * NO SE INVENTA NI UN SOLO PAR GRAFEMA -> AFI
 *
 * Una tabla de ortografia es una afirmacion sobre como se escribe una lengua,
 * y equivocarse tiene consecuencias: una transcripcion incorrecta con
 * apariencia tecnica es mas dificil de desmentir que una ausencia declarada.
 * Por eso estas cuatro plantillas nacen con `rules: []`, `status: "draft"` y
 * un aviso que no se puede borrar sin que una prueba se ponga en rojo.
 *
 * Los codigos ISO 639-3 y los Glottocodes se verificaron en iso639-3.sil.org,
 * que coincide con Glottolog; van en `notes` para que la fuente sea citable.
 */

/**
 * Aviso obligatorio. Se exporta para que la prueba lo compare contra la misma
 * cadena y para que la interfaz pueda mostrarlo sin volver a escribirlo.
 */
export const COMMUNITY_VALIDATION_NOTICE =
  "Esta tabla debe construirse y validarse con hablantes y fuentes ling\u00fc\u00edsticas de la comunidad";

const template = (
  id: string,
  languageId: string,
  name: string,
  glottocode: string,
): OrthographyTable => ({
  id,
  languageId,
  name,
  version: 1,
  classes: {},
  rules: [],
  notes: `Plantilla vacia. Glottocode: ${glottocode} (fuente: iso639-3.sil.org, coincide con Glottolog). ${COMMUNITY_VALIDATION_NOTICE}`,
  status: "draft",
});

export const INGA_TEMPLATE: OrthographyTable = template(
  "inb-template",
  "inb",
  "Inga (plantilla)",
  "inga1252",
);

export const WAYUUNAIKI_TEMPLATE: OrthographyTable = template(
  "guc-template",
  "guc",
  "Wayuunaiki (plantilla)",
  "wayu1243",
);

export const NASA_YUWE_TEMPLATE: OrthographyTable = template(
  "pbb-template",
  "pbb",
  "Nasa Yuwe (plantilla)",
  "paez1247",
);

export const ARHUACO_TEMPLATE: OrthographyTable = template(
  "arh-template",
  "arh",
  "Arhuaco (plantilla)",
  "arhu1242",
);

export const INDIGENOUS_TEMPLATES: readonly OrthographyTable[] = [
  INGA_TEMPLATE,
  WAYUUNAIKI_TEMPLATE,
  NASA_YUWE_TEMPLATE,
  ARHUACO_TEMPLATE,
];
