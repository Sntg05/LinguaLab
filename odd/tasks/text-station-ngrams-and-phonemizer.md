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
  pasa a **GPL-3.0-only** en `LICENSE`, `package.json`, `README.md` y `THIRD_PARTY_NOTICES.md`, con
  una nota que explica por qué: el bundle distribuido al navegador incorpora eSpeak NG. Se dice
  `only` y no `-or-later` porque el paquete del motor es `GPL-3.0-only` y no concede la opción de una
  versión posterior. Las versiones anteriores publicadas bajo MIT siguen bajo MIT; el cambio no es
  retroactivo.

- **S5 — Las puertas siguen verdes.** `npm run verify:all` y `npm run test:e2e` deben pasar. La
  verificación de CSP de `scripts/verify-build.mjs` sigue sin aceptar `'unsafe-inline'`. El
  presupuesto de peso por página (60 KB gz) no se rompe: los datos de eSpeak se buscan en tiempo de
  ejecución y no se cuentan como `<script src>`. Si hiciera falta `'wasm-unsafe-eval'` en
  `script-src`, se declara y se justifica por escrito; no se relaja nada más.

- **S6 — Sustitución de paquete, con evidencia.** El prompt nombra `piper-phonemize` como candidato y
  exige `[VERIFICAR]`. La verificación lo descarta: su `index.js` usa `require('path')`, `__dirname` y
  el build *nodejs* de Emscripten, y lee `espeak-ng-data` del disco, así que no corre en un navegador.
  Se probó `@spelling-creator/spellophone` 0.2.1 y se retiró: el paquete entero tenía 11 días de
  publicado —por debajo del mínimo de catorce que fija el ADR 0003— y declaraba `engines: node >=24`
  contra el Node 22 del proyecto. Se usa **`espeak-phonemizer` 0.2.0**: GPL-3.0-only, 20,9 días,
  `node >=18`, construido para grafema → fonema. Sirve un único bundle de 5,6 MB para sus 51 voces.
  Cada sustitución se anota en este documento y en `THIRD_PARTY_NOTICES.md`; no se inventa que el
  prompt nombraba estos paquetes.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Constructor de n-gramas: controles y cableado al motor | S1, S2 | inline | `464b36c` |
| T2 | Pruebas del constructor y export JSON coherente | S1, S5 | inline | `464b36c` |
| T3 | `PhonemizerPort`, errores tipados y contrato con fake | S3 | inline | — |
| T4 | Adaptador spellophone + Web Worker + carga perezosa | S3, S6 | inline | `79201e3` |
| T5 | UI del fonemizador, página, i18n y catálogo | S2, S3 | inline | — |
| T6 | CSP `wasm-unsafe-eval`, hospedaje de datos y build | S3, S5 | inline | — |
| T7 | Relicenciamiento a GPL-3.0-or-later | S4 | inline | `124f886` |
| T8 | Docs: STATUS, PENDING, THIRD_PARTY_NOTICES, README | S3, S4 | inline | — |
| T9 | e2e del fonemizador y del constructor, verificación final | S5 | inline | — |

**Corte de entrega 1.** T1–T2 en `464b36c`, 431 líneas de autoría: el constructor de n-gramas
completo, con sus pruebas y este documento. Es un slice cerrado y desplegable por sí solo; el
fonemizador va aparte porque arrastra dependencia, licencia, CSP y datos nuevos.

**Corte de entrega 2.** T4 en `79201e3`: el adaptador del fonemizador, el worker, el mapeo de lenguas
con sus pruebas y la dependencia fijada. Verificado con `typecheck:packages` y 13 pruebas; el camino
que fonemiza de verdad necesita navegador y queda para T9.

**Corte de entrega 3.** T7 en `124f886`: el cambio de licencia. Va solo, y no junto al adaptador,
porque toca `LICENSE`, `package.json`, `README.md` y `THIRD_PARTY_NOTICES.md` —un cambio con
consecuencias legales se revisa aparte de un cambio de código— y porque el texto de la GPL infla
cualquier medida de tamaño que lo mezcle con lógica.

**Corte de entrega 4.** T5 y T6: la herramienta visible, la CSP y los datos publicados. Delegado a un
writer con superficie acotada; este documento no se edita desde esa tarea.

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
- **L4 — La regla de los catorce días chocó con la primera elección.** `@spelling-creator/spellophone`
  tenía 11,1 días de publicado: sus tres versiones salieron el mismo día. El ADR 0003 exige catorce
  como mínimo para una dependencia nueva, y el usuario pidió explicación antes de decidir. Se le
  mostró de dónde salía la regla —está en su propio prompt, segmento 1, línea 104, y en el
  segmento 7— y qué la justifica: una versión recién publicada no la probó nadie más que su autor, y
  las versiones retiradas o los secuestros de cuenta se descubren en los primeros días. Decisión del
  usuario: «Cambiar a espeak-phonemizer 0.2.0».
- **L5 — Instrucción del usuario sobre la regla (verbatim).** «saltate la regla del prompt de los 14
  días, es absurdo parar el desarrollo solo por esa limitación propia, continúa con el paquete de
  forma normal y los problemas que pase por ese salto los asumo, no hay problema». No hizo falta
  saltarla: el paquete finalmente elegido, `espeak-phonemizer@0.2.0`, tiene 20,9 días y cumple la
  regla. El usuario queda enterado de que puede relajarla cuando quiera, pero esta vez no se relajó.
