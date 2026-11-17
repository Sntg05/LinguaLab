/* ============================================================
   LinguaLab — estadística: la geometría de los gráficos

   Sin DOM: cada gráfico es una escena de rectángulos, líneas, puntos y
   textos con sus coordenadas, que `render.ts` convierte en SVG. Así lo que se
   dibuja tiene prueba.

   - Histograma: intervalos de Sturges (1926), k = ⌈log₂ n⌉ + 1, de igual ancho.
   - Caja: cuartiles tipo 7 (los de R); bigotes hasta el dato más extremo dentro
     de 1,5 veces el rango intercuartílico (Tukey, 1977); lo demás, puntos.
   ============================================================ */

import { quantileType7 } from "@lingualab/core";
import type { ChartSpec } from "./analyses";

export type SceneItem =
  | { readonly type: "rect"; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly tone: number }
  | { readonly type: "line"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly role: "axis" | "data" | "reference" }
  | { readonly type: "circle"; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly type: "text"; readonly x: number; readonly y: number; readonly text: string; readonly anchor: "start" | "middle" | "end" };

export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly items: readonly SceneItem[];
}

const WIDTH = 560;
const HEIGHT = 300;
const MARGIN = { left: 56, right: 16, top: 16, bottom: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

/* ---------------------------------------------------------------
   Estadística de los gráficos
   --------------------------------------------------------------- */

export interface Bin {
  readonly from: number;
  readonly to: number;
  readonly count: number;
}

/** Intervalos de Sturges; el último incluye el máximo. */
export const histogramBins = (values: readonly number[]): Bin[] => {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ from: min, to: max, count: values.length }];
  const k = Math.ceil(Math.log2(values.length)) + 1;
  const width = (max - min) / k;
  const bins = Array.from({ length: k }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }));
  for (const value of values) {
    const index = Math.min(k - 1, Math.floor((value - min) / width));
    const bin = bins[index];
    if (bin !== undefined) bin.count += 1;
  }
  return bins;
};

export interface BoxStats {
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly low: number;
  readonly high: number;
  readonly outliers: readonly number[];
}

export const boxStats = (values: readonly number[]): BoxStats => {
  const q1 = quantileType7(values, 0.25);
  const q3 = quantileType7(values, 0.75);
  const fence = 1.5 * (q3 - q1);
  const inside = values.filter((value) => value >= q1 - fence && value <= q3 + fence);
  return {
    q1,
    median: quantileType7(values, 0.5),
    q3,
    low: Math.min(...inside),
    high: Math.max(...inside),
    outliers: values.filter((value) => value < q1 - fence || value > q3 + fence),
  };
};

/** Marcas «redondas» (1, 2 o 5 por una potencia de diez) que cubren [min, max]. */
export const niceTicks = (min: number, max: number, count = 5): number[] => {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((factor) => factor * power >= raw) ?? 10) * power;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
};

/* ---------------------------------------------------------------
   Escenas
   --------------------------------------------------------------- */

const scale = (domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) => {
  const span = domainMax - domainMin || 1;
  return (value: number): number => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
};

const label = (value: number): string => (Math.abs(value) >= 1000 ? value.toFixed(0) : String(Number(value.toPrecision(4))));

const yAxis = (min: number, max: number, y: (value: number) => number): SceneItem[] => [
  { type: "line", x1: MARGIN.left, y1: MARGIN.top, x2: MARGIN.left, y2: MARGIN.top + PLOT_H, role: "axis" },
  ...niceTicks(min, max).map(
    (tick): SceneItem => ({ type: "text", x: MARGIN.left - 6, y: y(tick) + 4, text: label(tick), anchor: "end" }),
  ),
];

const xAxisLine: SceneItem = {
  type: "line",
  x1: MARGIN.left,
  y1: MARGIN.top + PLOT_H,
  x2: MARGIN.left + PLOT_W,
  y2: MARGIN.top + PLOT_H,
  role: "axis",
};

const histogramScene = (values: readonly number[], reference?: number): Scene => {
  const bins = histogramBins(values);
  const top = Math.max(1, ...bins.map((bin) => bin.count));
  const first = bins[0]?.from ?? 0;
  const last = bins[bins.length - 1]?.to ?? 1;
  const low = reference === undefined ? first : Math.min(first, reference);
  const high = reference === undefined ? last : Math.max(last, reference);
  const x = scale(low, high, MARGIN.left, MARGIN.left + PLOT_W);
  const y = scale(0, top, MARGIN.top + PLOT_H, MARGIN.top);
  const items: SceneItem[] = [
    ...bins.map((bin): SceneItem => ({ type: "rect", x: x(bin.from), y: y(bin.count), w: Math.max(1, x(bin.to) - x(bin.from) - 1), h: y(0) - y(bin.count), tone: 0 })),
    ...yAxis(0, top, y),
    xAxisLine,
    ...niceTicks(low, high).map((tick): SceneItem => ({ type: "text", x: x(tick), y: MARGIN.top + PLOT_H + 18, text: label(tick), anchor: "middle" })),
  ];
  if (reference !== undefined) {
    items.push({ type: "line", x1: x(reference), y1: MARGIN.top, x2: x(reference), y2: MARGIN.top + PLOT_H, role: "reference" });
  }
  return { width: WIDTH, height: HEIGHT, items };
};

const boxplotScene = (groups: readonly { readonly label: string; readonly values: readonly number[] }[]): Scene => {
  const all = groups.flatMap((group) => [...group.values]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const y = scale(min, max, MARGIN.top + PLOT_H, MARGIN.top);
  const slot = PLOT_W / Math.max(1, groups.length);
  const items: SceneItem[] = [...yAxis(min, max, y), xAxisLine];
  groups.forEach((group, index) => {
    const stats = boxStats(group.values);
    const center = MARGIN.left + slot * (index + 0.5);
    const half = Math.min(40, slot * 0.3);
    items.push(
      { type: "line", x1: center, y1: y(stats.low), x2: center, y2: y(stats.q1), role: "data" },
      { type: "line", x1: center, y1: y(stats.q3), x2: center, y2: y(stats.high), role: "data" },
      { type: "rect", x: center - half, y: y(stats.q3), w: half * 2, h: Math.max(1, y(stats.q1) - y(stats.q3)), tone: index },
      { type: "line", x1: center - half, y1: y(stats.median), x2: center + half, y2: y(stats.median), role: "data" },
      ...stats.outliers.map((value): SceneItem => ({ type: "circle", cx: center, cy: y(value), r: 3 })),
      { type: "text", x: center, y: MARGIN.top + PLOT_H + 18, text: group.label, anchor: "middle" },
    );
  });
  return { width: WIDTH, height: HEIGHT, items };
};

const scatterScene = (
  xs: readonly number[],
  ys: readonly number[],
  fit?: { readonly intercept: number; readonly slope: number },
): Scene => {
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  const x = scale(xMin, xMax, MARGIN.left, MARGIN.left + PLOT_W);
  const y = scale(yMin, yMax, MARGIN.top + PLOT_H, MARGIN.top);
  const items: SceneItem[] = [
    ...yAxis(yMin, yMax, y),
    xAxisLine,
    ...niceTicks(xMin, xMax).map((tick): SceneItem => ({ type: "text", x: x(tick), y: MARGIN.top + PLOT_H + 18, text: label(tick), anchor: "middle" })),
    ...xs.map((value, index): SceneItem => ({ type: "circle", cx: x(value), cy: y(ys[index] ?? 0), r: 3 })),
  ];
  if (fit !== undefined) {
    const clampY = (value: number): number => Math.min(MARGIN.top + PLOT_H, Math.max(MARGIN.top, y(value)));
    items.push({
      type: "line",
      x1: x(xMin),
      y1: clampY(fit.intercept + fit.slope * xMin),
      x2: x(xMax),
      y2: clampY(fit.intercept + fit.slope * xMax),
      role: "reference",
    });
  }
  return { width: WIDTH, height: HEIGHT, items };
};

const barsScene = (
  labels: readonly string[],
  series: readonly { readonly label: string; readonly counts: readonly number[] }[],
): Scene => {
  const top = Math.max(1, ...series.flatMap((item) => [...item.counts]));
  const y = scale(0, top, MARGIN.top + PLOT_H, MARGIN.top);
  const slot = PLOT_W / Math.max(1, labels.length);
  const bar = (slot * 0.8) / Math.max(1, series.length);
  const items: SceneItem[] = [...yAxis(0, top, y), xAxisLine];
  labels.forEach((name, column) => {
    const start = MARGIN.left + slot * column + slot * 0.1;
    series.forEach((item, index) => {
      const count = item.counts[column] ?? 0;
      items.push({ type: "rect", x: start + bar * index, y: y(count), w: Math.max(1, bar - 2), h: y(0) - y(count), tone: index });
    });
    items.push({ type: "text", x: MARGIN.left + slot * (column + 0.5), y: MARGIN.top + PLOT_H + 18, text: name, anchor: "middle" });
  });
  series.forEach((item, index) => {
    items.push({ type: "rect", x: MARGIN.left + index * 110, y: HEIGHT - 14, w: 10, h: 10, tone: index });
    items.push({ type: "text", x: MARGIN.left + index * 110 + 14, y: HEIGHT - 5, text: item.label, anchor: "start" });
  });
  return { width: WIDTH, height: HEIGHT, items };
};

export const sceneFor = (spec: ChartSpec): Scene => {
  switch (spec.kind) {
    case "histogram":
      return histogramScene(spec.values, spec.reference);
    case "boxplots":
      return boxplotScene(spec.groups);
    case "scatter":
      return scatterScene(spec.x, spec.y, spec.line);
    case "bars":
      return barsScene(spec.labels, spec.series);
  }
};
