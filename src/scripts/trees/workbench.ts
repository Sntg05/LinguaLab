/* ============================================================
   LinguaLab — ArborLab: cableado del banco de árboles
   Tres piezas (banco, lienzo, exportación) que comparten el árbol dibujado.
   Cada una tiene su inicializador para que `safeInitAll` contenga el fallo de
   una sin llevarse las otras. Las reglas viven en `workbench-rules.ts`.
   ============================================================ */

import { TREE_EXAMPLES } from "../../data/trees/examples";
import { type TreeType, treeType } from "../../data/trees/types";
import type { Locale } from "../../i18n";
import { runChecks } from "./checks";
import { type ScriptKind, copySVG, downloadScript, savePNG, saveSVG, suggestName } from "./export";
import { layoutTree } from "./layout";
import type { TreeNode } from "./parse";
import { type MovementArrow, renderTree } from "./render";
import {
  type InputMode,
  buildWorkbenchTree,
  canUseSentence,
  copyStatus,
  errorMessage,
  exampleOptions,
  fitZoom,
  nextZoom,
  pngFailure,
  zoomLabel,
} from "./workbench-rules";

/** El tipo con el que abre la página: lingüístico y con ejemplos. */
const DEFAULT_TYPE = "constituency";

/** Lo que comparten las tres piezas: el árbol a la vista y cómo se ve. */
interface WorkbenchState {
  type: TreeType | null;
  tree: TreeNode | null;
  svg: SVGSVGElement | null;
  arrows: MovementArrow[];
  mode: InputMode;
  zoom: number;
}

const state: WorkbenchState = {
  type: null,
  tree: null,
  svg: null,
  arrows: [],
  mode: "text",
  zoom: 1,
};

const locale = (): Locale => (document.documentElement.lang === "en" ? "en" : "es");
const isSpanish = (): boolean => locale() === "es";

const $ = <T extends Element>(selector: string): T | null => document.querySelector<T>(selector);

const setText = (selector: string, text: string): void => {
  const el = $(selector);
  if (el) el.textContent = text;
};

const setExportsEnabled = (enabled: boolean): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-export], [data-script]",
  )) {
    // CoNLL-U solo tiene sentido con núcleos y relaciones: los de un árbol de dependencias.
    const needsDependencies = button.dataset["script"] === "conllu";
    button.disabled = !enabled || (needsDependencies && state.tree?.depMeta === undefined);
  }
};

/* ---------------- Zoom ---------------- */

const applyZoom = (zoom: number): void => {
  state.zoom = zoom;
  const inner = $<HTMLElement>("[data-canvas-inner]");
  if (inner) {
    // CSSOM, no atributo `style`: la CSP no lo bloquea.
    inner.style.transform = `scale(${zoom})`;
    inner.style.transformOrigin = "top left";
  }
  setText("[data-zoom-value]", zoomLabel(zoom));
};

/* ---------------- Dibujo ---------------- */

const draw = (tree: TreeNode, arrows: MovementArrow[]): void => {
  const host = $<HTMLElement>("[data-canvas-inner]");
  if (!host) return;

  const { svg } = renderTree(layoutTree(tree), {
    arrows,
    alt: isSpanish() ? "Árbol generado" : "Generated tree",
  });
  host.replaceChildren(svg);
  $<HTMLElement>("[data-canvas-empty]")?.remove();

  state.tree = tree;
  state.svg = svg;
  state.arrows = arrows;
  applyZoom(1);
  setExportsEnabled(true);
};

const renderChecks = (tree: TreeNode, type: TreeType): void => {
  const list = $<HTMLElement>("[data-checks-list]");
  if (!list) return;

  const results = runChecks(tree, {
    locale: locale(),
    ...(type.theory === undefined ? {} : { theory: type.theory }),
    directives: state.arrows,
  });

  list.replaceChildren(
    ...results.map((result) => {
      const item = document.createElement("li");
      item.className = `check check--${result.level}`;
      const dot = document.createElement("span");
      dot.className = "check__dot";
      dot.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = result.message;
      item.append(dot, text);
      return item;
    }),
  );
};

/* ---------------- Tipo y ejemplos ---------------- */

const selectType = (id: string): void => {
  const type = treeType(id);
  if (!type) return;
  const es = isSpanish();
  state.type = type;

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tree-type]")) {
    button.setAttribute("aria-pressed", button.dataset["treeType"] === id ? "true" : "false");
  }

  setText("[data-bench-title]", es ? type.name_es : type.name_en);
  setText("[data-bench-blurb]", es ? type.blurb_es : type.blurb_en);
  setText("[data-bench-hint]", es ? type.hint_es : type.hint_en);

  const sentence = canUseSentence(type);
  $<HTMLElement>("[data-bench-modes]")?.toggleAttribute("hidden", !sentence);
  if (!sentence) state.mode = "text";

  const select = $<HTMLSelectElement>("[data-tree-example]");
  if (select) {
    const options = exampleOptions(type.id, es);
    select.replaceChildren(...options.map((option) => new Option(option.label, option.value)));
    select.disabled = options.length === 1;
  }

  const input = $<HTMLTextAreaElement>("[data-tree-input]");
  if (input) input.value = "";

  setText("[data-tree-error]", "");
  $<HTMLElement>("[data-canvas-empty]")?.remove();
  const host = $<HTMLElement>("[data-canvas-inner]");
  if (host) {
    const placeholder = document.createElement("p");
    placeholder.className = "canvas__empty faint";
    placeholder.dataset["canvasEmpty"] = "true";
    placeholder.textContent = es
      ? "Elige un ejemplo y pulsa «Dibujar árbol»."
      : "Pick an example and press “Draw tree”.";
    host.replaceChildren(placeholder);
  }
  state.svg = null;
  state.tree = null;
  setExportsEnabled(false);
};

const loadExample = (index: number): void => {
  if (!state.type) return;
  const example = TREE_EXAMPLES[state.type.id]?.[index];
  const input = $<HTMLTextAreaElement>("[data-tree-input]");
  // `numeric` solo marca que el tipo espera números; la secuencia siempre está en `text`.
  if (example && input) input.value = example.text;
};

const drawCurrent = (): void => {
  const input = $<HTMLTextAreaElement>("[data-tree-input]");
  if (!state.type || !input) return;
  setText("[data-tree-error]", "");

  const value = input.value.trim();
  if (!value) {
    setText("[data-tree-error]", isSpanish() ? "Escribe algo primero." : "Type something first.");
    return;
  }

  try {
    const { tree, arrows } = buildWorkbenchTree(state.type, value, state.mode);
    draw(tree, arrows);
    renderChecks(tree, state.type);
  } catch (thrown) {
    setText("[data-tree-error]", errorMessage(thrown));
  }
};

/* ---------------- Inicializadores ---------------- */

export const initTreeWorkbench = (): void => {
  // La raíz de la delegación tiene que CONTENER todo lo que delega. Antes era
  // `.bench`, hermana de la lista de tipos: un clic en un tipo no encontraba
  // nada y la página se quedaba para siempre en el tipo por defecto.
  const root = $<HTMLElement>("[data-arborlab]");
  if (!root) return;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const typeButton = target.closest<HTMLButtonElement>("[data-tree-type]");
    if (typeButton?.dataset["treeType"]) {
      selectType(typeButton.dataset["treeType"]);
      return;
    }

    const modeButton = target.closest<HTMLButtonElement>("[data-mode]");
    if (modeButton?.dataset["mode"]) {
      state.mode = modeButton.dataset["mode"] === "easy" ? "easy" : "text";
      for (const other of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
        other.setAttribute("aria-pressed", other === modeButton ? "true" : "false");
      }
      return;
    }

    if (target.closest("[data-tree-draw]")) {
      drawCurrent();
      return;
    }

    if (target.closest("[data-tree-clear]")) {
      const input = $<HTMLTextAreaElement>("[data-tree-input]");
      if (input) input.value = "";
      setText("[data-tree-error]", "");
    }
  });

  $<HTMLSelectElement>("[data-tree-example]")?.addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value !== "") loadExample(Number(value));
  });

  // Ctrl/Cmd + Intro dibuja, igual que el transcriptor de FonoLab.
  $<HTMLTextAreaElement>("[data-tree-input]")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      drawCurrent();
    }
  });

  selectType(DEFAULT_TYPE);
  loadExample(0);
};

export const initTreeCanvas = (): void => {
  const frame = $<HTMLElement>("[data-canvas-frame]");
  if (!frame) return;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-zoom]");
    if (!button) return;

    const action = button.dataset["zoom"];
    if (action === "fit") {
      if (!state.svg) return;
      applyZoom(fitZoom(Number(state.svg.getAttribute("width")), frame.clientWidth));
      return;
    }
    applyZoom(nextZoom(action, state.zoom));
  });

  // Arrastrar mueve el dibujo cuando es más grande que el marco.
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  frame.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = frame.scrollLeft;
    startTop = frame.scrollTop;
    frame.setPointerCapture(event.pointerId);
  });

  frame.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    frame.scrollLeft = startLeft - (event.clientX - startX);
    frame.scrollTop = startTop - (event.clientY - startY);
  });

  const endDrag = (): void => {
    dragging = false;
  };
  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);
};

export const initTreeExports = (): void => {
  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const exportButton = target.closest<HTMLButtonElement>("[data-export]");
    const scriptButton = target.closest<HTMLButtonElement>("[data-script]");
    const { svg, tree, type } = state;

    if (exportButton && svg && tree) {
      const name = suggestName(tree);
      switch (exportButton.dataset["export"]) {
        case "svg":
          saveSVG(svg, name);
          break;
        case "png":
          try {
            await savePNG(svg, name);
          } catch {
            setText("[data-live-region]", pngFailure(isSpanish()));
          }
          break;
        case "copy": {
          let copied = true;
          try {
            await copySVG(svg);
          } catch {
            copied = false;
          }
          setText("[data-live-region]", copyStatus(copied, isSpanish()));
          break;
        }
        default:
          break;
      }
      return;
    }

    if (scriptButton && tree && type) {
      downloadScript(tree, {
        scriptKind: (scriptButton.dataset["script"] ?? "json") as ScriptKind,
        name: suggestName(tree),
        kind: type.id,
        lang: locale(),
        directives: state.arrows,
      });
    }
  });
};
