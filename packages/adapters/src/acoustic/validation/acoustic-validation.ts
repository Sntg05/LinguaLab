/**
 * Arnes de validacion del adaptador acustico contra valores de referencia de Praat.
 *
 * ESTADO REAL: NO HAY FIXTURES EN EL REPOSITORIO
 *
 * La condicion para quitar la etiqueta «Experimental» es que praatfan coincida
 * con Praat sobre voces reales. Ese contraste no se ha hecho: `e2e/fixtures/
 * reference/` no existe en el repositorio. Por eso este arnes, cuando la carpeta
 * esta vacia o falta, devuelve `missing-fixtures` y lo dice con el texto que la
 * interfaz y la documentacion pueden citar. Nunca devuelve «passed» por
 * ausencia de datos: un verde por vacio es peor que un rojo, porque nadie lo
 * investiga.
 *
 * TOLERANCIAS
 *
 * F0 ±2 %, F1 y F2 ±5 %, relativas al valor de referencia. El borde cuenta como
 * dentro (`<=`): una diferencia exactamente igual a la tolerancia esta dentro de
 * la tolerancia.
 *
 * Las tolerancias se aplican a puntos concretos en el tiempo, no a la media del
 * contorno. Comparar medias escondedria un contorno desplazado, que es
 * justamente el defecto que un error de piso o techo de F0 produce.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { AcousticTrack, Result } from "@lingualab/core";
import { err, ok } from "@lingualab/core";
import type { PraatfanEngine } from "../praatfan-engine";
import { decodeWavPcm16 } from "./wav";

/** Un instante con los tres valores que Praat mide en ese instante. */
export interface ReferencePoint {
  readonly time: number;
  readonly f0: number;
  readonly f1: number;
  readonly f2: number;
}

/** Forma del JSON de referencia que se documenta en `docs/validation/acoustic.md`. */
export interface ReferenceFixture {
  readonly praatVersion?: string;
  readonly audio: string;
  readonly pitch: { readonly floorHz: number; readonly ceilingHz: number };
  readonly formant: { readonly maxFormantHz: number; readonly count: number };
  readonly points: readonly ReferencePoint[];
}

export interface LoadedFixture {
  readonly file: string;
  readonly fixture: ReferenceFixture;
  readonly sampleRate: number;
  readonly samples: Float64Array;
}

export type FixtureError =
  | { readonly code: "missing-fixtures"; readonly detail: string }
  | { readonly code: "invalid-fixture"; readonly detail: string };

export interface Tolerances {
  readonly f0Percent: number;
  readonly formantPercent: number;
}

export const DEFAULT_TOLERANCES: Tolerances = { f0Percent: 2, formantPercent: 5 };

export type ComparisonKind = "f0" | "f1" | "f2";

export interface ComparisonRow {
  readonly file: string;
  readonly time: number;
  readonly kind: ComparisonKind;
  readonly reference: number;
  readonly measured: number;
  readonly tolerancePercent: number;
  readonly passed: boolean;
}

export type ValidationReport =
  | { readonly status: "missing-fixtures"; readonly message: string }
  | { readonly status: "invalid-fixture"; readonly message: string }
  | {
      readonly status: "passed" | "failed";
      readonly message: string;
      readonly rows: readonly ComparisonRow[];
    };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPoint = (value: unknown): value is ReferencePoint => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    isNumber(candidate.time) &&
    isNumber(candidate.f0) &&
    isNumber(candidate.f1) &&
    isNumber(candidate.f2)
  );
};

/** Valida el JSON antes de usarlo: una referencia mal escrita no es una referencia. */
const isFixture = (value: unknown): value is ReferenceFixture => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const pitch = candidate.pitch as Record<string, unknown> | undefined;
  const formant = candidate.formant as Record<string, unknown> | undefined;

  return (
    typeof candidate.audio === "string" &&
    pitch !== undefined &&
    isNumber(pitch.floorHz) &&
    isNumber(pitch.ceilingHz) &&
    formant !== undefined &&
    isNumber(formant.maxFormantHz) &&
    isNumber(formant.count) &&
    Array.isArray(candidate.points) &&
    candidate.points.length > 0 &&
    candidate.points.every(isPoint)
  );
};

const missing = (directory: string): FixtureError => ({
  code: "missing-fixtures",
  detail:
    `no hay fixtures de referencia en ${directory}: deja los audios y su JSON ` +
    "(ver docs/validation/acoustic.md). Sin ellos no se puede contrastar con Praat.",
});

export const loadReferenceFixtures = async (
  directory: string,
): Promise<Result<readonly LoadedFixture[], FixtureError>> => {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return err(missing(directory));
  }

  const references = entries.filter((entry) => entry.endsWith(".json")).sort();
  if (references.length === 0) {
    return err(missing(directory));
  }

  const loaded: LoadedFixture[] = [];
  for (const reference of references) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(join(directory, reference), "utf8"));
    } catch (error) {
      return err({
        code: "invalid-fixture",
        detail: `${reference} no es JSON legible: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    if (!isFixture(parsed)) {
      return err({
        code: "invalid-fixture",
        detail: `${reference} no tiene la forma documentada (audio, pitch, formant y points)`,
      });
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(join(directory, parsed.audio)));
    } catch {
      return err({
        code: "invalid-fixture",
        detail: `${reference} apunta a ${parsed.audio}, que no esta en la carpeta`,
      });
    }

    const decoded = decodeWavPcm16(bytes);
    if (!decoded.ok) {
      return err({ code: "invalid-fixture", detail: `${parsed.audio}: ${decoded.error.detail}` });
    }

    loaded.push({
      file: reference,
      fixture: parsed,
      sampleRate: decoded.value.sampleRate,
      samples: decoded.value.samples,
    });
  }

  return ok(loaded);
};

/**
 * Valor de una pista en un instante: la muestra mas cercana.
 *
 * Se toma la mas cercana y no una interpolacion porque un formante interpolado
 * entre dos marcos es un valor que Praat no midio. Las muestras sin voz valen 0
 * por convencion del dominio, y una referencia de voz que se mida como 0 en ese
 * instante es un fallo legitimo: la senal no tenia F0 donde Praat si la encontro.
 */
export const valueAtTime = (track: AcousticTrack, time: number): number => {
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

/** Dentro de tolerancia, con el borde incluido y el cero tratado aparte. */
export const withinTolerance = (reference: number, measured: number, percent: number): boolean => {
  if (reference === 0) {
    return Math.abs(measured) < 1e-9;
  }
  return (Math.abs(measured - reference) / Math.abs(reference)) * 100 <= percent + 1e-9;
};

const compare = (
  file: string,
  point: ReferencePoint,
  measured: { f0: number; f1: number; f2: number },
  tolerances: Tolerances,
): ComparisonRow[] => {
  const kinds: readonly { kind: ComparisonKind; reference: number; percent: number }[] = [
    { kind: "f0", reference: point.f0, percent: tolerances.f0Percent },
    { kind: "f1", reference: point.f1, percent: tolerances.formantPercent },
    { kind: "f2", reference: point.f2, percent: tolerances.formantPercent },
  ];

  return kinds.map(({ kind, reference, percent }) => {
    const value = measured[kind];
    return {
      file,
      time: point.time,
      kind,
      reference,
      measured: value,
      tolerancePercent: percent,
      passed: withinTolerance(reference, value, percent),
    };
  });
};

export interface ValidateOptions {
  readonly directory: string;
  readonly engine: PraatfanEngine;
  readonly tolerances?: Tolerances;
}

/** Filas comparadas de un fixture, o el motivo por el que no se pudo comparar. */
type FixtureComparison =
  | { readonly ok: true; readonly rows: readonly ComparisonRow[] }
  | { readonly ok: false; readonly message: string };

const compareFixture = async (
  entry: LoadedFixture,
  engine: PraatfanEngine,
  tolerances: Tolerances,
): Promise<FixtureComparison> => {
  const { fixture, samples, sampleRate, file } = entry;

  const pitch = await engine.pitch(samples, sampleRate, {
    floorHz: fixture.pitch.floorHz,
    ceilingHz: fixture.pitch.ceilingHz,
  });
  if (!pitch.ok) {
    return { ok: false, message: `${file}: el analisis de F0 fallo (${pitch.error.code})` };
  }

  const formants = await engine.formants(samples, sampleRate, {
    maxFormantHz: fixture.formant.maxFormantHz,
    count: fixture.formant.count,
  });
  if (!formants.ok) {
    return {
      ok: false,
      message: `${file}: el analisis de formantes fallo (${formants.error.code})`,
    };
  }

  const f1 = formants.value[0];
  const f2 = formants.value[1];
  if (f1 === undefined || f2 === undefined) {
    return { ok: false, message: `${file}: el analisis devolvio menos de dos formantes` };
  }

  const rows = fixture.points.flatMap((point) =>
    compare(
      file,
      point,
      {
        f0: valueAtTime(pitch.value, point.time),
        f1: valueAtTime(f1, point.time),
        f2: valueAtTime(f2, point.time),
      },
      tolerances,
    ),
  );

  return { ok: true, rows };
};

/**
 * Compara el motor contra cada fixture y devuelve lo medido, pase o no.
 *
 * El informe lleva las cifras —no solo el veredicto— para que
 * `docs/validation/acoustic.md` pueda registrar que se midio y cuanto se
 * desvio, que es lo que hace falta para decidir si una diferencia es tolerable.
 */
export const validateAgainstReference = async (
  options: ValidateOptions,
): Promise<ValidationReport> => {
  const tolerances = options.tolerances ?? DEFAULT_TOLERANCES;
  const loaded = await loadReferenceFixtures(options.directory);

  if (!loaded.ok) {
    return loaded.error.code === "missing-fixtures"
      ? { status: "missing-fixtures", message: loaded.error.detail }
      : { status: "invalid-fixture", message: loaded.error.detail };
  }

  const rows: ComparisonRow[] = [];
  for (const entry of loaded.value) {
    const comparison = await compareFixture(entry, options.engine, tolerances);
    if (!comparison.ok) {
      return { status: "failed", message: comparison.message, rows };
    }
    rows.push(...comparison.rows);
  }

  const failed = rows.filter((row) => !row.passed);
  return {
    status: failed.length === 0 ? "passed" : "failed",
    message:
      failed.length === 0
        ? `${rows.length} comparaciones dentro de tolerancia`
        : `${failed.length} de ${rows.length} comparaciones fuera de tolerancia`,
    rows,
  };
};
