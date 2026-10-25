/* ============================================================
   LinguaLab — mensajes de el conversor ELAN ↔ TextGrid (segmento 9)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `elan.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.

   QUE CLAVES NECESITA EL CLIENTE

   Las que empiezan por `elan.status.`, `elan.phase.`, `elan.error.`,
   `elan.note.` y los rotulos de `elan.export.` son frases que solo existen
   cuando alguien carga un archivo: no se pueden renderizar en la compilacion.
   El componente las serializa ya traducidas en un atributo `data-json` (ADR
   0004) y `src/scripts/elan/strings.ts` declara la lista exacta, tipada, para
   que una clave mal escrita rompa `npm run check` en vez de mostrar la clave
   cruda en la pagina.
   ============================================================ */

export const elanEs = {
  "elan.eyebrow": "Conversor",
  "elan.title": "ELAN ↔ TextGrid, sin salir del navegador",
  "elan.sub":
    "Carga un archivo .eaf de ELAN o un .TextGrid de Praat, mira sus capas y exporta en el otro formato. La conversión pasa por el mismo modelo de anotación que usa el visor, así que los tiempos y los textos no se reinterpretan por el camino.",
  "elan.local":
    "Los archivos se leen dentro de tu navegador. Nada se sube a ningún servidor y el motor de conversión se sirve desde este mismo sitio.",
  "elan.experimental":
    "Experimental. Conserva siempre el archivo original: esta herramienta traduce formatos y no sustituye a revisar el resultado en ELAN o en Praat.",
  "elan.load.title": "1. Carga un archivo",
  "elan.load.label": "Archivo .eaf o .TextGrid",
  "elan.load.hint":
    "El formato se detecta por el contenido del archivo, no por su extensión. Un .eaf que no sea XML, o un TextGrid que no empiece por su cabecera, se rechazan en vez de adivinar.",
  "elan.tiers.title": "2. Capas del archivo",
  "elan.tiers.empty": "Todavía no hay capas que mostrar.",
  "elan.tiers.name": "Capa",
  "elan.tiers.kind": "Tipo",
  "elan.tiers.items": "Elementos",
  "elan.tiers.sample": "Primer texto",
  "elan.tiers.count": "{count} capa(s)",
  "elan.kind.interval": "Intervalos",
  "elan.kind.point": "Puntos",
  "elan.export.title": "3. Exporta en el otro formato",
  "elan.export.hint":
    "Se exporta el archivo cargado, convertido al otro formato. El archivo original no se modifica: la descarga es un archivo nuevo.",
  "elan.export.textgrid": "Exportar como .TextGrid (Praat)",
  "elan.export.eaf": "Exportar como .eaf (ELAN)",
  "elan.loss.title": "Informe de pérdida",
  "elan.loss.intro":
    "ELAN admite estructuras que el modelo de anotación del visor no representa. Esto es lo que no se pudo convertir, agrupado por causa. Una lista vacía significa que por esa causa no se perdió nada.",
  "elan.loss.empty": "Carga un archivo para ver qué se conserva y qué no.",
  "elan.loss.none": "No se perdió nada: todo lo que traía el archivo se pudo convertir.",
  "elan.loss.causeEmpty": "Nada perdido por esta causa.",
  "elan.loss.pendingExport":
    "Un TextGrid no trae estructuras de ELAN que perder, así que aquí no hay nada que informar todavía. El informe se completa al exportar el .eaf, que es cuando se escribe el archivo.",
  "elan.loss.hierarchical": "Capas jerárquicas (tienen una capa padre)",
  "elan.loss.references": "Capas con anotaciones que apuntan a otra anotación",
  "elan.loss.vocabularies": "Vocabularios controlados",
  "elan.loss.notes": "Lo que cambió en la conversión",
  "elan.loss.notesEmpty": "La conversión no necesitó cambiar nada más.",
  "elan.limits":
    "Lo que esta herramienta no hace: alineación automática, traducción entre capas, ni copiar el audio. Tampoco decide por ti qué hacer con lo que se pierde: lo lista y exporta el resto.",
  "elan.status.idle": "Elige un archivo .eaf o .TextGrid.",
  "elan.status.reading": "Leyendo «{name}»…",
  "elan.status.loaded": "«{name}»: {format}, {count} capa(s). Listo para exportar.",
  "elan.status.exporting": "Convirtiendo y preparando la descarga…",
  "elan.status.exported": "Descargado «{name}». El archivo original no se tocó.",
  "elan.status.busy": "Paso {step} de {total}: {phase}",
  "elan.phase.runtime":
    "cargando el motor Python (unos 13 MB la primera vez, menos si el servidor comprime)",
  "elan.phase.wheel": "instalando pympi-ling desde este sitio",
  "elan.phase.convert": "convirtiendo el archivo",
  "elan.progress.label": "Carga del motor de conversión",
  "elan.format.eaf": "ELAN (.eaf)",
  "elan.format.textgrid": "Praat (.TextGrid)",
  "elan.error.read": "No se pudo leer el archivo: el navegador no entregó su contenido.",
  "elan.error.tooLarge":
    "El archivo pesa {size} y el tope de esta herramienta es {limit}. Recorta el tramo que necesites y vuelve a cargarlo: no se convirtió nada.",
  "elan.error.unknownFormat":
    "El archivo no parece un .eaf ni un .TextGrid. Un .eaf empieza por XML y un TextGrid por «File type = \"ooTextFile\"».",
  "elan.error.empty": "El archivo está vacío: no hay nada que convertir.",
  "elan.error.malformedXml":
    "El .eaf está mal formado: el XML no se puede leer. El archivo no se modificó.",
  "elan.error.unsupportedStructure":
    "El archivo es XML pero no tiene la estructura de un .eaf que esta herramienta sepa leer. El archivo no se modificó.",
  "elan.error.unreadableEncoding":
    "El archivo no está en una codificación que se pueda leer. Guárdalo en UTF-8 y vuelve a cargarlo.",
  "elan.error.runtimeUnavailable":
    "El motor de conversión no está disponible en este navegador: puede que no admita WebAssembly, que la política de seguridad lo bloquee o que los archivos de Pyodide no se hayan podido descargar de este sitio.",
  "elan.error.textgrid":
    "No se pudo leer el TextGrid ({code}). El archivo no se modificó: no se perdió nada.",
  "elan.error.detail": "Detalle técnico",
  "elan.note.gapFilled":
    "«{tier}»: {count} tramo(s) sin anotación se rellenaron con intervalos vacíos para que Praat abra el archivo.",
  "elan.note.referenceAnnotations":
    "«{tier}»: {count} anotación(es) apuntan a otra anotación en vez de a un tramo de tiempo, así que no se pueden convertir.",
  "elan.note.annotationWithoutTime":
    "«{tier}»: {count} anotación(es) apuntan a una ranura de tiempo sin valor y se omitieron.",
  "elan.note.tierEmpty": "La capa «{tier}» no tiene ninguna anotación.",
  "elan.note.overlapDetected":
    "«{tier}»: {count} anotación(es) se solapan. Praat puede rechazar el TextGrid exportado; conviene revisar el archivo en ELAN.",
  "elan.note.pointTierDropped":
    "La capa de puntos «{tier}» ({count} marca(s)) no se escribe en ELAN: el formato no admite anotaciones de duración cero.",
  "elan.note.emptyIntervalsDropped":
    "«{tier}»: {count} intervalo(s) sin texto son relleno de silencio y no se escribieron en ELAN.",
  "elan.note.zeroLengthDropped":
    "«{tier}»: {count} intervalo(s) de duración cero no se escribieron en ELAN.",
  "elan.note.timeRounded":
    "«{tier}»: {count} tiempo(s) se redondearon al milisegundo, que es la unidad de ELAN.",
  "elan.note.tierUnwritable":
    "La capa «{tier}» no se pudo escribir en ELAN: el formato exige un nombre de capa.",
} as const;
