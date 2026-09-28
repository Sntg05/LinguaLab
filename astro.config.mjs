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
  devToolbar: { enabled: false },
  vite: {
    build: {
      target: "es2022",
      cssMinify: "lightningcss",
      assetsInlineLimit: 2048,
    },
  },
});
