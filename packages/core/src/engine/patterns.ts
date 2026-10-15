import type { CasePolicy } from "./types";

/**
 * Resolucion de los patrones de contexto de `before`/`after`.
 *
 * Un patron describe UN caracter vecino, no una subcadena:
 *
 * - `#` es limite de palabra. Como `before` exige inicio de texto o un
 *   caracter no alfabetico a la izquierda; como `after`, fin de texto o un no
 *   alfabetico a la derecha. El motor no distingue los dos casos: quien llama
 *   le pasa el vecino correcto y `undefined` cuando no hay ninguno.
 * - `[abc]` es cualquiera de esos caracteres literales.
 * - `{V}` es cualquier caracter de la clase `V` declarada en `table.classes`.
 * - cualquier otro caracter es ese caracter literal.
 *
 * La clase la define la tabla, no el motor: anadir una vocal a una lengua no
 * deberia obligar a tocar codigo.
 */

/** Resultado de aplicar un patron al vecino de un grafema. */
export type ContextPatternOutcome =
  | { readonly kind: "matched" }
  | { readonly kind: "not-matched" }
  | { readonly kind: "undefined-class"; readonly className: string };

/** Entorno que un patron necesita para resolverse. */
export interface PatternEnvironment {
  readonly classes: Readonly<Record<string, readonly string[]>>;
  readonly casePolicy: CasePolicy;
}

const WORD_BOUNDARY = "#";

// `\p{L}` es la definicion Unicode de "letra": un digito o un signo de
// puntuacion no reinician la palabra, que es lo que un limite de palabra
// significa.
const LETTER_PATTERN = /\p{L}/u;

const isLetter = (char: string): boolean => LETTER_PATTERN.test(char);

const fold = (value: string, policy: CasePolicy): string =>
  policy === "fold" ? value.toLowerCase() : value;

/**
 * Nombre de la clase referenciada por un patron `{X}`, o `null` si el patron
 * no es una referencia a clase. Lo usan tanto el motor como el validador:
 * repetir esta condicion en dos sitios es la forma segura de que un dia
 * discrepen.
 */
export const classReferenceName = (pattern: string): string | null => {
  if (pattern.length >= 3 && pattern.startsWith("{") && pattern.endsWith("}")) {
    return pattern.slice(1, -1);
  }
  return null;
};

/**
 * Los caracteres que un patron puede aceptar.
 *
 * Devuelve `null` para el limite de palabra (que no es un conjunto de
 * caracteres) y `undefined` cuando la clase referenciada no existe, para que
 * quien llama no confunda "no existe la clase" con "no coincide".
 */
export const patternCharacters = (
  pattern: string,
  classes: Readonly<Record<string, readonly string[]>>,
): readonly string[] | null | undefined => {
  if (pattern === WORD_BOUNDARY) {
    return null;
  }

  const classReference = classReferenceName(pattern);
  if (classReference !== null) {
    return classes[classReference];
  }

  if (pattern.length >= 2 && pattern.startsWith("[") && pattern.endsWith("]")) {
    return Array.from(pattern.slice(1, -1));
  }

  return [pattern];
};

/**
 * Resuelve un patron contra el caracter vecino.
 *
 * `neighbour` es `undefined` en los bordes del texto; el patron `#` es el
 * unico que puede sacar provecho de esa ausencia.
 */
export const matchContextPattern = (
  pattern: string,
  neighbour: string | undefined,
  environment: PatternEnvironment,
): ContextPatternOutcome => {
  const classReference = classReferenceName(pattern);
  if (classReference !== null && environment.classes[classReference] === undefined) {
    return { kind: "undefined-class", className: classReference };
  }

  if (pattern === WORD_BOUNDARY) {
    const matched = neighbour === undefined || !isLetter(neighbour);
    return matched ? { kind: "matched" } : { kind: "not-matched" };
  }

  const accepted = patternCharacters(pattern, environment.classes);
  if (neighbour === undefined || accepted === null || accepted === undefined) {
    return { kind: "not-matched" };
  }

  const target = fold(neighbour, environment.casePolicy);
  const matched = accepted.some((member) => fold(member, environment.casePolicy) === target);
  return matched ? { kind: "matched" } : { kind: "not-matched" };
};
