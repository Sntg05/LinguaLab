import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable } from "../domain/orthography-table";
import { isReasonableIpa } from "../engine/ipa-symbols";
import { classReferenceName, patternCharacters } from "../engine/patterns";

/**
 * Validacion estatica de una tabla de ortografia (especificacion S6).
 *
 * Es una funcion pura y sin puertos: no guarda, no consulta y no convierte.
 * Su trabajo es decirle al editor, antes de transcriber nada, que reglas no
 * pueden funcionar como su autor cree.
 *
 * La distincion entre `error` y `warning` es deliberada. Un `error` hace que
 * la tabla no se pueda usar (`table-unusable`), porque produce una
 * transcripcion que parece autoritativa y no lo es. Un `warning` es una
 * sospecha que una persona debe poder ignorar con conocimiento de causa.
 */

export type OrthographyIssueCode =
  | "empty-grapheme"
  | "duplicate-rule"
  | "contradictory-rule"
  | "undefined-class"
  | "symbol-outside-ipa"
  | "unreachable-rule";

export interface OrthographyIssue {
  readonly code: OrthographyIssueCode;
  readonly severity: "error" | "warning";
  readonly ruleIndex?: number;
  /** Texto para la persona que usa el editor; por eso esta en espanol. */
  readonly message: string;
}

interface LocatedRule {
  readonly rule: G2PRule;
  readonly index: number;
}

const locate = (rules: readonly G2PRule[], offset: number): readonly LocatedRule[] =>
  rules.map((rule, position) => ({ rule, index: offset + position }));

const describeRule = (index: number): string => `La regla ${index + 1}`;

const findOutsideIpa = (ipa: string): string | null => {
  for (const char of ipa) {
    if (!isReasonableIpa(char)) {
      return char;
    }
  }
  return null;
};

const contextKey = (rule: G2PRule): string =>
  `${rule.before ?? "\u0000"}\u0001${rule.after ?? "\u0000"}`;

/**
 * Marca reglas que repiten grafema y contexto.
 *
 * `duplicate-rule` y `contradictory-rule` son excluyentes: si la
 * transcripcion coincide es una repeticion; si difiere, una contradiccion.
 * Se reporta la regla posterior porque es la que se puede borrar sin perdida
 * de informacion, y se devuelve el conjunto de indices marcados para que el
 * aviso de "inalcanzable" no repita el mismo diagnostico.
 */
const groupBySignature = (
  located: readonly LocatedRule[],
): ReadonlyMap<string, readonly LocatedRule[]> => {
  const groups = new Map<string, LocatedRule[]>();

  for (const entry of located) {
    const key = `${entry.rule.grapheme}\u0001${contextKey(entry.rule)}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [entry]);
    } else {
      group.push(entry);
    }
  }

  return groups;
};

const flagGroup = (
  group: readonly LocatedRule[],
  issues: OrthographyIssue[],
  flagged: Set<number>,
): void => {
  const seenIpas = new Set<string>();
  for (const entry of group) {
    if (seenIpas.size > 0) {
      const duplicate = seenIpas.has(entry.rule.ipa);
      issues.push({
        code: duplicate ? "duplicate-rule" : "contradictory-rule",
        severity: "error",
        ruleIndex: entry.index,
        message: duplicate
          ? `${describeRule(entry.index)} repite el grafema "${entry.rule.grapheme}" con el mismo contexto y la misma transcripcion que una regla anterior.`
          : `${describeRule(entry.index)} contradice una regla anterior para "${entry.rule.grapheme}": mismo contexto, transcripcion distinta.`,
      });
      flagged.add(entry.index);
    }
    seenIpas.add(entry.rule.ipa);
  }
};

/**
 * Marca reglas que repiten grafema y contexto.
 *
 * `duplicate-rule` y `contradictory-rule` son excluyentes: si la
 * transcripcion coincide es una repeticion; si difiere, una contradiccion.
 * Se reporta la regla posterior porque es la que se puede borrar sin perdida
 * de informacion, y se devuelve el conjunto de indices marcados para que el
 * aviso de "inalcanzable" no repita el mismo diagnostico.
 */
const flagRepeatedRules = (
  located: readonly LocatedRule[],
  issues: OrthographyIssue[],
): ReadonlySet<number> => {
  const flagged = new Set<number>();
  for (const group of groupBySignature(located).values()) {
    flagGroup(group, issues, flagged);
  }
  return flagged;
};

/**
 * `true` si todo caracter que acepta `narrow` tambien lo acepta `broad`.
 *
 * La ausencia de patron es el contexto mas amplio posible: coincide con
 * cualquier vecino. Como no se puede demostrar contencion sobre un patron que
 * referencia una clase inexistente, ese caso se responde `false`: es
 * preferible no avisar a inventar un solapamiento.
 */
const slotSubsumes = (
  broad: string | undefined,
  narrow: string | undefined,
  classes: Readonly<Record<string, readonly string[]>>,
): boolean => {
  if (broad === undefined) {
    return true;
  }
  if (narrow === undefined) {
    return false;
  }
  if (broad === narrow) {
    return true;
  }

  const broadCharacters = patternCharacters(broad, classes);
  const narrowCharacters = patternCharacters(narrow, classes);
  if (
    broadCharacters === null ||
    narrowCharacters === null ||
    broadCharacters === undefined ||
    narrowCharacters === undefined
  ) {
    return false;
  }

  return narrowCharacters.every((char) => broadCharacters.includes(char));
};

/**
 * Condicion de inalcanzabilidad.
 *
 * Ademas de que el contexto anterior cubra al posterior, los dos deben imponer
 * EL MISMO NUMERO de huecos de contexto. Si el anterior impone menos, el
 * posterior gana por especificidad y SI puede alcanzarse; sin esa igualdad, el
 * aviso seria falso.
 */
const contextSubsumes = (
  broad: G2PRule,
  narrow: G2PRule,
  classes: Readonly<Record<string, readonly string[]>>,
): boolean => {
  const sameBefore = (broad.before !== undefined) === (narrow.before !== undefined);
  const sameAfter = (broad.after !== undefined) === (narrow.after !== undefined);
  if (!sameBefore || !sameAfter) {
    return false;
  }

  return (
    slotSubsumes(broad.before, narrow.before, classes) &&
    slotSubsumes(broad.after, narrow.after, classes)
  );
};

const flagUnreachable = (
  located: readonly LocatedRule[],
  classes: Readonly<Record<string, readonly string[]>>,
  issues: OrthographyIssue[],
  alreadyFlagged: ReadonlySet<number>,
): void => {
  for (let position = 0; position < located.length; position += 1) {
    const later = located[position];
    if (later === undefined || alreadyFlagged.has(later.index) || later.rule.grapheme === "") {
      continue;
    }

    const shadowed = located
      .slice(0, position)
      .some(
        (earlier) =>
          earlier.rule.grapheme === later.rule.grapheme &&
          contextSubsumes(earlier.rule, later.rule, classes) &&
          (earlier.rule.priority ?? 0) >= (later.rule.priority ?? 0),
      );

    if (shadowed) {
      issues.push({
        code: "unreachable-rule",
        severity: "warning",
        ruleIndex: later.index,
        message: `${describeRule(later.index)} nunca puede ganar: una regla anterior con el mismo grafema cubre un contexto igual o mas amplio.`,
      });
    }
  }
};

const validateLayer = (
  rules: readonly G2PRule[],
  offset: number,
  classes: Readonly<Record<string, readonly string[]>>,
  issues: OrthographyIssue[],
): void => {
  const located = locate(rules, offset);

  for (const entry of located) {
    if (entry.rule.grapheme === "") {
      issues.push({
        code: "empty-grapheme",
        severity: "error",
        ruleIndex: entry.index,
        message: `${describeRule(entry.index)} tiene un grafema vacio y coincidiria en cualquier posicion.`,
      });
    }

    for (const pattern of [entry.rule.before, entry.rule.after]) {
      if (pattern === undefined) {
        continue;
      }
      const reference = classReferenceName(pattern);
      if (reference !== null && classes[reference] === undefined) {
        issues.push({
          code: "undefined-class",
          severity: "error",
          ruleIndex: entry.index,
          message: `${describeRule(entry.index)} referencia la clase {${reference}}, que no esta definida en la tabla.`,
        });
      }
    }

    const outside = findOutsideIpa(entry.rule.ipa);
    if (outside !== null) {
      issues.push({
        code: "symbol-outside-ipa",
        severity: "warning",
        ruleIndex: entry.index,
        message: `${describeRule(entry.index)} contiene "${outside}", que no forma parte del conjunto AFI esperado.`,
      });
    }
  }

  const flagged = flagRepeatedRules(located, issues);
  flagUnreachable(located, classes, issues, flagged);
};

/**
 * Valida las dos capas de una tabla.
 *
 * La capa alofonica se valida con un desplazamiento igual al numero de reglas
 * fonemicas, de modo que `ruleIndex` siga apuntando a la fila que el editor
 * muestra: la lista visual es fonemicas y despues alofonicas, una sola lista
 * plana. Sin ese desplazamiento el indice seria correcto dentro de su capa y
 * senalaria una fila distinta en pantalla.
 */
export const validateOrthographyTable = (table: OrthographyTable): readonly OrthographyIssue[] => {
  const issues: OrthographyIssue[] = [];
  validateLayer(table.rules, 0, table.classes, issues);
  validateLayer(table.allophonic ?? [], table.rules.length, table.classes, issues);
  return issues;
};
