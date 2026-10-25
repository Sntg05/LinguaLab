/**
 * Dibujo de los paneles acusticos: contorno de F0, intensidad, superposicion de
 * formantes y grafico vocalico F1–F2.
 *
 * LA GEOMETRIA SE SEPARA DEL TRAZO
 *
 * Las conversiones —instante a pixel, hercio a pixel, F1/F2 a un punto del
 * grafico vocalico— son funciones puras con prueba. Lo que queda sin prueba es
 * la llamada al canvas, igual que en `render.ts`: no hay jsdom en este
 * repositorio, y fingir que un canvas de mentira demuestra que el grafico se ve
 * seria cambiar una medicion por una ilusion.
 *
 * EJES INVERTIDOS, Y POR QUE
 *
 * En un grafico vocalico el eje vertical es F1 y crece hacia ABAJO (una vocal
 * abierta tiene F1 alto y se dibuja abajo), y el horizontal es F2 y crece hacia
 * la IZQUIERDA (una vocal anterior tiene F2 alto y se dibuja a la izquierda).
 * Invertirlos no es una preferencia estetica: es la convencion con la que se lee
 * un triangulo vocalico, y al reves las vocales aparecen en espejo.
 */

import type { AcousticTrack } from "@lingualab/core";
import type { VowelPoint } from "./acoustic-measure";
import type { Palette } from "./render";
import { ratioAtTime, type ViewWindow } from "./view";

export interface PlotPoint {
  readonly x: number;
  readonly y: number;
  readonly value: number;
}

export interface ValueAxis {
  readonly minValue: number;
  readonly maxValue: number;
  readonly height: number;
}

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

/** Instante a coordenada horizontal de la ventana visible. */
export const timeToX = (time: number, view: ViewWindow, width: number): number =>
  ratioAtTime(view, time) * width;

/** Valor a coordenada vertical: el maximo arriba, como un eje de frecuencia. */
export const valueToY = (value: number, axis: ValueAxis): number => {
  const span = axis.maxValue - axis.minValue;
  if (span <= 0) {
    return axis.height;
  }
  return (1 - clamp01((value - axis.minValue) / span)) * axis.height;
};

/** Hercio a coordenada vertical del espectrograma superpuesto. */
export const hzToY = (hz: number, minHz: number, maxHz: number, height: number): number =>
  valueToY(hz, { minValue: minHz, maxValue: maxHz, height });

export interface ContourOptions {
  readonly view: ViewWindow;
  readonly width: number;
  readonly height: number;
  readonly minValue: number;
  readonly maxValue: number;
}

/**
 * Puntos dibujables de una pista dentro de la ventana visible.
 *
 * Los marcos con valor 0 son «sin voz» —la convencion del dominio— y se
 * descartan: dibujarlos pondria la linea sobre el borde inferior y afirmaria una
 * F0 de 0 Hz. El trazo se corta donde hay un hueco, en vez de saltar de un
 * extremo al otro.
 */
export const contourPoints = (track: AcousticTrack, options: ContourOptions): PlotPoint[] => {
  const points: PlotPoint[] = [];
  const axis = {
    minValue: options.minValue,
    maxValue: options.maxValue,
    height: options.height,
  };

  for (let index = 0; index < track.times.length; index += 1) {
    const time = track.times[index];
    const value = track.values[index];
    if (time === undefined || value === undefined) {
      continue;
    }
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (time < options.view.start || time > options.view.end) {
      continue;
    }
    points.push({
      x: timeToX(time, options.view, options.width),
      y: valueToY(value, axis),
      value,
    });
  }

  return points;
};

export interface VowelRanges {
  readonly minF1: number;
  readonly maxF1: number;
  readonly minF2: number;
  readonly maxF2: number;
}

export interface Area {
  readonly width: number;
  readonly height: number;
}

/**
 * Posicion de un punto en el grafico vocalico, con los dos ejes invertidos.
 *
 * F1 crece hacia abajo y F2 hacia la izquierda: la vocal cerrada y anterior
 * —F1 bajo, F2 alto— queda arriba a la izquierda, que es donde se la busca.
 */
export const vowelPlotPosition = (
  point: { readonly f1: number; readonly f2: number },
  ranges: VowelRanges,
  area: Area,
): { readonly x: number; readonly y: number } => {
  const f2Span = ranges.maxF2 - ranges.minF2;
  const f1Span = ranges.maxF1 - ranges.minF1;

  const x = f2Span <= 0 ? 0 : (1 - clamp01((point.f2 - ranges.minF2) / f2Span)) * area.width;
  const y = f1Span <= 0 ? 0 : clamp01((point.f1 - ranges.minF1) / f1Span) * area.height;

  return { x, y };
};

/**
 * Superficie de un canvas ya dimensionado, sin borrarlo.
 *
 * `fitCanvas` de `render.ts` limpia y redimensiona, que es lo correcto para el
 * primer trazo. Aqui el lienzo propio se limpia a mano y el espectrograma
 * superpuesto no se toca: borrarlo seria borrar el espectrograma.
 */
const surfaceOf = (
  canvas: HTMLCanvasElement,
  clear: boolean,
  surface: string,
): { ctx: CanvasRenderingContext2D; width: number; height: number } | null => {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return null;
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.width / ratio));
  const height = Math.max(1, Math.round(canvas.height / ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (clear) {
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);
  }
  return { ctx, width, height };
};

/**
 * Traza la polilinea de los puntos, cortando en cada hueco.
 *
 * Se corta en vez de unir: una linea que cruza un silencio afirma una
 * continuidad que la senal no tiene.
 */
const tracePath = (ctx: CanvasRenderingContext2D, points: readonly PlotPoint[]): void => {
  let previous: PlotPoint | null = null;
  ctx.beginPath();
  for (const point of points) {
    // Un salto mayor que un caracter de ancho se trata como un corte.
    const joined = previous !== null && Math.abs(point.x - previous.x) <= 24;
    if (joined) {
      ctx.lineTo(point.x, point.y);
    } else {
      ctx.moveTo(point.x, point.y);
    }
    previous = point;
  }
  ctx.stroke();
};

export interface TrackPlotOptions extends ContourOptions {
  readonly track: AcousticTrack;
  readonly palette: Palette;
  /** Titulo del panel, ya traducido. */
  readonly label: string;
  /** Unidad de la escala: «Hz» o «dB». */
  readonly unit: string;
}

/** Contorno en su propio canvas, con la escala escrita al costado. */
export const drawTrackPlot = (canvas: HTMLCanvasElement, options: TrackPlotOptions): void => {
  const surface = surfaceOf(canvas, true, options.palette.surface);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  const { palette } = options;
  // El tamano real lo manda el canvas ya dimensionado, no lo que crea el
  // llamador: si los dos numeros no coinciden, el trazo se sale del lienzo.
  const plot = { ...options, width, height };

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.fillStyle = palette.muted;
  ctx.font = "11px system-ui, sans-serif";

  const steps = 4;
  for (let step = 0; step <= steps; step += 1) {
    const value = plot.minValue + ((plot.maxValue - plot.minValue) * step) / steps;
    const y = valueToY(value, plot);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
    ctx.fillText(
      `${Math.round(value)} ${options.unit}`,
      4,
      Math.min(Math.max(y - 3, 9), height - 2),
    );
  }

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  tracePath(ctx, contourPoints(options.track, plot));

  ctx.fillStyle = palette.ink;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(options.label, Math.max(width - 8 - ctx.measureText(options.label).width, 4), 14);
};

export interface OverlayOptions {
  readonly view: ViewWindow;
  readonly minHz: number;
  readonly maxHz: number;
  readonly palette: Palette;
}

/**
 * Superpone F1, F2 y F3 sobre el espectrograma ya pintado.
 *
 * Se dibuja encima y no al lado porque lo que hay que leer es la relacion entre
 * la banda oscura del espectrograma y el formante: separarlos en dos graficos
 * obliga a comparar de memoria.
 */
export const drawFormantOverlay = (
  canvas: HTMLCanvasElement,
  tracks: readonly AcousticTrack[],
  options: OverlayOptions,
): void => {
  const surface = surfaceOf(canvas, false, options.palette.surface);
  if (surface === null || tracks.length === 0) {
    return;
  }
  const { ctx, width, height } = surface;
  const colors = [options.palette.accent, options.palette.warn, options.palette.ink];

  tracks.slice(0, 3).forEach((track, index) => {
    ctx.strokeStyle = colors[index] ?? options.palette.accent;
    ctx.lineWidth = 1.5;
    tracePath(
      ctx,
      contourPoints(track, {
        view: options.view,
        width,
        height,
        minValue: options.minHz,
        maxValue: options.maxHz,
      }),
    );
  });

  // La leyenda se escribe en el canvas porque los colores no llevan otro rotulo;
  // la tabla de mediciones del DOM tiene los valores, que es lo accesible.
  ctx.font = "600 11px system-ui, sans-serif";
  tracks.slice(0, 3).forEach((_, index) => {
    ctx.fillStyle = colors[index] ?? options.palette.accent;
    ctx.fillText(`F${index + 1}`, 8 + index * 22, 14);
  });
};

export interface VowelChartOptions {
  readonly points: readonly VowelPoint[];
  readonly palette: Palette;
  readonly ranges: VowelRanges;
  /** Texto de los ejes, ya traducido. */
  readonly labels: { readonly x: string; readonly y: string };
}

/** Grafico vocalico F1–F2 con sus ejes invertidos y una etiqueta por medicion. */
export const drawVowelChart = (canvas: HTMLCanvasElement, options: VowelChartOptions): void => {
  const surface = surfaceOf(canvas, true, options.palette.surface);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  const { palette } = options;
  const margin = { left: 44, right: 16, top: 16, bottom: 28 };
  const area = {
    width: Math.max(width - margin.left - margin.right, 1),
    height: Math.max(height - margin.top - margin.bottom, 1),
  };

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.fillStyle = palette.muted;
  ctx.font = "11px system-ui, sans-serif";

  // Marco del area de dibujo: el punto (0, 0) del grafico es su esquina.
  ctx.strokeRect(margin.left + 0.5, margin.top + 0.5, area.width, area.height);

  ctx.fillText(options.labels.x, margin.left + Math.max(area.width - 110, 0), height - 8);
  ctx.save();
  ctx.translate(12, margin.top + area.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(options.labels.y, -40, 0);
  ctx.restore();

  // Extremos de los ejes, que es como se lee un grafico vocalico.
  ctx.fillText(`${Math.round(options.ranges.maxF2)} Hz`, margin.left, height - 8);
  ctx.fillText(`${Math.round(options.ranges.maxF1)} Hz`, 4, margin.top + 10);
  ctx.fillText(`${Math.round(options.ranges.minF1)} Hz`, 4, margin.top + area.height);

  for (const point of options.points) {
    const position = vowelPlotPosition(point, options.ranges, area);
    const x = margin.left + position.x;
    const y = margin.top + position.y;

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (point.label !== "") {
      ctx.fillStyle = palette.ink;
      ctx.fillText(point.label, Math.min(x + 6, width - 40), Math.max(y - 6, 12));
    }
  }
};
