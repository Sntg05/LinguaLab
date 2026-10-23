/**
 * Teclado IPA: los simbolos que una transcripcion estrecha necesita y la
 * insercion en el campo de texto del intervalo.
 *
 * Los simbolos estan agrupados por clase articulatoria porque asi se buscan:
 * quien transcribe no recuerda el codigo Unicode, recuerda que busca una
 * fricativa o una marca de duracion. Cada boton es un `<button>` de verdad, se
 * alcanza con Tab y se activa con Intro o Espacio.
 */

export type IpaSymbolGroup = "consonants" | "vowels" | "diacritics" | "prosody";

export interface IpaSymbolSet {
  readonly label: IpaSymbolGroup;
  readonly symbols: readonly string[];
}

/**
 * El inventario no repite simbolos entre grupos: dos botones con el mismo
 * caracter obligan a elegir sin criterio y hacen que la prueba de duplicados
 * —que existe— falle, que es lo que se quiere si alguien copia y pega de mas.
 */
export const IPA_GROUPS: readonly IpaSymbolSet[] = [
  {
    label: "consonants",
    symbols: [
      "p",
      "b",
      "t",
      "d",
      "ʈ",
      "ɖ",
      "c",
      "ɟ",
      "k",
      "ɡ",
      "q",
      "Ɂ",
      "m",
      "ɱ",
      "n",
      "ɲ",
      "ŋ",
      "ʙ",
      "r",
      "ɾ",
      "ɽ",
      "ʀ",
      "ɸ",
      "β",
      "f",
      "v",
      "θ",
      "ð",
      "s",
      "z",
      "ʃ",
      "ʒ",
      "ç",
      "ʝ",
      "x",
      "ɣ",
      "χ",
      "ʁ",
      "ħ",
      "ʕ",
      "h",
      "ɦ",
      "ɬ",
      "ɮ",
      "ʋ",
      "ɹ",
      "ɻ",
      "j",
      "ɰ",
      "l",
      "ɫ",
      "ʎ",
      "ʟ",
      "tʃ",
      "dʒ",
      "ts",
    ],
  },
  {
    label: "vowels",
    symbols: [
      "i",
      "y",
      "ɨ",
      "ʉ",
      "ɯ",
      "u",
      "ɪ",
      "ʏ",
      "ʊ",
      "e",
      "ø",
      "ɘ",
      "ɵ",
      "ɤ",
      "o",
      "ə",
      "ɛ",
      "œ",
      "ɜ",
      "ɞ",
      "ʌ",
      "ɔ",
      "æ",
      "ɐ",
      "a",
      "ɶ",
      "ɑ",
      "ɒ",
    ],
  },
  {
    label: "diacritics",
    symbols: ["ː", "ˑ", "̃", "̩", "̥", "̪", "̺", "̻", "̼", "̊", "̋", "˞", "ʰ", "ʲ", "ʷ", "ˠ", "ˤ"],
  },
  {
    label: "prosody",
    symbols: ["ˈ", "ˌ", "˥", "˦", "˧", "˨", "˩", "↗", "↘", "‖", "‿"],
  },
];

export interface InsertionResult {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;

const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/**
 * Inserta `symbol` entre `start` y `end`, y deja el cursor detras.
 *
 * Los indices se recortan al texto y se corrigen si caen en medio de un par
 * sustituto: insertar ahi partiria el caracter en dos y dejaria un texto que ya
 * no se puede volver a leer igual.
 */
export const insertSymbol = (
  value: string,
  start: number,
  end: number,
  symbol: string,
): InsertionResult => {
  const length = value.length;
  let from = Math.min(Math.max(Math.trunc(start), 0), length);
  const to = Math.min(Math.max(Math.trunc(end), from), length);

  if (
    from > 0 &&
    from < length &&
    isHighSurrogate(value.charCodeAt(from - 1)) &&
    isLowSurrogate(value.charCodeAt(from))
  ) {
    from += 1;
  }

  const next = `${value.slice(0, from)}${symbol}${value.slice(Math.max(to, from))}`;
  const caret = from + symbol.length;

  return { value: next, selectionStart: caret, selectionEnd: caret };
};
