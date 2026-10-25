/* ============================================================
   LinguaLab — topes de tamano del visor de audio

   POR QUE ESTAS TRES COSAS VIVEN JUNTAS EN UN MODULO PROPIO

   Porque son la unica parte de la importacion que se puede probar sin DOM. El
   controlador (`index.ts`) necesita `AudioContext` y un documento real, y por
   eso no tiene prueba unitaria: lo cubren las e2e. La decision «este archivo
   supera el tope» no necesita nada de eso, y mientras vivio dentro del
   controlador no habia forma de ponerla roja si cambiaba de valor o se movia de
   sitio. Ahora la politica vive aca, con su prueba al lado, y el controlador se
   limita a preguntar.
   ============================================================ */

/**
 * Tope de bytes del audio, comprobado ANTES de leer y decodificar el archivo.
 *
 * Sale del limite que ya existe para la duracion (`MAX_DURATION_SECONDS` = 300 s)
 * llevado a su peor caso honesto: 300 s de wav sin comprimir a 96 kHz, estereo y
 * 16 bits son 115,2 MB, asi que 128 MB rechaza solo lo que no puede ser un
 * tramo de 300 s. La duracion se sigue midiendo despues de decodificar, porque
 * antes no se conoce; lo que se evita aca es entregarle a `decodeAudioData` un
 * archivo que va a llenar la memoria antes de que ningun limite lo detenga.
 *
 * NO se unifica con `MAX_TEXTGRID_BYTES`, que vive en el nucleo junto al
 * formato: un archivo de anotaciones de texto y un contenedor de audio son
 * limites con motivos distintos, y compartir la constante haria que mover uno
 * moviera el otro sin que nadie lo decidiera.
 */
export const MAX_AUDIO_BYTES = 128 * 1024 * 1024;

/** Tamano legible para un mensaje: MB por encima del megabyte, KB por debajo. */
export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * `true` si el archivo supera el tope. Justo en el tope se acepta.
 *
 * La igualdad es deliberada: un archivo de exactamente 1 MB entra, porque el
 * limite describe lo que no se puede procesar, no lo que se puede.
 */
export const isOverLimit = (size: number, limit: number): boolean => size > limit;
