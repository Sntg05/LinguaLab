/**
 * `npm run doctor`: lo primero que se corre al sentarse a trabajar.
 *
 * POR QUE EXISTE
 *
 * El 2026-11-03 una sesión entera planeó cuatro herramientas que ya existían,
 * porque la copia local estaba 59 commits detrás de `origin/main`: la entrega
 * se había fusionado desde otra máquina. Ninguna puerta lo podía ver, porque
 * todas miran el árbol que hay, no el que debería haber. Este chequeo mira el
 * entorno antes de tocar nada y dice qué falta, con el comando que lo arregla.
 *
 * Solo lee. La única petición de red es `git fetch` (se omite con --offline).
 * Sale con 1 si algo impide trabajar, y con 0 si solo hay avisos.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OFFLINE = process.argv.includes("--offline");

const problems = [];
const warnings = [];
const ok = [];

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/* ---- Node ---- */
{
  const required = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).engines?.node ?? "";
  const minimum = required.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  const current = process.versions.node.split(".").map(Number);
  if (minimum) {
    const wanted = minimum.slice(1).map(Number);
    const tooOld =
      current[0] < wanted[0] ||
      (current[0] === wanted[0] && (current[1] < wanted[1] || (current[1] === wanted[1] && current[2] < wanted[2])));
    if (tooOld) problems.push(`Node ${process.versions.node} no cumple engines.node "${required}". Corre: nvm use`);
    else ok.push(`Node ${process.versions.node} cumple "${required}"`);
  }
}

/* ---- Git: rama y distancia con origin ---- */
try {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (!OFFLINE) {
    try {
      git("fetch", "--quiet", "origin");
    } catch {
      warnings.push("git fetch falló: las distancias con origin pueden estar viejas (¿sin red?)");
    }
  }
  const distance = (ref) => {
    try {
      const [behind, ahead] = git("rev-list", "--left-right", "--count", `${ref}...HEAD`).split(/\s+/).map(Number);
      return { behind, ahead };
    } catch {
      return null;
    }
  };
  const toMain = distance("origin/main");
  if (toMain && toMain.behind > 0) {
    warnings.push(
      `${branch} está ${toMain.behind} commit(s) detrás de origin/main. Antes de planear nada: git fetch && git rebase origin/main (o merge)`,
    );
  } else if (toMain) {
    ok.push(`${branch} contiene todo origin/main`);
  }
  const upstream = distance(`origin/${branch}`);
  if (upstream && upstream.behind > 0) {
    problems.push(`origin/${branch} tiene ${upstream.behind} commit(s) que no tenés: git pull --ff-only`);
  }
  const dirty = git("status", "--porcelain");
  if (dirty !== "") warnings.push(`hay cambios sin commitear:\n${dirty.split("\n").map((l) => `      ${l}`).join("\n")}`);
} catch {
  problems.push("no es un repositorio git, o git no está instalado");
}

/* ---- Documentos ODD: estado declarado ---- */
{
  const dir = join(ROOT, "odd", "tasks");
  const active = [];
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    if (!file.endsWith(".md")) continue;
    const head = readFileSync(join(dir, file), "utf8").slice(0, 300);
    const status = head.match(/^---\n[\s\S]*?^status:\s*(\S+)[\s\S]*?^---$/m)?.[1];
    if (status === undefined) warnings.push(`odd/tasks/${file} no declara su estado (status:) en el encabezado`);
    if (status === "active") active.push(file);
  }
  if (active.length > 0) ok.push(`documentos ODD activos: ${active.join(", ")}`);
}

/* ---- Navegador de la puerta e2e ---- */
try {
  const { chromium } = await import("@playwright/test");
  if (existsSync(chromium.executablePath())) ok.push("Chromium de Playwright instalado");
  else problems.push("falta el Chromium de Playwright, y sin él la puerta e2e no arranca: npx playwright install chromium");
} catch {
  problems.push("no están instaladas las dependencias: npm install");
}

/* ---- Puertos ---- */
const portFree = (port) =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
if (!(await portFree(4331))) {
  problems.push("el puerto 4331 está ocupado y la puerta e2e lo necesita libre: npx astro preview stop, o cerrá lo que lo use");
} else {
  ok.push("puerto 4331 libre para la puerta e2e");
}

/* ---- Informe ---- */
for (const line of ok) console.log(`  ✓ ${line}`);
for (const line of warnings) console.log(`  ! ${line}`);
for (const line of problems) console.log(`  ✗ ${line}`);
console.log(
  problems.length > 0
    ? `\n${problems.length} problema(s) impiden trabajar.`
    : `\nListo para trabajar${warnings.length > 0 ? `, con ${warnings.length} aviso(s)` : ""}.`,
);
process.exit(problems.length > 0 ? 1 : 0);
