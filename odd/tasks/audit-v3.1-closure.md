---
status: active
supersedes: odd/tasks/student-researcher-experience.md
---

# Cierre de la auditoría de v3.1.0

Corregir todo lo que encontró la auditoría del 2026-11-03 sobre `main@965fef7` (publicado en
`https://lingualab-beta.vercel.app`) e incorporar al repositorio las mejoras de metodología propuestas.
Rama: `fix/auditoria-v3-1` desde `main`. Entrega: `feature-branch-chain` (elegida antes por el dueño),
commits por unidad de trabajo, rebanadas de PR de unas 400 líneas. Runner: Node 22, Vitest y Playwright;
cierre con `npm run verify:all` y `npm run test:e2e`.

## Specs

- **S1.** Pedido del dueño, textual: «corrige todas las fallas encontradas y realiza las mejoras a la
  metodología que propusiste, cuando toda la página hasta el momento esté funcionando correctamente,
  empezamos a hacer cambios en el front, UX/UI y cambiamos par de cosas en el back, por el momento quiero
  que sea más pulida la página web a nivel de arquitectura».
- **S2 (H1).** La copia local trabaja sobre `main` al día, y el documento ODD que planeaba herramientas ya
  existentes queda marcado como sustituido, conservando las peticiones textuales que registró.
- **S3 (H2).** Ningún archivo publicado nombra un dominio que no sea el del sitio: el `robots.txt` sale
  de la misma constante que el `canonical`, y `verify-build` falla si aparece otro dominio propio.
- **S4 (H3).** Ningún texto promete navegar o recargar sin conexión mientras no exista un mecanismo que lo
  cumpla. Lo que sí es cierto —una pestaña abierta sigue calculando sin red— puede decirse.
- **S5 (H4).** Cada alerta abierta de CodeQL queda corregida en el código o justificada por escrito, y
  `docs/SECURITY-REVIEW.md` dice el número real.
- **S6 (H5).** El repositorio pasa la puerta con Biome 2.6.3, Astro 7.4.2 y `@astrojs/check` 0.9.12, lo que
  sustituye al PR #12 de Dependabot.
- **S7 (M1).** Ninguna página registra errores de consola al cargar, y una prueba lo vigila.
- **S8 (M2).** Ningún enlace interno del build apunta a un archivo inexistente, y el enlace a la fuente del
  mapa de lenguas abre. Una comprobación del build lo vigila.
- **S9 (M3, M4).** Ninguna página pública se desborda a 320 px (WCAG 1.4.10), con una prueba por página en
  lugar de una sola que recorre todas.
- **S10 (M5).** Las pestañas de la Estación textual siguen el patrón ARIA de pestañas: `tabpanel`,
  `aria-controls`, foco itinerante, flechas, Inicio y Fin.
- **S11 (M6).** El fonemizador declara la variedad que de verdad usa (`es-419`), y FonoLab declara en su
  interfaz que su transcriptor usa distinción.
- **S12 (M7).** Los documentos de estado dejan de contradecirse entre sí y con lo medido.
- **S13 (M8).** Los motores pesados se cachean como inmutables sin riesgo de servir una versión vieja, y
  no se publica ningún archivo duplicado.
- **S14 (B1).** Hay favicon e imagen para compartir; el `canonical` coincide con el sitemap; la 404 no
  enlaza ni declara URL inexistentes.
- **S15 (B2).** `ci.yml` deja de escuchar ramas ya fusionadas; los orquestadores ganan arquitectura y
  pruebas propias (P2).
- **S16 (metodología).** Las ocho propuestas del reporte: cifras con una sola fuente, `npm run doctor`,
  CONTRIBUTING igual a la práctica, chequeo del sitio publicado, traspaso vivo y estado en los documentos
  ODD, cola de evidencia humana, revisión semanal de alertas y documentos con resumen arriba.
- **S18 (encontrado al cerrar).** Una herramienta con página en este sitio corre aquí y no se anuncia
  como «requiere servidor»: el conversor ELAN seguía como `needs-backend` desde antes de implementarse.
- **S17.** No se hace push, ni PR, ni merge, ni se borran ramas o se crean etiquetas sin una decisión
  aparte del dueño. Cambios de configuración del repositorio en GitHub los hace el dueño.

## Tasks

| ID | Specs | Ruta | Estado | Commit y evidencia |
|---|---|---|---|---|
| T1 | S2 | inline | hecha | `f04e461`. `main` local avanzó por fast-forward a `965fef7` |
| T2 | S3, S4, S7, S8 | inline | hecha | `dc4ddd6`, `3cb7ca0`. Rojo: verify-build con 31 `frame-ancestors`, robots, `/en/404` ×2 y la atribución; e2e de consola con 31 fallos por mutación; `claims.test` con 7 promesas sin conexión. Verde después |
| T3 | S11 | inline | hecha | `827e3ee`. Rojo: las dos pruebas de variedad. Verde después |
| T4 | S9, S14 | inline | hecha | `2e3cb9c`. Rojo: reflujo a 320 px en `/experimentos` y `/en/experimentos`; 62 faltas de icono e imagen en verify-build. Verde: 31 de 31 |
| T5 | S6 | inline | hecha | `00b6e12`. Biome 2.6.3 y `@astrojs/check` 0.9.12; Astro queda en 7.4.1 (P23) |
| T6 | S5 | inline | hecha | `9e7ad8f`. 10 alertas corregidas en el código, 5 justificadas en SECURITY-REVIEW §6; e2e de los tres workers en verde |
| T7 | S13 | inline | hecha | `be29d6d`. Rojo: `engines.test` (4) y el duplicado en verify-build. Verde; e2e de motores 27 de 27 |
| T8 | S10 | inline | hecha | `65db7ab`. Rojo: la e2e de teclado. Verde |
| T9 | S12, S16, S18 | inline | hecha | `663f4bb`, `67694f4` y el commit de documentos. `live:check` contra producción: los 66 fallos conocidos. `docs.test` atrapa 4 de 4 mutaciones |
| T10 | S15 | inline | pendiente | — |
| T11 | S1–S18 | verificador independiente | pendiente | — |

## Log

- **L1 (2026-11-03).** Pedido original, textual: «listo, estoy de acuerdo con el reporte, corrige todas las
  fallas encontradas y realiza las mejoras a la metodología que propusiste, cuando toda la página hasta el
  momento esté funcionando correctamente, empezamos a hacer cambios en el front, UX/UI y cambiamos par de
  cosas en el back, por el momento quiero que sea más pulida la página web a nivel de arquitectura, buen
  trabajo, continua.»
- **L2.** Reporte de origen: https://claude.ai/artifact/1uUe6RchgCSVRbsrAUGJLf. Línea base medida sobre
  `965fef7`: `verify:all` verde (1168 pruebas en 78 archivos), e2e 117 de 118 (la que falla es intermitente),
  0 violaciones de axe en 62 pasadas en vivo.
- **L3.** `main` local avanzó por fast-forward de `1ee15c6` a `965fef7`.
- **L4 (T5).** Astro 7.4.2 exige Node `>=22.23.4` y la máquina tiene 22.23.3: `astro check` se niega a
  correr. Se sube Biome y `@astrojs/check`, Astro queda en 7.4.1 y la decisión pasa a P23 y a
  `docs/HUMAN-EVIDENCE.md`. No se toca el entorno global.
- **L5 (T7).** Diseño: los motores van a `public/<motor>/<versión>/` con la versión en
  `src/config/engines.json`, en vez de cachear `max-age` corto con `stale-while-revalidate`, que podía
  mezclar archivos de dos versiones de Pyodide tras una actualización.
- **L6 (T9).** Al cruzar el catálogo con las rutas apareció S18: se corrige en `663f4bb` con su prueba.
- **L7.** El commit del catálogo se había llevado el renombrado del traspaso que estaba en el índice; como
  nada estaba publicado, se rehicieron los dos commits locales para que cada uno tenga solo lo suyo.

