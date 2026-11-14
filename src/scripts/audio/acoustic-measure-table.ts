/**
 * Filas de la tabla de mediciones del panel acustico.
 *
 * Aparte del controlador porque es solo DOM a partir de una medicion ya hecha:
 * el orden de las columnas es el del encabezado de `AudioLab.astro` y el del
 * CSV, y cambiarlo aqui sin cambiar alli desalinea los numeros con sus titulos.
 */

import type { SelectionMeasurement } from "./acoustic-measure";

const rounded = (value: number, digits = 0): string => value.toFixed(digits);

const cell = (text: string): HTMLTableCellElement => {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
};

const sampleCell = (value: number | undefined): HTMLTableCellElement =>
  cell(value === undefined ? "—" : rounded(value, 0));

/**
 * Una cifra del resumen de F0, o una raya cuando ese intervalo no tiene voz.
 *
 * «Sin voz» se escribe solo en la media: repetirlo en las cuatro columnas
 * convertiria la fila en una frase. Las rayas dicen «aqui no hay numero» sin
 * inventar un 0 Hz.
 */
const statsCell = (
  measurement: SelectionMeasurement,
  pick: (stats: NonNullable<SelectionMeasurement["f0"]>) => number,
): HTMLTableCellElement => {
  const stats = measurement.f0;
  if (stats === null) {
    return cell("—");
  }
  return cell(rounded(pick(stats), 1));
};

export const measurementRow = (
  measurement: SelectionMeasurement,
  index: number,
  es: boolean,
): HTMLTableRowElement => {
  const row = document.createElement("tr");
  row.dataset.measurement = String(index);

  const head = document.createElement("th");
  head.scope = "row";
  head.textContent = measurement.label;

  row.append(
    head,
    cell(`${rounded(measurement.start, 3)}–${rounded(measurement.end, 3)}`),
    cell(
      measurement.f0 === null ? (es ? "sin voz" : "unvoiced") : rounded(measurement.f0.mean, 1),
    ),
    statsCell(measurement, (stats) => stats.median),
    statsCell(measurement, (stats) => stats.min),
    statsCell(measurement, (stats) => stats.max),
    cell(measurement.intensity === null ? "—" : rounded(measurement.intensity.mean, 1)),
  );

  for (const sample of measurement.f1) {
    row.append(sampleCell(sample.value));
  }
  for (const sample of measurement.f2) {
    row.append(sampleCell(sample.value));
  }

  return row;
};
