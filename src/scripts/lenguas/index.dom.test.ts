/* ============================================================
   LinguaLab — prueba del orquestador del mapa de lenguas sobre un DOM

   POR QUE ESTE ARCHIVO SE LLAMA `.dom.test.ts`

   `vitest.config.ts` corre en happy-dom solo los archivos con este sufijo; el
   resto sigue en Node. La regla de filtrado ya tiene su prueba pura en
   `filter.test.ts`; lo que se prueba aqui es lo que esa prueba no puede ver: que
   el orquestador lleve esa decision al DOM —filas, secciones, puntos del mapa,
   cuenta, aviso vacio— y que el panel de detalle copie la fila elegida.

   POR QUE EL FIXTURE SE ARMA CON NODOS

   Imita el marcado de `src/components/LanguageMap.astro` —la tabla de lenguas
   ubicadas, la lista de las que no tienen coordenadas, el SVG con un punto por
   lengua y el panel— con `createElement`, igual que exige el repositorio en el
   codigo de produccion.
   ============================================================ */

import { afterEach, describe, expect, it } from "vitest";
import { NO_FAMILY } from "./filter";
import { initLanguageMap } from "./index";

type Attributes = Readonly<Record<string, string>>;

const el = (tag: string, attributes: Attributes = {}, ...children: (Node | string)[]): HTMLElement => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
};

const SVG = "http://www.w3.org/2000/svg";

const STRINGS = {
  "map.count": "Mostrando {count} de {total} lenguas",
  "map.empty": "Ninguna lengua coincide.",
};

interface Language {
  readonly name: string;
  readonly family: string | null;
  readonly glottocode: string;
  readonly iso: string;
  readonly located: boolean;
}

const LANGUAGES: readonly Language[] = [
  { name: "Wayuunaiki", family: "Arawakan", glottocode: "wayu1243", iso: "guc", located: true },
  { name: "Nasa Yuwe", family: null, glottocode: "paez1247", iso: "pbb", located: true },
  { name: "Kogui", family: "Chibchan", glottocode: "cogu1240", iso: "kog", located: true },
  { name: "Tinigua", family: null, glottocode: "tini1245", iso: "tit", located: false },
];

const familyValue = (family: string | null): string => family ?? NO_FAMILY;

const sourceLink = (language: Language): HTMLElement =>
  el(
    "a",
    { href: `https://glottolog.org/resource/languoid/id/${language.glottocode}` },
    "Glottolog",
  );

const rowAttributes = (language: Language): Attributes => ({
  "data-language-row": "",
  "data-name": language.name,
  "data-family": familyValue(language.family),
  "data-glottocode": language.glottocode,
});

const openButton = (language: Language): HTMLElement =>
  el(
    "button",
    { type: "button", "data-language-open": language.glottocode, "data-cell": "language" },
    language.name,
  );

const tableRow = (language: Language): HTMLElement =>
  el(
    "tr",
    rowAttributes(language),
    el("th", { scope: "row" }, openButton(language)),
    el("td", { "data-cell": "family" }, language.family ?? "Sin familia"),
    el("td", { "data-cell": "glottocode" }, language.glottocode),
    el("td", { "data-cell": "iso" }, language.iso),
    el("td", { "data-cell": "source" }, sourceLink(language)),
  );

const listItem = (language: Language): HTMLElement =>
  el(
    "li",
    rowAttributes(language),
    openButton(language),
    el("span", { "data-cell": "family" }, language.family ?? "Sin familia"),
    el("span", { "data-cell": "glottocode" }, language.glottocode),
    el("span", { "data-cell": "iso" }, language.iso),
    el("span", { "data-cell": "source" }, sourceLink(language)),
  );

const map = (languages: readonly Language[]): SVGElement => {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  for (const language of languages) {
    const dot = document.createElementNS(SVG, "circle");
    dot.setAttribute("data-dot-for", language.glottocode);
    svg.append(dot);
  }
  return svg;
};

/** Monta el mapa como la pagina compilada: tabla, lista sin ubicacion y panel. */
const mount = (languages: readonly Language[] = LANGUAGES): HTMLElement => {
  const located = languages.filter((language) => language.located);
  const unlocated = languages.filter((language) => !language.located);
  const families = [
    ...new Set(languages.flatMap((language) => (language.family === null ? [] : [language.family]))),
  ];

  const root = el(
    "section",
    { "data-language-map": "true" },
    el("div", { "data-language-strings": "", hidden: "", "data-json": JSON.stringify(STRINGS) }),
    map(located),
    el(
      "select",
      { "data-language-filter": "family" },
      el("option", { value: "" }, "Todas las familias"),
      ...families.map((family) => el("option", { value: family }, family)),
      el("option", { value: NO_FAMILY }, "Sin familia"),
    ),
    el("input", { type: "search", "data-language-search": "" }),
    el("p", { "data-language-count": "" }, `Mostrando ${languages.length} de ${languages.length} lenguas`),
    el("p", { "data-language-empty": "", hidden: "" }, "Ninguna lengua coincide."),
    el(
      "div",
      { "data-language-group": "", id: "ubicadas" },
      el("table", {}, el("tbody", {}, ...located.map(tableRow))),
    ),
    el(
      "section",
      { "data-language-group": "", id: "sin-ubicacion" },
      el("h2", {}, "Lenguas sin ubicación"),
      el("ul", {}, ...unlocated.map(listItem)),
    ),
    el(
      "aside",
      {},
      el("p", { "data-detail-placeholder": "" }, "Elegí una lengua."),
      el(
        "div",
        { "data-detail-body": "", hidden: "" },
        el("p", { "data-detail-name": "" }),
        el("dd", { "data-detail-family": "" }),
        el("dd", { "data-detail-glottocode": "" }),
        el("dd", { "data-detail-iso": "" }),
        el("a", { "data-detail-link": "" }),
      ),
    ),
  );
  document.body.replaceChildren(root);
  return root;
};

const required = <T extends Element>(root: ParentNode, selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`falta ${selector} en el fixture`);
  }
  return found;
};

const visibleRows = (root: HTMLElement): string[] =>
  [...root.querySelectorAll<HTMLElement>("[data-language-row]")]
    .filter((row) => !row.hasAttribute("hidden"))
    .map((row) => row.dataset["glottocode"] ?? "");

const visibleDots = (root: HTMLElement): string[] =>
  [...root.querySelectorAll<SVGElement>("[data-dot-for]")]
    .filter((dot) => !dot.hasAttribute("hidden"))
    .map((dot) => dot.getAttribute("data-dot-for") ?? "");

const chooseFamily = (root: HTMLElement, family: string): void => {
  const control = required<HTMLSelectElement>(root, '[data-language-filter="family"]');
  control.value = family;
  control.dispatchEvent(new Event("change"));
};

const search = (root: HTMLElement, query: string): void => {
  const control = required<HTMLInputElement>(root, "[data-language-search]");
  control.value = query;
  control.dispatchEvent(new Event("input"));
};

const count = (root: HTMLElement): string | null =>
  required(root, "[data-language-count]").textContent;

afterEach(() => {
  document.body.replaceChildren();
});

describe("initLanguageMap: filtros", () => {
  it("al arrancar deja todo visible y reescribe la cuenta", () => {
    const root = mount();
    initLanguageMap();

    expect(visibleRows(root)).toEqual(["wayu1243", "paez1247", "cogu1240", "tini1245"]);
    expect(visibleDots(root)).toEqual(["wayu1243", "paez1247", "cogu1240"]);
    expect(count(root)).toBe("Mostrando 4 de 4 lenguas");
    expect(required(root, "[data-language-empty]").hasAttribute("hidden")).toBe(true);
  });

  it("filtrar por familia apaga las filas y los puntos de las demas", () => {
    const root = mount();
    initLanguageMap();

    chooseFamily(root, "Chibchan");

    expect(visibleRows(root)).toEqual(["cogu1240"]);
    expect(visibleDots(root)).toEqual(["cogu1240"]);
    expect(count(root)).toBe("Mostrando 1 de 4 lenguas");
  });

  it("«sin familia» muestra las aisladas, ubicadas o no, y no la opcion «todas»", () => {
    const root = mount();
    initLanguageMap();

    chooseFamily(root, NO_FAMILY);

    expect(visibleRows(root)).toEqual(["paez1247", "tini1245"]);
    expect(required(root, "#sin-ubicacion").hasAttribute("hidden")).toBe(false);
  });

  it("la seccion que se queda sin lenguas se oculta entera y vuelve sola", () => {
    const root = mount();
    initLanguageMap();

    chooseFamily(root, "Arawakan");
    expect(required(root, "#ubicadas").hasAttribute("hidden")).toBe(false);
    expect(required(root, "#sin-ubicacion").hasAttribute("hidden")).toBe(true);

    chooseFamily(root, "");
    expect(required(root, "#sin-ubicacion").hasAttribute("hidden")).toBe(false);
  });

  it("una seccion que nunca tuvo lenguas no se oculta por estar vacia", () => {
    const root = mount(LANGUAGES.filter((language) => language.located));
    initLanguageMap();

    chooseFamily(root, "Arawakan");

    // La regla es «ninguna de sus lenguas sobrevive», no «no tiene lenguas»:
    // `every` sobre una lista vacia seria verdadero y la ocultaria por error.
    expect(required(root, "#sin-ubicacion").hasAttribute("hidden")).toBe(false);
  });

  it("el buscador combina con la familia y no distingue mayusculas", () => {
    const root = mount();
    initLanguageMap();

    search(root, "NASA");
    expect(visibleRows(root)).toEqual(["paez1247"]);

    chooseFamily(root, "Chibchan");
    expect(visibleRows(root)).toEqual([]);
    expect(visibleDots(root)).toEqual([]);
    expect(required(root, "[data-language-empty]").hasAttribute("hidden")).toBe(false);
    expect(count(root)).toBe("Mostrando 0 de 4 lenguas");

    search(root, "");
    expect(visibleRows(root)).toEqual(["cogu1240"]);
    expect(required(root, "[data-language-empty]").hasAttribute("hidden")).toBe(true);
  });

  it("respeta un texto que el navegador restauro antes de que corriera el script", () => {
    const root = mount();
    required<HTMLInputElement>(root, "[data-language-search]").value = "kogui";

    initLanguageMap();

    expect(visibleRows(root)).toEqual(["cogu1240"]);
    expect(count(root)).toBe("Mostrando 1 de 4 lenguas");
  });
});

describe("initLanguageMap: panel de detalle", () => {
  const open = (root: HTMLElement, glottocode: string): void => {
    required<HTMLElement>(root, `[data-language-open="${glottocode}"]`).click();
  };

  it("copia al panel lo que dice la fila elegida y oculta el texto de espera", () => {
    const root = mount();
    initLanguageMap();

    open(root, "wayu1243");

    expect(required(root, "[data-detail-placeholder]").hasAttribute("hidden")).toBe(true);
    expect(required(root, "[data-detail-body]").hasAttribute("hidden")).toBe(false);
    expect(required(root, "[data-detail-name]").textContent).toBe("Wayuunaiki");
    expect(required(root, "[data-detail-family]").textContent).toBe("Arawakan");
    expect(required(root, "[data-detail-glottocode]").textContent).toBe("wayu1243");
    expect(required(root, "[data-detail-iso]").textContent).toBe("guc");

    const link = required<HTMLAnchorElement>(root, "[data-detail-link]");
    expect(link.href).toBe("https://glottolog.org/resource/languoid/id/wayu1243");
    expect(link.textContent).toBe("Glottolog");
  });

  it("marca la fila y el punto elegidos, y desmarca la eleccion anterior", () => {
    const root = mount();
    initLanguageMap();

    open(root, "wayu1243");
    open(root, "cogu1240");

    const selectedRows = [...root.querySelectorAll<HTMLElement>("[data-language-row][data-selected]")];
    const selectedDots = [...root.querySelectorAll("[data-dot-for][data-selected]")];
    expect(selectedRows.map((row) => row.dataset["glottocode"])).toEqual(["cogu1240"]);
    expect(selectedDots.map((dot) => dot.getAttribute("data-dot-for"))).toEqual(["cogu1240"]);
    expect(required(root, "[data-detail-name]").textContent).toBe("Kogui");
  });

  it("abre tambien las lenguas sin coordenadas, que no tienen punto en el mapa", () => {
    const root = mount();
    initLanguageMap();

    open(root, "tini1245");

    expect(required(root, "[data-detail-name]").textContent).toBe("Tinigua");
    expect(required(root, "[data-detail-family]").textContent).toBe("Sin familia");
    expect(root.querySelectorAll("[data-dot-for][data-selected]")).toHaveLength(0);
  });

  it("un clic dentro del boton, en un nodo hijo, tambien abre la lengua", () => {
    const root = mount();
    initLanguageMap();

    const button = required<HTMLElement>(root, '[data-language-open="paez1247"]');
    const inner = el("span", {}, "Nasa");
    button.replaceChildren(inner, " Yuwe");
    inner.click();

    expect(required(root, "[data-detail-name]").textContent).toBe("Nasa Yuwe");
  });

  it("un clic fuera de los botones no toca el panel", () => {
    const root = mount();
    initLanguageMap();

    required<HTMLElement>(root, '[data-cell="iso"]').click();

    expect(required(root, "[data-detail-placeholder]").hasAttribute("hidden")).toBe(false);
    expect(required(root, "[data-detail-body]").hasAttribute("hidden")).toBe(true);
  });

  it("un nombre con `<` y `>` entra como texto, nunca como marcado", () => {
    const hostile: Language = {
      name: "<img src=x onerror=alert(1)>",
      family: null,
      glottocode: "host1234",
      iso: "xxx",
      located: true,
    };
    const root = mount([hostile]);
    initLanguageMap();

    open(root, "host1234");

    const name = required(root, "[data-detail-name]");
    expect(name.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(name.children).toHaveLength(0);
    expect(root.querySelector("img")).toBeNull();
  });
});

describe("initLanguageMap: fuera del mapa", () => {
  it("en una pagina sin mapa no hace nada", () => {
    document.body.replaceChildren(el("main", {}, el("p", {}, "otra pagina")));

    expect(() => initLanguageMap()).not.toThrow();
    expect(document.body.textContent).toBe("otra pagina");
  });
});
