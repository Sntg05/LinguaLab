/**
 * Genera public/og-card.png, la imagen que muestran las redes al compartir un
 * enlace del sitio (og:image y twitter:image).
 *
 * Por que un script y no un PNG suelto: la tarjeta usa la marca, las fuentes y
 * la paleta del sitio, y si cambian hay que poder rehacerla igual. Se dibuja con
 * el mismo Chromium de Playwright que usa la puerta e2e, con las fuentes que el
 * sitio ya sirve desde node_modules, sin ninguna peticion de red.
 *
 * La idea de la tarjeta es la misma del inicio: una oracion, tres analisis. «la
 * lluvia cae» aparece como ortografia, como transcripcion fonologica, como
 * transcripcion fonetica y como arbol. Las cifras de herramientas se leen de
 * src/data/tools.json, igual que en la pagina, para que la imagen no pueda
 * quedarse atras cuando llegue la siguiente herramienta.
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
  `data:font/woff2;base64,${readFileSync(`${ROOT}node_modules/${pkg}/files/${file}`).toString("base64")}`;
const OUT = `${ROOT}public/og-card.png`;

const { tools } = JSON.parse(readFileSync(`${ROOT}src/data/tools.json`, "utf8"));
const integrated = tools.filter((tool) => tool.integration === "embedded").length;
const external = tools.filter((tool) => tool.integration === "external-link").length;

// La paleta del sitio (src/styles/tokens.css): papel frio, tinta indigo y azafran.
const INDIGO = "oklch(31% 0.14 277)";
const INK = "oklch(22% 0.06 275)";
const ACCENT = "oklch(41% 0.19 277)";
const SAFFRON = "oklch(83% 0.15 80)";
const PAPER = "oklch(99.6% 0.003 275)";
const SUNKEN = "oklch(94.4% 0.011 275)";
const MUTED = "oklch(49% 0.035 275)";

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face { font-family: Bricolage; src: url(${font("@fontsource-variable/bricolage-grotesque", "bricolage-grotesque-latin-opsz-normal.woff2")}); font-weight: 200 800; }
@font-face { font-family: Atkinson; src: url(${font("@fontsource-variable/atkinson-hyperlegible-next", "atkinson-hyperlegible-next-latin-wght-normal.woff2")}); font-weight: 200 800; }
@font-face { font-family: NotoIPA; src: url(${font("@fontsource/noto-sans", "noto-sans-latin-400-normal.woff2")}); unicode-range: U+0000-00FF; }
@font-face { font-family: NotoIPA; src: url(${font("@fontsource/noto-sans", "noto-sans-latin-ext-400-normal.woff2")}); unicode-range: U+0100-02FF, U+0300-036F, U+1D00-1DBF; }
@font-face { font-family: NotoIPA; src: url(${font("@fontsource/noto-sans", "noto-sans-greek-400-normal.woff2")}); unicode-range: U+0370-03FF; }

html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; background: ${INDIGO}; color: white; font-family: Atkinson, sans-serif; }

/* The saffron disc of the phoneme card, partly off the edge. */
.disc { position: absolute; width: 560px; height: 560px; right: -120px; top: -150px;
  border-radius: 50%; background: ${SAFFRON}; }

.copy { position: absolute; left: 72px; top: 64px; width: 560px; }
.lockup { display: flex; align-items: center; gap: 18px; }
.lockup svg { width: 64px; height: 64px; }
.name { font-family: Bricolage; font-size: 46px; font-weight: 720; letter-spacing: -0.04em; }
.name span { color: ${SAFFRON}; }
h1 { margin: 54px 0 0; font-family: Bricolage; font-size: 60px; font-weight: 720; line-height: 1.02;
  letter-spacing: -0.045em; }
.foot { position: absolute; left: 72px; bottom: 60px; width: 520px; font-size: 24px; line-height: 1.35;
  color: oklch(87% 0.035 277); }
.foot b { color: ${SAFFRON}; font-weight: 800; }

/* The lab card, tilted a little, on top of the disc. */
.card { position: absolute; right: 64px; top: 84px; width: 452px; padding: 30px 32px 24px;
  box-sizing: border-box; background: ${PAPER}; color: ${INK}; border-radius: 28px;
  transform: rotate(-2.5deg); box-shadow: 0 40px 80px -30px oklch(10% 0.08 277 / 0.85); }
.row { display: grid; grid-template-columns: 112px 1fr; align-items: baseline; gap: 12px; }
.row + .row { margin-top: 10px; }
.label { font-size: 17px; font-weight: 700; color: ${MUTED}; }
.ortho { font-size: 30px; font-weight: 650; }
.ipa { font-family: NotoIPA; font-size: 33px; color: ${ACCENT}; }
mark { color: ${INK}; background: ${SAFFRON}; border-radius: 5px; padding: 0 2px; }
.tree { margin-top: 20px; padding: 14px 10px 6px; background: ${SUNKEN}; border-radius: 18px; }
.tree svg { display: block; width: 100%; height: auto; }
.tree path { fill: none; stroke: oklch(76% 0.025 275); stroke-width: 1.6; stroke-linecap: round; }
.tree .lex { stroke-dasharray: 2 4; }
.node { font-family: Atkinson; font-size: 15px; font-weight: 800; fill: ${ACCENT}; }
.leaf { font-family: Atkinson; font-size: 16px; font-style: italic; fill: ${INK}; }
</style></head><body>
<div class="disc"></div>

<div class="copy">
  <div class="lockup">
    <svg viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill="oklch(52% 0.2 277)"/>
      <path d="M10 7.5H7v17h3M22 7.5h3v17h-3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 11.5 11.8 20.5M16 11.5l4.2 9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="16" cy="11" r="2.6" fill="${SAFFRON}"/>
      <circle cx="11.8" cy="21" r="2.1" fill="#fff"/>
      <circle cx="20.2" cy="21" r="2.1" fill="#fff"/>
    </svg>
    <div class="name">Lingua<span>Lab</span></div>
  </div>
  <h1>Transcribe, anota y mide la lengua sin salir del navegador.</h1>
</div>

<p class="foot"><b>${integrated}</b> herramientas integradas, del sonido a la documentación, y <b>${external}</b> programas externos en un directorio aparte.</p>

<div class="card">
  <div class="row"><span class="label">Ortografía</span><span class="ortho">la lluvia cae</span></div>
  <div class="row"><span class="label">Fonológica</span><span class="ipa">/la ʝubia kae/</span></div>
  <div class="row"><span class="label">Fonética</span><span class="ipa">[la ʝu<mark>β</mark>ia kae]</span></div>
  <div class="tree">
    <svg viewBox="0 0 300 172">
      <path d="M150 26 L88 52 M150 26 L222 52"/>
      <path d="M88 72 L54 98 M88 72 L122 98 M222 72 L222 98"/>
      <path class="lex" d="M54 118 L54 138 M122 118 L122 138 M222 118 L222 138"/>
      <g text-anchor="middle">
        <text class="node" x="150" y="20">S</text>
        <text class="node" x="88" y="66">SN</text>
        <text class="node" x="222" y="66">SV</text>
        <text class="node" x="54" y="112">Det</text>
        <text class="node" x="122" y="112">N</text>
        <text class="node" x="222" y="112">V</text>
        <text class="leaf" x="54" y="158">la</text>
        <text class="leaf" x="122" y="158">lluvia</text>
        <text class="leaf" x="222" y="158">cae</text>
      </g>
    </svg>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT, type: "png" });
await browser.close();
console.log(`social card written to ${OUT}`);
