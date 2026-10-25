/* ============================================================
   LinguaLab — mensajes de the map of Colombia's languages (segment 10)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo `map.`
   —no `languages.`— porque el catalogo de herramientas ya ocupa `catalog.*` y
   el mapa necesita un prefijo propio, corto y sin solapamientos. Una prueba
   comprueba que no se repitan entre modulos, que existan en los dos idiomas y
   que el prefijo se respete.
   ============================================================ */

export const languagesEn = {
  "map.eyebrow": "Language map",
  "map.title": "Colombia's languages",
  "map.lead":
    "A browsable map of the languages Glottolog records in Colombia, with their family, Glottocode, ISO 639-3 code and the link to the source record. The table is the content; the map helps you place them.",
  "map.offline":
    "The country outline and the data travel inside the page: no map tile and no file from another server is downloaded.",
  "map.data.version": "Glottolog {version} · data retrieved on {date}",
  "map.data.source": "Source dataset",
  "map.data.geometry": "Outline: Natural Earth 1:10m, public domain.",
  "map.respect":
    "Names and locations come from academic sources and may not reflect how peoples name themselves.",
  "map.corrections": "Suggest a correction",
  "map.composition":
    "The list is the one Glottolog assigns to Colombia. Besides the indigenous languages it includes the Indo-European family ones —Spanish, Portuguese, Palenquero and San Andrés Creole— and the country's two sign languages: they appear with their family so the filter lets you leave them out.",
  "map.filter.family": "Language family",
  "map.filter.allFamilies": "All families",
  "map.filter.search": "Search by name",
  "map.filter.searchPlaceholder": "e.g. Wayuunaiki",
  "map.family.none": "No family in Glottolog",
  "map.count": "Showing {count} of {total} languages",
  "map.empty": "No language matches that family and that search.",
  "map.map.caption":
    "One dot per language, placed with the latitude and longitude Glottolog publishes. The frame is Colombia: a language whose coordinates fall outside the country, or that has no coordinates, is not drawn here and does appear in the lists.",
  "map.table.caption": "Colombia's languages with coordinates, ordered by name",
  "map.table.language": "Language",
  "map.table.family": "Family",
  "map.table.glottocode": "Glottocode",
  "map.table.iso": "ISO 639-3",
  "map.table.source": "Record",
  "map.table.sourceLink": "Glottolog",
  "map.iso.none": "No code published",
  "map.detail.title": "Language detail",
  "map.detail.empty": "Choose a language from the table to see its record here.",
  "map.detail.glottolog": "Glottolog record",
  "map.noCoords.title": "No location",
  "map.noCoords.lead":
    "Glottolog publishes no coordinates for these languages, so they are not drawn on the map and are listed separately. No location was invented.",
} as const;
