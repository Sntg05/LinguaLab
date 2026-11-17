/* ============================================================
   LinguaLab — ArborLab export

   Produces downloadable artefacts from a tree:
     - SVG (self-contained and XML-valid)
     - PNG (rasterised through a canvas)
     - JSON (re-importable)
     - Newick (etiquetas entre comillas cuando hace falta)
     - CoNLL-U, solo para árboles de dependencias

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

/** Lo que el XML no admite tal cual dentro de un atributo entre comillas dobles. */
const xmlAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Un color de CSS a hex sRGB, pintando un píxel. Los tokens del sitio están en
 * `lab()` y `oklch()`, que Inkscape, Illustrator y rsvg no leen: un SVG que
 * «se abre en cualquier programa» tiene que llevar colores que cualquiera lea.
 * Sin lienzo (o si el valor no es un color) devuelve el valor tal cual.
 */
function toSrgb(value: string): string {
  if (!/^(?:lab|lch|oklab|oklch|color|hsl|hwb)\(/i.test(value)) return value;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return value;
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data;
    const hex = (n: number): string => n.toString(16).padStart(2, "0");
    return a === 255 ? `#${hex(r)}${hex(g)}${hex(b)}` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return value;
  }
}

/**
 * Resolve every `var(--x)` in the serialized markup to its computed value.
 *
 * Lo que hace que el archivo se sostenga solo: un visor que nunca vio nuestra
 * hoja de estilos pinta los colores correctos. Cada valor se escapa para el
 * atributo donde cae: la familia tipográfica del sitio lleva comillas dobles
 * (`"Noto IPA", …`) y, sin escape, cerraba el atributo y dejaba el archivo
 * como XML inválido, que ningún programa abría (tampoco el paso a PNG).
 */
export function resolveCustomProperties(markup: string, root: Element): string {
  const computed = getComputedStyle(root);
  const values = new Map<string, string>();

  for (const name of THEME_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value === "") continue;
    // Las comillas de una familia tipográfica pasan a simples: en un atributo
    // con comillas dobles se leen igual y el archivo queda legible.
    values.set(name, name.startsWith("--font-") ? value.replace(/"/g, "'") : toSrgb(value));
  }

  return markup.replace(
    /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi,
    (_match, name: string, fallback?: string) =>
      xmlAttribute(values.get(name) ?? (fallback?.trim() || "currentColor")),
  );
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

/**
 * Rasteriza el SVG y descarga el PNG. Devuelve una promesa que falla si el
 * navegador no pudo cargar la imagen o crear el archivo: antes el fallo se
 * tragaba en silencio y el botón «no hacía nada».
 */
export function savePNG(svg: SVGSVGElement, name = "arborlab"): Promise<void> {
  const width = Number.parseInt(svg.getAttribute("width") ?? "800", 10) || 800;
  const height = Number.parseInt(svg.getAttribute("height") ?? "600", 10) || 600;

  // Cap the scale: a large tree at 2x can exhaust memory on mobile.
  const scale = Math.min(2, 2048 / Math.max(width, height));

  const blob = new Blob([svgString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  return new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas 2d no disponible"));
        return;
      }

      // Opaque background: a transparent PNG is unreadable on a dark viewer.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("el navegador no creó el PNG"));
          return;
        }
        const resultUrl = URL.createObjectURL(result);
        const anchor = document.createElement("a");
        anchor.href = resultUrl;
        anchor.download = `${name}.png`;
        // En el documento, como en `download`: Firefox no sigue un enlace suelto.
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(resultUrl), 1500);
        resolve();
      }, "image/png");
    });

    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("el SVG no se pudo cargar como imagen"));
    });
    image.src = url;
  });
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

/**
 * Una etiqueta de Newick. Sin caracteres reservados va tal cual (los espacios
 * se escriben como `_`, que el formato lee como espacio); si tiene alguno, va
 * entre comillas simples con la comilla interna doblada, como pide el formato.
 * Antes se borraban: `x,y` llegaba como `xy`, y una etiqueta que quedaba vacía
 * se reemplazaba por «nodo», una etiqueta que nadie escribió.
 */
function newickLabel(value: string): string {
  const label = String(value ?? "");
  if (label !== "" && !/[\s(),:;'"[\]_]/.test(label)) return label;
  if (!/[(),:;'"[\]_]/.test(label)) return label.replace(/ /g, "_");
  return `'${label.replace(/'/g, "''")}'`;
}

export function toNewick(tree: TreeNode): string {
  const serialize = (node: TreeNode): string => {
    const label = newickLabel(node.label);
    if (node.children.length === 0) return label;
    return `(${node.children.map(serialize).join(",")})${label}`;
  };
  return `${serialize(tree)};`;
}

/* ---------------------------------------------------------------
   CoNLL-U
   --------------------------------------------------------------- */

/** Leaves in reading order. */
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

/** Las 17 categorías universales de UD v2 (universaldependencies.org/u/pos/). */
const UPOS = new Set([
  "ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM",
  "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X",
]);

/** Un campo de CoNLL-U no puede estar vacío ni llevar tabuladores ni saltos. */
const conlluField = (value: string | undefined): string => {
  const clean = String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
  return clean === "" ? "_" : clean;
};

/**
 * CoNLL-U de un árbol de dependencias, con lo que la persona escribió: id,
 * palabra, núcleo y relación. Una etiqueta que no es de las 17 de UD va en
 * XPOS y UPOS queda «_» (sin especificar), en vez de forzarla o adivinarla.
 *
 * Un árbol de constituyentes no tiene núcleos ni relaciones que escribir:
 * devuelve `null`. La versión anterior los inventaba (todo dependía de la
 * primera palabra, y la categoría salía de la longitud de la palabra).
 */
export function toCoNLLU(tree: TreeNode): string | null {
  const meta = tree.depMeta;
  if (meta === undefined) return null;

  const tokens = [...meta.nodes].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const lines = ["# sent_id = 1", `# text = ${tokens.map((node) => conlluField(node.word)).join(" ")}`];
  for (const node of tokens) {
    const pos = conlluField(node.pos);
    const upos = UPOS.has(pos) ? pos : "_";
    const xpos = UPOS.has(pos) ? "_" : pos;
    lines.push(
      [
        String(node.id),
        conlluField(node.word),
        "_",
        upos,
        xpos,
        "_",
        String(node.head ?? 0),
        conlluField(node.rel),
        "_",
        "_",
      ].join("\t"),
    );
  }
  // Cada oración termina con una línea en blanco, también la última.
  return `${lines.join("\n")}\n\n`;
}

/* ---------------------------------------------------------------
   Script download menu
   --------------------------------------------------------------- */

export type ScriptKind = "json" | "newick" | "conllu";

export function downloadScript(
  tree: TreeNode,
  meta: {
    scriptKind?: ScriptKind;
    name?: string;
    kind?: string;
    lang?: string;
    directives?: unknown[];
  } = {},
): void {
  const kind = meta.scriptKind ?? "json";
  const name = meta.name ?? "arborlab-arbol";

  switch (kind) {
    case "newick":
      download(`${name}.nwk`, toNewick(tree));
      return;
    case "conllu": {
      const conllu = toCoNLLU(tree);
      // El botón solo se habilita para árboles de dependencias; esto es la red.
      if (conllu !== null) download(`${name}.conllu`, conllu);
      return;
    }
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
  downloadScript,
  download,
  suggestName,
} as const;
