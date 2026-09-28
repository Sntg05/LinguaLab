// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const SITE = process.env.SITE_URL ?? "https://lingualab.pages.dev";

export default defineConfig({
  site: SITE,
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
  integrations: [sitemap()],
  security: {
    // GitHub Pages cannot set response headers, so the policy ships as a meta
    // tag. Astro hashes each inline script and style it emits, which lets us
    // drop 'unsafe-inline' from both directives.
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
        "frame-ancestors 'self'",
      ],
      scriptDirective: { resources: ["'self'"] },
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
