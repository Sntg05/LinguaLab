# 0009 — Publicación solo en Vercel, con cabeceras reales

**Estado:** aceptada (2026-10-25).
**Reemplaza parcialmente:** la parte de despliegue de ADR 0002.

## Contexto

El repositorio publicaba en **dos** destinos al empujar a `main`: Vercel, desde la raíz del dominio, y
GitHub Pages, desde el subdirectorio `/LinguaLab` (`SITE_BASE=/LinguaLab`).

Tres hechos medidos el 2026-10-25, ninguno de ellos una preferencia:

1. **El dominio que el repositorio anunciaba como canónico no era este sitio.**
   `https://lingualab.pages.dev` respondía `200` con el título «The Lingua Lab — English Classes for
   Migrants in Brisbane». Era el valor por defecto de `SITE.url`, del `astro.config.mjs` y de dos
   literales duplicados en `Base.astro`, así que **cada página publicaba un `canonical` y unos `hreflang`
   que apuntaban a la web de otra persona**, y el README invitaba a visitarla.
2. **Un destino sin cabeceras obliga a una política más débil.** GitHub Pages no permite cabeceras de
   respuesta, así que la CSP viajaba en una metaetiqueta y `frame-ancestors` —que los navegadores ignoran
   cuando llega así— no protegía nada. Vercel **sí** permite cabeceras.
3. **Dos destinos son dos artefactos.** El mismo commit se publicaba con dos bases distintas, y el
   segundo no lo miraba nadie: la página que se revisaba en Vercel no era la que se probaba en Pages.

La dueña del repositorio decidió que `main` publique **solo** en Vercel.

## Decisión

1. Se elimina `.github/workflows/deploy.yml`. El push a `main` despliega en Vercel y en ningún otro lado.
2. La URL canónica pasa a ser `https://lingualab-beta.vercel.app`, en **una sola** constante (`SITE.url`)
   de la que dependen `Base.astro` y `astro.config.mjs`. El literal duplicado fue la causa del punto 1:
   dos copias del mismo dato que se desincronizan no son una decisión, son un defecto esperando.
3. `vercel.json` emite las cabeceras que antes no se podían emitir: `frame-ancestors 'none'`,
   `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `Permissions-Policy` (sin cámara ni micrófono: la herramienta no los usa) y HSTS. Los assets con
   hash de contenido se cachean un año e immutable, porque su nombre cambia cuando cambia su contenido.
4. `SITE_URL` y `SITE_BASE` se conservan: el código no asume la raíz del dominio, para que un fork o un
   espejo pueda vivir en un subdirectorio sin tocar una línea.

## Consecuencias

- **`frame-ancestors` pasa a aplicarse de verdad**, que es lo que O3 de `docs/SECURITY-REVIEW.md` pedía y
  no se podía cumplir en Pages. La metaetiqueta sigue viajando —es la política completa, con sus
  hashes— y la cabecera cubre lo que la metaetiqueta no puede.
- El sitio de GitHub Pages **sigue en pie y congelado** en su última publicación. Desactivarlo es un
  ajuste del repositorio que no se puede hacer desde el código; queda anotado en `docs/STATUS.md`.
- Un solo artefacto que revisar: lo que se prueba en CI es lo que se despliega.
- Se pierde la publicación gratuita desde el repositorio. Vercel es el host, y la cuenta ya existe.

## Lo que NO cambia

El sitio sigue siendo estático, sin servidor, con la CSP por hashes y sin `unsafe-inline`. La privacidad
local no depende del host: no hay peticiones salientes ni en Vercel ni en Pages.
