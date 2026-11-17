/* ============================================================
   LinguaLab — mensajes del laboratorio de análisis cualitativo (T7)

   Un módulo por herramienta, con el prefijo `qual.`: ver `elan.es.ts` y
   `src/i18n/features.test.ts`. Las claves que el controlador escribe mientras
   trabaja (estado, errores, bandas, rótulos de las tablas que se construyen en
   el navegador) están listadas en `src/scripts/cualitativo/strings.ts`.
   ============================================================ */

export const qualitativeEs = {
  "qual.meta.title": "Análisis cualitativo — LinguaLab",
  "qual.meta.description":
    "Codifica entrevistas y transcripciones con un libro de códigos, mira frecuencias y coocurrencias, y mide el acuerdo entre codificadores con la kappa de Cohen y la alfa de Krippendorff.",
  "qual.eyebrow": "Métodos cualitativos",
  "qual.title": "Codificación cualitativa y acuerdo entre codificadores",
  "qual.sub":
    "Define tus códigos, divide el material en segmentos y marca qué código corresponde a cada uno. La página cuenta frecuencias y coocurrencias y, si otra persona codifica el mismo material, calcula cuánto coinciden.",
  "qual.local":
    "Todo ocurre en tu navegador: el material y las codificaciones no se suben a ningún servidor. Para guardar tu trabajo, descarga la hoja de codificación (CSV) y vuelve a cargarla cuando quieras seguir.",
  "qual.experimental":
    "Experimental. Se codifican segmentos completos (una línea o un párrafo), no fragmentos libres dentro de un segmento.",
  "qual.example.button": "Cargar un ejemplo",
  "qual.example.note":
    "Un fragmento inventado de entrevista sociolingüística con cuatro códigos, para ver cómo funciona antes de usar tu material.",

  "qual.codebook.title": "1. Libro de códigos",
  "qual.codebook.note":
    "Cada código lleva una definición y reglas de uso: cuándo se aplica, cuándo no y un ejemplo. Sin reglas escritas, dos personas aplican el mismo nombre a cosas distintas (MacQueen y colaboradores, 1998).",
  "qual.codebook.name": "Nombre del código",
  "qual.codebook.definition": "Definición",
  "qual.codebook.include": "Cuándo se aplica",
  "qual.codebook.exclude": "Cuándo no se aplica",
  "qual.codebook.example": "Ejemplo",
  "qual.codebook.add": "Añadir código",
  "qual.codebook.import": "Importar libro de códigos (.csv)",
  "qual.codebook.export": "Descargar libro de códigos (.csv)",
  "qual.codebook.empty": "Todavía no hay códigos.",
  "qual.codebook.columns": "Columnas del CSV",

  "qual.material.title": "2. Material",
  "qual.material.note":
    "Pega o carga el texto y elige cómo dividirlo. Por línea, cada línea es un segmento (un turno de una transcripción); por párrafo, lo que separa una línea en blanco. Volver a dividir empieza una codificación nueva.",
  "qual.material.paste": "Texto",
  "qual.material.pasteHint": "Entrevistadora: ¿Dónde aprendiste la lengua?\nParticipante: En casa, con mi abuela.",
  "qual.material.file": "O carga un archivo de texto (.txt)",
  "qual.material.mode": "Dividir por",
  "qual.material.line": "línea",
  "qual.material.paragraph": "párrafo",
  "qual.material.split": "Dividir en segmentos",
  "qual.material.resume": "O sigue una codificación guardada (.csv)",
  "qual.material.resumeNote":
    "Carga una hoja descargada de esta página: recupera los segmentos y las marcas, y añade al libro los códigos que falten.",

  "qual.coding.title": "3. Codificar",
  "qual.coding.note":
    "Marca los códigos que corresponden a cada segmento. Un segmento puede llevar varios códigos o ninguno. Pasa el cursor por el nombre de un código para ver su definición.",
  "qual.coding.empty": "Divide el material en segmentos y añade al menos un código para empezar.",
  "qual.coding.export": "Descargar hoja de codificación (.csv)",

  "qual.results.title": "4. Frecuencias y coocurrencias",
  "qual.results.note":
    "La frecuencia cuenta los segmentos en los que se aplicó cada código. La coocurrencia cuenta los segmentos en los que se aplicaron dos códigos a la vez; la diagonal es la frecuencia. Que dos códigos aparezcan juntos es una pista para volver al material, no una relación demostrada.",
  "qual.results.frequencies": "Frecuencias",
  "qual.results.cooccurrence": "Coocurrencias",
  "qual.results.empty": "Aparecen cuando hay segmentos y códigos.",
  "qual.results.exportFrequencies": "Descargar frecuencias (.csv)",
  "qual.results.exportCooccurrence": "Descargar coocurrencias (.csv)",

  "qual.agreement.title": "5. Acuerdo entre codificadores",
  "qual.agreement.note":
    "Cada persona codifica el mismo material por separado, con el mismo libro de códigos, y descarga su hoja. Carga aquí las hojas de las demás personas: los segmentos se emparejan por número y tienen que tener el mismo texto.",
  "qual.agreement.files": "Hojas de otras personas (.csv)",
  "qual.agreement.includeMine": "Incluir mi codificación actual",
  "qual.agreement.clear": "Quitar las hojas cargadas",
  "qual.agreement.run": "Calcular el acuerdo",
  "qual.agreement.empty": "Carga al menos una hoja más para comparar.",
  "qual.agreement.export": "Descargar informe de acuerdo (.csv)",
  "qual.agreement.readPercent":
    "Acuerdo porcentual: de los segmentos que codificaron todas las personas, en cuántos coinciden todas. No descuenta el acuerdo que se daría por azar.",
  "qual.agreement.readKappa":
    "Kappa de Cohen (1960): solo con dos personas; descuenta el azar. Se lee con las bandas de Landis y Koch (1977), que son una convención, no un umbral de la teoría.",
  "qual.agreement.readAlpha":
    "Alfa de Krippendorff: dos o más personas y datos faltantes. Krippendorff considera fiable α ≥ 0,800 y admite conclusiones provisionales desde 0,667.",
  "qual.agreement.validated":
    "Las tres cifras se contrastan con el paquete irr de R en las pruebas del sitio. Una diferencia declarada: si nadie varía (todas las personas usan siempre la misma marca), la alfa queda indefinida; irr da 1.",

  "qual.col.code": "Código",
  "qual.col.definition": "Definición",
  "qual.col.segment": "N.º",
  "qual.col.text": "Segmento",
  "qual.col.segments": "Segmentos",
  "qual.col.share": "% del material",
  "qual.col.complete": "Segmentos comparables",
  "qual.col.percent": "Acuerdo",
  "qual.col.kappa": "κ de Cohen",
  "qual.col.alpha": "α de Krippendorff",
  "qual.col.actions": "Acciones",

  "qual.status.ready": "Listo. Empieza por el libro de códigos o carga el ejemplo.",
  "qual.status.codeAdded": "Código «{code}» añadido.",
  "qual.status.codeRemoved": "Código «{code}» quitado, con sus marcas.",
  "qual.status.codebookLoaded": "Libro de códigos cargado: {count} códigos.",
  "qual.status.split": "Material dividido en {count} segmentos.",
  "qual.status.resumed": "Codificación recuperada: {segments} segmentos y {codes} códigos.",
  "qual.status.example": "Ejemplo cargado: marca los códigos de cada segmento.",
  "qual.status.agreement": "Acuerdo calculado entre {coders} hojas, sobre {segments} segmentos.",
  "qual.status.textLoaded": "Archivo de texto cargado. Elige cómo dividirlo.",

  "qual.error.codeEmpty": "El código necesita un nombre.",
  "qual.error.codeDuplicate": "Ya hay un código con ese nombre.",
  "qual.error.materialEmpty": "No hay texto para dividir.",
  "qual.error.codebook": "No se pudo leer el libro de códigos: {detail}",
  "qual.error.coding": "No se pudo leer la hoja «{file}»: {detail}",
  "qual.error.agreementFew": "Hacen falta al menos dos hojas para comparar.",
  "qual.error.mismatch":
    "El segmento {segment} de la hoja {sheet} tiene otro texto: esas personas no codificaron el mismo material.",
  "qual.error.file": "No se pudo leer el archivo.",

  "qual.csv.unclosedQuote": "hay unas comillas sin cerrar en la línea {line}.",
  "qual.csv.missingCodeColumn": "falta la columna «code».",
  "qual.csv.emptyName": "la fila {row} no tiene nombre de código.",
  "qual.csv.duplicateName": "la fila {row} repite el código «{name}».",
  "qual.csv.empty": "el archivo está vacío.",
  "qual.csv.badHeader": "la cabecera tiene que empezar por «segment,text».",
  "qual.csv.noCodes": "no hay columnas de códigos después de «segment,text».",
  "qual.csv.badCodeName": "la columna {column} no tiene nombre o repite otro código.",
  "qual.csv.duplicateSegment": "la fila {row} repite el segmento {segment}.",
  "qual.csv.badMark": "la fila {row}, columna {column}, dice «{value}»: se espera 1, 0 o vacío.",

  "qual.remove": "Quitar",
  "qual.removeLabel": "Quitar el código {code}",
  "qual.markLabel": "{code}, segmento {segment}",
  "qual.mine": "mi codificación actual",
  "qual.notComputable": "—",
  "qual.notComputableNote":
    "«—»: no se puede calcular. La kappa necesita exactamente dos hojas; la alfa, que alguien use las dos marcas; las tres, segmentos que hayan codificado las personas comparadas.",
  "qual.band.poor": "pobre",
  "qual.band.slight": "leve",
  "qual.band.fair": "aceptable",
  "qual.band.moderate": "moderado",
  "qual.band.substantial": "considerable",
  "qual.band.almost-perfect": "casi perfecto",
  "qual.verdict.reliable": "fiable",
  "qual.verdict.tentative": "provisional",
  "qual.verdict.unreliable": "insuficiente",
} as const;
