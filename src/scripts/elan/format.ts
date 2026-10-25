/**
 * Deteccion del formato de un archivo de anotacion, por su CONTENIDO.
 *
 * POR QUE NO POR LA EXTENSION
 *
 * En el campo los archivos se renombran: un `.eaf` que paso por un correo se
 * llama `.xml`, y un TextGrid exportado desde Praat puede llamarse `.txt`. Si la
 * herramienta eligiera el camino por la extension, intentaria leer un ELAN como
 * TextGrid y el error que mostraria seria del formato equivocado. El contenido,
 * en cambio, no miente: un `.eaf` empieza por XML y un TextGrid por su cabecera
 * `File type = "ooTextFile"`.
 *
 * Esto NO reemplaza al analizador: dice cual de los dos lectores hay que usar, y
 * si el archivo no parece ninguno de los dos se dice, en vez de probar suerte.
 */

export type ElanFileFormat = "eaf" | "textgrid";

/**
 * Cuantos bytes hacen falta para decidir.
 *
 * La cabecera de un TextGrid cabe en una linea y la declaracion XML en dos; 512
 * bytes son de sobra y evitan decodificar un archivo de varios megas solo para
 * mirar el principio.
 */
const HEADER_BYTES = 512;

const EXTENSIONS: Readonly<Record<ElanFileFormat, string>> = {
  eaf: ".eaf",
  textgrid: ".TextGrid",
};

/** Nombre de respaldo cuando el navegador no entrega el del archivo. */
const FALLBACK_BASE = "lingualab";

const TEXTGRID_HEADER = 'File type = "ooTextFile"';

const isUtf16Bom = (bytes: Uint8Array): boolean =>
  bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff));

/**
 * Formato del archivo, o `null` si no es ninguno de los dos.
 *
 * Un TextGrid en UTF-16 se reconoce por el BOM y no por su texto: Praat lo
 * escribe asi cuando se guarda en «Unicode», y los bytes ASCII de ese archivo
 * estan separados por ceros, asi que comparar cadenas fallaria.
 */
export const detectFormat = (bytes: Uint8Array): ElanFileFormat | null => {
  if (bytes.length === 0) {
    return null;
  }
  if (isUtf16Bom(bytes)) {
    // Solo Praat guarda UTF-16 entre los dos formatos; ELAN escribe UTF-8.
    return "textgrid";
  }

  const head = new TextDecoder("utf-8")
    .decode(bytes.subarray(0, HEADER_BYTES))
    .replace(/^\ufeff/, "")
    .trimStart();

  if (head.startsWith("<?xml") || head.startsWith("<ANNOTATION_DOCUMENT")) {
    return "eaf";
  }
  if (head.startsWith(TEXTGRID_HEADER)) {
    return "textgrid";
  }
  return null;
};

/**
 * Nombre para el archivo descargado: el mismo, con la extension del formato de
 * destino.
 *
 * Se quita la extension de origen —en cualquier caja— para que exportar dos
 * veces no produzca `sesion.eaf.TextGrid`. Si el navegador no entrego nombre, se
 * usa uno neutro: el nombre del sitio, no una palabra en un idioma.
 */
export const suggestedFileName = (name: string, target: ElanFileFormat): string => {
  const base = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\.(eaf|textgrid)$/i, "");
  return `${base === "" ? FALLBACK_BASE : base}${EXTENSIONS[target]}`;
};

/** La extension que corresponde a cada formato, para mostrarla o para `accept`. */
export const extensionOf = (format: ElanFileFormat): string => EXTENSIONS[format];

/**
 * Un tamano en bytes, legible, para el mensaje del tope.
 *
 * Se escribe aqui y no en la interfaz porque el mensaje que lo usa lo arma el
 * controlador, y dos formateos distintos para el mismo numero se notan.
 */
export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} B`;
};
