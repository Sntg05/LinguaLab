/**
 * robots.txt, generado en la compilación.
 *
 * Era un archivo escrito a mano en `public/` y siguió anunciando el sitemap en
 * `lingualab.pages.dev` —un dominio ajeno— semanas después de que el ADR 0009
 * corrigiera cada `canonical`, porque ninguna comprobación lo leía. Ahora sale
 * de la misma URL que usa la integración del sitemap (`Astro.site`), y
 * `scripts/verify-build.mjs` falla si nombra otro origen.
 */
import type { APIRoute } from "astro";
import { SITE } from "../config/site";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(SITE.url);
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const sitemap = new URL(`${base}sitemap-index.xml`, origin);
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap.href}`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
