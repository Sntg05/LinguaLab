/* ============================================================
   LinguaLab — mensajes de la comparación de documentos (S13)

   Un módulo por herramienta, con el prefijo `cmp.` (ver `elan.es.ts` y
   `src/i18n/features.test.ts`). Las claves que el controlador usa en el
   navegador están listadas en `src/scripts/comparar/strings.ts`.
   ============================================================ */

export const compareEs = {
  "cmp.eyebrow": "Comparar documentos",
  "cmp.title": "Compara dos o tres documentos",
  "cmp.sub":
    "Carga de dos a tres documentos (.docx, PDF con texto o .txt) y mira en qué se parecen y en qué se diferencian: qué palabras distinguen a cada uno, cuánto vocabulario comparten, su diversidad léxica y cómo usa cada uno una palabra.",
  "cmp.local":
    "Los documentos se leen dentro de tu navegador; nada se sube a ningún servidor. Para leer un PDF se descarga una vez el lector pdf.js desde este mismo sitio.",
  "cmp.limits":
    "Del .docx se lee el cuerpo (no las notas al pie ni los encabezados). De un PDF se lee el texto que guarda: un PDF escaneado no tiene texto y se rechaza, y las columnas o las tablas pueden salir en otro orden. Hasta 10 MB por archivo.",

  "cmp.load.title": "1. Documentos",
  "cmp.load.label": "Elige de 2 a 3 archivos (.docx, .pdf o .txt)",
  "cmp.load.empty": "Todavía no hay documentos.",
  "cmp.settings.title": "2. Ajustes",
  "cmp.settings.stopwords": "Palabras vacías",
  "cmp.settings.stopwords.es": "Español",
  "cmp.settings.stopwords.en": "Inglés",
  "cmp.settings.stopwords.both": "Ambos",
  "cmp.settings.stopwords.none": "Ninguna",
  "cmp.settings.minCount": "Frecuencia mínima",
  "cmp.settings.alpha": "Nivel de significación",
  "cmp.settings.alphaNote":
    "Se prueban cientos o miles de palabras a la vez: con p < 0,05, una de cada veinte saldría por azar. Además, al comparar dos corpus muchas palabras comunes salen significativas (Kilgarriff, 1996, citado por Rayson y Garside, 2000). Un nivel más estricto deja solo las diferencias más claras: p < 0,0001 equivale a G² > 15,14.",
  "cmp.run": "Comparar",

  "cmp.profile.title": "3. Perfil de cada documento",
  "cmp.profile.note":
    "La TTR baja cuando el texto es más largo aunque el vocabulario no cambie: para comparar documentos de distinta longitud, mira la MSTTR (la TTR media de tramos de 100 palabras).",
  "cmp.keywords.title": "4. Palabras clave: cada documento frente a los demás",
  "cmp.keywords.note":
    "G² (Dunning, 1993) dice cuán seguro es que la diferencia no sea azar; crece con el tamaño de los documentos. El log ratio (Hardie, 2014) dice cuán grande es: 1 es el doble de frecuente, 2 el cuádruple. Las cifras se contrastan con R en las pruebas del sitio.",
  "cmp.keywords.positive": "Más usadas en «{name}»",
  "cmp.keywords.negative": "Menos usadas en «{name}»",
  "cmp.keywords.tested": "Se probaron {count} palabras.",
  "cmp.vocabulary.title": "5. Vocabulario compartido y propio",
  "cmp.vocabulary.note":
    "Se comparan formas, sin lematizar: «casa» y «casas» cuentan como palabras distintas. El índice de Jaccard es la parte del vocabulario de dos documentos que comparten (0 = nada, 1 = todo).",
  "cmp.vocabulary.shared": "En todos los documentos",
  "cmp.vocabulary.unique": "Solo en «{name}»",
  "cmp.vocabulary.jaccard": "Índice de Jaccard",
  "cmp.frequency.title": "6. Frecuencias, por cada 10 000 palabras",
  "cmp.frequency.note":
    "La frecuencia por 10 000 palabras permite comparar documentos de distinta longitud. Se muestran las palabras más frecuentes de cada documento.",
  "cmp.kwic.title": "7. Concordancia por documento",
  "cmp.kwic.label": "Palabra",
  "cmp.kwic.run": "Buscar",
  "cmp.export.title": "Descargas",
  "cmp.export.keywords": "Palabras clave (.csv)",
  "cmp.export.frequency": "Frecuencias (.csv)",
  "cmp.export.profile": "Perfil (.csv)",

  "cmp.col.document": "Documento",
  "cmp.col.measure": "Medida",
  "cmp.col.word": "Palabra",
  "cmp.col.here": "Aquí",
  "cmp.col.rest": "Resto",
  "cmp.col.herePer10k": "Aquí /10 000",
  "cmp.col.restPer10k": "Resto /10 000",
  "cmp.col.g2": "G²",
  "cmp.col.p": "p",
  "cmp.col.logRatio": "Log ratio",
  "cmp.col.pair": "Par",
  "cmp.col.left": "Izquierda",
  "cmp.col.node": "Nodo",
  "cmp.col.right": "Derecha",
  "cmp.measure.tokens": "Palabras",
  "cmp.measure.types": "Formas distintas",
  "cmp.measure.ttr": "TTR",
  "cmp.measure.msttr": "MSTTR",
  "cmp.measure.hapax": "Hápax (% del vocabulario)",
  "cmp.measure.sentences": "Oraciones",
  "cmp.measure.wordsPerSentence": "Palabras por oración",

  "cmp.status.ready": "Carga dos o tres documentos para empezar.",
  "cmp.status.reading": "Leyendo «{name}»…",
  "cmp.status.loaded": "«{name}» cargado: {words} palabras.",
  "cmp.status.compared": "Comparación lista: {count} documentos.",
  "cmp.status.removed": "«{name}» quitado.",
  "cmp.status.kwic": "{count} apariciones de «{word}».",
  "cmp.error.tooMany": "Como máximo tres documentos: «{name}» no se cargó.",
  "cmp.error.tooFew": "Hacen falta al menos dos documentos.",
  "cmp.error.duplicate": "«{name}» ya está cargado.",
  "cmp.error.unsupported-format": "«{name}» no es un .docx, un PDF ni un .txt.",
  "cmp.error.too-large": "«{name}» pasa de 10 MB.",
  "cmp.error.corrupt": "«{name}» está dañado o no se puede abrir.",
  "cmp.error.encrypted": "«{name}» tiene contraseña: guárdalo sin ella y vuelve a cargarlo.",
  "cmp.error.no-text":
    "«{name}» no tiene texto que leer. Si es un PDF escaneado, hace falta pasarlo antes por reconocimiento de texto (OCR).",
  "cmp.error.reader-unavailable":
    "«{name}» no se pudo leer porque el lector no se descargó. Revisa tu conexión y vuelve a cargarlo.",
  "cmp.error.read": "No se pudo leer «{name}».",
  "cmp.remove": "Quitar",
  "cmp.removeLabel": "Quitar {name}",
  "cmp.pages": "{count} páginas",
  "cmp.words": "{count} palabras",
  "cmp.none": "Ninguna.",
} as const;
