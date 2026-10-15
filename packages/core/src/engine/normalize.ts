/**
 * Normalizacion de la entrada del motor.
 *
 * SE USA NFC Y NO NFD A PROPOSITO
 *
 * NFC mantiene `ñ`, `á` y `ü` como un unico punto de codigo, que es como un
 * autor de tablas escribe el campo `grapheme`. NFD los partiria en el caracter
 * base mas una marca combinante, y entonces ninguna regla escrita de forma
 * natural volveria a coincidir: la tabla pareceria correcta y no transcribiria
 * nada. La normalizacion es la primera linea de defensa contra esa diferencia
 * invisible entre dos cadenas que se ven iguales.
 */
export const normalizeInput = (text: string): string => text.normalize("NFC");
