---
status: superseded
superseded-by: odd/tasks/audit-v3.1-closure.md
---

> **Sustituido el 2026-11-03.** Este plan se escribió sobre una copia local 59 commits detrás de `main`.
> Cuando se escribió, T11 (ELAN), T12 (acústica), T14 (mapa) y T15 (experimentos) ya estaban
> implementados en `main` por otra sesión, y P1, P3, P18 y P19 ya estaban cerrados. Se conserva por las
> peticiones textuales del dueño en L1 y L2; lo que sigue vigente pasó a `odd/tasks/audit-v3.1-closure.md`
> y al pipeline del reporte de auditoría.

Objective: implement the authorized student/researcher workflow, quality, accessibility, performance and capability improvements without abandoning the local-first static architecture.
Branch: feat/toolbox-v3-security-languages. Delivery: feature-branch-chain (user selected), work-unit commits; planned slices: coherence T1-T2, accessibility T3-T4, reproducibility T5-T6, performance T7-T8, reliability T9-T10, then one slice per new capability.
Runner: Node 22; focused Vitest/Playwright checks per task, then npm run verify:all and env -u AI_AGENT -u PI_CODING_AGENT npm run test:e2e.

## Specs

S1. The user authorized the complete audit roadmap: "listo, te doy libertad para que implementes ese flujo de trabajo que me propones, desarrolla todas las mejoras directamente si necesitas algo dímelo y te lo facilito".
S2. Preserve the accepted product direction: "Todo el análisis ocurre en JavaScript dentro de tu pestaña" and "Sin cuentas, sin servidor de análisis, sin telemetría." New capabilities must not silently upload user text or audio.
S3. Correct every audited truth/discovery defect: Latin American Spanish rather than Castilian; no unsupported corpus CSV claim; no Spanish validation prose on English pages; home, catalog, footer and 404 expose current tools from shared data.
S4. Complete keyboard/screen-reader workflows: ARIA tabs and tabpanel, arrow/Home/End navigation, correctly named phoneme section, deep glossary links, narrowly scoped axe exceptions, and checks for shared chrome, mobile, zoom and cross-browser behavior.
S5. Implement clear task-oriented journeys: "entrar → comprender → hacer → verificar → exportar y citar"; preserve technical precision while adding plain-language explanations, examples, limitations and methodology.
S6. Add interoperable, reproducible outputs: corpus CSV and an export containing results, settings, application version, timestamp, provenance and methodological notes. Tests must verify the public download and its complete metadata.
S7. Reduce first phonemization cost, verify real hosting compression/cache behavior, remove confirmed duplicate assets, include deferred resources in performance budgets, and distinguish an already-loaded page working offline from a genuine offline/PWA guarantee.
S8. Close documented reliability debt: TextTier point bounds, audio-size limit tests, individual project deletion, IndexedDB quota fallback, Praat/TextGrid and spectrogram interoperability evidence. Do not mark experimental behavior stable without the required external evidence.
S9. Add the accepted future capabilities only with working UI, validation and tests: ELAN↔TextGrid, acoustic F0/formants/intensity, sourced lemmatization, a sourced Colombian Indigenous language map, and psycholinguistic experiments. Empty ports or fakes are not features.
S10. Validate the resulting experience with students/researchers where human participation is required. Automated checks cannot certify comprehension, screen-reader usability or linguistic correctness.
S11. Keep every behavior with its tests and docs in reviewable work-unit commits; do not push, open PRs or merge without a separate user decision. Update this file, its Engram mirror and the visible todo after every transition.

## Tasks

T1 | S3 | inline | in_progress | Correct language/copy truth and move orthography validation prose to localized presentation; RED/GREEN contract and locale tests; commit pending.
T2 | S3 | delegated | pending | Unify home/catalog/footer/404 discovery and add glossary deep links; RED/GREEN navigation tests; commit pending.
T3 | S4 | delegated | pending | Complete ARIA tabs, phoneme structure and narrowly scoped accessibility exceptions; RED/GREEN keyboard/axe tests; commit pending.
T4 | S4,S10 | delegated | pending | Add shared-chrome, responsive, zoom and cross-browser checks; document unavailable manual AT/user evidence; commit pending.
T5 | S6 | delegated | pending | Add corpus CSV and reproducible export metadata with public-download tests and docs; commit pending.
T6 | S5 | delegated | pending | Build task-oriented entry points, guided workflows, contextual explanations and citation/methodology help; tests and docs; commit pending.
T7 | S7 | delegated | pending | Reduce and pin the two-voice eSpeak artifact, verify deferred-weight budgets and remove proven duplicate assets; build/e2e evidence; commit pending.
T8 | S7 | delegated | pending | Add deployment compression/cache policy and an explicit versioned offline strategy without overstating support; tests/docs; commit pending.
T9 | S8 | delegated | pending | Close TextTier, audio-limit, project-deletion and quota-fallback reliability debt with RED/GREEN tests; commit pending.
T10 | S8,S10 | inline | pending | Validate Praat interoperability and spectrogram parity using a real local Praat/audio fixture; record version/date or external blocker; commit pending if verified.
T11 | S9 | delegated | pending | Implement accessible ELAN↔TextGrid conversion with loss reports, fixtures, size limits and local processing; commit pending.
T12 | S9 | delegated | pending | Implement experimental acoustic F0/F1-F3/intensity analysis with reference signals, uncertainty copy and accessible results; commit pending.
T13 | S9 | delegated | pending | Implement explicitly sourced lemmatization with provenance, language limits and correctness tests; commit pending.
T14 | S9 | delegated | pending | Implement the Colombian Indigenous language map from cited public data without inventing classifications; accessibility/mobile tests; commit pending.
T15 | S9 | delegated | pending | Implement psycholinguistic experiment building/running with accessible stimuli, timing limits, export and participant privacy; commit pending.
T16 | S1-S11 | inline | pending | Reconcile all units, run full verification, close documentation and report remaining human-only evidence; final commit pending.

## Log

L1. Original audit request (verbatim): "quiero que escanees el repositorio web y trabajemos desde ahí, quiero que me digas que tiene la página, que no tiene que puede hacer y que no puede hacer, adicional a ello quiero que hagas un análisis de QA completo, de accesibilidad siguiendo las recomendaciones mundiales de UX/UI para mejorar el aspecto gráfico, de usabilidad, lenguaje claro y conciso para que todas las personas puedan acceder a los contenidos, en caso de que falten cosas, haz una planificación completa de cómo implementar lo que falte y por último quiero que me des una opinión sincera de qué más cosas le hacen falta y qué se puede mejorar para hacer que el usuario estudiante o investigador en lingüística tenga una experiencia de primera con la aplicación, también quiero que me des un reporte de cuál es el peso que tiene la página dentro del servidor en el que se alojaría, o sea si se pueden hacer movimientos de optimización para que vaya más rápido y sea más confiable"
L2. Implementation authorization (verbatim): "listo, te doy libertad para que implementes ese flujo de trabajo que me propones, desarrolla todas las mejoras directamente si necesitas algo dímelo y te lo facilito"
L3. Baseline reproduced before implementation: verify:all passed, 925 unit tests in 53 files, 87 E2E passed, 25 pages built, dist 8,136,451 bytes. Working tree clean at 4505ddf.
L4. User selected `feature-branch-chain` from the oversized-delivery menu. Branches/PRs are not created yet; push and PR creation remain separate decisions. Local work-unit commits proceed on the existing feature branch.
