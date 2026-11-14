/**
 * Mide el estado del repositorio y lo escribe en `docs/metrics.json`.
 *
 * POR QUE EXISTE
 *
 * Las mismas cifras —pruebas, páginas, avisos de lint, peso— estaban copiadas a
 * mano en README, STATUS, PENDING, el traspaso y los documentos de PR, y la
 * auditoría del 2026-11-03 las encontró contradiciéndose entre sí: 117 e2e en un
 * lado, 88 en otro y 118 medidas. Una cifra copiada se queda vieja dos veces.
 * Ahora hay una sola fuente: este script la escribe y los documentos la citan.
 * `src/lib/docs.test.ts` falla si un documento vuelve a copiar una de estas
 * cifras.
 *
 * Uso: npm run status:measure    (compila; tarda uno o dos minutos)
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "docs", "metrics.json");

/** Corre un comando del repositorio y devuelve su salida, sin pasar por un shell. */
const run = (command, args) =>
  execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });

/**
 * Igual que `run`, pero devuelve stdout y stderr juntos y no aborta con un código
 * distinto de cero. Biome, por ejemplo, escribe su resumen en stderr.
 */
const runTolerant = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
};

const match = (text, pattern, label) => {
  const found = text.match(pattern);
  if (!found) throw new Error(`measure-status: no se encontró ${label} en la salida`);
  return Number(found[1].replace(/\D/g, ""));
};

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const commit = run("git", ["rev-parse", "--short", "HEAD"]).trim();
const dirty = run("git", ["status", "--porcelain"]).trim() !== "";

process.stdout.write("measure-status: pruebas unitarias…\n");
const vitestJson = join(ROOT, "node_modules", ".cache", "measure-status-vitest.json");
runTolerant("npx", ["vitest", "run", "--reporter=json", `--outputFile=${vitestJson}`]);
const vitest = JSON.parse(readFileSync(vitestJson, "utf8"));

process.stdout.write("measure-status: e2e…\n");
const e2eList = run("npx", ["playwright", "test", "--list"]);

process.stdout.write("measure-status: reglas del hexágono…\n");
const deps = run("node", ["scripts/deps-check.mjs"]);

process.stdout.write("measure-status: lint…\n");
const lint = runTolerant("npx", ["biome", "lint", "."]);

process.stdout.write("measure-status: build verificado…\n");
run("npx", ["astro", "build"]);
const build = run("node", ["scripts/verify-build.mjs"]);

const DIST = join(ROOT, "dist");
const filesUnder = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
const distFiles = filesUnder(DIST);

const engineMb = (name) =>
  Number(build.match(new RegExp(`engine ${name}: ([\\d.]+) MB`))?.[1] ?? Number.NaN);

const metrics = {
  $comment:
    "Generado por `npm run status:measure`. No se edita a mano: los documentos citan este archivo en vez de copiar las cifras.",
  version: pkg.version,
  commit: dirty ? `${commit} (con cambios sin commitear)` : commit,
  measuredAt: new Date().toISOString().slice(0, 10),
  unitTests: { tests: vitest.numTotalTests, passed: vitest.numPassedTests, files: vitest.testResults.length },
  e2e: {
    tests: match(e2eList, /Total: (\d+) tests? in/, "el total de e2e"),
    files: match(e2eList, /tests? in (\d+) files?/, "los archivos de e2e"),
  },
  hexagon: {
    modules: match(deps, /(\d+) módulos/, "los módulos"),
    dependencies: match(deps, /(\d+) dependencias/, "las dependencias"),
  },
  lint: {
    errors: Number(lint.match(/Found (\d+) errors?/)?.[1] ?? 0),
    warnings: Number(lint.match(/Found (\d+) warnings?/)?.[1] ?? 0),
  },
  build: {
    pages: distFiles.filter((file) => file.endsWith(".html")).length,
    files: distFiles.length,
    bytes: distFiles.reduce((sum, file) => sum + statSync(file).size, 0),
    worstPageKbGz: Number(build.match(/worst page[^:]*: ([\d.]+) KB gz/)?.[1] ?? Number.NaN),
    worstPage: build.match(/KB gz — (\S+)/)?.[1] ?? null,
    enginesMb: {
      pyodide: engineMb("pyodide"),
      cmudict: engineMb("cmudict"),
      praatfan: engineMb("praatfan"),
    },
  },
};

writeFileSync(OUT, `${JSON.stringify(metrics, null, 2)}\n`);
process.stdout.write(`measure-status: escrito ${relative(ROOT, OUT)}\n`);
