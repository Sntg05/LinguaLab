/* ============================================================
   LinguaLab — mapa de lenguas: filtros y panel de detalle

   POR QUE EL SCRIPT NO CONSTRUYE NADA

   La tabla y el mapa se renderizan en el servidor, en la compilacion: las filas
   ya estan en el HTML, con su familia, su Glottocode, su ISO y su enlace, y cada
   punto del SVG ya tiene sus coordenadas. Este script solo alterna `hidden` y
   copia texto que ya existe, igual que el filtro del catalogo. Eso da tres cosas:
   la pagina se puede leer sin JavaScript, el peso del cliente son dos funciones,
   y no hay dos versiones de la lista que puedan discrepar.

   POR QUE EL PANEL SE LLENA LEYENDO LA FILA

   El detalle no viaja como un segundo juego de datos: se copia de las celdas de
   la fila elegida. Asi el panel no puede mostrar algo distinto de lo que la
   tabla afirma —que es el camino accesible— y no hay un JSON de lenguas que se
   descargue de nuevo para pintar lo que ya esta en pantalla.

   `innerHTML` esta prohibido en este repositorio, y aqui no hace falta: todo se
   escribe con `textContent` y un `href`.
   ============================================================ */

import { filterLanguages, type FilterableLanguage, type LanguageFilters } from "./filter";
import { createStrings, format, parseStrings } from "./strings";

/** Una fila de cualquiera de las dos tablas, con lo que el filtro necesita. */
interface Row extends FilterableLanguage {
  readonly element: HTMLElement;
  readonly glottocode: string;
}

const cellText = (row: HTMLElement, name: string): string =>
  row.querySelector<HTMLElement>(`[data-cell="${name}"]`)?.textContent?.trim() ?? "";

const rowOf = (element: HTMLElement): Row => ({
  element,
  name: element.dataset["name"] ?? "",
  family: element.dataset["family"] === "" ? null : (element.dataset["family"] ?? null),
  glottocode: element.dataset["glottocode"] ?? "",
});

export const initLanguageMap = (): void => {
  const root = document.querySelector<HTMLElement>("[data-language-map]");
  if (root === null) {
    return;
  }

  const strings = createStrings(
    parseStrings(root.querySelector<HTMLElement>("[data-language-strings]")?.dataset["json"]),
  );

  const rows = [...root.querySelectorAll<HTMLElement>("[data-language-row]")].map(rowOf);
  const groups = [...root.querySelectorAll<HTMLElement>("[data-language-group]")];
  const dots = new Map(
    [...root.querySelectorAll<SVGElement>("[data-dot-for]")].map((dot) => [
      dot.dataset["dotFor"] ?? "",
      dot,
    ]),
  );

  const familyControl = root.querySelector<HTMLSelectElement>('[data-language-filter="family"]');
  const searchControl = root.querySelector<HTMLInputElement>("[data-language-search]");
  const count = root.querySelector<HTMLElement>("[data-language-count]");
  const empty = root.querySelector<HTMLElement>("[data-language-empty]");

  const detail = {
    placeholder: root.querySelector<HTMLElement>("[data-detail-placeholder]"),
    body: root.querySelector<HTMLElement>("[data-detail-body]"),
    name: root.querySelector<HTMLElement>("[data-detail-name]"),
    family: root.querySelector<HTMLElement>("[data-detail-family]"),
    glottocode: root.querySelector<HTMLElement>("[data-detail-glottocode]"),
    iso: root.querySelector<HTMLElement>("[data-detail-iso]"),
    link: root.querySelector<HTMLAnchorElement>("[data-detail-link]"),
  };

  const filters = (): LanguageFilters => ({
    family: familyControl?.value ?? "",
    query: searchControl?.value ?? "",
  });

  const applyFilters = (): void => {
    const visible = filterLanguages(rows, filters());
    const shown = new Set(visible.map((row) => row.element));
    const shownIds = new Set(visible.map((row) => row.glottocode));

    for (const row of rows) {
      row.element.toggleAttribute("hidden", !shown.has(row.element));
    }

    // Un encabezado seguido de nada sugiere que falta contenido, asi que la
    // seccion entera —titulo incluido— se oculta cuando ninguna de sus lenguas
    // sobrevive al filtro, y vuelve sola cuando alguna vuelve a coincidir.
    for (const group of groups) {
      const inside = [...group.querySelectorAll<HTMLElement>("[data-language-row]")];
      group.toggleAttribute(
        "hidden",
        inside.length > 0 && inside.every((row) => row.hasAttribute("hidden")),
      );
    }

    // El SVG lleva `aria-hidden`: los puntos acompanian a la tabla, no la
    // reemplazan. Si una lengua queda filtrada, su punto se apaga con ella.
    for (const [glottocode, dot] of dots) {
      dot.toggleAttribute("hidden", !shownIds.has(glottocode));
    }

    if (count !== null) {
      count.textContent = format(strings.text("map.count"), {
        count: visible.length,
        total: rows.length,
      });
    }

    if (empty !== null) {
      empty.toggleAttribute("hidden", visible.length > 0);
    }
  };

  /** Marca la fila y el punto elegidos, y desmarca el resto. */
  const markSelection = (row: Row): void => {
    for (const other of rows) {
      other.element.toggleAttribute("data-selected", other === row);
    }
    for (const [glottocode, dot] of dots) {
      dot.toggleAttribute("data-selected", glottocode === row.glottocode);
    }
  };

  /** Copia al panel lo que la fila ya dice. Nada se escribe de otra fuente. */
  const writeDetail = (row: Row): void => {
    const source = row.element.querySelector<HTMLAnchorElement>('[data-cell="source"] a');
    const values: readonly (readonly [HTMLElement | null, string])[] = [
      [detail.name, cellText(row.element, "language")],
      [detail.family, cellText(row.element, "family")],
      [detail.glottocode, cellText(row.element, "glottocode")],
      [detail.iso, cellText(row.element, "iso")],
    ];

    for (const [element, value] of values) {
      if (element !== null) {
        element.textContent = value;
      }
    }

    if (detail.link !== null) {
      detail.link.href = source?.href ?? "";
      detail.link.textContent = source?.textContent?.trim() ?? "";
    }
  };

  const showDetail = (row: Row): void => {
    markSelection(row);
    writeDetail(row);
    detail.placeholder?.toggleAttribute("hidden", true);
    detail.body?.toggleAttribute("hidden", false);
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLElement>("[data-language-open]");
    if (button === null) {
      return;
    }
    const glottocode = button.dataset["languageOpen"] ?? "";
    const row = rows.find((candidate) => candidate.glottocode === glottocode);
    if (row !== undefined) {
      showDetail(row);
    }
  });

  familyControl?.addEventListener("change", applyFilters);
  searchControl?.addEventListener("input", applyFilters);

  // El servidor ya renderizo la cuenta completa; aplicarla una vez deja el DOM y
  // el script en el mismo estado aunque el navegador restaure una seleccion.
  applyFilters();
};
