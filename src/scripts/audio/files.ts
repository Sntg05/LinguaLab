/* ============================================================
   LinguaLab — lectura y descarga de archivos locales

   Sin servidor, importar y exportar son la copia de seguridad: el archivo del
   usuario es lo unico que sobrevive a borrar los datos del navegador. Estas dos
   funciones son la unica puerta al sistema de archivos, y las dos trabajan con
   `File` y `Blob` del navegador: nada sale del equipo.
   ============================================================ */

/** Bytes de un archivo elegido o arrastrado. */
export const readFileBytes = async (file: File): Promise<Uint8Array> =>
  new Uint8Array(await file.arrayBuffer());

/**
 * Descarga un texto como archivo.
 *
 * Se usa un `Blob` con URL de objeto y un ancla temporal: es la unica forma de
 * guardar un archivo desde una pagina estatica, y no requiere ningun permiso del
 * navegador. La URL se revoca despues para no retener el contenido en memoria.
 */
export const downloadText = (filename: string, text: string, mimeType: string): void => {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revocar de inmediato cancela la descarga en algunos navegadores; un turno
  // del bucle de eventos alcanza para que la haya tomado.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** Nombre de archivo estable: sin espacios, sin acentos y con la extension del formato. */
export const toFileName = (base: string, extension: string): string => {
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${clean === "" ? "anotacion" : clean}.${extension}`;
};
