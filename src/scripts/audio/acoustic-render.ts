/**
 * Dibujo acustico: tono, formantes e intensidad sobre el espectrograma
 * (unidad 5.3) y grafico vocalico F1–F2.
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

/**
 * Colores de las curvas sobre el espectrograma, los de Praat: tono azul,
 * formantes rojos, intensidad amarilla. Son fijos y no del tema porque el
 * espectrograma es gris en los dos temas, y un estudiante que compare con su
 * manual tiene que reconocer cada curva por su color.
 */
export const OVERLAY_COLORS = {
  pitch: "#1a3dff",
  formants: "#e8191c",
  intensity: "#f2cc00",
} as const;

/**
 * Un punto por marco y por formante, como los dibuja Praat.
 *
 * Puntos y no lineas: un formante es una estimacion por marco y entre dos
 * marcos el analisis puede saltar de F2 a F3; una linea uniria dos formantes
 * distintos y afirmaria una trayectoria que no se midio.
 */
export const formantDots = (
  tracks: readonly AcousticTrack[],
  options: ContourOptions,
): PlotPoint[] => tracks.flatMap((track) => contourPoints(track, options));

export interface OverlayLayers {
  readonly pitch: AcousticTrack | null;
  readonly formants: readonly AcousticTrack[];
  readonly intensity: AcousticTrack | null;
}

export interface ScaleRange {
  readonly min: number;
  readonly max: number;
}

export interface OverlayOptions {
  readonly view: ViewWindow;
  /** Rango del espectrograma: el de los formantes, que son frecuencias de ese eje. */
  readonly minHz: number;
  readonly maxHz: number;
  /** Rango del tono (piso y techo del analisis): su propia escala, a la derecha. */
  readonly pitchRange: ScaleRange;
  /** Rango de la intensidad en dB, como el «view range» de Praat. */
  readonly intensityRange: ScaleRange;
  readonly palette: Palette;
}

/** Cuantos puntos de cada curva quedaron dibujados: lo que la pagina puede afirmar. */
export interface OverlayCounts {
  readonly pitch: number;
  readonly formants: number;
  readonly intensity: number;
}

/** Rotulo de una escala sobre un fondo, para que se lea sobre el gris. */
const scaleLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  right: number,
  y: number,
  color: string,
  palette: Palette,
): number => {
  const width = ctx.measureText(text).width + 6;
  ctx.fillStyle = palette.surface;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(right - width, y - 6, width, 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, right - width + 3, y);
  return width;
};

/**
 * Tono, formantes e intensidad sobre el espectrograma ya pintado.
 *
 * Se dibujan encima y no en lienzos aparte porque lo que se lee es la relacion
 * entre la curva y el sonido: el formante contra su banda oscura, el tono
 * contra los tramos con voz. Separarlos obliga a comparar de memoria. El tono y
 * la intensidad tienen su propia escala, escrita a la derecha como en Praat; los
 * formantes usan la del espectrograma, que esta a la izquierda.
 */
export const drawAcousticOverlay = (
  canvas: HTMLCanvasElement,
  layers: OverlayLayers,
  options: OverlayOptions,
): OverlayCounts => {
  const surface = surfaceOf(canvas, false, options.palette.surface);
  if (surface === null) {
    return { pitch: 0, formants: 0, intensity: 0 };
  }
  const { ctx, width, height } = surface;
  const area = { view: options.view, width, height };
  ctx.save();

  let intensityCount = 0;
  if (layers.intensity !== null) {
    const points = contourPoints(layers.intensity, {
      ...area,
      minValue: options.intensityRange.min,
      maxValue: options.intensityRange.max,
    });
    intensityCount = points.length;
    // Un borde oscuro debajo: el amarillo solo no se ve sobre el blanco de los
    // silencios del espectrograma.
    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 3.5;
    tracePath(ctx, points);
    ctx.strokeStyle = OVERLAY_COLORS.intensity;
    ctx.lineWidth = 2;
    tracePath(ctx, points);
  }

  const dots = formantDots(layers.formants, {
    ...area,
    minValue: options.minHz,
    maxValue: options.maxHz,
  });
  ctx.fillStyle = OVERLAY_COLORS.formants;
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  let pitchCount = 0;
  if (layers.pitch !== null) {
    const points = contourPoints(layers.pitch, {
      ...area,
      minValue: options.pitchRange.min,
      maxValue: options.pitchRange.max,
    });
    pitchCount = points.length;
    ctx.strokeStyle = OVERLAY_COLORS.pitch;
    ctx.lineWidth = 2;
    tracePath(ctx, points);
  }

  // Escalas a la derecha: la del tono en el borde y la de la intensidad a su
  // izquierda, cada una en el color de su curva.
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  let right = width - 2;
  if (layers.pitch !== null) {
    const top = scaleLabel(ctx, `${Math.round(options.pitchRange.max)} Hz`, right, 7, OVERLAY_COLORS.pitch, options.palette);
    const bottom = scaleLabel(ctx, `${Math.round(options.pitchRange.min)} Hz`, right, height - 7, OVERLAY_COLORS.pitch, options.palette);
    right -= Math.max(top, bottom) + 4;
  }
  if (layers.intensity !== null) {
    // El texto de la intensidad va en tinta: el amarillo no se lee como letra.
    scaleLabel(ctx, `${Math.round(options.intensityRange.max)} dB`, right, 7, options.palette.ink, options.palette);
    scaleLabel(ctx, `${Math.round(options.intensityRange.min)} dB`, right, height - 7, options.palette.ink, options.palette);
  }
  ctx.restore();

  return { pitch: pitchCount, formants: dots.length, intensity: intensityCount };
};

/**
 * Un aviso escrito sobre el espectrograma, donde se esperaban las curvas.
 *
 * Praat hace lo mismo cuando no analiza («zoom in to at most 10 seconds»): el
 * aviso va donde el estudiante busca la curva, no en un panel lejano.
 */
export const drawOverlayNotice = (
  canvas: HTMLCanvasElement,
  text: string,
  palette: Palette,
): void => {
  const surface = surfaceOf(canvas, false, palette.surface);
  if (surface === null) {
    return;
  }
  const { ctx, width, height } = surface;
  ctx.save();
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const textWidth = Math.min(ctx.measureText(text).width, width - 24);
  const x = Math.max((width - textWidth) / 2, 12);
  const y = height / 2;
  ctx.fillStyle = palette.surface;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x - 8, y - 11, textWidth + 16, 22);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.ink;
  ctx.fillText(text, x, y, width - 24);
  ctx.restore();
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
