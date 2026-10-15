# hexagonal-v3-mix

Incrustar el núcleo hexagonal del prompt `LinguaLab_prompt_vibecoding.md` (segmentos 1–4) dentro del
sitio Astro v2.0.0, sin romper nada de lo desplegado: npm workspaces `packages/*`, dominio y puertos en
TypeScript puro, adaptadores secundarios, y la Herramienta A (ortografía → IPA) funcionando de punta a punta.

Rama: `feat/lingualab-hexagonal-monorepo`. Baseline verificado antes de escribir código: 537 pruebas en verde.

## Specs

- **S1 — Fidelidad a la v2.0.0.** El sitio Astro de la raíz sigue funcionando sin cambios de comportamiento:
  `npm run dev`, `npm run build`, `npm run build:verify`, `npm run check`, `npm test`, `npm run verify`
  y `npm run lint:css` deben pasar igual que en `main`. `astro.config.mjs`, `src/pages/**`, `src/layouts/**`
  y `scripts/verify-build.mjs` no se modifican salvo adición puramente aditiva.
- **S2 — Monorepo con npm workspaces.** Raíz y `packages/*`. TypeScript estricto. Sin pnpm
  (decisión del usuario: "Usar npm workspaces"). Sin React ni Vite como app nueva: el sitio declara
  "Sin framework de UI" como invariante y S1 exige fidelidad.
- **S3 — Dependencias hacia adentro.** `adapters → application → domain`. `packages/core` no importa
  DOM, `window`, `fetch`, ni `packages/adapters`. `packages/adapters` no importa `src/**`.
  La UI (`src/**`) solo importa `@lingualab/core`; los adaptadores se cablean en un único
  composition root.
- **S4 — Puertos y errores tipados.** Interfaces de salida en `packages/core/src/ports`. Unión
  discriminada de errores por puerto. Nunca excepciones en flujos esperados (archivo mal formado,
  lengua no soportada, WASM no disponible): se devuelve `Result<T, E>`.
- **S5 — Contratos y fakes.** `runXxxPortContract(createAdapter)` reutilizable en
  `packages/core/src/testing/`, fakes en memoria en `packages/core/src/testing/fakes`.
- **S6 — Reglas de dependencia en CI.** `npm run deps:check` (dependency-cruiser) falla si se introduce
  un import prohibido. Debe comprobarse introduciendo uno a propósito y revirtiéndolo.
- **S7 — Motor ortografía → IPA (segmento 4).** Normaliza a Unicode NFC. Reglas con
  `grapheme, ipa, before?, after?, priority?, note?`. Clases definidas por la tabla (`V = [a e i o u]`).
  Coincidencia más larga primero (dígrafos antes que letras sueltas); entre iguales gana el contexto
  más específico y luego la mayor prioridad. Símbolo `#` para límite de palabra. Capa fonémica y capa
  alofónica opcional (segunda pasada). Caracteres sin regla se marcan como "sin cobertura", nunca se
  descartan en silencio. Devuelve `trace` por carácter. Sin dependencias externas.
- **S8 — Pruebas de español que deben pasar.**
  `"chico" → tʃiko`; `"queso" → keso`; `"guerra" → ɡera`; `"hijo" → ixo`; `"ñandú" → ɲandu`;
  `"perro"` con vibrante múltiple `r` (U+0072) y `"pero"` con vibrante simple `ɾ` (U+027E);
  `"casa" → kasa`. Propiedades: determinismo, no pérdida de caracteres, idempotencia donde corresponda.
- **S9 — Editor web.** Tabla editable de reglas (alta, baja, reordenado por teclado, deshacer/rehacer).
  Panel de prueba en vivo con modo "explicar". Lista de cobertura. Importar y exportar JSON y CSV.
  Compartir por URL (tabla comprimida en el hash, con límite y aviso). Persistencia con
  `OrthographyRepositoryPort` sobre IndexedDB con fallback a memoria.
- **S10 — Plantillas de lenguas indígenas VACÍAS.** inga, wayuunaiki, nasa yuwe, arhuaco: plantilla vacía,
  `status: draft`, con el aviso exacto: "Esta tabla debe construirse y validarse con hablantes y fuentes
  lingüísticas de la comunidad". No se inventan correspondencias.
- **S11 — Demos solo es/en.** Demostración en español (variedad latinoamericana, con interruptor de
  yeísmo) y en inglés americano básico, rotuladas "demo".
- **S12 — Privacidad.** Todo se procesa en el navegador; sin analítica ni telemetría; aviso visible.
  Sin `SharedArrayBuffer` ni hilos WASM (GitHub Pages no permite COOP/COEP).
- **S13 — Idioma.** Código e identificadores en inglés. Interfaz, documentación y commits en español.
  Comentarios constantes y útiles que expliquen el *por qué*, nunca el *qué* obvio.
- **S14 — Puerta por segmento.** Cada tarea cierra con lint, typecheck, `deps:check`, pruebas y build en
  verde, más el texto de PR en `docs/pr/`.
- **S15 — ADR por decisión relevante** en `docs/adr/`, y `docs/ARCHITECTURE.md` con el diagrama de
  puertos y adaptadores.

## Tasks

- T1 — S2,S6,S14 — workspace npm, tooling base (biome, dependency-cruiser, commitlint, editorconfig, .nvmrc, tsconfig.base) — inline — `chore: agrega workspace npm y tooling base`
- T2 — S14,S15 — CI con lint y deps:check; plantillas de repositorio — worker — `ci: agrega lint y deps:check al pipeline`
- T3 — S3 — `packages/core`: entidades y valores de dominio — worker — `feat(core): agrega entidades y valores de dominio`
- T4 — S4,S5 — `packages/core`: puertos, `Result`, errores tipados, fakes y suites de contrato — worker — `feat(core): define puertos y errores tipados`
- T5 — S7,S8 — `packages/core`: motor de reglas y `ConvertOrthographyToIpa` con `trace` — worker — `feat(core): implementa motor de reglas ortografia-ipa`
- T6 — S7 — `packages/core`: `ValidateOrthographyTable` y capa alofónica — worker — `feat(core): agrega validacion de tablas y capas alofonicas`
- T7 — S3,S4 — `packages/core`: casos de uso restantes (guardar, importar, exportar tabla, `PhonemizeText`, `ListTools`) — worker — `feat(core): implementa casos de uso con fakes`
- T8 — S9 — `packages/adapters`: `IndexedDBOrthographyRepository` con fallback a memoria — worker — `feat(adapters): agrega repositorio de tablas con indexeddb`
- T9 — S10,S11 — plantillas vacías de lenguas indígenas y demos es/en — worker — `feat(core): agrega plantillas vacias y demos es-en`
- T10 — S9,S12,S13 — composition root + página `/ortografia` con editor, modo explicar, cobertura, import/export y compartir por URL — worker — `feat(web): agrega editor de tablas con modo explicar`
- T11 — S15 — ADRs 0001–0004, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `THIRD_PARTY_NOTICES.md`, `docs/pr/` — worker — `docs: documenta la arquitectura hexagonal y el formato de tablas`
- T12 — S1,S6,S14 — verificación final: lint, typecheck, deps:check, pruebas, build, build:verify, y regresión de la v2.0.0 — verifier — `test: verifica el nucleo hexagonal y la herramienta a`

## Log

- **L1** (petición original del usuario, verbatim):
  > scanea el proyecto de lingualabs, conéctalo a Git y crea un branch dónde podamos experimentar con el prompt gigante que acabo de dejar en la carpeta ODD tasks, para que tengas el contexto, dentro del branch implementa aquello que dice el prompt y utiliza buenas prácticas de código, arquitectura hexagonal y comentarios constantes para poder tener un buen code review al final de cada implementación, good luck!

- **L2** (respuestas del usuario a las preguntas de encuadre):
  - Sustrato: "deja la v2.0.0 lo más fiel posible, pero implementa las mejoras que el prompt propone, básicamente mezcla ambas y haz que funcione, el servidor donde está alojada la página lo soportará no te preocupes, quiero hacer pruebas primero".
  - Alcance: "Segmentos 1-4 (hasta Herramienta A)".
  - Tooling: "Usar npm workspaces".

- **L3** (hallazgos de la exploración): el repositorio ya estaba conectado a `origin`
  (`https://github.com/Sntg05/LinguaLab.git`) y sincronizado con `main`; no hizo falta conectarlo.
  150 archivos versionados, Astro 7, `npm` (no pnpm), 537 pruebas en verde como baseline.
  El prompt pide `apps/web` con React+Vite; se descarta por S1/S2 y se registra en el ADR 0001.

- **L4** (decisión de sustrato, registrada en ADR 0001): la raíz sigue siendo el paquete Astro y a la vez
  la raíz del workspace; la UI web es el adaptador primario en `src/**`, no una app React nueva.
