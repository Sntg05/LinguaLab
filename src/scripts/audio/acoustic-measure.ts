/**
 * Medicion de una seleccion sobre las pistas acusticas.
 *
 * POR QUE ESTE MODULO NO TOCA EL DOM
 *
 * Lo que sigue es lo que una persona cita en un trabajo: la media, la mediana,
 * el minimo y el maximo de F0 de un intervalo, y los formantes en puntos
 * concretos. Se calcula aqui, sin DOM y con prueba, porque un error de
 * estadistica no se ve en pantalla: una mediana corrida o un tramo sin voz
 * contado como 0 Hz produce numeros con aspecto correcto.
 *
 * LA CONVENCION DEL CERO
 *
 * El dominio declara que un marco sin voz vale 0 en las pistas de F0. Ese 0 no
 * es una frecuencia: es la ausencia de una. Por eso el resumen lo descarta en
 * vez de promediarlo, y si no queda ningun valor devuelve `null` —no un resumen
 * de ceros— para que la tabla diga «sin voz» y no «0 Hz».
 */

import type { AcousticTrack } from "@lingualab/core";

export interface AcousticRange {
  readonly start: number;
  readonly end: number;
}

export interface TrackStats {
  readonly count: number;
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
}

export interface FormantSample {
  /** Punto del intervalo: 25, 50 o 75 por ciento. */
  readonly percent: number;
  readonly time: number;
  readonly value: number;
}

export interface SelectionMeasurement {
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly f0: TrackStats | null;
  readonly intensity: TrackStats | null;
  /** F1 en 25 %, 50 %, 75 % y en el punto medio. */
  readonly f1: readonly FormantSample[];
  /** F2 en los mismos cuatro puntos. */
  readonly f2: readonly FormantSample[];
}

/**
 * Puntos que se informan: los tres porcentajes que pide la especificacion y el
 * punto medio.
 *
 * El punto medio coincide numericamente con el 50 % por construccion, y se
 * conserva igual porque es el dato que se cita como «formante en el centro de
 * la vocal»: quien lee la tabla lo busca con ese nombre.
 */
export const PERCENT_POINTS: readonly number[] = [25, 50, 75];
export const MIDPOINT_PERCENT = 50;

const isMeasured = (value: number): boolean => Number.isFinite(value) && value !== 0;

/** Valores con medicion dentro del intervalo. */
export const valuesInRange = (track: AcousticTrack, range: AcousticRange): number[] => {
  const values: number[] = [];
  for (let index = 0; index < track.times.length; index += 1) {
    const time = track.times[index];
    const value = track.values[index];
    if (time === undefined || value === undefined) {
      continue;
    }
    if (time < range.start - 1e-9 || time > range.end + 1e-9) {
      continue;
    }
    if (isMeasured(value)) {
      values.push(value);
    }
  }
  return values;
};

const mean = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

/** Mediana con la convencion de siempre: con un numero par, media de los dos centrales. */
export const median = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  const lower = sorted[middle - 1] ?? 0;
  const upper = sorted[middle] ?? 0;
  return (lower + upper) / 2;
};

/**
 * Resumen de una pista en un intervalo, o `null` si no hay nada medido.
 *
 * `null` y no ceros: un intervalo en silencio no tiene frecuencia fundamental
 * media, y escribir 0 Hz afirmaria una medicion que no existe.
 */
export const summarize = (track: AcousticTrack, range: AcousticRange): TrackStats | null => {
  const values = valuesInRange(track, range);
  if (values.length === 0) {
    return null;
  }
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

/**
 * Valor de la pista en un instante: la muestra mas cercana.
 *
 * No se interpola: un formante interpolado entre dos marcos es un numero que
 * nadie midio, y ademas el analisis de formantes solo es fiable dentro de su
 * ventana.
 */
export const valueAt = (track: AcousticTrack, time: number): number => {
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < track.times.length; index += 1) {
    const at = track.times[index];
    const value = track.values[index];
    if (at === undefined || value === undefined) {
      continue;
    }
    const gap = Math.abs(at - time);
    if (gap < distance) {
      distance = gap;
      best = value;
    }
  }

  return best;
};

/** Muestras en los porcentajes pedidos, tomando el instante exacto del porcentaje. */
export const sampleAtPercents = (
  track: AcousticTrack,
  range: AcousticRange,
  percents: readonly number[] = PERCENT_POINTS,
): FormantSample[] => {
  const span = range.end - range.start;
  return percents.map((percent) => {
    const time = range.start + (span * percent) / 100;
    return { percent, time, value: valueAt(track, time) };
  });
};

export interface MeasureSelectionInput {
  readonly label: string;
  readonly range: AcousticRange;
  readonly f0: AcousticTrack | null;
  readonly formants: readonly AcousticTrack[];
  readonly intensity: AcousticTrack | null;
}

/**
 * Medida completa de una seleccion.
 *
 * La intensidad se resume con las mismas funciones que F0 pero SIN descartar el
 * cero: en decibelios un 0 es un valor posible de un silencio digital, no la
 * marca de «sin dato».
 */
export const measureSelection = (input: MeasureSelectionInput): SelectionMeasurement => {
  const first = input.formants[0];
  const second = input.formants[1];

  return {
    label: input.label,
    start: input.range.start,
    end: input.range.end,
    f0: input.f0 === null ? null : summarize(input.f0, input.range),
    intensity:
      input.intensity === null
        ? null
        : summarizeIntensity(input.intensity, input.range),
    f1:
      first === undefined
        ? []
        : sampleAtPercents(first, input.range, [...PERCENT_POINTS, MIDPOINT_PERCENT]),
    f2:
      second === undefined
        ? []
        : sampleAtPercents(second, input.range, [...PERCENT_POINTS, MIDPOINT_PERCENT]),
  };
};

/**
 * Resumen de intensidad.
 *
 * Comparte el calculo con F0 pero no el descarte del cero: la intensidad de un
 * marco siempre existe, y un 0 dB es un valor, no un hueco.
 */
const summarizeIntensity = (track: AcousticTrack, range: AcousticRange): TrackStats | null => {
  const values: number[] = [];
  for (let index = 0; index < track.times.length; index += 1) {
    const time = track.times[index];
    const value = track.values[index];
    if (time === undefined || value === undefined) {
      continue;
    }
    if (time < range.start - 1e-9 || time > range.end + 1e-9) {
      continue;
    }
    if (Number.isFinite(value)) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return null;
  }
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

/** Punto del grafico vocalico: F1 y F2 en el centro del intervalo. */
export interface VowelPoint {
  readonly label: string;
  readonly f1: number;
  readonly f2: number;
}

/**
 * Puntos para el grafico F1–F2 de las mediciones guardadas.
 *
 * Se usa el centro del intervalo y se descarta lo que no tenga los dos
 * formantes: un punto en (0, 0) seria una vocal que no se midio.
 */
export const vowelPoints = (
  measurements: readonly SelectionMeasurement[],
): VowelPoint[] => {
  const points: VowelPoint[] = [];
  for (const measurement of measurements) {
    const f1 = measurement.f1.find((sample) => sample.percent === MIDPOINT_PERCENT);
    const f2 = measurement.f2.find((sample) => sample.percent === MIDPOINT_PERCENT);
    if (f1 === undefined || f2 === undefined || f1.value === 0 || f2.value === 0) {
      continue;
    }
    points.push({ label: measurement.label, f1: f1.value, f2: f2.value });
  }
  return points;
};

/** Coma decimal fuera: dentro de un CSV separado por comas seria un campo partido. */
const number = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "" : value.toFixed(3);

/** Entrecomilla segun RFC 4180: dobla la comilla y encierra el campo. */
const field = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const CSV_HEADER = [
  "etiqueta",
  "inicio_s",
  "fin_s",
  "f0_media_hz",
  "f0_mediana_hz",
  "f0_min_hz",
  "f0_max_hz",
  "intensidad_media_db",
  "f1_25_hz",
  "f1_50_hz",
  "f1_75_hz",
  "f1_centro_hz",
  "f2_25_hz",
  "f2_50_hz",
  "f2_75_hz",
  "f2_centro_hz",
];

/**
 * CSV de las mediciones, una fila por intervalo.
 *
 * El orden de las columnas de formantes sigue el de `PERCENT_POINTS` y deja el
 * centro al final para que se lea como el dato que se cita, no como un cuarto
 * porcentaje.
 */
export const measurementsToCsv = (
  measurements: readonly SelectionMeasurement[],
): string => {
  const rows = measurements.map((measurement) => {
    const f1 = measurement.f1;
    const f2 = measurement.f2;
    return [
      field(measurement.label),
      number(measurement.start),
      number(measurement.end),
      number(measurement.f0?.mean),
      number(measurement.f0?.median),
      number(measurement.f0?.min),
      number(measurement.f0?.max),
      number(measurement.intensity?.mean),
      number(f1[0]?.value),
      number(f1[1]?.value),
      number(f1[2]?.value),
      number(f1[3]?.value),
      number(f2[0]?.value),
      number(f2[1]?.value),
      number(f2[2]?.value),
      number(f2[3]?.value),
    ].join(",");
  });

  return `${CSV_HEADER.join(",")}\n${rows.map((row) => `${row}\n`).join("")}`;
};

/* ----------------------------- consultas ----------------------------- */

/**
 * Donde se consulta: el cursor o un tramo seleccionado.
 *
 * Es la distincion del manual de Praat («Intro 4.3», «Intro 5.3»): con un
 * cursor, «Get pitch» da el valor en ese instante; con una seleccion, la media
 * en ella.
 */
export type QueryTarget =
  | { readonly kind: "cursor"; readonly time: number }
  | { readonly kind: "selection"; readonly start: number; readonly end: number };

/** Respuesta de una consulta: un valor de un marco, una media o nada medido. */
export type QueryAnswer =
  | { readonly kind: "value"; readonly time: number; readonly value: number }
  | {
      readonly kind: "mean";
      readonly start: number;
      readonly end: number;
      readonly value: number;
      readonly count: number;
    }
  | { readonly kind: "undefined" };

/**
 * Como se trata la pista: una frecuencia (tono, formantes), donde 0 o NaN es
 * «sin valor», o una intensidad en dB, donde 0 dB es un valor.
 */
export type QueryScale = "frequency" | "intensity";

const NOTHING: QueryAnswer = { kind: "undefined" };

const isQueryValue = (value: number, scale: QueryScale): boolean =>
  scale === "intensity" ? Number.isFinite(value) : isMeasured(value);

/**
 * Media de energia: 10·log10 de la media de 10^(dB/10).
 *
 * Es el metodo «energy» de «Intensity: Get mean…» de Praat, el que su manual
 * dice que se acerca al nivel de presion sonora del tramo. La media aritmetica
 * de los dB (la de la tabla de mediciones) pesa igual un marco casi en silencio
 * que uno fuerte, y por eso da menos.
 */
const energyMean = (values: readonly number[]): number =>
  10 * Math.log10(values.reduce((total, db) => total + 10 ** (db / 10), 0) / values.length);

/**
 * Consulta una pista en el cursor o en una seleccion.
 *
 * En el cursor se da el valor del marco mas cercano y se informa el instante de
 * ese marco, no el del cursor: asi se ve de donde sale el numero. Praat
 * interpola entre los dos marcos vecinos; aqui no se interpola, por la misma
 * razon que en `valueAt`: un valor entre marcos es un numero que nadie midio, y
 * los marcos estan a pocos milisegundos. Si el marco mas cercano esta a mas de
 * un paso del cursor, el cursor cae fuera de lo analizado y no hay valor.
 *
 * Con una seleccion se da la media de los marcos medidos dentro de ella: para
 * tono y formantes, la media aritmetica en Hz sin los marcos sordos (como
 * «Get mean» de Praat, que ignora los indefinidos); para la intensidad, la media
 * de energia.
 */
export const queryTrack = (
  track: AcousticTrack | undefined,
  target: QueryTarget,
  scale: QueryScale,
): QueryAnswer => {
  if (track === undefined || track.times.length === 0) {
    return NOTHING;
  }

  if (target.kind === "selection") {
    const values: number[] = [];
    track.times.forEach((time, index) => {
      const value = track.values[index];
      if (
        value !== undefined &&
        time >= target.start - 1e-9 &&
        time <= target.end + 1e-9 &&
        isQueryValue(value, scale)
      ) {
        values.push(value);
      }
    });
    if (values.length === 0) {
      return NOTHING;
    }
    return {
      kind: "mean",
      start: target.start,
      end: target.end,
      value: scale === "intensity" ? energyMean(values) : mean(values),
      count: values.length,
    };
  }

  let nearest = -1;
  let distance = Number.POSITIVE_INFINITY;
  track.times.forEach((time, index) => {
    const gap = Math.abs(time - target.time);
    if (gap < distance) {
      distance = gap;
      nearest = index;
    }
  });

  const first = track.times[0] ?? 0;
  const second = track.times[1];
  const step = second === undefined ? Number.POSITIVE_INFINITY : second - first;
  const time = track.times[nearest];
  const value = track.values[nearest];
  if (time === undefined || value === undefined || distance > step + 1e-9) {
    return NOTHING;
  }
  return isQueryValue(value, scale) ? { kind: "value", time, value } : NOTHING;
};
