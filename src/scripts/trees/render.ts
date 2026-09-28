/* ============================================================
   LinguaLab — ArborLab SVG renderer

   Draws a laid-out tree: node boxes, elbow connectors, and the full label
   notation (indices, superscripts, features, boxes, traces, triangles,
   highlighting, arc labels, notes and movement arrows).

   Colours are written as CSS custom properties so the drawing follows the
   page theme. export.ts resolves them to concrete values when producing a
   standalone file.

   Every attribute is given an explicit value. A valueless attribute is
   valid HTML but invalid XML, and these drawings are downloaded as .svg.
   ============================================================ */

import type { Layout, LayoutNode } from "./layout";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Attributes that carry a value; none may be left bare. */
type Attrs = Record<string, string | number>;

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs,
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------------------------------------------------------------
   Label notation
   --------------------------------------------------------------- */

export interface ParsedLabel {
  base: string;
  sub: string;
  sup: string;
  feats: string;
  boxed: boolean;
  copy: boolean;
  highlight: boolean;
  arc: string;
  note: string;
  triangle: boolean;
  hidden: boolean;
}

/**
 * Decompose a label into its notation parts.
 *
 * Supported, in the order the pieces are stripped:
 *   `NP!` highlight · `label@ARC` · `label::"note"` · `DP^` triangle ·
 *   `<copy>` · `{t_i}` box · `X^{max}` superscript · `T[feats]` ·
 *   `base_i` index · `#id` movement id (kept in the base).
 */
export function parseLabel(raw: string | null | undefined): ParsedLabel {
  const out: ParsedLabel = {
    base: "",
    sub: "",
    sup: "",
    feats: "",
    boxed: false,
    copy: false,
    highlight: false,
    arc: "",
    note: "",
    triangle: false,
    hidden: false,
  };

  let s = String(raw ?? "");
  if (!s) return out;

  out.hidden = s === "ε" || s === "0" || s === "∅";

  if (/!$/.test(s)) {
    out.highlight = true;
    s = s.replace(/!$/, "");
  }

  const at = s.split("@");
  if (at.length === 2) {
    out.arc = at[1] ?? "";
    s = at[0] ?? "";
  }

  const dc = s.split("::");
  if (dc.length >= 2) {
    out.note = dc
      .slice(1)
      .join("::")
      .replace(/^"|"$/g, "");
    s = dc[0] ?? "";
  }

  // `DP^` is a triangle, but `X^max` is a superscript: both use `^`. Only a
  // TRAILING caret marks a triangle, so the two can be told apart. The
  // original treated every non-braced caret as a triangle, which silently
  // ate the bare superscript form.
  if (/\^$/.test(s)) {
    out.triangle = true;
    s = s.replace(/\^$/, "");
  }

  if (/^<.*>$/.test(s)) {
    out.copy = true;
    s = s.slice(1, -1);
  }

  if (/^\{.*\}$/.test(s)) {
    out.boxed = true;
    s = s.slice(1, -1);
  }

  const supMatch = /\^\{([^}]*)\}|\^(\w+)/.exec(s);
  if (supMatch) {
    out.sup = supMatch[1] ?? supMatch[2] ?? "";
    s = s.replace(supMatch[0], "");
  }

  const featsMatch = /\[([^\]]*)\]/.exec(s);
  if (featsMatch) {
    out.feats = featsMatch[1] ?? "";
    s = s.replace(featsMatch[0], "");
  }

  const idxMatch = /_\{([^}]*)\}|_(\w)/.exec(s);
  if (idxMatch) {
    out.sub = idxMatch[1] ?? idxMatch[2] ?? "";
    s = s.replace(idxMatch[0], "");
  }

  out.base = s.trim() || String(raw ?? "");
  return out;
}

/** Estimated width of a node box for a parsed label. */
export function labelWidth(parsed: ParsedLabel): number {
  const base = parsed.base.replace(/_/g, " ");
  let width = Math.max(40, base.length * 9.6 + 16);
  if (parsed.feats) width += parsed.feats.length * 5.4;
  if (parsed.sup) width += parsed.sup.length * 5;
  if (parsed.sub) width += parsed.sub.length * 5;
  return Math.min(width, 240);
}

export const NODE_HEIGHT = 34;

/* ---------------------------------------------------------------
   Colours
   --------------------------------------------------------------- */

export interface RenderTheme {
  ink: string;
  muted: string;
  accent: string;
  mark: string;
  surface: string;
  wash: string;
  line: string;
  ok: string;
  warn: string;
}

export const DEFAULT_THEME: RenderTheme = {
  ink: "var(--ink)",
  muted: "var(--ink-muted)",
  accent: "var(--accent)",
  mark: "var(--mark)",
  surface: "var(--surface)",
  wash: "var(--accent-wash)",
  line: "var(--line-strong)",
  ok: "var(--ok)",
  warn: "var(--warn)",
};

/* ---------------------------------------------------------------
   Drawing
   --------------------------------------------------------------- */

interface DrawnNode {
  layout: LayoutNode;
  parsed: ParsedLabel;
  width: number;
  movementId: string | null;
}

function drawNode(group: SVGGElement, drawn: DrawnNode, theme: RenderTheme): void {
  const { layout: n, parsed: p, width } = drawn;
  const x = n.x;
  const y = n.y;
  const half = width / 2;
  const isLeaf = n.node.isLeaf;

  if (p.arc) {
    group.append(
      el(
        "text",
        {
          x,
          y: y - 8,
          "text-anchor": "middle",
          "font-family": "var(--font-mono)",
          "font-size": 9.5,
          fill: theme.mark,
          "letter-spacing": ".08em",
        },
        p.arc,
      ),
    );
  }

  if (p.triangle) {
    const baseY = y + NODE_HEIGHT;
    group.append(
      el("polygon", {
        points: `${x - half},${baseY} ${x + half},${baseY} ${x},${y}`,
        fill: "none",
        stroke: theme.line,
        "stroke-width": 1.4,
        opacity: 0.75,
      }),
    );
  } else if (p.boxed) {
    group.append(
      el("rect", {
        x: x - half,
        y,
        width,
        height: NODE_HEIGHT,
        rx: 7,
        fill: "none",
        stroke: theme.accent,
        "stroke-width": 1.6,
        "stroke-dasharray": "5 3",
      }),
    );
  } else {
    group.append(
      el("rect", {
        x: x - half,
        y,
        width,
        height: NODE_HEIGHT,
        rx: 9,
        fill: p.highlight ? theme.wash : isLeaf ? theme.surface : "transparent",
        stroke: isLeaf ? theme.muted : p.highlight ? theme.accent : theme.line,
        "stroke-width": isLeaf ? 1.2 : 1.6,
        opacity: p.copy ? 0.55 : 1,
      }),
    );
  }

  group.append(
    el(
      "text",
      {
        x,
        y: y + NODE_HEIGHT / 2 + 5,
        "text-anchor": "middle",
        "font-family": isLeaf ? "var(--font-ipa)" : "var(--font-sans)",
        "font-size": isLeaf ? 15 : 13.5,
        "font-weight": isLeaf ? 600 : 700,
        fill: p.copy ? theme.muted : isLeaf ? theme.ink : theme.accent,
        "text-decoration": p.copy ? "line-through" : "none",
        opacity: p.copy ? 0.6 : 1,
      },
      p.base.replace(/_/g, " "),
    ),
  );

  if (p.sub) {
    group.append(
      el(
        "text",
        {
          x: x + half - 6,
          y: y + NODE_HEIGHT - 3,
          "text-anchor": "end",
          "font-family": "var(--font-mono)",
          "font-size": 9.5,
          fill: theme.muted,
        },
        p.sub,
      ),
    );
  }

  if (p.sup) {
    group.append(
      el(
        "text",
        {
          x: x - half + 6,
          y: y + 11,
          "text-anchor": "start",
          "font-family": "var(--font-mono)",
          "font-size": 9.5,
          fill: theme.mark,
        },
        p.sup,
      ),
    );
  }

  if (p.feats) {
    group.append(
      el(
        "text",
        {
          x,
          y: y + NODE_HEIGHT + 12,
          "text-anchor": "middle",
          "font-family": "var(--font-mono)",
          "font-size": 9,
          fill: theme.mark,
          opacity: 0.9,
        },
        `[${p.feats}]`,
      ),
    );
  }

  if (p.note) {
    group.append(
      el(
        "text",
        {
          x,
          y: y - (p.arc ? 20 : 8),
          "text-anchor": "middle",
          "font-family": "var(--font-mono)",
          "font-size": 8.5,
          fill: theme.muted,
          opacity: 0.85,
        },
        p.note,
      ),
    );
  }
}

export interface MovementArrow {
  from: string;
  to: string;
  label?: string;
  color?: string;
  style?: "solid" | "dashed";
}

function arrowColor(color: string | undefined, theme: RenderTheme): string {
  switch (color) {
    case "red":
      return theme.warn;
    case "grey":
    case "gray":
      return theme.line;
    case "green":
      return theme.ok;
    default:
      return theme.accent;
  }
}

function drawArrows(
  group: SVGGElement,
  drawn: Map<number, DrawnNode>,
  arrows: readonly MovementArrow[],
  theme: RenderTheme,
): void {
  const byId = new Map<string, DrawnNode>();
  for (const item of drawn.values()) {
    if (item.movementId) byId.set(item.movementId, item);
  }

  for (const arrow of arrows) {
    const a = byId.get(arrow.from);
    const b = byId.get(arrow.to);
    if (!a || !b) continue;

    const colour = arrowColor(arrow.color, theme);
    const bottom = (n: DrawnNode) => n.layout.y + NODE_HEIGHT;
    const midX = (a.layout.x + b.layout.x) / 2;
    const drop = Math.max(bottom(a), bottom(b)) + 46;

    group.append(
      el("path", {
        d: `M${a.layout.x},${bottom(a)} Q${midX},${drop + 20} ${b.layout.x},${bottom(b)}`,
        fill: "none",
        stroke: colour,
        "stroke-width": 1.5,
        "stroke-dasharray": arrow.style === "solid" ? "none" : "6 4",
        opacity: 0.9,
      }),
    );

    group.append(
      el("polygon", {
        points: `${b.layout.x},${bottom(b)} ${b.layout.x - 4},${bottom(b) + 8} ${b.layout.x + 4},${bottom(b) + 8}`,
        fill: colour,
      }),
    );

    if (arrow.label) {
      group.append(
        el(
          "text",
          {
            x: midX,
            y: drop + 26,
            "text-anchor": "middle",
            "font-family": "var(--font-mono)",
            "font-size": 9.5,
            fill: colour,
          },
          arrow.label,
        ),
      );
    }
  }
}

export interface RenderOptions {
  theme?: Partial<RenderTheme>;
  arrows?: readonly MovementArrow[];
  /** Accessible label for the drawing. */
  alt?: string;
}

export interface RenderResult {
  svg: SVGSVGElement;
  layout: Layout;
}

/** Build the SVG for a laid-out tree. */
export function renderTree(layout: Layout, options: RenderOptions = {}): RenderResult {
  const theme: RenderTheme = { ...DEFAULT_THEME, ...options.theme };
  const width = Math.max(layout.width, 200);
  const height = Math.max(layout.height, 160);

  const svg = el("svg", {
    xmlns: SVG_NS,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": options.alt ?? "Árbol",
    "data-arborlab-svg": "true",
  });

  // Precompute the parsed label and box width for every node.
  const drawn = new Map<number, DrawnNode>();
  for (const item of layout.nodes) {
    const parsed = parseLabel(item.node.label);
    drawn.set(item.id, {
      layout: item,
      parsed,
      width: Math.max(item.width, labelWidth(parsed)),
      movementId: /#(\w+)/.exec(item.node.label)?.[1] ?? null,
    });
  }

  const edgeGroup = el("g", { class: "edges" });
  const nodeGroup = el("g", { class: "nodes" });
  svg.append(edgeGroup, nodeGroup);

  // Edges first so boxes sit on top of the connectors.
  const walkEdges = (parent: LayoutNode): void => {
    for (const child of parent.children) {
      const midY = parent.y + NODE_HEIGHT + (child.y - (parent.y + NODE_HEIGHT)) * 0.5;
      edgeGroup.append(
        el("path", {
          d: `M${parent.x},${parent.y + NODE_HEIGHT} L${parent.x},${midY} L${child.x},${midY} L${child.x},${child.y}`,
          fill: "none",
          stroke: theme.line,
          "stroke-width": 1.5,
          opacity: 0.7,
        }),
      );
      walkEdges(child);
    }
  };
  walkEdges(layout.root);

  for (const item of layout.nodes) {
    const entry = drawn.get(item.id);
    if (entry) drawNode(nodeGroup, entry, theme);
  }

  if (options.arrows && options.arrows.length > 0) {
    drawArrows(nodeGroup, drawn, options.arrows, theme);
  }

  return { svg, layout };
}

/** Parse `move: a -> b "label"` directives from the source text. */
export function parseMovementDirectives(source: string): MovementArrow[] {
  const arrows: MovementArrow[] = [];
  const pattern = /move:\s*(\S+)\s*->\s*(\S+)(?:\s*"([^"]*)")?/gi;

  for (const match of source.matchAll(pattern)) {
    const [, from, to, label] = match;
    if (!from || !to) continue;
    arrows.push({
      from: from.replace(/^#/, ""),
      to: to.replace(/^#/, ""),
      ...(label ? { label } : {}),
    });
  }

  return arrows;
}

