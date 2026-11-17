/**
 * Ida y vuelta de TextGrid por el Praat oficial (cierra P17 de docs/PENDING.md).
 *
 * POR QUÉ EXISTE
 *
 * Las pruebas del núcleo demuestran que el lector y el escritor de TextGrid de
 * LinguaLab se entienden entre sí. Eso no dice si Praat abre lo que el visor
 * exporta. Este script usa Praat como árbitro:
 *
 * 1. Escribe cada caso con `serializeTextGrid`, la misma función con la que el
 *    visor exporta (`src/scripts/audio/textgrid-io.ts`), en UTF-8 sin BOM, que
 *    es lo que descarga el navegador.
 * 2. Lo abre con `praat --run scripts/praat/textgrid-roundtrip.praat`, que
 *    imprime capas, intervalos, puntos y etiquetas tal como Praat los leyó, y
 *    lo vuelve a guardar en formato largo y corto.
 * 3. Compara lo que Praat leyó con el documento original, y lee con el lector
 *    de LinguaLab los dos archivos que escribió Praat.
 *
 * Los tiempos que imprime Praat llevan 15 decimales (`fixed$`), así que esa
 * comparación admite 1e-9 s, muy por debajo de una muestra a 44,1 kHz
 * (2,3e-5 s). Los archivos que Praat guarda llevan la precisión completa: ahí
 * los tiempos tienen que ser idénticos.
 *
 * Lo temporal va a `node_modules/.cache/textgrid-praat/` (nunca a /tmp: ver
 * odd/handoff/ACTUAL.md, §3).
 *
 * Uso: node scripts/run-ts.mjs scripts/textgrid-praat-roundtrip.mts
 * (o `npm run validate:textgrid-praat`). Necesita `praat` en el PATH; sin él
 * sale con código 2 y lo dice.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnnotationDocument, Tier } from "../packages/core/src/domain/annotation.ts";
import { parseTextGridBytes, serializeTextGrid } from "../packages/core/src/data/textgrid.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRATCH = join(ROOT, "node_modules", ".cache", "textgrid-praat");
const PRAAT_SCRIPT = join(ROOT, "scripts", "praat", "textgrid-roundtrip.praat");
const PATO = join(ROOT, "public", "audio", "ejemplos", "pato.TextGrid");
/** Margen para los tiempos que Praat imprime con 15 decimales. */
const PRINTED_TIME_TOLERANCE = 1e-9;

export interface RoundTripCase {
  readonly name: string;
  readonly ok: boolean;
  /** Diferencias encontradas; vacío cuando la ida y vuelta es exacta. */
  readonly problems: readonly string[];
  readonly tiers: number;
  readonly items: number;
}

export interface RoundTripReport {
  readonly praatVersion: string;
  readonly cases: readonly RoundTripCase[];
}

/** Versión de Praat en el PATH, o `null` si no está. */
export const findPraat = (): string | null => {
  try {
    const out = execFileSync("praat", ["--version"], { encoding: "utf8", stdio: "pipe" });
    return out.match(/Praat (\S+)/)?.[1] ?? out.trim();
  } catch {
    return null;
  }
};

const interval = (name: string, xmax: number, cuts: readonly [number, string][]): Tier => {
  // `cuts` da el fin y la etiqueta de cada intervalo: la cobertura queda
  // continua de 0 a xmax, que es lo que el visor garantiza y Praat exige.
  let start = 0;
  const items = cuts.map(([end, text]) => {
    const item = { start, end, text };
    start = end;
    return item;
  });
  if (start !== xmax) throw new Error(`caso mal escrito: la capa ${name} termina en ${start}`);
  return { name, kind: "interval", items };
};

const doc = (xmax: number, tiers: readonly Tier[]): AnnotationDocument => ({ xmin: 0, xmax, tiers });

/** Los casos, cada uno con lo que podría romperse al cruzar a Praat. */
const buildCases = (): readonly { name: string; document: AnnotationDocument }[] => {
  const pato = parseTextGridBytes(new Uint8Array(readFileSync(PATO)));
  if (!pato.ok) throw new Error(`pato.TextGrid no se pudo leer: ${pato.error.code}`);
  return [
    {
      name: "varias capas, etiquetas vacías y una capa de puntos",
      document: doc(1.5, [
        interval("segmentos", 1.5, [
          [0.2, ""],
          [0.35, "p"],
          [0.6, "a"],
          [0.7, ""],
          [1.5, ""],
        ]),
        interval("sílabas", 1.5, [
          [0.2, ""],
          [0.6, "pa"],
          [1.5, ""],
        ]),
        interval("palabra", 1.5, [[1.5, ""]]),
        {
          name: "tonos",
          kind: "point",
          points: [
            { time: 0.4, text: "H*" },
            { time: 0.65, text: "" },
          ],
        },
      ]),
    },
    {
      name: "etiquetas AFI y no ASCII",
      document: doc(1, [
        interval("afi", 1, [
          [0.1, "ʃ"],
          [0.2, "ɲ"],
          [0.35, "ˈpa.to"],
          [0.5, "t͡ʃ"],
          [0.6, "ʎ̝"],
          [0.75, "ã"],
          [0.9, "ŋ ʔ ɾ"],
          [1, "ñandú"],
        ]),
        interval("glosa ñ", 1, [[1, "canción «dicha»"]]),
      ]),
    },
    {
      name: "comillas dentro de las etiquetas",
      document: doc(1, [
        interval("citas", 1, [
          [0.25, 'dijo "hola"'],
          [0.5, '"'],
          [0.75, '""'],
          [1, 'termina en "'],
        ]),
        interval('capa "con" comillas', 1, [[1, "x"]]),
      ]),
    },
    {
      name: "tiempos sin representación decimal exacta",
      document: doc(1, [
        interval("precisión", 1, [
          [0.1 + 0.2, "a"],
          [1 / 3, "b"],
          [2 / 3, "c"],
          [1, "d"],
        ]),
      ]),
    },
    { name: "pato.TextGrid, importado y exportado como en el visor", document: pato.value.document },
  ];
};

const itemCount = (document: AnnotationDocument): number =>
  document.tiers.reduce(
    (sum, tier) => sum + (tier.kind === "interval" ? tier.items.length : tier.points.length),
    0,
  );

/** Convierte la salida del script de Praat en un documento, con tiempos impresos. */
const readPraatListing = (listing: string): AnnotationDocument => {
  let xmin = Number.NaN;
  let xmax = Number.NaN;
  const tiers: Tier[] = [];
  for (const line of listing.split("\n")) {
    if (line === "") continue;
    const fields = line.split("\t");
    const [tag] = fields;
    if (tag === "range") {
      xmin = Number(fields[1]);
      xmax = Number(fields[2]);
    } else if (tag === "tier") {
      const name = fields[3] ?? "";
      tiers.push(
        fields[2] === "interval" ? { name, kind: "interval", items: [] } : { name, kind: "point", points: [] },
      );
    } else if (tag === "interval" || tag === "point") {
      const tier = tiers.at(-1);
      if (tier?.kind === "interval" && tag === "interval") {
        (tier.items as { start: number; end: number; text: string }[]).push({
          start: Number(fields[1]),
          end: Number(fields[2]),
          text: fields.slice(3).join("\t"),
        });
      } else if (tier?.kind === "point" && tag === "point") {
        (tier.points as { time: number; text: string }[]).push({
          time: Number(fields[1]),
          text: fields.slice(2).join("\t"),
        });
      } else {
        throw new Error(`salida de Praat inesperada: «${line}»`);
      }
    }
  }
  return { xmin, xmax, tiers };
};

/** Lista de diferencias entre dos documentos; vacía si son iguales. */
export const compareDocuments = (
  label: string,
  expected: AnnotationDocument,
  actual: AnnotationDocument,
  tolerance: number,
): string[] => {
  const problems: string[] = [];
  const time = (what: string, a: number, b: number): void => {
    if (!(Math.abs(a - b) <= tolerance)) problems.push(`${label}: ${what} ${a} ≠ ${b}`);
  };
  time("xmin", expected.xmin, actual.xmin);
  time("xmax", expected.xmax, actual.xmax);
  if (expected.tiers.length !== actual.tiers.length) {
    problems.push(`${label}: ${expected.tiers.length} capas esperadas, ${actual.tiers.length} leídas`);
    return problems;
  }
  expected.tiers.forEach((tier, t) => {
    const other = actual.tiers[t] as Tier;
    const where = `${label}, capa ${t + 1}`;
    if (tier.name !== other.name) problems.push(`${where}: nombre «${tier.name}» ≠ «${other.name}»`);
    if (tier.kind !== other.kind) {
      problems.push(`${where}: clase ${tier.kind} ≠ ${other.kind}`);
      return;
    }
    if (tier.kind === "interval" && other.kind === "interval") {
      if (tier.items.length !== other.items.length) {
        problems.push(`${where}: ${tier.items.length} intervalos ≠ ${other.items.length}`);
        return;
      }
      tier.items.forEach((item, i) => {
        const got = other.items[i] as (typeof other.items)[number];
        time(`capa ${t + 1}, intervalo ${i + 1}, inicio`, item.start, got.start);
        time(`capa ${t + 1}, intervalo ${i + 1}, fin`, item.end, got.end);
        if (item.text !== got.text) {
          problems.push(`${where}, intervalo ${i + 1}: etiqueta «${item.text}» ≠ «${got.text}»`);
        }
      });
    } else if (tier.kind === "point" && other.kind === "point") {
      if (tier.points.length !== other.points.length) {
        problems.push(`${where}: ${tier.points.length} puntos ≠ ${other.points.length}`);
        return;
      }
      tier.points.forEach((point, i) => {
        const got = other.points[i] as (typeof other.points)[number];
        time(`capa ${t + 1}, punto ${i + 1}`, point.time, got.time);
        if (point.text !== got.text) {
          problems.push(`${where}, punto ${i + 1}: etiqueta «${point.text}» ≠ «${got.text}»`);
        }
      });
    }
  });
  return problems;
};

const fileName = (index: number): string => `caso-${index + 1}`;

/** Corre todos los casos por Praat. Lanza si `praat` no está en el PATH. */
export const runTextGridPraatRoundTrip = (): RoundTripReport => {
  const praatVersion = findPraat();
  if (praatVersion === null) throw new Error("praat no está en el PATH");
  mkdirSync(SCRATCH, { recursive: true });

  const cases = buildCases().map(({ name, document }, index): RoundTripCase => {
    const base = join(SCRATCH, fileName(index));
    const exported = `${base}.TextGrid`;
    const long = `${base}.praat-largo.TextGrid`;
    const short = `${base}.praat-corto.TextGrid`;
    writeFileSync(exported, new TextEncoder().encode(serializeTextGrid(document)));

    const problems: string[] = [];
    let listing: string;
    try {
      listing = execFileSync("praat", ["--run", PRAAT_SCRIPT, exported, long, short], {
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr ?? String(error);
      return { name, ok: false, problems: [`Praat no lo abrió: ${stderr.trim()}`], tiers: 0, items: 0 };
    }

    problems.push(
      ...compareDocuments("leído por Praat", document, readPraatListing(listing), PRINTED_TIME_TOLERANCE),
    );
    for (const [label, path] of [
      ["guardado por Praat (largo)", long],
      ["guardado por Praat (corto)", short],
    ] as const) {
      const back = parseTextGridBytes(new Uint8Array(readFileSync(path)));
      if (!back.ok) {
        problems.push(`${label}: el lector de LinguaLab no lo abre (${back.error.code})`);
        continue;
      }
      if (back.value.gaps.length > 0) problems.push(`${label}: ${back.value.gaps.length} huecos`);
      problems.push(...compareDocuments(label, document, back.value.document, 0));
    }

    return { name, ok: problems.length === 0, problems, tiers: document.tiers.length, items: itemCount(document) };
  });

  return { praatVersion, cases };
};

// Vitest importa este módulo para correr la prueba; solo como script imprime y sale.
if (process.env.VITEST === undefined) {
  if (findPraat() === null) {
    process.stderr.write("textgrid-praat-roundtrip: praat no está en el PATH; no se puede comparar\n");
    process.exit(2);
  }
  const report = runTextGridPraatRoundTrip();
  process.stdout.write(`textgrid-praat-roundtrip: Praat ${report.praatVersion}\n`);
  for (const result of report.cases) {
    process.stdout.write(
      `${result.ok ? "ok  " : "FALLA"} ${result.name} (${result.tiers} capas, ${result.items} intervalos o puntos)\n`,
    );
    for (const problem of result.problems) process.stdout.write(`      ${problem}\n`);
  }
  const failed = report.cases.filter((result) => !result.ok).length;
  process.stdout.write(
    `textgrid-praat-roundtrip: ${report.cases.length - failed} de ${report.cases.length} casos iguales\n`,
  );
  if (failed > 0) process.exit(1);
}
