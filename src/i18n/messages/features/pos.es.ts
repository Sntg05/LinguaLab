/* ============================================================
   LinguaLab — mensajes del etiquetado de categorías (S14)
   Las claves llevan el prefijo `pos.`; `pos.en.ts` tiene las mismas.
   ============================================================ */

export const posEs = {
  "pos.eyebrow": "Categorías gramaticales",
  "pos.title": "Etiqueta las categorías de un texto",
  "pos.sub":
    "Cada palabra recibe su categoría gramatical (sustantivo, verbo, determinante…) según las 17 categorías universales de Universal Dependencies, las mismas de ArborLab.",
  "pos.local": "Procesamiento local: el texto no sale de tu navegador. El modelo de cada lengua se descarga la primera vez que lo usas (cerca de 1 MB).",
  "pos.limits":
    "Es un modelo estadístico y se equivoca: acierta el {es} % de las palabras del conjunto de prueba de AnCora (español) y el {en} % del de EWT (inglés), y bastante menos con palabras que nunca vio. Revisa las etiquetas antes de usarlas como dato.",
  "pos.text": "Texto",
  "pos.language": "Lengua",
  "pos.run": "Etiquetar",
  "pos.example": "Cargar un ejemplo",
  "pos.exampleText": "La profesora explicó la diferencia entre el sujeto y el objeto del verbo.",
  "pos.col.word": "Palabra",
  "pos.col.tag": "Categoría",
  "pos.col.count": "Veces",
  "pos.col.share": "Proporción",
  "pos.tagged": "Texto etiquetado",
  "pos.summary": "Cuántas veces sale cada categoría",
  "pos.exportCsv": "Descargar CSV",
  "pos.contractionNote": "«{word}» se separó en dos palabras, como en el treebank de entrenamiento.",
  "pos.status.ready": "Escribe un texto y pulsa «Etiquetar».",
  "pos.status.loading": "Etiquetando… la primera vez se descarga el modelo de la lengua.",
  "pos.status.done": "{count} palabras etiquetadas. Revisa las dudosas: el modelo se equivoca en una de cada {every} aproximadamente.",
  "pos.status.empty": "Escribe un texto primero: no hay nada que etiquetar.",
  "pos.status.error": "No se pudo descargar el modelo desde este sitio. Revisa la conexión y vuelve a intentarlo.",
} as const;
