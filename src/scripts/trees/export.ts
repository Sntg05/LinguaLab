/* ============================================================
   LinguaLab — ArborLab export

   Produces downloadable artefacts from a tree:
     - SVG (self-contained and XML-valid)
     - PNG (rasterised through a canvas)
     - JSON (re-importable)
     - Newick, CoNLL-U, Brat

   The SVG path deliberately resolves CSS custom properties to concrete
   colours and strips nothing that carries meaning. A standalone file that
   references `var(--accent)` renders black in every other tool, and an
   attribute without a value makes the file invalid XML.
   ============================================================ */

import { parseLabel } from "./render";
import type { TreeNode } from "./parse";

/* ---------------------------------------------------------------
   Download plumbing
   --------------------------------------------------------------- */

export function download(filename: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------
   SVG
   --------------------------------------------------------------- */

/** The custom properties the drawing references. */
const THEME_VARS = [
  "--ink",
  "--ink-muted",
  "--accent",
  "--mark",
  "--surface",
  "--accent-wash",
  "--line-strong",
  "--ok",
  "--warn",
  "--bg",
  "--font-sans",
  "--font-ipa",
  "--font-mono",
] as const;

/**
 * Resolve every `var(--x)` in the serialized markup to its computed value.
 *
 * This is what makes the exported file stand alone: a viewer that has never
 * seen our stylesheet still paints the right colours. Unknown properties fall
 * back to a literal so no `var()` survives into the file.
 */
export function resolveCustomProperties(markup: string, root: Element): string {
  const computed = getComputedStyle(root);
  const values = new Map<string, string>();

  for (const name of THEME_VARS) {
    const value = computed.getPropertyValue(name).trim();
    values.set(name, value || "currentColor");
  }

  return markup.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi, (_match, name: string, fallback?: string) => {
    const resolved = values.get(name);
    if (resolved && resolved !== "currentColor") return resolved;
    return fallback?.trim() || resolved || "currentColor";
  });
}

/**
 * Serialize an SVG for download.
 *
 * The result is valid XML: the namespace is declared, the document is
 * preceded by an XML declaration, and every custom property is resolved so
 * nothing depends on an external stylesheet.
 */
export function svgString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const serialized = new XMLSerializer().serializeToString(clone);
  const resolved = resolveCustomProperties(serialized, document.documentElement);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${resolved}`;
}

export function saveSVG(svg: SVGSVGElement, name = "arborlab"): void {
  download(`${name}.svg`, svgString(svg), "image/svg+xml;charset=utf-8");
}

export async function copySVG(svg: SVGSVGElement): Promise<void> {
  const text = svgString(svg);
  if (!navigator.clipboard?.writeText) {
    throw new Error("El portapapeles no está disponible");
  }
  await navigator.clipboard.writeText(text);
}

export function savePNG(svg: SVGSVGElement, name = "arborlab"): void {
  const width = Number.parseInt(svg.getAttribute("width") ?? "800", 10) || 800;
  const height = Number.parseInt(svg.getAttribute("height") ?? "600", 10) || 600;

  // Cap the scale: a large tree at 2x can exhaust memory on mobile.
  const scale = Math.min(2, 2048 / Math.max(width, height));

  const blob = new Blob([svgString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  image.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }

    // Opaque background: a transparent PNG is unreadable on a dark viewer.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((result) => {
      if (!result) return;
      const resultUrl = URL.createObjectURL(result);
      const anchor = document.createElement("a");
      anchor.href = resultUrl;
      anchor.download = `${name}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(resultUrl), 1500);
    });
  });

  image.addEventListener("error", () => URL.revokeObjectURL(url));
  image.src = url;
}

/* ---------------------------------------------------------------
   JSON
   --------------------------------------------------------------- */

export interface SerializedNode {
  label: string;
  children?: SerializedNode[];
}

export interface ArborLabDocument {
  format: string;
  generated: string;
  kind: string;
  lang: string;
  tree: SerializedNode;
  directives: unknown[];
}

function serializeNode(node: TreeNode): SerializedNode {
  const out: SerializedNode = { label: node.label };
  if (node.children.length > 0) out.children = node.children.map(serializeNode);
  return out;
}

export function toJSON(
  tree: TreeNode,
  meta: { kind?: string; lang?: string; directives?: unknown[] } = {},
): ArborLabDocument {
  return {
    format: "LinguaLab ArborLab v1",
    generated: new Date().toISOString(),
    kind: meta.kind ?? "constituency",
    lang: meta.lang ?? "es",
    tree: serializeNode(tree),
    directives: meta.directives ?? [],
  };
}

export function fromJSON(value: unknown): TreeNode {
  const deserialize = (raw: unknown): TreeNode => {
    if (typeof raw !== "object" || raw === null || !("label" in raw)) {
      throw new Error("JSON no reconocido");
    }
    const label = String((raw as { label: unknown }).label);
    const childrenRaw = (raw as { children?: unknown }).children;
    const children = Array.isArray(childrenRaw) ? childrenRaw.map(deserialize) : [];
    return {
      label,
      children,
      isLeaf: children.length === 0,
      line: 1,
      col: 1,
    };
  };

  if (typeof value !== "object" || value === null || !("tree" in value)) {
    throw new Error("JSON no reconocido");
  }

  return deserialize((value as { tree: unknown }).tree);
}

/* ---------------------------------------------------------------
   Newick
   --------------------------------------------------------------- */

/** Newick reserves these characters, and spaces are not allowed. */
function newickEscape(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, "_")
    .replace(/[(),:;'"[\]{}]/g, "");
}

export function toNewick(tree: TreeNode): string {
  const serialize = (node: TreeNode): string => {
    const label = newickEscape(node.label);
    if (node.children.length === 0) return label || "nodo";
    return `(${node.children.map(serialize).join(",")})${label}`;
  };
  return `${serialize(tree)};`;
}

/* ---------------------------------------------------------------
   CoNLL-U and Brat
   --------------------------------------------------------------- */

/** Leaves in reading order, which is the token order for UD output. */
export function leavesOf(tree: TreeNode): TreeNode[] {
  const leaves: TreeNode[] = [];
  const walk = (node: TreeNode): void => {
    if (node.children.length === 0) {
      leaves.push(node);
      return;
    }
    node.children.forEach(walk);
  };
  walk(tree);
  return leaves;
}

const DETERMINERS = ["el", "la", "los", "las", "un", "una", "the", "a", "an", "this", "that"];
const ADPOSITIONS = ["de", "en", "con", "por", "para", "sobre", "of", "in", "with", "by", "for", "on"];
const CONJUNCTIONS = ["y", "o", "pero", "and", "or", "but"];
const AUXILIARIES = ["es", "está", "was", "is", "son", "era"];

/** Rough UPOS guess, for producing syntactically valid CoNLL-U. */
export function guessUPOS(word: string): string {
  const value = word.toLowerCase();
  if (/^[.,;:!?…]$/.test(value)) return "PUNCT";
  if (DETERMINERS.includes(value)) return "DET";
  if (ADPOSITIONS.includes(value)) return "ADP";
  if (CONJUNCTIONS.includes(value)) return "CCONJ";
  if (AUXILIARIES.includes(value)) return "AUX";
  if (/[áéíóú]|\d/.test(value) || value.length > 3) {
    return /[aeiou]$/.test(value) ? "VERB" : "NOUN";
  }
  return "NOUN";
}

/**
 * Emit CoNLL-U.
 *
 * Only leaves become tokens, which is what makes the output valid UD: a
 * constituency node is not a token.
 *
 * Note the head assignment: every token but the first points at token 1,
 * which mirrors the legacy behaviour. It is a syntactically valid tree, not a
 * linguistically analysed one, and the UI says so.
 */
export function toCoNLLU(tree: TreeNode): string {
  const leaves = leavesOf(tree);
  const forms = leaves.map((n) => n.label.replace(/_/g, " "));

  const lines = [`# text = ${forms.join(" ")}`];
  forms.forEach((form, index) => {
    const id = index + 1;
    const head = id === 1 ? 0 : 1;
    const rel = id === 1 ? "root" : "dep";
    lines.push(
      [id, form, form.toLowerCase(), guessUPOS(form), "_", "_", head, rel, "_", "_"].join("\t"),
    );
  });

  lines.push("");
  return lines.join("\n");
}

/** Brat stand-off is text-only in this export. */
export function toBrat(tree: TreeNode): string {
  return `${leavesOf(tree)
    .map((n) => n.label.replace(/_/g, " "))
    .join(" ")}\n`;
}

/* ---------------------------------------------------------------
   Script download menu
   --------------------------------------------------------------- */

export type ScriptKind = "json" | "newick" | "conllu" | "brat";

export function downloadScript(
  tree: TreeNode,
  meta: { scriptKind?: ScriptKind; name?: string; kind?: string; lang?: string } = {},
): void {
  const kind = meta.scriptKind ?? "json";
  const name = meta.name ?? "arborlab-arbol";

  switch (kind) {
    case "newick":
      download(`${name}.nwk`, toNewick(tree));
      return;
    case "conllu":
      download(`${name}.conllu`, toCoNLLU(tree));
      return;
    case "brat":
      download(`${name}.txt`, toBrat(tree));
      return;
    default:
      download(
        `${name}.json`,
        JSON.stringify(toJSON(tree, meta), null, 2),
        "application/json;charset=utf-8",
      );
  }
}

/** File name stem for a tree, derived from its first leaf. */
export function suggestName(tree: TreeNode): string {
  const first = leavesOf(tree)[0];
  const base = first ? parseLabel(first.label).base : "arbol";
  const slug = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `arborlab-${slug || "arbol"}`;
}

export const EXPORTER = {
  saveSVG,
  savePNG,
  copySVG,
  svgString,
  toJSON,
  fromJSON,
  toNewick,
  toCoNLLU,
  toBrat,
  guessUPOS,
  downloadScript,
  download,
  suggestName,
} as const;
