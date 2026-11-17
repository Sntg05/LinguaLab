/* ============================================================
   LinguaLab — ArborLab: reglas del banco de árboles
   Zoom, qué tipos aceptan una frase, la lista de ejemplos, cómo se arma el
   árbol según el modo y qué se dice ante un error. Sin DOM, para que tengan
   prueba. El cableado vive en `workbench.ts`.
   ============================================================ */

import { TREE_EXAMPLES } from "../../data/trees/examples";
import type { TreeType } from "../../data/trees/types";
import type { TreeNode } from "./parse";
import type { MovementArrow } from "./render";
import { ParseError, buildFromSentence, buildTree } from "./pipeline";

export type InputMode = "easy" | "text";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.2;
/** Lo que se supone que mide el dibujo si su SVG no declara un ancho legible. */
const FALLBACK_WIDTH = 800;
/** El relleno interior del marco, que el ajuste deja libre. */
const FRAME_PADDING = 32;

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** «in» y «out» multiplican o dividen; cualquier otra orden vuelve al tamaño real. */
export const nextZoom = (action: string | undefined, current: number): number => {
  if (action === "in") return clampZoom(current * ZOOM_STEP);
  if (action === "out") return clampZoom(current / ZOOM_STEP);
  return 1;
};

/** Lo que cabe en el marco sin agrandar nunca el dibujo. */
export const fitZoom = (svgWidth: number, frameWidth: number): number => {
  const width = svgWidth || FALLBACK_WIDTH;
  return clampZoom(Math.min(1, (frameWidth - FRAME_PADDING) / width));
};

export const zoomLabel = (zoom: number): string => `${Math.round(zoom * 100)} %`;

/** Solo los tipos de corchetes se pueden armar desde una oración sin notación. */
export const canUseSentence = (type: TreeType): boolean => type.mode === "bracket";

export interface ExampleOption {
  readonly label: string;
  readonly value: string;
}

export const exampleOptions = (typeId: string, es: boolean): readonly ExampleOption[] => [
  { label: es ? "Cargar ejemplo…" : "Load example…", value: "" },
  ...(TREE_EXAMPLES[typeId] ?? []).map((example, index) => ({
    label: (es ? example.name_es : example.name_en) || `#${index + 1}`,
    value: String(index),
  })),
];

export interface WorkbenchTree {
  readonly tree: TreeNode;
  /** Las flechas de las líneas `move:`; una frase sin notación no tiene. */
  readonly arrows: MovementArrow[];
}

/** El modo frase solo cuenta en un tipo que lo admite; si no, se lee la notación. */
export const buildWorkbenchTree = (type: TreeType, value: string, mode: InputMode): WorkbenchTree => {
  if (mode === "easy" && canUseSentence(type)) {
    return { tree: buildFromSentence(value), arrows: [] };
  }
  const { tree, arrows } = buildTree(type.id, value);
  return { tree, arrows };
};

/** Un error de análisis lleva su posición; el resto, su texto. */
export const errorMessage = (thrown: unknown): string => {
  if (thrown instanceof ParseError) return thrown.userMessage;
  if (thrown instanceof Error) return thrown.message;
  return String(thrown);
};

export const copyStatus = (copied: boolean, es: boolean): string => {
  if (copied) return es ? "SVG copiado." : "SVG copied.";
  return es ? "No se pudo copiar al portapapeles." : "Could not copy to the clipboard.";
};

export const pngFailure = (es: boolean): string =>
  es
    ? "No se pudo crear el PNG en este navegador. Guarda el SVG y conviértelo con otro programa."
    : "This browser could not create the PNG. Save the SVG and convert it with another program.";
