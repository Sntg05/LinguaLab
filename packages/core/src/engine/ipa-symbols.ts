/**
 * Que caracteres acepta el editor como AFI razonable.
 *
 * No es un validador normativo del Alfabeto Fonico Internacional: es una red
 * de seguridad barata para el error tipico —pegar un caracter de otro
 * alfabeto o un simbolo matematico— sin bloquear transcripciones validas. La
 * deteccion es de aviso, nunca de error, porque un inventario fonologico
 * abierto puede necesitar un simbolo que aqui no se anticipo.
 *
 * POR QUE HAY EXCEPCIONES EXPLICITAS
 *
 * El AFI no es un bloque Unicode: sus simbolos estan repartidos. Un chequeo
 * ingenuo por rangos dejaria fuera `θ`, que es una fricativa dental en la
 * tabla del AFI pero una letra griega en Unicode, y marcaria como erroneas
 * transcripciones correctas. Lo mismo pasa con las vocales y consonantes que
 * el AFI tomo del Latin-1 (`ð`, `æ`, `ç`, `ø`) y con `ŋ`, que vive en Latin
 * Extended-A. Las excepciones no son un parche: son el reconocimiento de que
 * el conjunto se define por el uso linguistico, no por el bloque.
 */

const IPA_BLOCK_RANGES: readonly (readonly [number, number])[] = [
  [0x0250, 0x02af], // IPA Extensions
  [0x02b0, 0x02ff], // Spacing Modifier Letters (tono, cantidad, aspiracion)
  [0x0300, 0x036f], // Combining Diacritical Marks (incluye la barra de union)
];

const EXTRA_IPA_CHARACTERS: ReadonlySet<string> = new Set([
  "\u00f0", // ð  latin-1, fricativa dental sonora
  "\u00e6", // æ  latin-1, vocal casi abierta anterior
  "\u00e7", // ç  latin-1, fricativa palatal sorda
  "\u00f8", // ø  latin-1, vocal semicerrada anterior redondeada
  "\u014b", // ŋ  latin extended-a, nasal velar
  "\u03b2", // β  griega, fricativa bilabial sonora
  "\u03b8", // θ  griega, fricativa dental sorda
  "\u03c7", // χ  griega, fricativa velar sorda
]);

const isAsciiLetter = (codePoint: number): boolean =>
  (codePoint >= 0x41 && codePoint <= 0x5a) || (codePoint >= 0x61 && codePoint <= 0x7a);

// El espacio no es un fono, pero aparece en transcripciones de mas de una
// palabra; marcarlo como error seria ruido.
const isSpace = (codePoint: number): boolean => codePoint === 0x20;

const isInIpaBlock = (codePoint: number): boolean =>
  IPA_BLOCK_RANGES.some(([low, high]) => codePoint >= low && codePoint <= high);

/**
 * `true` si todo el contenido de `symbol` cae dentro del conjunto AFI
 * razonable. La cadena vacia es valida: es la marca de un grafema que se
 * elimina, como la `h` muda del espanol.
 */
export const isReasonableIpa = (symbol: string): boolean => {
  for (const char of symbol) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (isAsciiLetter(codePoint) || isSpace(codePoint)) {
      continue;
    }

    if (EXTRA_IPA_CHARACTERS.has(char)) {
      continue;
    }

    if (!isInIpaBlock(codePoint)) {
      return false;
    }
  }

  return true;
};
