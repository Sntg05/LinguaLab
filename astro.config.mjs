// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

/**
 * El sitio se publica en Vercel, desde `main`, en la raiz del dominio. El
 * repositorio sigue aceptando `SITE_URL` y `SITE_BASE` para que un fork o un
 * espejo pueda servirse desde un subdirectorio —el caso de GitHub Pages se
 * retiro por decision de la dueña—, pero ninguno de los dos se define en
 * Vercel y el valor por defecto es la direccion real del sitio.
 *
 * `SITE_URL` es SOLO el origen; `SITE_BASE` es el subdirectorio, y es "/" para
 * la raiz de un dominio, una pagina de usuario o el desarrollo local.
 *
 * Neither is set on Vercel, so the production URL is read from the variables
 * Vercel injects. Without this the canonical and hreflang links would point at
 * a placeholder domain.
 */
const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "";

const SITE =
  process.env.SITE_URL ??
  (vercelHost ? `https://${vercelHost}` : "https://lingualab-beta.vercel.app");

const BASE = process.env.SITE_BASE ?? "/";

export default defineConfig({
  site: SITE,
  base: BASE,
  output: "static",
  trailingSlash: "ignore",
  build: {
    // Inline the small critical stylesheet, keep everything else as a cacheable file.
    inlineStylesheets: "auto",
    assets: "assets",
  },
  compressHTML: true,
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      // Spanish lives at the root; English under /en. Keeps existing
      // clean URLs and avoids redirect hops.
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      // Las paginas se enlazan y se declaran canonicas SIN barra final
      // (`/acerca`, ver `localePath`). El sitemap las listaba con barra
      // (`/acerca/`), y con `trailingSlash: "ignore"` las dos responden 200: el
      // buscador recibia dos direcciones para la misma pagina. verify-build
      // exige ahora que el sitemap y los canonicos coincidan.
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
        return { ...item, url: url.href };
      },
    }),
  ],
  security: {
    // The policy ships as a meta tag because Astro hashes each inline script
    // and style it emits at build time, which lets us drop 'unsafe-inline'
    // from both directives. Headers that only work as headers
    // (frame-ancestors, HSTS, X-Frame-Options) live in vercel.json.
    csp: {
      algorithm: "SHA-256",
      // script-src and style-src are owned by Astro so it can append the
      // per-asset hashes; they must not be listed here.
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        // Every asset is same-origin; nothing is ever fetched at runtime.
        "connect-src 'self'",
        "media-src 'self' blob: data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        // frame-ancestors NO va aqui: en una metaetiqueta el navegador la ignora
        // y registra un error de consola en cada pagina. La aplica la cabecera
        // que envia vercel.json (`frame-ancestors 'none'`), y verify-build falla
        // si vuelve a aparecer en la metaetiqueta.
      ],
      // `wasm-unsafe-eval` permite COMPILAR WebAssembly, y solo eso: sin ella el
      // navegador se niega a instanciar Pyodide (conversor ELAN) y praatfan (visor
      // acustico), y esas herramientas solo pueden degradar. Es una concesión
      // mucho más estrecha que `'unsafe-eval'`, que además habilitaría `eval()` y
      // el constructor `Function`, y por eso no se usa la segunda.
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  devToolbar: { enabled: false },
  vite: {
    build: {
      target: "es2022",
      cssMinify: "lightningcss",
      assetsInlineLimit: 2048,
    },
  },
});
