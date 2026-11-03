/**
 * Genera public/og-card.png, la imagen que muestran las redes al compartir un
 * enlace del sitio (og:image y twitter:image).
 *
 * Por que un script y no un PNG suelto: la tarjeta usa la marca, las fuentes y
 * la paleta del sitio, y si cambian hay que poder rehacerla igual. Se dibuja con
 * el mismo Chromium de Playwright que usa la puerta e2e, con las fuentes que el
 * sitio ya sirve desde node_modules, sin ninguna peticion de red.
 *
 * Uso: node scripts/build-social-card.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Las fuentes viajan como data: URI: una pagina cargada con setContent vive en
// about:blank y el navegador no le deja leer archivos file://.
const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(`${ROOT}node_modules/@fontsource-variable/${pkg}/files/${file}`).toString("base64")}`;
const OUT = `${ROOT}public/og-card.png`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Newsreader; src: url(${font("newsreader", "newsreader-latin-wght-normal.woff2")}); font-weight: 200 800; }
@font-face { font-family: Inter; src: url(${font("inter", "inter-latin-wght-normal.woff2")}); font-weight: 100 900; }
html, body { margin: 0; width: 1200px; height: 630px; }
body { background: oklch(97.6% 0.011 84); color: oklch(24% 0.019 55); font-family: Inter, sans-serif;
  display: grid; align-content: center; padding: 0 96px; box-sizing: border-box; gap: 28px; }
.lockup { display: flex; align-items: center; gap: 24px; }
svg { width: 112px; height: 112px; color: oklch(45% 0.09 40); }
.name { font-size: 88px; font-weight: 650; letter-spacing: -0.03em; }
.name span { color: oklch(45% 0.09 40); }
.lead { font-family: Newsreader, serif; font-size: 44px; line-height: 1.2; max-width: 980px; margin: 0; }
.foot { font-size: 26px; color: oklch(40% 0.022 58); letter-spacing: 0.02em; }
</style></head><body>
<div class="lockup">
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor">
    <rect x="3" y="3" width="26" height="26" rx="8.5" stroke-width="2" opacity=".4"/>
    <path d="M11.8 11.2h7.4a1.8 1.8 0 0 1 1.8 1.8v7.4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="11.8" cy="11.2" r="2.6" fill="currentColor" stroke="none"/>
    <circle cx="21" cy="20.4" r="2.6" fill="currentColor" stroke="none"/>
  </svg>
  <div class="name">Lingua<span>Lab</span></div>
</div>
<p class="lead">Herramientas de análisis lingüístico que corren en tu navegador: fonética, sintaxis, corpus y anotación.</p>
<div class="foot">Fonética · Sintaxis · Corpus · Sin cuentas ni servidor de análisis</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT, type: "png" });
await browser.close();
console.log(`social card written to ${OUT}`);
