import type { G2PRule } from "../domain/g2p-rule";
import { normalizeInput } from "./normalize";
import { matchContextPattern, type PatternEnvironment } from "./patterns";
import type {
  CasePolicy,
  ConversionLayer,
  ConversionTraceEntry,
  LayerConversion,
  UncoveredPosition,
} from "./types";

/**
 * El corazon del motor: aplica UNA lista de reglas a un texto (especificacion
 * S7).
 *
 * La coincidencia se resuelve por posicion de izquierda a derecha. En cada
 * posicion se juntan todas las reglas cuyo grafema coincide y cuyo contexto se
 * cumple, y gana una sola. El orden de desempate es parte del contrato y esta
 * en `selectWinner`.
 */

export interface ConvertLayerOptions {
  readonly layer: ConversionLayer;
  readonly casePolicy: CasePolicy;
  readonly classes: Readonly<Record<string, readonly string[]>>;
}

const fold = (value: string, policy: CasePolicy): string =>
  policy === "fold" ? value.toLowerCase() : value;

/** Longitud en puntos de codigo: un digrafo cuenta dos, una vocal con tilde uno. */
const graphemeLength = (grapheme: string): number => Array.from(grapheme).length;

/**
 * Cuantos huecos de contexto impone la regla. Es la medida de especificidad
 * que usa el desempate: imponer `before` y `after` es mas especifico que
 * imponer solo uno, y eso es mas especifico que no imponer ninguno.
 */
const contextSpecificity = (rule: G2PRule): number =>
  (rule.before !== undefined ? 1 : 0) + (rule.after !== undefined ? 1 : 0);

/**
 * Comprueba si el grafema de la regla coincide en `index`.
 *
 * Un grafema vacio NUNCA coincide: si lo hiciera consumiria cero caracteres y
 * el bucle no avanzaria. El validador lo marca como error; el motor se
 * protege por si alguien llega aqui con una tabla sin validar.
 */
const graphemeMatchesAt = (
  chars: readonly string[],
  index: number,
  grapheme: string,
  policy: CasePolicy,
): boolean => {
  const expected = Array.from(grapheme);
  if (expected.length === 0 || index + expected.length > chars.length) {
    return false;
  }

  for (let offset = 0; offset < expected.length; offset += 1) {
    const actualChar = chars[index + offset];
    const expectedChar = expected[offset];
    if (actualChar === undefined || expectedChar === undefined) {
      return false;
    }
    if (fold(actualChar, policy) !== fold(expectedChar, policy)) {
      return false;
    }
  }

  return true;
};

/**
 * Comprueba los contextos `before`/`after` de una regla.
 *
 * Una clase inexistente se trata como "no coincide" en lugar de como error:
 * quien garantiza que no se llega aqui con una tabla rota es
 * `validateOrthographyTable` en la capa de aplicacion.
 */
const contextMatches = (
  chars: readonly string[],
  index: number,
  length: number,
  rule: G2PRule,
  environment: PatternEnvironment,
): boolean => {
  if (rule.before !== undefined) {
    const neighbour = index > 0 ? chars[index - 1] : undefined;
    if (matchContextPattern(rule.before, neighbour, environment).kind !== "matched") {
      return false;
    }
  }

  if (rule.after !== undefined) {
    const afterIndex = index + length;
    const neighbour = afterIndex < chars.length ? chars[afterIndex] : undefined;
    if (matchContextPattern(rule.after, neighbour, environment).kind !== "matched") {
      return false;
    }
  }

  return true;
};

/**
 * Elige la regla ganadora en una posicion.
 *
 * Orden de desempate, en este orden exacto:
 *  1. grafema mas largo (el digrafo le gana a la letra suelta),
 *  2. contexto mas especifico,
 *  3. prioridad mas alta (ausente = 0),
 *  4. aparicion mas temprana en la tabla.
 *
 * El punto 4 se cumple sin comparar indices: se recorre la tabla en orden y
 * solo se reemplaza al ganador cuando aparece algo estrictamente mejor. Un
 * empate nunca desplaza a quien llego primero.
 */
const selectWinner = (
  chars: readonly string[],
  index: number,
  rules: readonly G2PRule[],
  environment: PatternEnvironment,
  policy: CasePolicy,
): G2PRule | null => {
  let winner: G2PRule | null = null;
  let winnerLength = 0;
  let winnerSpecificity = 0;
  let winnerPriority = 0;

  for (const rule of rules) {
    const length = graphemeLength(rule.grapheme);
    if (length === 0 || !graphemeMatchesAt(chars, index, rule.grapheme, policy)) {
      continue;
    }
    if (!contextMatches(chars, index, length, rule, environment)) {
      continue;
    }

    const specificity = contextSpecificity(rule);
    const priority = rule.priority ?? 0;
    const better =
      winner === null ||
      length > winnerLength ||
      (length === winnerLength && specificity > winnerSpecificity) ||
      (length === winnerLength && specificity === winnerSpecificity && priority > winnerPriority);

    if (better) {
      winner = rule;
      winnerLength = length;
      winnerSpecificity = specificity;
      winnerPriority = priority;
    }
  }

  return winner;
};

/**
 * Aplica una capa de reglas y devuelve salida, rastro y huecos.
 *
 * Los caracteres sin regla se copian tal cual y se anotan en `uncovered`
 * (especificacion S7): descartarlos en silencio convertiria una tabla
 * incompleta en una transcripcion con palabras mutiladas, y el error se
 * descubriria mucho mas lejos de su causa.
 */
export const convertLayer = (
  text: string,
  rules: readonly G2PRule[],
  options: ConvertLayerOptions,
): LayerConversion => {
  const chars = Array.from(normalizeInput(text));
  const environment: PatternEnvironment = {
    classes: options.classes,
    casePolicy: options.casePolicy,
  };

  const trace: ConversionTraceEntry[] = [];
  const uncovered: UncoveredPosition[] = [];
  let output = "";
  let index = 0;

  while (index < chars.length) {
    const winner = selectWinner(chars, index, rules, environment, options.casePolicy);

    if (winner === null) {
      const char = chars[index];
      if (char !== undefined) {
        output += char;
        uncovered.push({ layer: options.layer, inputIndex: index, grapheme: char });
      }
      index += 1;
      continue;
    }

    const length = graphemeLength(winner.grapheme);
    const matched = chars.slice(index, index + length).join("");
    const before = index > 0 ? (chars[index - 1] ?? "") : "";
    const afterIndex = index + length;
    const after = afterIndex < chars.length ? (chars[afterIndex] ?? "") : "";

    output += winner.ipa;
    trace.push({
      layer: options.layer,
      inputIndex: index,
      grapheme: matched,
      ipa: winner.ipa,
      rule: winner,
      before,
      after,
    });
    index += length;
  }

  return { output, trace, uncovered };
};
