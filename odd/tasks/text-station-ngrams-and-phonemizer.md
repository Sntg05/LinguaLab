# text-station-ngrams-and-phonemizer

Continuar el prompt `LinguaLab_prompt_vibecoding.md` donde quedó quieto: implementar la Herramienta B
(fonemizador es/en, Segmento 5) y dotar a la estación textual de un creador de n-gramas configurable,
manteniendo la estética y las puertas del proyecto. Incluye el cambio de licencia que el fonemizador
arrastra por usar eSpeak NG.

Rama: `feat/lingualab-hexagonal-monorepo`. Baseline verificado al empezar: `verify:all` en verde,
744 pruebas, 21 páginas construidas.

## Specs

- **S1 — Creador de n-gramas.** El panel de Colocaciones deja de tener `n` fijo en el código y pasa a
  ofrecer un constructor: `n` de 2 a 5, frecuencia mínima, límite de resultados, medida de orden
  (log-Dice, PMI, t-score, G², recuento) y modo de stopwords. Reusa `ngrams()` de
  `src/scripts/tools/analysis.ts`, que ya soporta `n`, `minCount`, `limit`, `sortBy` y `stopwords`;
  no se escribe un motor nuevo. El export JSON refleja la configuración elegida, no valores fijos.
  Requisito del usuario, literal: «implementar un creador de n-gramas para la estación textual».

- **S2 — Continuidad estética.** Todo lo nuevo usa los tokens y clases que el proyecto ya tiene:
  `.station`, `.tabs`, `.panel`, `.table`, `.chips`, `.cluster`, `.btn`, `.eyebrow`, `note()`, y el
  mecanismo de i18n `es`/`en` con claves tipadas. Nada de estilos ad hoc ni de un segundo lenguaje
  visual. Requisito del usuario, literal: «manteniendo la estética que ya llevamos manteniendo en el
  proyecto completo». Se cumple también en la herramienta nueva: el fonemizador se ve como FonoLab y
  como la estación, no como un injerto.

- **S3 — Herramienta B: fonemizador es/en (Segmento 5).** Texto → IPA en el navegador.
  `PhonemizerPort` y su unión de errores tipados en `packages/core/src/ports`; adaptador en
  `packages/adapters`; ejecución en un Web Worker con carga perezosa, indicador de progreso y error
  tipado cuando el motor no está disponible. Lenguas expuestas: solo las que el motor realmente
  soporte y que se hayan verificado (`es`, `en-us`). Salida IPA copiable. Comparación lado a lado
  con el motor de tablas del Segmento 4 cuando exista tabla para esa lengua. Aviso visible de que el
  IPA de eSpeak NG es aproximado y no sustituye una transcripción revisada. Indicador de que el
  procesamiento es local. Nunca se simulan resultados: si el motor falla, se muestra el error.

- **S4 — Licencia.** Decisión del usuario, literal: «Usar eSpeak NG y asumir GPL-3.0». El proyecto
  pasa a GPL-3.0-or-later en `LICENSE`, `package.json`, `README.md` y `THIRD_PARTY_NOTICES.md`, con
  una nota que explica por qué: el bundle distribuido al navegador incorpora eSpeak NG. Las versiones
  anteriores publicadas bajo MIT siguen bajo MIT; el cambio no es retroactivo.

- **S5 — Las puertas siguen verdes.** `npm run verify:all` y `npm run test:e2e` deben pasar. La
  verificación de CSP de `scripts/verify-build.mjs` sigue sin aceptar `'unsafe-inline'`. El
  presupuesto de peso por página (60 KB gz) no se rompe: los datos de eSpeak se buscan en tiempo de
  ejecución y no se cuentan como `<script src>`. Si hiciera falta `'wasm-unsafe-eval'` en
  `script-src`, se declara y se justifica por escrito; no se relaja nada más.

- **S6 — Sustitución de paquete, con evidencia.** El prompt nombra `piper-phonemize` como candidato y
  exige `[VERIFICAR]`. La verificación lo descarta: su `index.js` usa `require('path')`, `__dirname` y
  el build *nodejs* de Emscripten, y lee `espeak-ng-data` del disco, así que no corre en un navegador.
  Se usa `@spelling-creator/spellophone` 0.2.1 (GPL-3.0-or-later, export `./browser`, documentado para
  Web Workers, datos autohospedables vía `dataUrl`). La sustitución se anota en este documento y en
  `THIRD_PARTY_NOTICES.md`; no se inventa que el prompt nombraba este paquete.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Constructor de n-gramas: controles y cableado al motor | S1, S2 | inline | `464b36c` |
| T2 | Pruebas del constructor y export JSON coherente | S1, S5 | inline | `464b36c` |
| T3 | `PhonemizerPort`, errores tipados y contrato con fake | S3 | inline | — |
| T4 | Adaptador spellophone + Web Worker + carga perezosa | S3, S6 | inline | — |
| T5 | UI del fonemizador, página, i18n y catálogo | S2, S3 | inline | — |
| T6 | CSP `wasm-unsafe-eval`, hospedaje de datos y build | S3, S5 | inline | — |
| T7 | Relicenciamiento a GPL-3.0-or-later | S4 | inline | — |
| T8 | Docs: STATUS, PENDING, THIRD_PARTY_NOTICES, README | S3, S4 | inline | — |
| T9 | e2e del fonemizador y del constructor, verificación final | S5 | inline | — |

**Corte de entrega 1.** T1–T2 en `464b36c`, 431 líneas de autoría: el constructor de n-gramas
completo, con sus pruebas y el documento. Es un slice cerrado y desplegable por sí solo; el
fonemizador va aparte porque arrastra dependencia, licencia, CSP y datos nuevos.

## Log

- **L1 — Pedido original del usuario (verbatim).** «podemos trabajar sobre el branch nuevamente para
  seguir haciendo avances del prompt que quedaron quietos, quisiera hacer la implementación de la
  herramienta 2 y arreglar la estación textual para implementar un creador de n-gramas para la
  estación textual manteniendo la estética que ya llevamos manteniendo en el proyecto completo».
- **L2 — Decisiones del usuario en el lote de preguntas.** Herramienta 2 = «Herramienta B: fonemizador
  es/en (Segmento 5)». Licencia = «Usar eSpeak NG y asumir GPL-3.0». Estación textual = «Nada roto:
  solo falta el creador de n-gramas».
- **L3 — Hallazgo de verificación (S6).** `piper-phonemize@1.5.9` declara «compiled to WebAssembly»
  pero su punto de entrada es Node-only; se descarta leyendo su código, no su descripción.
  `@spelling-creator/spellophone@0.2.1` es el build pensado para navegador y worker.
