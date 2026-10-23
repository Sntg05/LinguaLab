/* ============================================================
   LinguaLab — dibujo del visor

   Forma de onda, espectrograma, regla de tiempo y capas sobre tres canvas.

   POR QUE CANVAS Y NO SVG NI DOM
   Una forma de onda de 900 columnas son 900 trazos por repintado; el
   espectrograma son 108 000 pixeles por fotograma mientras suena el audio. Con
   nodos del DOM, mover el cursor repintaria miles de elementos por segundo. El
   canvas no cuesta nada y no lleva texto: todo lo que una persona necesita LEER
   —tiempos, etiquetas, intervalos— esta en la tabla y en los campos del DOM, que
   si son accesibles. El canvas es la representacion visual, no la unica.
   ============================================================ */

import type { AnnotationDocument, Tier } from "@lingualab/core";
import { isIntervalTier } from "@lingualab/core";
import type { Spectrogram } from "./spectrogram";
import type { ViewWindow } from "./view";
import { ratioAtTime } from "./view";
import type { Peak } from "./waveform";

/** Colores del tema activo, leidos de las variables CSS. */
export interface Palette {
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly surface: string;
  readonly line: string;
  readonly warn: string;
}

export const readPalette = (element: Element): Palette => {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string): string => {
    const value = style.getPropertyValue(name).trim();
    return value === "" ? fallback : value;
  };
  return {
    ink: read("--ink", "#1a140f"),
    muted: read("--ink-muted", "#5c5248"),
    accent: read("--accent", "#a2431f"),
    surface: read("--surface", "#ffffff"),
    line: read("--line", "#d8cfc2"),
    warn: read("--warn", "#8a3b00"),
  };
};

interface Surface {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
}

/**
 * Ajusta el canvas a su tamano CSS y a la densidad de pantalla, y devuelve el
 * contexto listo para dibujar en pixeles logicos.
 */
export const fitCanvas = (canvas: HTMLCanvasElement): Surface | null => {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return null;
  }

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth));
  const height = Math.max(1, Math.round(canvas.clientHeight));

  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
};

const timeToX = (view: ViewWindow, duration: number, time: number): number =>
  ratioAtTime(view, time) * duration;

export interface WaveformOptions {
  readonly peaks: readonly Peak[];
  readonly view: ViewWindow;
  readonly duration: number;
  readonly palette: Palette;
  readonly cursor: number;
  readonly selection: { readonly start: number; readonly end: number } | null;
}

/** Forma de onda con la seleccion sombreada y el cursor marcado. */
export const drawWaveform = (canvas: HTMLCanvasElement, options: WaveformOptions): void => {
  const surface = fitCanvas(canvas);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  const middle = height / 2;
  const span = options.view.end - options.view.start;

  if (options.selection !== null) {
    const from = timeToX(options.view, width, options.selection.start);
    const to = timeToX(options.view, width, options.selection.end);
    ctx.fillStyle = options.palette.accent;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(from, 0, Math.max(to - from, 1), height);
    ctx.globalAlpha = 1;
  }

  // La linea de cero es la referencia sin la cual una onda no se puede leer.
  ctx.strokeStyle = options.palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, middle + 0.5);
  ctx.lineTo(width, middle + 0.5);
  ctx.stroke();

  ctx.strokeStyle = options.palette.accent;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const time = options.view.start + (x / width) * span;
    const bucket = Math.min(
      options.peaks.length - 1,
      Math.max(0, Math.floor((time / Math.max(options.duration, 1e-9)) * options.peaks.length)),
    );
    const peak = options.peaks[bucket];
    if (peak === undefined) {
      continue;
    }
    const top = middle - peak.max * middle;
    const bottom = middle - peak.min * middle;
    ctx.moveTo(x + 0.5, top);
    ctx.lineTo(x + 0.5, Math.max(bottom, top + 1));
  }
  ctx.stroke();

  const cursorX = timeToX(options.view, width, options.cursor);
  ctx.strokeStyle = options.palette.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cursorX, 0);
  ctx.lineTo(cursorX, height);
  ctx.stroke();
};

/**
 * Rampa de color del espectrograma: azul oscuro (silencio) a ambar (energia).
 *
 * Es fija y no depende del tema a proposito. Un espectrograma pintado con los
 * colores del tema se vuelve ilegible en uno de los dos, y el contraste entre
 * bandas es el unico contenido del dibujo.
 */
const heatColor = (value: number): readonly [number, number, number] => {
  const stops: readonly (readonly [number, number, number])[] = [
    [12, 12, 26],
    [40, 44, 110],
    [140, 60, 120],
    [230, 120, 60],
    [255, 226, 140],
  ];
  const position = Math.min(Math.max(value, 0), 1) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const fraction = position - index;
  const from = stops[index] ?? [0, 0, 0];
  const to = stops[index + 1] ?? [0, 0, 0];
  return [
    Math.round(from[0] + (to[0] - from[0]) * fraction),
    Math.round(from[1] + (to[1] - from[1]) * fraction),
    Math.round(from[2] + (to[2] - from[2]) * fraction),
  ];
};

export interface SpectrogramOptions {
  readonly spectrogram: Spectrogram;
  readonly view: ViewWindow;
  readonly palette: Palette;
}

/** Espectrograma por pixel, leyendo la columna que corresponde a cada instante. */
export const drawSpectrogram = (canvas: HTMLCanvasElement, options: SpectrogramOptions): void => {
  const surface = fitCanvas(canvas);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  const { spectrogram } = options;

  if (spectrogram.columns === 0 || spectrogram.columnLength === 0) {
    ctx.fillStyle = options.palette.surface;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = options.palette.muted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("—", 6, height / 2);
    return;
  }

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const step = spectrogram.columnSeconds;

  for (let x = 0; x < width; x += 1) {
    const time = options.view.start + (x / width) * (options.view.end - options.view.start);
    const column = Math.min(
      spectrogram.columns - 1,
      Math.max(0, Math.floor(time / Math.max(step, 1e-9))),
    );
    for (let y = 0; y < height; y += 1) {
      const band = Math.min(
        spectrogram.columnLength - 1,
        Math.max(0, Math.floor((1 - (y + 0.5) / height) * spectrogram.columnLength)),
      );
      const value = spectrogram.values[column * spectrogram.columnLength + band] ?? 0;
      const [red, green, blue] = heatColor(value);
      const offset = (y * width + x) * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
};


/** Datos de una banda de capa que necesitan los ayudantes de dibujo. */
interface Strip {
  readonly ctx: CanvasRenderingContext2D;
  readonly top: number;
  readonly rowHeight: number;
  readonly width: number;
  readonly view: ViewWindow;
  readonly palette: Palette;
}

const drawBoundary = (strip: Strip, x: number): void => {
  strip.ctx.strokeStyle = strip.palette.ink;
  strip.ctx.globalAlpha = 0.5;
  strip.ctx.beginPath();
  strip.ctx.moveTo(x + 0.5, strip.top);
  strip.ctx.lineTo(x + 0.5, strip.top + strip.rowHeight - 2);
  strip.ctx.stroke();
  strip.ctx.globalAlpha = 1;
};

/**
 * Etiqueta recortada al hueco del intervalo.
 *
 * Se recorta en vez de escribir encima del vecino porque un texto que invade el
 * intervalo de al lado se lee como si perteneciera a ese intervalo.
 */
const drawLabel = (strip: Strip, from: number, to: number, text: string): void => {
  if (text === "") {
    return;
  }
  const { ctx } = strip;
  ctx.save();
  ctx.beginPath();
  ctx.rect(from + 2, strip.top, Math.max(to - from - 4, 0), strip.rowHeight - 2);
  ctx.clip();
  ctx.fillStyle = strip.palette.ink;
  ctx.fillText(text, from + 3, strip.top + strip.rowHeight - 7);
  ctx.restore();
};

/** Una banda completa de una capa: fondo, nombre y su contenido. */
const drawTierRow = (strip: Strip, tier: Tier, active: boolean): void => {
  const { ctx } = strip;

  ctx.fillStyle = active ? strip.palette.accent : strip.palette.line;
  ctx.globalAlpha = active ? 0.14 : 0.35;
  ctx.fillRect(0, strip.top, strip.width, strip.rowHeight - 2);
  ctx.globalAlpha = 1;

  ctx.fillStyle = active ? strip.palette.ink : strip.palette.muted;
  ctx.font = active ? "600 11px system-ui, sans-serif" : "11px system-ui, sans-serif";
  ctx.fillText(tier.name, 4, strip.top + strip.rowHeight - 7);

  if (!isIntervalTier(tier)) {
    drawPointStrip(strip, tier.points);
    return;
  }

  for (const interval of tier.items) {
    const from = timeToX(strip.view, strip.width, interval.start);
    const to = timeToX(strip.view, strip.width, interval.end);
    if (to < 0 || from > strip.width) {
      continue;
    }
    drawBoundary(strip, from);
    drawLabel(strip, from, to, interval.text);
  }
};

/** Capa de puntos: cada marca es un triangulo en su instante. */
const drawPointStrip = (strip: Strip, points: readonly { time: number }[]): void => {
  const { ctx } = strip;
  ctx.fillStyle = strip.palette.accent;
  for (const point of points) {
    const x = ratioAtTime(strip.view, point.time) * strip.width;
    if (x < 0 || x > strip.width) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(x, strip.top + 2);
    ctx.lineTo(x + 4, strip.top + strip.rowHeight - 6);
    ctx.lineTo(x - 4, strip.top + strip.rowHeight - 6);
    ctx.closePath();
    ctx.fill();
  }
};

export interface TierStripOptions {
  readonly document: AnnotationDocument;
  readonly view: ViewWindow;
  readonly activeTier: number;
  readonly palette: Palette;
}

/**
 * Regla de tiempo y bandas de las capas, con sus fronteras.
 *
 * El texto de las etiquetas se dibuja solo si cabe: un texto recortado a la mitad
 * se lee como una etiqueta distinta, y la tabla del DOM ya tiene el texto
 * completo y accesible.
 */
export const drawTierStrips = (canvas: HTMLCanvasElement, options: TierStripOptions): void => {
  const surface = fitCanvas(canvas);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  const tiers = options.document.tiers;
  const rowHeight = Math.max(18, Math.min(28, height / Math.max(tiers.length + 1, 1)));

  ctx.fillStyle = options.palette.surface;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = options.palette.muted;
  ctx.font = "11px system-ui, sans-serif";
  ctx.strokeStyle = options.palette.line;
  ctx.lineWidth = 1;

  const rulerY = rowHeight;
  ctx.beginPath();
  ctx.moveTo(0, rulerY + 0.5);
  ctx.lineTo(width, rulerY + 0.5);
  ctx.stroke();

  // Marcas de la regla: un numero fijo de etiquetas para que el eje no se sature.
  const span = options.view.end - options.view.start;
  const marks = 6;
  ctx.textAlign = "left";
  for (let mark = 0; mark <= marks; mark += 1) {
    const time = options.view.start + (span * mark) / marks;
    const x = (mark / marks) * width;
    ctx.fillRect(x, rulerY - 4, 1, 4);
    if (mark < marks) {
      ctx.fillText(`${time.toFixed(2)} s`, Math.min(x + 3, width - 46), rulerY - 6);
    }
  }

  tiers.forEach((tier, index) => {
    drawTierRow(
      { ctx, top: rulerY + index * rowHeight, rowHeight, width, view: options.view, palette: options.palette },
      tier,
      index === options.activeTier,
    );
  });
};
