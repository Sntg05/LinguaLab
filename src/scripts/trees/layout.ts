/* ============================================================
   LinguaLab — ArborLab layout

   A simplified Reingold–Tilford pass for hierarchical trees with
   variable-width labels, plus forest support.

   The original mutated the tree with `_`-prefixed fields. This version
   returns a separate LayoutNode graph instead, so a tree can be laid out
   more than once (different zoom, different options) without carrying
   stale coordinates, and the renderer never reads underscore fields.
   ============================================================ */

import type { TreeNode } from "./parse";

export interface LayoutConfig {
  /** Node box height. */
  nodeHeight: number;
  /** Minimum horizontal gap between siblings. */
  hGap: number;
  /** Vertical gap between levels. */
  vGap: number;
  /** Outer margin. */
  pad: number;
}

export const LAYOUT_CONFIG: LayoutConfig = {
  nodeHeight: 54,
  hGap: 14,
  vGap: 46,
  pad: 40,
};

export interface LayoutNode {
  node: TreeNode;
  id: number;
  depth: number;
  parent: LayoutNode | null;
  /** Centre of the node box. */
  x: number;
  y: number;
  /** Width of this node's own box. */
  width: number;
  /** Width of the subtree rooted here, including sibling gaps. */
  subtreeWidth: number;
  children: LayoutNode[];
}

export interface Layout {
  /** Every node, in placement order (children before parents). */
  nodes: LayoutNode[];
  root: LayoutNode;
  width: number;
  height: number;
  config: LayoutConfig;
}

/**
 * Estimated box width for a label.
 * A character-count heuristic, not real text measurement: the renderer uses
 * the same function so boxes and text always agree, and the layout stays
 * pure and testable.
 */
export function measureLabel(label: string | null | undefined): number {
  const chars = String(label ?? "").length;
  return Math.max(46, chars * 9.4 + 22);
}

/** The text a node displays: a leaf shows its label, others a pre-label. */
function displayLabel(node: TreeNode): string {
  return node.isLeaf ? node.label : node.label;
}

export interface LayoutOptions {
  gap?: number;
  config?: Partial<LayoutConfig>;
}

export function layoutTree(root: TreeNode, options: LayoutOptions = {}): Layout {
  const config: LayoutConfig = { ...LAYOUT_CONFIG, ...options.config };
  const gap = options.gap ?? config.hGap;

  const nodes: LayoutNode[] = [];
  let nextId = 0;

  const make = (node: TreeNode, depth: number, parent: LayoutNode | null): LayoutNode => ({
    node,
    id: nextId++,
    depth,
    parent,
    x: 0,
    y: 0,
    width: measureLabel(displayLabel(node)),
    subtreeWidth: 0,
    children: [],
  });

  /** Phase 1: build the graph and measure subtree widths, bottom-up. */
  const measure = (node: TreeNode, depth: number, parent: LayoutNode | null): LayoutNode => {
    const self = make(node, depth, parent);
    self.children = node.children.map((child) => measure(child, depth + 1, self));

    if (self.children.length === 0) {
      self.subtreeWidth = self.width;
    } else {
      let sum = 0;
      self.children.forEach((child, index) => {
        sum += child.subtreeWidth + (index > 0 ? gap : 0);
      });
      self.subtreeWidth = Math.max(self.width, sum);
    }

    return self;
  };

  /** Phase 2: assign coordinates, left to right. */
  const place = (self: LayoutNode, left: number): void => {
    if (self.children.length === 0) {
      self.x = left + self.subtreeWidth / 2;
    } else {
      let cursor = left;
      self.children.forEach((child, index) => {
        if (index > 0) cursor += gap;
        place(child, cursor);
        cursor += child.subtreeWidth;
      });

      // Centre the parent over its children. Because subtreeWidth is the max
      // of the label width and the children's total, the parent can never be
      // wider than its own subtree, so no overflow correction is needed here.
      const first = self.children[0]!;
      const last = self.children[self.children.length - 1]!;
      self.x = (first.x + last.x) / 2;
    }

    self.y = config.pad + self.depth * (config.nodeHeight + config.vGap);
    nodes.push(self);
  };

  const isForest = root.forest === true || root.label === "";

  let layoutRoot: LayoutNode;
  if (isForest && root.children.length > 0) {
    // A forest is placed under an implicit container at depth 0.
    layoutRoot = make(root, 0, null);
    layoutRoot.width = 0;
    layoutRoot.children = root.children.map((child) => measure(child, 1, layoutRoot));

    let sum = 0;
    layoutRoot.children.forEach((child, index) => {
      sum += child.subtreeWidth + (index > 0 ? gap : 0);
    });
    layoutRoot.subtreeWidth = sum;

    let cursor = 0;
    layoutRoot.children.forEach((child, index) => {
      if (index > 0) cursor += gap;
      place(child, cursor);
      cursor += child.subtreeWidth;
    });

    const firstChild = layoutRoot.children[0]!;
    const lastChild = layoutRoot.children[layoutRoot.children.length - 1]!;
    layoutRoot.x = (firstChild.x + lastChild.x) / 2;
    layoutRoot.y = config.pad;
    nodes.push(layoutRoot);
  } else {
    layoutRoot = measure(root, 0, null);
    place(layoutRoot, 0);
  }

  // Normalise so the drawing starts at the margin.
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const half = node.width / 2;
    if (node.x - half < minX) minX = node.x - half;
    if (node.x + half > maxX) maxX = node.x + half;
    if (node.y > maxY) maxY = node.y;
  }

  if (!Number.isFinite(minX)) {
    // Degenerate tree (a single synthetic root with no children).
    minX = 0;
    maxX = 0;
    maxY = 0;
  }

  const shift = config.pad - minX;
  for (const node of nodes) node.x += shift;

  return {
    nodes,
    root: layoutRoot,
    width: maxX + shift + config.pad,
    height: maxY + config.nodeHeight + config.pad,
    config,
  };
}

/* ---------------------------------------------------------------
   Metrics, used by the checks panel and the tree-type guide.
   --------------------------------------------------------------- */

export function maxDepth(node: TreeNode, depth = 0): number {
  let best = depth;
  for (const child of node.children) {
    best = Math.max(best, maxDepth(child, depth + 1));
  }
  return best;
}

export function countNodes(node: TreeNode): number {
  let total = 1;
  for (const child of node.children) total += countNodes(child);
  return total;
}

export function countLeaves(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  let total = 0;
  for (const child of node.children) total += countLeaves(child);
  return total;
}

/** True when every node has at most two children. */
export function isBinary(node: TreeNode): boolean {
  if (node.children.length > 2) return false;
  return node.children.every(isBinary);
}

export const METRICS = { maxDepth, countNodes, countLeaves, isBinary } as const;
