/* ============================================================
   LinguaLab — mensajes de los paneles de análisis acústico del visor (segmento 8)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `acoustic.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.

   AQUI NO SE PROMETE NADA QUE NO SE HAYA MEDIDO

   El aviso de «Experimental» no es cortesia: la condicion para quitarlo es el
   contraste contra Praat sobre voces reales, y ese contraste todavia no existe.
   El texto de `acoustic.limits` lo dice con esas palabras.
   ============================================================ */

export const acousticEs = {
  "acoustic.title": "Análisis acústico (experimental)",
  "acoustic.lead":
    "Tono, formantes e intensidad de la grabación cargada. Los números salen de praatfan, una reimplementación de los algoritmos de Praat que corre en tu navegador y en un worker aparte: la página sigue respondiendo mientras analiza.",
  "acoustic.experimental": "Experimental: contrasta tus resultados con Praat antes de publicarlos.",

  "acoustic.preset.label": "Preset de voz",
  "acoustic.preset.custom": "Personalizado",
  "acoustic.preset.masculine": "Voz masculina (75–300 Hz)",
  "acoustic.preset.feminine": "Voz femenina (100–500 Hz)",
  "acoustic.preset.child": "Voz infantil (150–800 Hz)",

  "acoustic.pitch.title": "Contorno de F0 (tono)",
  "acoustic.pitch.floor": "Piso (Hz)",
  "acoustic.pitch.ceiling": "Techo (Hz)",
  "acoustic.pitch.run": "Calcular F0",
  "acoustic.pitch.note":
    "El piso y el techo acotan la búsqueda. Con un techo demasiado bajo, el análisis toma la mitad de la frecuencia real; con un piso demasiado alto, pierde las voces graves.",
  "acoustic.canvas.f0": "Contorno de la frecuencia fundamental, en hercios",

  "acoustic.formant.title": "Formantes F1 a F3",
  "acoustic.formant.max": "Frecuencia máxima (Hz)",
  "acoustic.formant.run": "Calcular formantes",
  "acoustic.formant.overlay": "Superponer sobre el espectrograma",
  "acoustic.formant.note":
    "La frecuencia máxima tiene que superar el formante más alto que esperas encontrar: en voces infantiles suele hacer falta más de 5500 Hz.",

  "acoustic.intensity.title": "Intensidad",
  "acoustic.intensity.run": "Calcular intensidad",
  "acoustic.intensity.note":
    "Decibelios de la señal, medidos con el mismo método que Praat y referidos al mismo umbral.",
  "acoustic.canvas.intensity": "Curva de intensidad, en decibelios",

  "acoustic.measure.title": "Medición de la selección",
  "acoustic.measure.run": "Medir la selección",
  "acoustic.measure.export": "Exportar mediciones a CSV",
  "acoustic.measure.clear": "Borrar mediciones",
  "acoustic.measure.note":
    "Mide el intervalo activo —aquel donde está el cursor— y, si no hay intervalos, el audio completo. F0 se resume sin contar los tramos sin voz; F1 y F2 se informan al 25, 50 y 75 por ciento y en el punto medio.",
  "acoustic.measure.empty": "Todavía no hay mediciones. Elige un intervalo y pide la medición.",
  "acoustic.measure.head.label": "Etiqueta",
  "acoustic.measure.head.range": "Intervalo (s)",
  "acoustic.measure.head.f0": "F0 (Hz)",
  "acoustic.measure.head.mean": "Media",
  "acoustic.measure.head.median": "Mediana",
  "acoustic.measure.head.min": "Mínimo",
  "acoustic.measure.head.max": "Máximo",
  "acoustic.measure.head.intensity": "Intensidad media (dB)",
  "acoustic.measure.head.f1": "F1 (Hz)",
  "acoustic.measure.head.f2": "F2 (Hz)",
  "acoustic.measure.head.percent25": "25 %",
  "acoustic.measure.head.percent50": "50 %",
  "acoustic.measure.head.percent75": "75 %",
  "acoustic.measure.head.centre": "Centro",

  "acoustic.vowels.title": "Gráfico vocálico F1–F2",
  "acoustic.vowels.x": "F2 (Hz), anterior a la izquierda",
  "acoustic.vowels.y": "F1 (Hz), abierta abajo",
  "acoustic.vowels.empty":
    "Las vocales medidas aparecen aquí, etiquetadas con el texto del intervalo.",
  "acoustic.canvas.vowels": "Dispersión de F1 y F2 con los ejes invertidos",

  "acoustic.status.idle":
    "El análisis se ejecuta en un worker: el primer cálculo carga el motor y puede tardar unos segundos.",
  "acoustic.status.analysing": "Analizando… el cálculo corre en un worker y la página sigue respondiendo.",
  "acoustic.status.f0": "Contorno de F0 listo: {count} marcos con voz.",
  "acoustic.status.formants": "Formantes calculados.",
  "acoustic.status.intensity": "Intensidad calculada.",
  "acoustic.status.measured": "Medición lista: {count} intervalo(s).",
  "acoustic.status.exported": "Mediciones descargadas: {name}",
  "acoustic.status.cleared": "Mediciones borradas.",
  "acoustic.error.noAudio": "Carga un audio antes de analizarlo.",
  "acoustic.error.noSelection": "No hay un intervalo activo que medir.",
  "acoustic.error.unavailable":
    "El análisis acústico no está disponible: {detail}. El resto del visor sigue funcionando igual.",
  "acoustic.error.tooShort":
    "El audio dura {duration} s y el análisis necesita al menos 0,05 s.",
  "acoustic.error.failed": "El análisis falló: {detail}",

  "acoustic.limits":
    "Todavía no hay audios de referencia para contrastar este análisis con Praat sobre voces reales: mientras falten, estos números sirven para mirar la señal, no para publicarlos como mediciones.",
} as const;
