/* ============================================================
   LinguaLab — prueba del orquestador del catalogo sobre un DOM

   POR QUE ESTE ARCHIVO SE LLAMA `.dom.test.ts`

   `vitest.config.ts` corre en happy-dom solo los archivos con este sufijo; el
   resto de las pruebas —el nucleo, los adaptadores, la logica pura— sigue en
   Node, donde no existe `document`. Si este archivo perdiera el sufijo, fallaria
   en la primera linea con «document is not defined», que es justo la senal que
   se quiere: el nucleo no puede empezar a depender del DOM sin que se note.

   POR QUE EL FIXTURE SE ARMA CON NODOS

   Imita el marcado de `src/components/ToolCatalog.astro` —los mismos atributos
   `data-*`, el mismo anidamiento— pero se construye con `createElement`, igual
   que exige el repositorio en el codigo de produccion: `innerHTML` no entra ni en
   las pruebas.
   ============================================================ */

import { afterEach, describe, expect, it } from "vitest";
import { initToolCatalog } from "./index";

type Attributes = Readonly<Record<string, string>>;

const el = (tag: string, attributes: Attributes = {}, ...children: (Node | string)[]): HTMLElement => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
};

const STRINGS = {
  "catalog.count": "Mostrando {count} de {total} herramientas",
  "catalog.empty": "Ninguna herramienta coincide con {filters}.",
};

interface Tool {
  readonly id: string;
  readonly area: string;
  readonly integration: string;
  readonly languages: readonly string[];
}

const TOOLS: readonly Tool[] = [
  { id: "ipa", area: "phonetics", integration: "native", languages: [] },
  { id: "praat", area: "phonetics", integration: "external", languages: ["es", "en"] },
  { id: "silabas", area: "phonology", integration: "native", languages: ["es"] },
  { id: "corpus", area: "corpus", integration: "external", languages: ["en"] },
];

const card = (tool: Tool): HTMLElement =>
  el(
    "article",
    {
      "data-tool-card": "",
      "data-status": "stable",
      "data-area": tool.area,
      "data-integration": tool.integration,
      "data-languages": tool.languages.join(" "),
    },
    el("h3", {}, tool.id),
  );

const filter = (name: string, label: string, options: readonly (readonly [string, string])[]) =>
  el(
    "select",
    { "data-catalog-filter": name, "data-catalog-label": label },
    ...options.map(([value, text]) => el("option", { value }, text)),
  );

/** Monta el catalogo con las secciones por area, como la pagina compilada. */
const mount = (strings: Readonly<Record<string, string>> | null = STRINGS): HTMLElement => {
  const areas = [...new Set(TOOLS.map((tool) => tool.area))];
  const root = el(
    "section",
    { "data-catalog": "true" },
    ...(strings === null ? [] : [el("div", { "data-catalog-strings": "", hidden: "", "data-json": JSON.stringify(strings) })]),
    filter("area", "Área", [
      ["", "Todas las áreas"],
      ["phonetics", "Fonética"],
      ["phonology", "Fonología"],
      ["corpus", "Corpus"],
    ]),
    filter("language", "Lengua", [
      ["", "Todas las lenguas"],
      ["es", "Español"],
      ["en", "Inglés"],
    ]),
    filter("integration", "Integración", [
      ["", "Todas"],
      ["native", "En el sitio"],
      ["external", "Externa"],
    ]),
    el("p", { "data-catalog-count": "" }, "Mostrando 4 de 4 herramientas"),
    el("p", { "data-catalog-empty": "", hidden: "" }),
    ...areas.map((area) =>
      el(
        "section",
        { "data-catalog-group": "", id: `nivel-${area}` },
        el("h2", {}, area),
        ...TOOLS.filter((tool) => tool.area === area).map(card),
      ),
    ),
  );
  document.body.replaceChildren(root);
  return root;
};

const choose = (root: HTMLElement, facet: string, value: string): void => {
  const control = root.querySelector<HTMLSelectElement>(`[data-catalog-filter="${facet}"]`);
  if (control === null) {
    throw new Error(`falta el filtro ${facet} en el fixture`);
  }
  control.value = value;
  control.dispatchEvent(new Event("change"));
};

const visibleTools = (root: HTMLElement): string[] =>
  [...root.querySelectorAll<HTMLElement>("[data-tool-card]")]
    .filter((element) => !element.hidden)
    .map((element) => element.querySelector("h3")?.textContent ?? "");

const required = <T extends Element>(root: ParentNode, selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`falta ${selector} en el fixture`);
  }
  return found;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("initToolCatalog", () => {
  it("al arrancar sin filtros deja todo visible y reescribe la cuenta", () => {
    const root = mount();
    initToolCatalog();

    expect(visibleTools(root)).toEqual(["ipa", "praat", "silabas", "corpus"]);
    expect(required(root, "[data-catalog-count]").textContent).toBe(
      "Mostrando 4 de 4 herramientas",
    );
    expect(required<HTMLElement>(root, "[data-catalog-empty]").hidden).toBe(true);
  });

  it("filtra por area y oculta la seccion que se queda sin fichas, encabezado incluido", () => {
    const root = mount();
    initToolCatalog();

    choose(root, "area", "phonetics");

    expect(visibleTools(root)).toEqual(["ipa", "praat"]);
    expect(required<HTMLElement>(root, "#nivel-phonetics").hidden).toBe(false);
    expect(required<HTMLElement>(root, "#nivel-phonology").hidden).toBe(true);
    expect(required<HTMLElement>(root, "#nivel-corpus").hidden).toBe(true);
    expect(required(root, "[data-catalog-count]").textContent).toBe(
      "Mostrando 2 de 4 herramientas",
    );
  });

  it("combina las tres facetas con Y, no con O", () => {
    const root = mount();
    initToolCatalog();

    choose(root, "language", "es");
    expect(visibleTools(root)).toEqual(["praat", "silabas"]);

    choose(root, "integration", "native");
    expect(visibleTools(root)).toEqual(["silabas"]);

    choose(root, "area", "phonetics");
    expect(visibleTools(root)).toEqual([]);
  });

  it("una herramienta sin lenguas solo coincide con «todas las lenguas»", () => {
    const root = mount();
    initToolCatalog();

    choose(root, "language", "en");

    // `ipa` es independiente de la lengua: elegir una lengua concreta la oculta,
    // porque el filtro pregunta «sirve para esta lengua» y la ficha no lo afirma.
    expect(visibleTools(root)).toEqual(["praat", "corpus"]);

    choose(root, "language", "");
    expect(visibleTools(root)).toContain("ipa");
  });

  it("sin coincidencias muestra el estado vacio nombrando los filtros activos como se leen", () => {
    const root = mount();
    initToolCatalog();

    choose(root, "area", "corpus");
    choose(root, "integration", "native");

    const empty = required<HTMLElement>(root, "[data-catalog-empty]");
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe(
      "Ninguna herramienta coincide con Área: Corpus, Integración: En el sitio.",
    );
    expect(required(root, "[data-catalog-count]").textContent).toBe(
      "Mostrando 0 de 4 herramientas",
    );
    expect(
      [...root.querySelectorAll<HTMLElement>("[data-catalog-group]")].every((group) => group.hidden),
    ).toBe(true);

    // Quitar un filtro devuelve las fichas, sus secciones y apaga el aviso.
    choose(root, "integration", "");
    expect(visibleTools(root)).toEqual(["corpus"]);
    expect(required<HTMLElement>(root, "#nivel-corpus").hidden).toBe(false);
    expect(empty.hidden).toBe(true);
  });

  it("respeta una seleccion que el navegador restauro antes de que corriera el script", () => {
    const root = mount();
    required<HTMLSelectElement>(root, '[data-catalog-filter="integration"]').value = "external";

    initToolCatalog();

    expect(visibleTools(root)).toEqual(["praat", "corpus"]);
    expect(required(root, "[data-catalog-count]").textContent).toBe(
      "Mostrando 2 de 4 herramientas",
    );
  });

  it("sin el diccionario serializado muestra la clave, que no se confunde con una frase", () => {
    const root = mount(null);
    initToolCatalog();

    expect(required(root, "[data-catalog-count]").textContent).toBe("catalog.count");
  });

  it("en una pagina sin catalogo no hace nada", () => {
    const other = el("main", {}, el("p", {}, "otra pagina"));
    document.body.replaceChildren(other);

    expect(() => initToolCatalog()).not.toThrow();
    expect(document.body.textContent).toBe("otra pagina");
  });
});
