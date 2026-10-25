/* ============================================================
   LinguaLab — mensajes de los cuatro experimentos de psicolingüística (segmento 7)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `exp.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.

   QUE NO SE TRADUCE AQUI

   Los valores de respuesta que viajan al CSV («1»..«7», «word», «nonword») no
   son texto de interfaz: son datos que se analizan, y por eso viven en el codigo
   del adaptador y no en el diccionario. Un CSV cuyas respuestas cambian de
   idioma segun la ruta del sitio no se puede comparar entre sesiones.
   ============================================================ */

export const experimentsEs = {
  "exp.meta.title": "Experimentos de psicolingüística",
  "exp.meta.description":
    "Monta y ejecuta experimentos de psicolingüística en el navegador: juicios de aceptabilidad, elección forzada, lectura autocontrolada y decisión léxica, con semilla reproducible y resultados en CSV. Nada sale de tu equipo.",
  "exp.eyebrow": "Psicolingüística",
  "exp.title": "Constructor de experimentos",
  "exp.sub":
    "Carga tus estímulos, elige una plantilla, revisa el orden y ejecuta. Al terminar descargas un CSV con las respuestas, los tiempos, la semilla y la versión de la herramienta, que es lo que hace falta para reproducir la sesión.",
  "exp.privacy":
    "Los estímulos y los audios se quedan en tu navegador: no se suben a ningún servidor. La única salida es el archivo que descargas.",
  "exp.precision":
    "Los tiempos de reacción en el navegador tienen precisión limitada: dependen del refresco de la pantalla, de la carga de la máquina y del teclado. Sirven para comparar condiciones dentro de la misma sesión, no para publicar milisegundos absolutos. Si necesitas precisión de laboratorio, mide con hardware dedicado.",

  "exp.consent.title": "Antes de ejecutar: consentimiento y datos",
  "exp.consent.note":
    "Esta guía es breve a propósito y no sustituye la revisión de tu comité de ética.",
  "exp.consent.item1":
    "Explica qué se mide, cuánto dura, qué se hace con los datos y que participar es voluntario y se puede abandonar en cualquier momento.",
  "exp.consent.item2":
    "Recoge el consentimiento fuera de esta herramienta y guárdalo aparte: aquí no se piden nombres, firmas ni correos.",
  "exp.consent.item3":
    "Cada participante recibe un identificador anónimo generado en este navegador. No lo asocies a una persona en el mismo archivo.",
  "exp.consent.item4":
    "El CSV queda en el equipo de quien lo descarga. Decide antes de empezar dónde se guarda, quién lo ve y cuándo se borra.",

  "exp.load.title": "1. Estímulos",
  "exp.load.note":
    "Pega la lista o sube un archivo CSV. Las columnas se llaman id, condition, text y audio; el audio es opcional.",
  "exp.load.paste": "Lista de estímulos (CSV)",
  "exp.load.pasteHint": "id,condition,text,audio",
  "exp.load.file": "Subir un archivo CSV",
  "exp.load.columns": "Qué significa cada columna",
  "exp.load.columnsNote":
    "id identifica el estímulo y se repite en los resultados; condition es la condición que vas a comparar; text es lo que se muestra o se lee en voz alta; audio es el nombre del archivo que cargues aquí abajo.",
  "exp.load.audio": "Audios (opcional)",
  "exp.load.audioNote":
    "Los archivos se cargan en este navegador y nunca se suben. El nombre tiene que coincidir con el de la columna audio.",

  "exp.design.title": "2. Plantilla y diseño",
  "exp.design.template": "Plantilla",
  "exp.design.seed": "Semilla",
  "exp.design.seedHint":
    "Con la misma semilla y la misma lista el orden es idéntico. Déjala vacía para sortear una nueva; la que se use queda escrita en el CSV.",
  "exp.design.blocks": "Bloques",
  "exp.design.practice": "Ensayos de práctica",
  "exp.design.instructions": "Instrucciones",
  "exp.design.instructionsHint":
    "Se muestran antes de empezar. Puedes escribir en cualquier lengua: se conserva el Unicode completo, con acentos, símbolos del AFI y escrituras de derecha a izquierda.",
  "exp.design.instructionsReset": "Volver al texto de la plantilla",
  "exp.design.scale": "Extremos de la escala (1 a 7)",
  "exp.design.scaleLeft": "Extremo izquierdo",
  "exp.design.scaleRight": "Extremo derecho",
  "exp.continueLabel": "Continuar",
  "exp.lexical.word": "palabra",
  "exp.lexical.nonword": "no palabra",

  "exp.template.acceptability": "Juicios de aceptabilidad (1 a 7)",
  "exp.template.acceptability.note":
    "Cada estímulo se juzga en una escala de 1 a 7. La condición es lo que se compara y lo que se guarda es el número elegido.",
  "exp.instructions.acceptability":
    "Vas a ver una frase cada vez y a juzgar qué tan natural te parece en tu variedad de la lengua.\n1 = nada natural, 7 = totalmente natural.\nNo hay respuestas correctas: responde con lo primero que te parezca.\nPulsa «Continuar» para empezar.",
  "exp.template.two-afc": "Elección forzada entre dos opciones (2AFC)",
  "exp.template.two-afc.note":
    "Escribe las dos alternativas en la columna text separadas por una barra vertical: «perro|pero». Si el estímulo trae audio, se reproduce y las dos alternativas aparecen como botones.",
  "exp.instructions.two-afc":
    "Vas a oír o leer un estímulo y a elegir entre dos opciones.\nElige la que hayas percibido, aunque no estés seguro.\nPulsa «Continuar» para empezar.",
  "exp.template.self-paced-reading": "Lectura autocontrolada por palabras",
  "exp.template.self-paced-reading.note":
    "Cada estímulo se parte por espacios y se muestra una palabra por vez. La barra espaciadora avanza, y el tiempo de cada palabra es el dato que se guarda: una fila por palabra.",
  "exp.instructions.self-paced-reading":
    "Vas a leer frases palabra por palabra.\nPulsa la barra espaciadora para ver la siguiente y lee a tu ritmo, con naturalidad.\nPulsa «Continuar» para empezar.",
  "exp.template.lexical-decision": "Decisión léxica con tiempos de reacción",
  "exp.template.lexical-decision.note":
    "Se muestra un estímulo y se responde si es palabra o no palabra con las teclas F y J. La herramienta no evalúa la respuesta: la condición de tu lista es la que dice cuál era la esperada.",
  "exp.instructions.lexical-decision":
    "Vas a ver estímulos de uno en uno.\nPulsa F si es una palabra de la lengua y J si no lo es.\nResponde lo más rápido que puedas sin equivocarte.\nPulsa «Continuar» para empezar.",

  "exp.preview.title": "3. Vista previa",
  "exp.preview.note":
    "Así queda el orden con esta semilla. Revísalo antes de ejecutar: es exactamente lo que va a ver el participante, incluidos los ensayos de práctica.",
  "exp.preview.refresh": "Actualizar la vista previa",
  "exp.preview.order": "Orden",
  "exp.preview.block": "Bloque",
  "exp.preview.condition": "Condición",
  "exp.preview.text": "Estímulo",
  "exp.preview.practice": "Práctica",
  "exp.preview.spec": "Descargar la especificación en JSON",
  "exp.preview.specNote":
    "La especificación guarda la lista, la plantilla, la semilla y los parámetros del diseño; es lo que permite repetir el experimento más adelante.",

  "exp.run.title": "4. Ejecución",
  "exp.run.note":
    "El experimento ocupa la página mientras corre. Al terminar, el CSV se descarga desde la sección de resultados.",
  "exp.run.fullscreen": "Ejecutar en pantalla completa",
  "exp.run.start": "Ejecutar el experimento",
  "exp.run.abort": "Interrumpir",
  "exp.run.stage": "Sesión en curso",

  "exp.results.title": "5. Resultados",
  "exp.results.note":
    "El CSV lleva una fila por ensayo con el participante anónimo, el id de ensayo, la condición, la respuesta, el tiempo de reacción en milisegundos, la versión de la herramienta y la semilla.",
  "exp.results.download": "Descargar el CSV de resultados",
  "exp.results.columns":
    "Las respuestas se guardan como valor de la escala («1» a «7»), alternativa elegida («perro») o «word» / «nonword», para que el archivo no dependa del idioma de la pantalla.",

  "exp.help.title": "Cómo se arma cada plantilla",
  "exp.help.twoafc":
    "2AFC: la columna text lleva las dos alternativas separadas por «|» y la respuesta guardada es la alternativa elegida.",
  "exp.help.spr":
    "Lectura autocontrolada: la respuesta queda vacía y cada palabra es una fila con su tiempo, porque sumarlas borraría el dato.",
  "exp.help.lexical":
    "Decisión léxica: se responde con F (palabra) y J (no palabra); se guarda «word» o «nonword».",
  "exp.help.rt":
    "Los tiempos se redondean a milisegundos y cuentan desde que el estímulo aparece en pantalla.",

  "exp.status.ready": "Listo. Carga los estímulos para empezar.",
  "exp.status.parsed": "{count} estímulo(s) en {conditions} condición(es).",
  "exp.status.running": "Sesión en curso: no cambies de pestaña ni recargues la página.",
  "exp.status.finished": "Terminado: {count} ensayo(s) registrados. Descarga el CSV.",
  "exp.status.aborted": "La sesión se interrumpió y no se guardó nada.",
  "exp.status.spec": "Especificación descargada: es el archivo que permite repetir este experimento.",
  "exp.status.error": "No se pudo ejecutar: {detail}",
  "exp.preview.empty": "Todavía no hay ensayos que mostrar.",
  "exp.preview.count": "{total} ensayo(s): {practice} de práctica y {main} de la tarea.",
  "exp.audio.loaded": "{count} audio(s) cargados en este navegador.",
  "exp.participant": "Participante anónimo de esta sesión: {id}.",
  "exp.fullscreen.denied":
    "El navegador no permitió la pantalla completa; el experimento sigue en la página.",
  "exp.error.empty": "Pega la lista o sube un archivo CSV antes de continuar.",
  "exp.error.csv": "No se pudo leer la lista: {detail}",
  "exp.error.csvLine": "No se pudo leer la lista (línea {line}): {detail}",
  "exp.error.audioMissing": "La lista menciona el audio «{file}» y no está cargado.",
  "exp.error.seed": "La semilla tiene que ser un número entero mayor o igual que cero.",
  "exp.error.blocks": "La cantidad de bloques tiene que ser un entero mayor que cero.",
  "exp.error.practice":
    "Los ensayos de práctica no pueden ser negativos ni consumir toda la lista.",
  "exp.error.runner": "Este navegador no pudo cargar el ejecutor de experimentos.",
  "exp.error.spec": "La especificación no es válida: {detail}",
} as const;
