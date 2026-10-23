# Security review, dependency response and document drift

Two halves of one delivery: make the project's own claims true again (the documents drifted after
the merge to `main`), and answer the dependency queue with measured evidence instead of guesswork.

## Specs

**S1 — `docs/STATUS.md` stops naming a branch that no longer exists as the work surface.**
The document opens with «Rama: `feat/lingualab-hexagonal-monorepo`», a branch already merged into
`main` by fast-forward. It must state the real surface (`main`) so a newcomer reading the confidence
document is not sent to a dead branch.

**S2 — `README.md` lists every page that exists.** The "Qué hay dentro" table omits `/ortografia`,
`/catalogo` and `/fonemizador`, and the `/tools` row does not mention the n-gram builder that shipped
with it. The table must match the 11 public pages plus 404.

**S3 — A complete security scan, with its results written down.** Verbatim:
«quiero que hagamos una revisión de seguridad para responder al dependabot de github, hagamos un
escaneo completo al proyecto y revisemos si hay cosas que no funcionan correctamente».

**S4 — Every open Dependabot pull request gets a decision and an answer.** Verbatim: «quiero que
hagamos una revisión de seguridad para responder al dependabot de github». Seven pull requests are
open (#1–#7); one of them (#6) fails CI. A decision means merge, close with reason, or fix here and
close the PR; an answer means a comment on the pull request that states the measurement behind the
decision. Note: Dependabot *alerts* are disabled for this repository (the API answers 403
«Dependabot alerts are disabled for this repository»), so the audit trail is `npm audit` plus the
pull requests themselves.

**S5 — The dependency gate keeps meaning the same thing after each bump.** Whatever is merged must
leave `npm run verify:all` and `npm run test:e2e` green, and the Playwright version skew that broke
#6 must be impossible to reintroduce silently.

## Tasks

| ID | Task | Spec | Route | Commit |
|---|---|---|---|---|
| T1 | Correct `docs/STATUS.md` and `README.md` drift | S1, S2 | inline | `d027462` |
| T2 | Security scan: `npm audit`, dependency inventory, CSP, headers, secrets, supply-chain posture; write the findings down | S3 | inline + `docs/SECURITY-REVIEW.md` | `08dbaeb` |
| T3 | Diagnose #6's CI failure and fix the root cause (version-skew guard) | S4, S5 | inline | `08dbaeb` |
| T4 | Triage and answer the seven pull requests | S4 | inline | comments on #1–#7 |

**Slice boundary.** These four tasks are one review unit (≈316 authored lines) and belong to the first
PR of the branch, before the catalog work.

## Findings so far

- `npm audit` on `main` (`1ee15c6`): **5 vulnerabilities — 2 moderate, 3 high** in development
  dependencies: `vite` (5 advisories, incl. arbitrary command execution through `launch-editor`),
  `source-map-js` (event-loop DoS), `http-cache-semantics` (cross-user cache disclosure). Production
  dependencies (`--omit=dev`) are 0, which is what `docs/STATUS.md` already claimed — both numbers
  can be true at once and the document never said which audit it ran.
- `package.json` still carries `overrides: { "playwright-core": "1.63.0" }`. Dependabot #6 raises
  `@playwright/test` to 1.64.1 and leaves that override alone; the e2e suite then dies with
  `TypeError: createCallIdGenerator is not a function` before a single assertion runs. 69 tests fail
  for one pinned transitive version, not for 69 reasons.

## Log

- **L1 — Pedido original del usuario (verbatim).** «corrije A B y C en orden cómo lo veas, quiero que
  hagamos una revisión de seguridad para responder al dependabot de github, hagamos un escaneo
  completo al proyecto y revisemos si hay cosas que no funcionan correctamente, quiero que hagas de
  forma sintética ejemplos de más lenguas aparte del español y el inglés para las herramientas que
  ofrecen texto de ejemplo, explora bibliografía relacionada para poder construir al menos 2 lenguas
  más, una lengua mayoritaria y una lengua minoritaria de Colombia que esté vital y bien documentada,
  adicionalmente quiero que revises la barra de las herramientas y las reorganices para que al añadir
  más herramientas sean más fáciles de llegar, propongo que hagas del botón catálogo algo como
  "Catálogo de herramientas" y ahí condensarlas todas en orden por nivel de análisis que propone cada
  herramienta, y que en la barra de arriba sea más consistente, accesible y ordenado, haz todo eso y
  me dices si necesitas algo.» Las partes de lenguas y de navegación viven en
  `odd/tasks/toolbox-v3-navigation-and-languages.md`.
- **L2 — Resultado medido.** `npm audit` sobre 5 avisos (3 altos) → 0 después de las actualizaciones.
  El fallo del PR #6 no era de las nueve dependencias: era el `overrides` de `playwright-core`, que
  dejaba dos versiones internas de Playwright conviviendo. Al quitarlo, `npm ls playwright-core`
  muestra una sola copia deduplicada en 1.64.1.
- **L3 — Lo que el bump destapó.** Con Playwright 1.64.1 y axe 4.14.0 la suite llegó por fin al
  aserto: dos nodos de `/arboles` aparecían como `incomplete` **sin motivo textual** —la regla
  `label-content-name-mismatch` sobre los botones de zoom—, y la puerta se negó a descartarlos en
  silencio, que es exactamente para lo que se escribió. El defecto era real (WCAG 2.5.3): un botón
  visible «−» con nombre accesible «Alejar». Se corrigieron a botones de texto y la suite volvió a 69
  verdes. El PR #6 no era una actualización rota: era una puerta funcionando.
- **L4 — Incidente de entorno, no del proyecto.** `npm run test:e2e` fallaba con «Process from
  config.webServer exited early». Causa: `astro preview` se auto-envía al fondo cuando detecta que lo
  lanza un agente (variable `AI_AGENT`), y Playwright exige un proceso en primer plano. No es un
  defecto del repositorio ni afecta a CI: se verifica con `env -u AI_AGENT -u PI_CODING_AGENT npm run
  test:e2e`. Queda anotado en PENDING para el próximo que lo vea.
