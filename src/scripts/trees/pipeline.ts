/* ============================================================
   LinguaLab — ArborLab build pipeline

   One entry point that turns (type, input) into a tree, so the page does
   not need to know which parser each tree type uses.
   ============================================================ */

import { solve, DATA_KINDS, type SolveOptions } from "./solvers";
import {
  ParseError,
  parseBrackets,
  parseDependency,
  parseOutline,
  sentenceToTree,
  type TreeNode,
} from "./parse";
import { treeType, type TreeType } from "../../data/trees/types";
import { parseMovementDirectives, type MovementArrow } from "./render";

export interface BuildResult {
  tree: TreeNode;
  arrows: MovementArrow[];
  type: TreeType;
}

export interface BuildOptions {
  /** Extra solve options for the data-structure kinds. */
  solveOptions?: SolveOptions;
}

/** The kinds `solve` accepts, as a set for membership tests. */
const SOLVABLE: ReadonlySet<string> = new Set(DATA_KINDS);

/**
 * Build a tree for a type.
 *
 * `comparison` has no input of its own: it is a table of the other data
 * structures, so it is reported rather than parsed.
 */
export function buildTree(
  typeId: string,
  input: string,
  options: BuildOptions = {},
): BuildResult {
  const type = treeType(typeId);
  if (!type) throw new ParseError(`Tipo de árbol desconocido: «${typeId}»`);

  const source = String(input ?? "");
  const arrows = parseMovementDirectives(source);

  switch (type.mode) {
    case "dep":
      return { tree: parseDependency(source), arrows, type };

    case "bracket":
      return { tree: parseBrackets(source), arrows, type };

    case "outline":
      return { tree: parseOutline(source), arrows, type };

    case "data": {
      if (!SOLVABLE.has(typeId)) {
        throw new ParseError(`«${typeId}» no es una estructura de datos conocida`);
      }
      // `solve` returns the tree alongside its build log and metrics; the
      // drawing only needs the tree.
      const { tree } = solve(typeId, source, options.solveOptions);
      return { tree, arrows, type };
    }

    case "table":
      throw new ParseError(
        "Este tipo es una tabla comparativa: elige una estructura de datos para dibujarla.",
      );

    default: {
      // Exhaustive: a new mode must be handled here.
      const never: never = type.mode;
      throw new ParseError(`Modo no soportado: ${String(never)}`);
    }
  }
}

/** Build from a plain sentence using the didactic tagger. */
export function buildFromSentence(sentence: string): TreeNode {
  return sentenceToTree(sentence);
}

/** True when the type takes free text rather than a notation. */
export function takesFreeText(typeId: string): boolean {
  const type = treeType(typeId);
  return type?.mode === "data" || type?.mode === "table";
}

export { ParseError };
