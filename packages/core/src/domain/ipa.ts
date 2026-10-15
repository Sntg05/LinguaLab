/**
 * Tipos y utilidades para manejar AFI (Alfabeto Fónico Internacional).
 *
 * REGLA CENTRAL: un fonema NO es un caracter.
 *
 * En AFI un mismo fono se puede escribir de varias formas y muchas ocupan mas
 * de un punto de codigo: la nasalidad de [ã] es una tilde combinante aparte,
 * la africada [t͡ʃ] lleva una barra de union en medio, y la aspiracion de
 * [kʰ] es una letra modificadora en superindice. Partir la cadena por
 * caracteres produciria "fonos" que nadie pronuncio. Por eso el dominio
 * expone `tokenizeIpa` y los puertos hablan de `PhonemeSequence`, nunca de
 * indices sobre la cadena.
 */

/**
 * Un fono individual. Es un alias, no un `string` suelto, para que la firma
 * diga de que se trata: `readonly Phoneme[]` no se confunde con texto libre.
 */
export type Phoneme = string;

/**
 * Una cadena AFI completa. Alias por la misma razon que `Phoneme`: distingue
 * "texto ya transcrito" de "texto de entrada escrito con ortografia normal".
 */
export type IpaString = string;

/** Una cadena AFI junto con sus fonos ya separados, para no volver a partirla. */
export interface PhonemeSequence {
  readonly phones: readonly Phoneme[];
  /** La cadena original, sin normalizar: es la que se muestra tal cual se recibio. */
  readonly ipa: string;
}

/**
 * Rangos Unicode de marcas combinantes que siempre acompanan al caracter base.
 * Incluye las marcas diacriticas estandar y los bloques de marcas extendidas:
 * si una marca combinante abre un token propio, el resultado deja de ser una
 * transcripcion.
 */
const COMBINING_MARK_RANGES: readonly (readonly [number, number])[] = [
  [0x0300, 0x036f],
  [0x0483, 0x0489],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe20, 0xfe2f],
];

/**
 * Bloque de letras modificadoras y superindices (aspiracion ʰ, labializacion
 * ʷ, palatalizacion ʲ, marcas de tono, cantidad ː). Se tratan como parte del
 * fono anterior: [kʰ] es un solo segmento fonologico, no una "k" mas una "h".
 */
const MODIFIER_LETTER_RANGE: readonly [number, number] = [0x02b0, 0x02ff];

/**
 * Barras de union (doble breve invertida arriba y abajo). No son diacriticos
 * decorativos: obligan a que el caracter base que sigue pertenezca al MISMO
 * fono, que es como se escribe una africada o una coarticulacion.
 */
const TIE_BARS: readonly number[] = [0x0361, 0x035c];

const isInRange = (codePoint: number, [low, high]: readonly [number, number]): boolean =>
  codePoint >= low && codePoint <= high;

const isCombiningMark = (codePoint: number): boolean =>
  COMBINING_MARK_RANGES.some((range) => isInRange(codePoint, range));

const isTieBar = (codePoint: number): boolean => TIE_BARS.includes(codePoint);

const isModifierLetter = (codePoint: number): boolean =>
  isInRange(codePoint, MODIFIER_LETTER_RANGE);

/** Un caracter que no puede iniciar un fono: se pega al que este en curso. */
const attachesToPrevious = (codePoint: number): boolean =>
  isCombiningMark(codePoint) || isModifierLetter(codePoint);

// El espacio no es un fono: separa palabras. Se descarta en lugar de
// convertirse en un token, para que nadie lo cuente como segmento.
const isWhitespace = (char: string): boolean => char.trim().length === 0;

/**
 * Parte una cadena AFI en fonos, sin asumir que un caracter es un fonema.
 *
 * Une marcas combinantes y letras modificadoras al fono anterior, y usa la
 * barra de union para fusionar los dos caracteres base que conecta. Los
 * espacios separan palabras y no generan token. La funcion es pura: no
 * normaliza, no consulta tablas y no depende del idioma.
 */
export const tokenizeIpa = (ipa: string): readonly Phoneme[] => {
  const phones: string[] = [];
  let current = "";
  let tiePending = false;

  // Cierra el fono en curso, si lo hay. Se extrae para no repetir la guarda
  // en cada rama y para que el flujo principal se lea como una sola lista de
  // reglas de pegado.
  const flush = (): void => {
    if (current !== "") {
      phones.push(current);
      current = "";
    }
  };

  for (const char of ipa) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (isWhitespace(char)) {
      flush();
      tiePending = false;
      continue;
    }

    if (isTieBar(codePoint)) {
      current += char;
      tiePending = true;
      continue;
    }

    if (attachesToPrevious(codePoint)) {
      current += char;
      continue;
    }

    // Caracter base: abre un fono nuevo salvo que una barra de union haya
    // pedido fusionarlo con el anterior (africada o coarticulacion).
    if (!tiePending) {
      flush();
    }
    current += char;
    tiePending = false;
  }

  flush();
  return phones;
};
