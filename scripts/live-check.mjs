/**
 * Chequeo del sitio PUBLICADO: `npm run live:check [url]`.
 *
 * POR QUE EXISTE
 *
 * Todas las puertas prueban `dist/` en esta máquina. La auditoría del
 * 2026-11-03 encontró en producción defectos que ninguna podía ver: un
 * `robots.txt` que anunciaba el sitemap en un dominio ajeno, un error de
 * consola en cada página, motores servidos sin caché y una página 404 que
 * enlazaba otra que no existía. Solo aparecen en el servidor real, con sus
 * cabeceras y su caché. Este script mira lo que ve una persona, y lo corre el
 * flujo `live-check.yml` después de cada despliegue de producción y una vez por
 * semana.
 *
 * Qué comprueba:
 *   1. las cabeceras de seguridad que solo existen en el servidor (vercel.json)
 *   2. robots.txt y el sitemap nombran el origen canónico del sitio
 *   3. cada página del sitemap responde 200, sin errores de consola y sin
 *      violaciones de axe (WCAG 2.2 AA) en tema claro y oscuro
 *   4. una ruta inexistente responde 404
 *   5. los motores se sirven desde su carpeta versionada como inmutables
 *
 * Solo hace peticiones GET y HEAD. Sale con 1 si algo falla.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_URL = "https://lingualab-beta.vercel.app";
const target = new URL(process.argv[2] ?? process.env.LIVE_URL ?? DEFAULT_URL);
const origin = target.origin;
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const failures = [];
const fail = (message) => failures.push(message);
const log = (message) => console.log(`  ${message}`);

/* ---- 1. Cabeceras ---- */
const home = await fetch(`${origin}/`);
const header = (name) => home.headers.get(name) ?? "";
if (home.status !== 200) fail(`/ responde ${home.status}`);
if (!/frame-ancestors 'none'/.test(header("content-security-policy"))) {
  fail("falta la cabecera CSP con frame-ancestors 'none'");
}
if (header("x-frame-options").toUpperCase() !== "DENY") fail("falta X-Frame-Options: DENY");
if (header("x-content-type-options") !== "nosniff") fail("falta X-Content-Type-Options: nosniff");
if (!/max-age=\d+/.test(header("strict-transport-security"))) fail("falta Strict-Transport-Security");
log(`cabeceras de ${origin}/ revisadas`);

/* ---- 2. Identidad: robots.txt y sitemap ---- */
const homeHtml = await home.text();
const canonical = homeHtml.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
const siteOrigin = canonical ? new URL(canonical).origin : origin;
const robots = await (await fetch(`${origin}/robots.txt`)).text();
const sitemapUrl = robots.match(/^\s*sitemap:\s*(\S+)/im)?.[1];
if (!sitemapUrl) fail("robots.txt no declara Sitemap");
else if (new URL(sitemapUrl).origin !== siteOrigin) {
  fail(`robots.txt anuncia ${sitemapUrl}, que no es ${siteOrigin}`);
}

// Las páginas se leen del sitemap del despliegue que se prueba, pero se piden
// a ESE origen: así el chequeo sirve también contra una URL de despliegue.
const sitemapIndex = await (await fetch(`${origin}/sitemap-index.xml`)).text();
const pages = [];
for (const [, loc] of sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const child = await (await fetch(`${origin}${new URL(loc).pathname}`)).text();
  for (const [, page] of child.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (new URL(page).origin !== siteOrigin) fail(`el sitemap lista ${page}, que no es ${siteOrigin}`);
    pages.push(new URL(page).pathname);
  }
}
if (pages.length === 0) fail("el sitemap no lista ninguna página");
log(`${pages.length} páginas en el sitemap`);

/* ---- 3 y 4. Páginas en un navegador real ---- */
const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme });
  for (const path of [...pages, "/esta-ruta-no-existe"]) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !(path.startsWith("/esta-ruta") && /404/.test(message.text()))) {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${origin}${path}`, { waitUntil: "load" });
    const expected = path.startsWith("/esta-ruta") ? 404 : 200;
    if (response?.status() !== expected) fail(`${path} responde ${response?.status()}, se esperaba ${expected}`);
    if (errors.length > 0) fail(`${path} (${scheme}) registra errores de consola: ${errors.join(" | ")}`);
    const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    for (const violation of axe.violations) {
      fail(`${path} (${scheme}) viola ${violation.id} en ${violation.nodes.length} nodo(s)`);
    }
    await page.close();
  }
  await context.close();
  log(`páginas revisadas en tema ${scheme}`);
}
await browser.close();

/* ---- 5. Motores ---- */
const engines = JSON.parse(readFileSync(`${ROOT}src/config/engines.json`, "utf8"));
const probes = {
  [`/pyodide/${engines.pyodide}/pyodide-lock.json`]: "pyodide",
  [`/espeak-phonemizer/${engines.espeakPhonemizer}/data/manifest.json`]: "eSpeak",
  [`/praatfan/${engines.praatfan}/PROVENANCE.txt`]: "praatfan",
};
for (const [path, name] of Object.entries(probes)) {
  const response = await fetch(`${origin}${path}`, { method: "HEAD" });
  if (response.status !== 200) fail(`${name}: ${path} responde ${response.status}`);
  else if (!/immutable/.test(response.headers.get("cache-control") ?? "")) {
    fail(`${name}: ${path} no se sirve como inmutable (${response.headers.get("cache-control")})`);
  }
}
log("motores revisados");

if (failures.length > 0) {
  console.error(`\nChequeo del sitio publicado: ${failures.length} fallo(s) en ${origin}\n`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  process.exit(1);
}
console.log(`\nChequeo del sitio publicado: todo en orden en ${origin}`);
