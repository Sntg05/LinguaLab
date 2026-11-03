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
- **S17.** No se hace push, ni PR, ni merge, ni se borran ramas o se crean etiquetas sin una decisión
  aparte del dueño. Cambios de configuración del repositorio en GitHub los hace el dueño.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S2 | inline | en curso | — |
| T2 | S3, S7, S8 | inline | pendiente | — |
| T3 | S4, S11 | inline | pendiente | — |
| T4 | S9, S14 | inline | pendiente | — |
| T5 | S6 | inline | pendiente | — |
| T6 | S5 | inline | pendiente | — |
| T7 | S13 | inline | pendiente | — |
| T8 | S10 | inline | pendiente | — |
| T9 | S12, S16 | inline | pendiente | — |
| T10 | S15 | inline | pendiente | — |
| T11 | S1–S17 | verificador independiente | pendiente | — |

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
