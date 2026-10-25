#!/usr/bin/env node
/**
 * Atribuye los avisos del linter a la línea base o al trabajo nuevo.
 *
 * POR QUE EXISTE
 *
 * `docs/PENDING.md` P4 repartió los avisos entre «heredados» y «propios» **por
 * existencia del archivo** en `main`, no corriendo el linter sobre `main`. Eso
 * es una inferencia, y una inferencia no distingue una deuda aceptada de un
 * trabajo sin terminar: se arreglan distinto. P8 pidió la medición y este script
 * es esa medición, repetible.
 *
 * COMO FUNCIONA
 *
 * Extrae la base con `git archive` a un directorio temporal —no la copia a mano,
 * así el árbol medido es exactamente el commit—, copia la `biome.json` del
 * árbol actual, y corre el linter sobre los dos con el mismo binario y la misma
 * configuración. Después compara los diagnósticos uno por uno: uno que aparece
 * en los dos lados es heredado; uno que solo aparece del lado actual es nuevo.
 *
 * Uso:
 *   node scripts/lint-baseline.mjs                  # base main, actual el árbol de trabajo
 *   node scripts/lint-baseline.mjs --base origin/main
 *   node scripts/lint-baseline.mjs --out /tmp/lint  # donde dejar los dos informes JSON
 *
 * Código de salida 0 siempre que la medición se complete: esto informa, no
 * bloquea. La puerta que bloquea sigue siendo `npm run lint`.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);

const readFlag = (name, fallback) => {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : (argv[index + 1] ?? fallback);
};

const base = readFlag("--base", "main");
const outDir = readFlag("--out", mkdtempSync(join(tmpdir(), "lingualab-lint-")));
const biome = join(process.cwd(), "node_modules", ".bin", "biome");

/** Extrae `ref` a un directorio temporal y deja ahí la configuración actual. */
const extract = (ref) => {
  const dir = mkdtempSync(join(tmpdir(), `lingualab-${ref.replaceAll("/", "-")}-`));
  execFileSync("bash", ["-c", `git archive ${ref} | tar -x -C ${JSON.stringify(dir)}`], {
    stdio: "inherit",
  });
  copyFileSync("biome.json", join(dir, "biome.json"));
  return dir;
};

const lint = (dir, name) => {
  const out = join(outDir, `${name}.json`);
  // El informe va a un archivo y no a la salida estándar: `biome` escribe el
  // JSON por stdout y un aviso suyo por stderr, y mezclarlos rompe el parseo.
  const json = execFileSync(
    biome,
    ["lint", `--config-path=${join(dir, "biome.json")}`, "--reporter=json", dir],
    { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024, encoding: "utf8" },
  );
  writeFileSync(out, json);
  return out;
};

const collect = (reportPath, stripPrefix) => {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const rows = new Map();
  for (const diagnostic of report.diagnostics ?? []) {
    const location = diagnostic.location ?? {};
    const raw = typeof location.path === "string" ? location.path : (location.path?.file ?? "");
    const file = raw.startsWith(stripPrefix) ? raw.slice(stripPrefix.length).replace(/^\//, "") : raw;
    const key = `${diagnostic.severity}\u0000${diagnostic.category}\u0000${file}`;
    rows.set(key, (rows.get(key) ?? 0) + 1);
  }
  return { rows, summary: report.summary ?? {} };
};

const baseDir = extract(base);
const baseReport = lint(baseDir, "base");
const headReport = lint(process.cwd(), "head");

const baseData = collect(baseReport, baseDir);
const headData = collect(headReport, process.cwd());

const keys = new Set([...baseData.rows.keys(), ...headData.rows.keys()]);
const inherited = [];
const added = [];
for (const key of keys) {
  const was = baseData.rows.get(key) ?? 0;
  const now = headData.rows.get(key) ?? 0;
  const [severity, category, file] = key.split("\u0000");
  if (severity !== "warning") {
    continue;
  }
  if (now > 0 && was > 0) {
    inherited.push({ count: Math.min(was, now), file, category });
  }
  if (now > was) {
    added.push({ count: now - was, file, category });
  }
}

const total = (list) => list.reduce((sum, row) => sum + row.count, 0);

console.log(`Base: ${base} (${baseData.summary.warnings ?? 0} avisos)`);
console.log(`Actual: árbol de trabajo (${headData.summary.warnings ?? 0} avisos)`);
console.log(`\nHeredados: ${total(inherited)} avisos`);
for (const row of inherited.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`  ${String(row.count).padStart(2)}  ${row.category}  ${row.file}`);
}
console.log(`\nNuevos: ${total(added)} avisos`);
if (added.length === 0) {
  console.log("  (ninguno)");
}
for (const row of added.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`  ${String(row.count).padStart(2)}  ${row.category}  ${row.file}`);
}
console.log(`\nInformes: ${baseReport} y ${headReport}`);
