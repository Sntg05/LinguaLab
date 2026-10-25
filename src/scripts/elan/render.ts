/**
 * Dibujo de las capas y del informe de perdida.
 *
 * TODO SE CONSTRUYE CON `document.createElement` Y `textContent`. Nada de
 * `innerHTML`: el nombre de una capa y el texto de una anotacion vienen de un
 * archivo que escribio otra persona, y ese texto no puede convertirse en HTML
 * por el camino. Es la misma regla que sostiene la CSP sin `unsafe-inline`.
 *
 * Este modulo no decide QUE se muestra (eso lo hace `index.ts` con los textos
 * que recibe) ni de donde salen los datos: recibe el documento y el informe ya
 * calculados y los pone en el DOM.
 */

import type { AnnotationDocument, Tier } from "@lingualab/core";
import { describeNote, isReportEmpty, type ElanReportView } from "./notes";
import type { ElanStrings } from "./strings";

/** Cuantos caracteres del primer texto de una capa se muestran en la tabla. */
const SAMPLE_LENGTH = 48;

const cell = (text: string, className?: string): HTMLTableCellElement => {
  const element = document.createElement("td");
  if (className !== undefined) element.className = className;
  element.textContent = text;
  return element;
};

const listItem = (text: string, className?: string): HTMLLIElement => {
  const element = document.createElement("li");
  if (className !== undefined) element.className = className;
  element.textContent = text;
  return element;
};

/** El primer texto de la capa, recortado: alcanza para reconocerla sin abrirla. */
const sampleOf = (tier: Tier): string => {
  const first =
    tier.kind === "interval"
      ? tier.items.find((item) => item.text !== "")?.text
      : tier.points.find((point) => point.text !== "")?.text;
  if (first === undefined) return "—";
  return first.length > SAMPLE_LENGTH ? `${first.slice(0, SAMPLE_LENGTH)}…` : first;
};

const countOf = (tier: Tier): number => (tier.kind === "interval" ? tier.items.length : tier.points.length);

const kindOf = (tier: Tier, strings: ElanStrings): string =>
  strings.text(tier.kind === "interval" ? "elan.kind.interval" : "elan.kind.point");

/** Una fila por capa, en el orden del archivo. */
export const renderTiers = (
  rows: HTMLElement,
  doc: AnnotationDocument,
  strings: ElanStrings,
): void => {
  rows.replaceChildren();
  for (const tier of doc.tiers) {
    const row = document.createElement("tr");
    row.append(
      cell(tier.name, "elan-table__name"),
      cell(kindOf(tier, strings)),
      cell(String(countOf(tier))),
      cell(sampleOf(tier), "elan-table__sample"),
    );
    rows.append(row);
  }
};

export const clearTiers = (rows: HTMLElement): void => {
  rows.replaceChildren();
};

/** Los nodos del informe, buscados una vez por `index.ts`. */
export interface ReportElements {
  /** Envoltorio de las cuatro listas; se oculta hasta que hay informe. */
  readonly container: HTMLElement;
  /** Lo que se ve antes de cargar nada («carga un archivo para ver...»). */
  readonly placeholder: HTMLElement;
  /** «No se perdio nada», visible solo si las cuatro listas estan vacias. */
  readonly none: HTMLElement;
  readonly hierarchical: HTMLElement;
  readonly references: HTMLElement;
  readonly vocabularies: HTMLElement;
  readonly notes: HTMLElement;
}

/**
 * Rellena una lista, o pone una sola linea diciendo que por esa causa no se
 * perdio nada.
 *
 * La linea importa: una lista vacia sin explicacion se lee como «esta
 * herramienta no mira eso», que es lo contrario de lo que hace.
 */
const fillList = (
  list: HTMLElement,
  values: readonly string[],
  strings: ElanStrings,
): void => {
  list.replaceChildren();
  if (values.length === 0) {
    list.append(listItem(strings.text("elan.loss.causeEmpty"), "elan-loss__none"));
    return;
  }
  for (const value of values) {
    list.append(listItem(value));
  }
};

/**
 * Informe de perdida de una lectura de ELAN.
 *
 * El aviso «no se perdio nada» solo aparece si de verdad no se perdio nada: es
 * la frase que una persona lee para decidir si confia en el archivo exportado.
 */
export const renderReport = (
  elements: ReportElements,
  report: ElanReportView,
  strings: ElanStrings,
): void => {
  elements.placeholder.hidden = true;
  elements.container.hidden = false;
  elements.none.hidden = !isReportEmpty(report);

  fillList(elements.hierarchical, report.hierarchicalTiers, strings);
  fillList(elements.references, report.annotationReferences, strings);
  fillList(elements.vocabularies, report.controlledVocabularies, strings);

  elements.notes.replaceChildren();
  if (report.notes.length === 0) {
    elements.notes.append(listItem(strings.text("elan.loss.notesEmpty"), "elan-loss__none"));
  } else {
    for (const note of report.notes) {
      const line = describeNote(note, strings);
      // Un codigo que esta version no conoce se muestra tal cual: feo, pero
      // cierto. Inventar una frase escondería el desacuerdo.
      elements.notes.append(
        line === null
          ? listItem(`${note.code} · ${note.tier}`, "elan-loss__unknown")
          : listItem(line),
      );
    }
  }
};

/** Vuelve al estado de antes de cargar: una linea y ninguna lista. */
export const renderReportPlaceholder = (elements: ReportElements, message: string): void => {
  elements.container.hidden = true;
  elements.none.hidden = true;
  elements.placeholder.hidden = false;
  elements.placeholder.textContent = message;
};
