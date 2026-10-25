/* ============================================================
   LinguaLab — mensajes de el mapa de lenguas de Colombia (segmento 10)

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

export const languagesEs = {
  "map.eyebrow": "Mapa de lenguas",
  "map.title": "Lenguas de Colombia",
  "map.lead":
    "Un mapa consultable de las lenguas que Glottolog registra en Colombia, con su familia, su Glottocode, su código ISO 639-3 y el enlace a la ficha de origen. La tabla es el contenido; el mapa es una ayuda para ubicarlas.",
  "map.offline":
    "El contorno del país y los datos viajan dentro de la página: no se descarga ninguna tesela ni ningún archivo de otro servidor.",
  "map.data.version": "Glottolog {version} · datos recuperados el {date}",
  "map.data.source": "Dataset de origen",
  "map.data.geometry": "Contorno: Natural Earth 1:10m, de dominio público.",
  "map.respect":
    "Los nombres y las ubicaciones provienen de fuentes académicas y pueden no reflejar la autodenominación de los pueblos.",
  "map.corrections": "Sugerir una corrección",
  "map.composition":
    "La lista es la que Glottolog asigna a Colombia. Además de las lenguas indígenas incluye las de familia indoeuropea —español, portugués, palenquero y criollo de San Andrés— y las dos lenguas de señas del país: aparecen con su familia para que el filtro permita dejarlas fuera.",
  "map.filter.family": "Familia lingüística",
  "map.filter.allFamilies": "Todas las familias",
  "map.filter.search": "Buscar por nombre",
  "map.filter.searchPlaceholder": "Ej.: wayuunaiki",
  "map.family.none": "Sin familia en Glottolog",
  "map.count": "Mostrando {count} de {total} lenguas",
  "map.empty": "Ninguna lengua coincide con esa familia y esa búsqueda.",
  "map.map.caption":
    "Un punto por lengua, ubicado con la latitud y la longitud que publica Glottolog. El encuadre es Colombia: una lengua cuyas coordenadas caen fuera del país, o que no tiene coordenadas, no se dibuja acá y sí aparece en las listas.",
  "map.table.caption": "Lenguas de Colombia con coordenadas, ordenadas por nombre",
  "map.table.language": "Lengua",
  "map.table.family": "Familia",
  "map.table.glottocode": "Glottocode",
  "map.table.iso": "ISO 639-3",
  "map.table.source": "Ficha",
  "map.table.sourceLink": "Glottolog",
  "map.iso.none": "Sin código publicado",
  "map.detail.title": "Detalle de la lengua",
  "map.detail.empty": "Elegí una lengua de la tabla para ver su ficha acá.",
  "map.detail.glottolog": "Ficha en Glottolog",
  "map.noCoords.title": "Sin ubicación",
  "map.noCoords.lead":
    "Glottolog no publica coordenadas para estas lenguas, así que no se dibujan en el mapa y se listan aparte. No se inventó ninguna ubicación.",
} as const;
