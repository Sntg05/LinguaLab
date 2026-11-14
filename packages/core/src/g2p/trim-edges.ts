/**
 * Quita del principio de `token` lo que cumple `isLeading`, y del final lo que
 * cumple `isTrailing` (por defecto, el mismo criterio).
 *
 * Existe porque la forma obvia —`token.replace(/^[…]+|[…]+$/g, "")`— es
 * cuadrática: el motor de expresiones regulares reintenta la alternativa
 * anclada al final desde cada posición, y una palabra pegada de 50 000 signos
 * tardaba segundos (CodeQL js/polynomial-redos). Recorrer los bordes una vez es
 * lineal. Trabaja por puntos de código, para no partir un carácter fuera del
 * plano básico.
 */
export const trimEdges = (
  token: string,
  isLeading: (char: string) => boolean,
  isTrailing: (char: string) => boolean = isLeading,
): string => {
  const chars = Array.from(token);
  let start = 0;
  let end = chars.length;
  while (start < end && isLeading(chars[start] as string)) start += 1;
  while (end > start && isTrailing(chars[end - 1] as string)) end -= 1;
  return chars.slice(start, end).join("");
};
