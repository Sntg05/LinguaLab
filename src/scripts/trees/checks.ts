/* ============================================================
   LinguaLab — ArborLab validation

   Three families of rule, each reporting findings the UI shows next to
   the drawing:
     - dependency: single root, acyclic, projectivity
     - constituency: branching, X-bar projections, size
     - movement: does the landing site c-command its trace
   ============================================================ */

import type { Locale } from "../../i18n";
import { countNodes, maxDepth } from "./layout";
import type { TreeNode } from "./parse";

export type CheckLevel = "error" | "note" | "ok";

export interface CheckResult {
  level: CheckLevel;
  message: string;
}

export interface MovementDirective {
  from: string;
  to: string;
  label?: string;
}

export interface CheckOptions {
  locale: Locale;
  /** Apply X-bar specific rules. */
  xbar?: boolean;
  directives?: readonly MovementDirective[];
}

const es = (locale: Locale): boolean => locale === "es";

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/** A dependency tree is recognised by the metadata the parser attaches. */
export function isDependencyTree(tree: TreeNode): boolean {
  return tree.depMeta !== undefined;
}

/* ---------------------------------------------------------------
   Dependency rules
   --------------------------------------------------------------- */

export function checkDependency(tree: TreeNode, locale: Locale): CheckResult[] {
  const out: CheckResult[] = [];
  const meta = tree.depMeta;
  if (!meta) return out;

  if (meta.roots.length === 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? "Ninguna palabra es la raíz: falta una cabeza 0."
        : "No word is the root: a head 0 is missing.",
    });
  } else if (meta.roots.length > 1) {
    out.push({
      level: "error",
      message: es(locale)
        ? `${meta.roots.length} raíces encontradas: debe haber exactamente una.`
        : `${meta.roots.length} roots found: there must be exactly one.`,
    });
  }

  // Walk to the root from every node; revisiting one means a cycle.
  const cycles: string[] = [];
  const limit = meta.nodes.length + 1;

  for (const node of meta.nodes) {
    const seen = new Set<number>();
    let current: TreeNode | undefined = node;
    let steps = 0;

    while (current && current.head !== 0 && steps < limit) {
      const id = current.id;
      if (id === undefined) break;
      if (seen.has(id)) {
        cycles.push(current.word ?? current.label);
        break;
      }
      seen.add(id);
      const nextHead: number | undefined = current.head;
      current = nextHead === undefined ? undefined : meta.byId[nextHead];
      steps += 1;
    }

    if (steps > meta.nodes.length) cycles.push(node.word ?? node.label);
  }

  if (cycles.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `Ciclo detectado desde: ${unique(cycles).join(", ")}`
        : `Cycle detected from: ${unique(cycles).join(", ")}`,
    });
  }

  const crossings = crossingArcs(meta.nodes);
  if (crossings.length > 0) {
    out.push({
      level: "note",
      message: es(locale)
        ? `Arcos cruzados (no proyectivo): ${crossings.join(", ")}. Normal en lenguas de orden libre.`
        : `Crossing arcs (non-projective): ${crossings.join(", ")}. Common in free-word-order languages.`,
    });
  }

  if (out.length === 0) {
    out.push({
      level: "ok",
      message: es(locale)
        ? "Árbol de dependencia válido: raíz única, sin ciclos, proyectivo."
        : "Valid dependency tree: single root, acyclic, projective.",
    });
  }

  return out;
}

/**
 * Pairs of arcs that cross, which is what makes a dependency tree
 * non-projective.
 */
export function crossingArcs(nodes: readonly TreeNode[]): string[] {
  const position = new Map<number, number>();
  nodes.forEach((node, index) => {
    if (node.id !== undefined) position.set(node.id, index);
  });

  const arcs = nodes
    .filter((node) => node.head !== 0 && node.head !== undefined)
    .map((node) => {
      const from = position.get(node.head ?? -1) ?? 0;
      const to = position.get(node.id ?? -1) ?? 0;
      return {
        from: Math.min(from, to),
        to: Math.max(from, to),
        label: node.word ?? node.label,
      };
    });

  const crossed: string[] = [];
  for (let i = 0; i < arcs.length; i += 1) {
    for (let j = i + 1; j < arcs.length; j += 1) {
      const a = arcs[i]!;
      const b = arcs[j]!;
      const crosses =
        (a.from < b.from && b.from < a.to && a.to < b.to) ||
        (b.from < a.from && a.from < b.to && b.to < a.to);
      if (crosses) crossed.push(`${a.label}↔${b.label}`);
    }
  }

  return unique(crossed);
}

/* ---------------------------------------------------------------
   Constituency rules
   --------------------------------------------------------------- */

/** True when no node has more than two children. */
export function allBinary(node: TreeNode): boolean {
  if (node.children.length > 2) return false;
  return node.children.every(allBinary);
}

/**
 * Phrase nodes whose subtree contains no projection of their own category.
 *
 * The original tested this by searching `JSON.stringify(subtree)` for the
 * category name, which also matched inside unrelated labels and values. This
 * walks the actual labels instead.
 */
export function badProjections(root: TreeNode): string[] {
  const bad: string[] = [];

  const walk = (node: TreeNode): void => {
    if (node.children.length === 0) return;

    // Only actual projections are checked: a label ending in P (`NP`, `AdvP`)
    // or in a prime (`N'`). A bare category such as `N` IS the head, not a
    // projection of itself, and `S` projects nothing.
    //
    // A greedy `[A-Z]+` would swallow the P, so `NP` yielded the category
    // "NP" and every standard projection passed by matching its own label.
    const phrase = /^([A-Z][A-Za-z]*?)P$/.exec(node.label);
    const barred = /^([A-Z][A-Za-z]*?)['\u2032]+$/.exec(node.label);
    const match = phrase ?? barred;
    if (match) {
      const category = match[1]!;
      // A projection should CONTAIN its own head, so the search starts at the
      // children. Testing the node itself made every XP satisfy the rule,
      // because `${category}P` is the node's own label.
      const isHead = (candidate: TreeNode): boolean =>
        candidate.label === category || candidate.label === `${category}'`;

      const containsHead = (candidate: TreeNode): boolean =>
        candidate.children.some((child) => isHead(child) || containsHead(child));

      if (!containsHead(node)) bad.push(node.label);
    }

    node.children.forEach(walk);
  };

  walk(root);
  return unique(bad);
}

export function checkConstituency(
  tree: TreeNode,
  locale: Locale,
  options: { xbar?: boolean } = {},
): CheckResult[] {
  const out: CheckResult[] = [];
  const binary = allBinary(tree);
  const depth = maxDepth(tree);
  const total = countNodes(tree);

  if (binary) {
    out.push({
      level: "ok",
      message: es(locale)
        ? "Ramificación binaria en todos los nodos (compatible con X-bar)."
        : "Binary branching at every node (X-bar compatible).",
    });
  } else if (options.xbar) {
    out.push({
      level: "note",
      message: es(locale)
        ? "Ramas no binarias detectadas: revisa si algún XP tiene más de dos hijas."
        : "Non-binary branching detected: check whether some XP has more than two daughters.",
    });
  }

  if (options.xbar) {
    const bad = badProjections(tree);
    if (bad.length > 0) {
      out.push({
        level: "note",
        message: es(locale)
          ? `Proyecciones sin núcleo X′: ${bad.join(", ")}`
          : `Projections lacking an X′ head: ${bad.join(", ")}`,
      });
    }
  }

  out.push({
    level: "ok",
    message: `${es(locale) ? "Nodos" : "Nodes"}: ${total} · ${
      es(locale) ? "profundidad" : "depth"
    } ${depth}`,
  });

  return out;
}

/* ---------------------------------------------------------------
   Movement: c-command
   --------------------------------------------------------------- */

interface IndexedNode {
  node: TreeNode;
  /** Path of child indices from the root. */
  path: number[];
}

function indexTree(root: TreeNode): IndexedNode[] {
  const index: IndexedNode[] = [];
  const walk = (node: TreeNode, path: number[]): void => {
    index.push({ node, path: [...path] });
    node.children.forEach((child, i) => walk(child, [...path, i]));
  };
  walk(root, []);
  return index;
}

/** Extract the `#id` marker a label may carry. */
function movementId(label: string): string | null {
  return /#(\w+)/.exec(label)?.[1] ?? null;
}

/**
 * Check that each landing site c-commands its trace.
 *
 * "C-commands" is approximated as "the trace sits inside the subtree of the
 * landing site", which is the relation these diagrams draw.
 */
export function checkMovement(
  tree: TreeNode,
  directives: readonly MovementDirective[],
  locale: Locale,
): CheckResult[] {
  const out: CheckResult[] = [];
  if (directives.length === 0) return out;

  const index = indexTree(tree);
  const byId = new Map<string, IndexedNode>();
  for (const entry of index) {
    const id = movementId(entry.node.label);
    if (id) byId.set(id, entry);
  }

  for (const directive of directives) {
    const from = byId.get(directive.from);
    const to = byId.get(directive.to);

    if (!from || !to) {
      out.push({
        level: "note",
        message: es(locale)
          ? `No se encontró el par de flecha «${directive.from} → ${directive.to}» (usa #id).`
          : `Arrow pair «${directive.from} → ${directive.to}» not found (use #id).`,
      });
      continue;
    }

    // C-command: the landing site c-commands its trace when the trace is
    // dominated by the landing site's PARENT. Comparing the other way round
    // (as the original did) asks whether the landing site is inside the
    // trace, which is never true for a real movement dependency.
    const parentPath = from.path.slice(0, -1);
    const under =
      to.path.length >= parentPath.length &&
      parentPath.every((value, index) => value === to.path[index]);

    const suffix = directive.label ? ` (${directive.label})` : "";

    out.push({
      level: under ? "ok" : "note",
      message: under
        ? (es(locale)
            ? "✓ c-command: la posición movida c-comanda su huella"
            : "✓ c-command: the landing site c-commands its trace") + suffix
        : (es(locale)
            ? "⚠ La posición movida NO c-commanda la huella"
            : "⚠ The landing site does NOT c-command the trace") + suffix,
    });
  }

  return out;
}

/* ---------------------------------------------------------------
   Entry point
   --------------------------------------------------------------- */

export function runChecks(tree: TreeNode, options: CheckOptions): CheckResult[] {
  const out = isDependencyTree(tree)
    ? checkDependency(tree, options.locale)
    : checkConstituency(tree, options.locale, { xbar: options.xbar });

  if (options.directives && options.directives.length > 0) {
    out.push(...checkMovement(tree, options.directives, options.locale));
  }

  return out;
}

export const CHECKS = {
  runAll: runChecks,
  checkDependency,
  checkConstituency,
  checkMovement,
  allBinary,
  badProjections,
  crossingArcs,
} as const;
