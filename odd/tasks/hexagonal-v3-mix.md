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

- **L5** (revisión nativa detenida por presupuesto de contexto): con el interruptor de RDD activado,
  `inspect` ofreció `review.start` sobre `main..HEAD`. El humano concedió el consentimiento explícito
  (`consentBinding` `d6bc121a-19ff-40ec-8e28-15a41e6506bc`, respuesta `granted`) y el proveedor lo
  rechazó en la fase de preflight con el código terminal `lens_context_budget_exceeded`:

  > The candidate's complete reviewer evidence exceeds the native context budget, so no review
  > authority was created; review this change as smaller candidates that each fit under it.

  `mutation_performed: false`, `mutation_outcome: "none"`, `lineage_created: false` en el intento de
  `start`: no hay autoridad que abandonar ni linaje que reconciliar, y reintentar este mismo candidato
  no puede funcionar. El diagnóstico del proveedor: 66 archivos y 4.810 líneas en un solo candidato.

  **Consecuencia para el plan:** la revisión no se hace nunca sobre la rama acumulada, sino sobre
  candidatos más pequeños, uno por unidad de trabajo. Es exactamente el modelo que el prompt ya pedía
  («un PR por segmento») y lo que recomienda la habilidad de PRs encadenados. La tarea T13 recoge la
  decisión de cómo rebanar el rango ya commiteado; la continuación del proveedor exige reducir el
  alcance y después refrescar el estado nativo antes de ejecutar la transición devuelta.

- **L6** (entorno cerrado): Node 22.23.3 instalado con nvm, y `npm ci && npm run verify:all` en verde
  sobre ese runtime — el camino exacto de CI. El binario real de dependency-cruiser ya corre y da 89
  módulos y 125 dependencias, idéntico al desvío por API que se escribió para Node 25. Playwright
  1.63.0 quedó con sus navegadores correctos (`chromium-1243`, `chromium_headless_shell-1243`,
  `ffmpeg-1011`) y la cadena se probó lanzando chromium contra un HTML local: la captura de 5.185
  bytes se generó y se revisó a ojo. `@axe-core/playwright` carga y exporta una función.

  Nota operativa que hay que recordar en cada sesión: el shell no interactivo de Pi no lee
  `~/.bashrc`, así que nvm no se carga solo y `node` cae al 25.9.0 de Linuxbrew. Todo comando de
  npm o npx de este repositorio debe activar nvm 22 antes.

- **L7** (segmento 4 cerrado): el motor queda implementado y verificado en seis commits en lugar de uno.
  La razón es ejecutable, no estética: el proveedor ya rechazó un candidato de 66 archivos y 4.810
  líneas por presupuesto de contexto, así que un solo commit de ~3.900 líneas habría reproducido el
  problema. El orden de los commits lo fijó el acoplamiento real — **todas** las pruebas de `engine`
  y `application` importan los fakes, así que `data` va primero, después los fakes, después los
  contratos, después el motor, después el validador y por último los casos de uso.

  Verificación del padre, con evidencia propia y no delegada:
  - Las ocho cadenas de español se leyeron en el código de las pruebas, con los puntos de código
    explícitos: `rr` → `r` (U+0072) frente a `r` → `ɾ` (U+027E), y la esh como `\u0283`.
  - El aviso obligatorio de las plantillas se resolvió programáticamente desde los escapes Unicode y
    coincide **carácter por carácter** con el texto exigido en S10.
  - Las cuatro plantillas indígenas se generan con un único `template()` con `rules: []` y
    `status: "draft"`, así que no hay forma de que una quede con datos.

  Un hallazgo que nació de la revisión del padre y no del worker: `layerOutputs.allophonic` se
  rellenaba con la salida **fonémica** cuando la tabla no declaraba capa alofónica, así que la
  interfaz habría mostrado «capa alofónica: aboɡado» en un idioma sin reglas alofónicas. La suite del
  worker cubría la cobertura de esa rama pero no ese campo. Se corrigió con su prueba, y es
  exactamente el tipo de defecto que el principio de honestidad técnica del proyecto existe para
  atrapar: una etiqueta que afirma más de lo que el dato respalda.

- **L8** (defecto de accesibilidad real en la v2.0.0, encontrado por la puerta nueva): al levantar la
  infraestructura e2e, axe marcó `aria-allowed-attr` con impacto **crítico** en **ambas** páginas de
  inicio, sobre los nodos `a[href="/"]` y `a[aria-current="true"]`.

  Diagnóstico, no conjetura: `src/components/Masthead.astro` ponía
  `aria-pressed={l === locale ? "true" : "false"}` en los **enlaces** del selector de idioma.
  `aria-pressed` solo es válido en elementos con rol de botón; en un `link` es ARIA inválido, y el
  lector de pantalla anunciaba un enlace como si fuera un botón de alternancia pulsado. Los otros 14
  usos de `aria-pressed` del proyecto son sobre `<button type="button">` reales y sí son válidos: el
  defecto estaba acotado a un solo archivo.

  Corrección: se quita el atributo del enlace y el estado activo pasa a marcarse con `aria-current`,
  que **ya estaba** y sí es lo que ARIA permite en un enlace. En `src/styles/components.css` el estilo
  del estado activo pasa a cubrir los dos selectores, porque el resto de las herramientas sigue
  usando `aria-pressed` en botones y no hay razón para cambiarlas.

  Nota de alcance, declarada: esto toca código heredado, y la spec S1 pedía cambios «puramente
  aditivos» en el sitio. La excepción está justificada y es la razón de ser de la puerta: una
  violación crítica en un proyecto que declara WCAG 2.2 AA como requisito, comprobada por una prueba
  reproducible, se arregla. Dejarla habría significado una prueba en rojo o una prueba debilitada a
  propósito.

  Efecto colateral visible y esperado: el `e2e/accessibility.spec.ts` destapó también que
  `@axe-core/playwright` arrastra su propia copia de `playwright-core` (1.64.1) mientras el proyecto
  usa 1.63.0, lo que rompe el chequeo de tipos de `AxeBuilder({ page })`. Mientras se alinea con un
  `overrides` de npm (tarea T15, bloqueada porque el lockfile lo tiene tomado el worker del
  adaptador), `e2e/**` queda **fuera** del `include` del tsconfig para no romperle la puerta a ese
  worker. Es una brecha temporal declarada, no un descuido: se cierra en el mismo cambio que añade el
  `overrides`.

- **L9** (segmento 4 completo, incluido el adaptador): cuatro commits más (`d386edd` la corrección de
  accesibilidad, `b8c0209` el override y la puerta e2e, `6a6f359` las dos correcciones del núcleo,
  `569a4bb` el adaptador de IndexedDB).

  El worker del adaptador terminó pidiendo una decisión y **tenía razón en las dos cosas que reportó**:

  1. `deps:check` salía 1 y la culpa era de mi regla, no de su código. `@lingualab/core/testing` es una
     segunda entrada pública declarada en `packages/core/package.json` y creada precisamente para que
     los adaptadores ejecuten las suites de contrato; mi regla solo excusaba `index.ts`, así que
     prohibía lo que el diseño pide. Se amplió a las dos entradas declaradas y sigue prohibiendo
     cualquier otra ruta profunda.
  2. El fake en memoria devolvía `not-found` al borrar un id inexistente y el adaptador devolvía `ok`.
     El contrato no cubría ese caso, de modo que **los dos pasaban la suite mientras se comportaban
     distinto** — justo lo que una suite de contrato existe para impedir. Se decidió idempotencia,
     se escribió la razón en el puerto y el contrato ahora la comprueba para ambos.

  Pruebas de accesibilidad, con evidencia propia: `npx playwright test` en **verde en las dos páginas**
  tras quitar `aria-pressed` de los enlaces del selector de idioma. El defecto era real y estaba en
  producción; lo encontró la puerta nueva, no una revisión a ojo.

  `npm ls playwright-core` confirma una sola copia (1.63.0, `overridden` para axe y `deduped` para el
  proyecto), y los tipos pasan con `e2e/` dentro del `include`: 92 archivos, 0 errores.

  Declarado y sin probar por ejecución: la rama `quota-exceeded` del adaptador. `fake-indexeddb` no
  puede provocar `QuotaExceededError` de forma determinista y la firma de la fábrica no ofrece una
  costura para inyectar un `IDBFactory` que falle.

- **L10** (segunda inspección de la autoridad de revisión, y por qué NO se ejecutó el `start`): el
  recordatorio de RDD volvió a dispararse y `inspect` ofreció `review.start` para un candidato nuevo
  (`sha256:c597575…`). El alcance ofrecido es `base-diff:workspace` con `base-ref=f355c3bea25cab7ec613ae57a4315c0905ea7a7e`
  — es decir, **la rama acumulada entera**: 156 rutas y 35 commits.

  Decisión: no se ejecuta, por tres razones con evidencia y no por preferencia.

  1. **El proveedor ya rechazó este mismo alcance.** El intento anterior, con 66 archivos y 4.810
     líneas, terminó en `lens_context_budget_exceeded` con `next_action: stop` y este diagnóstico
     textual: *«retrying this exact candidate cannot succeed, so split it into a chained sequence of
     smaller reviewable commits, each under the budget, then refresh the exact native next transition
     […] and execute the returned transition for the reduced scope»*. El candidato actual es un
     **superconjunto** de aquel, así que el argumento vale con más fuerza: reintentarlo quema una
     ceremonia de consentimiento del humano para recibir el mismo rechazo.
  2. **La continuación es condicional a reducir el alcance primero.** Dice «execute the returned
     transition **for the reduced scope**». No se ha reducido nada todavía, así que ejecutar ahora
     sería ejecutarlo para el alcance equivocado: el que el proveedor ya declaró inviable.
  3. **El árbol no está quieto.** El worker del catálogo sigue escribiendo, y un candidato congelado
     sobre un árbol en movimiento nace inestable, con el riesgo de fallar la verificación por algo que
     no es un defecto.

  Lo que sí queda decidido, y es lo que el proveedor pidió: la revisión se hace **por unidad de trabajo**,
  con el árbol quieto, refrescando el estado nativo antes de ejecutar. Es la tarea T13, y el
  fraccionamiento del historial en 35 commits ya está hecho justamente con ese presupuesto en mente.
  Si el humano prefiere que se intente el alcance completo igual, basta con decirlo: la decisión está
  fundada en evidencia del proveedor, no en un juicio propio sobre si la revisión hace falta.

- **L11** (dos hallazgos operativos al cerrar, que conviene no redescubrir):

  1. **`baseRef` solo permite rebanar SUFIJOS.** La instrucción del proveedor es reducir el alcance y
     ejecutar la transición «for the reduced scope», y el único mecanismo documentado es un `baseRef`
     explícito con `committedOnly: true`. Pero el rango que produce es `baseRef..HEAD`, así que no se
     puede aislar un commit interior del historial —por ejemplo el adaptador de IndexedDB, que es
     donde más valor tendría una mirada externa— sin reescribir historia, que está descartado. Las
     rebanadas posibles son sufijos: el catálogo y la documentación, o solo la documentación.

  2. **Nunca lanzar `npm ci` en paralelo con un commit que dispara ganchos.** El commit de `STATUS.md`
     falló con `Cannot find module 'fast-deep-equal'` y `husky - commit-msg script failed`, porque
     `npm ci` estaba borrando y reponiendo `node_modules` mientras el gancho de commitlint intentaba
     cargar `ajv`. El cambio quedó staged y se rehízo con el árbol de dependencias sano. Es la misma
     clase de error de coordinación que ya se había evitado con los writers: dos procesos que tocan el
     mismo recurso compartido no pueden correr en el mismo lote.

  Estado final de la rama en este punto: 41 commits, árbol limpio, `npm ci` y `npm run verify:all` en
  verde sobre Node 22, 744 pruebas unitarias en 40 archivos, 20 pruebas e2e, 21 páginas construidas,
  peor página 28.5 KB sobre 60 de presupuesto, y 0 vulnerabilidades de producción.

- **L12** (la revisión se hizo, y por fin con el alcance reducido): el candidato reducido se midió antes
  de intentarlo — `baseRef=7b6d033` da **13 archivos y 745 líneas** contra las **14.926** de la rama
  acumulada, una reducción de veinte veces.

  **Tres intentos, y el tercero es el que enseña algo reutilizable:**

  1. `baseRef` + dos lentes → `native-start-input-invalid`, razón `lenses-invalid`.
  2. `baseRef` + las **tres** lentes que el facade ya había aceptado en un `start` anterior → el MISMO
     `lenses-invalid`. Eso descarta los lentes y señala a la combinación.
  3. `baseRef` **sin lentes** → aceptado. El proveedor eligió `review-reliability` por su cuenta
     (`lenses_required: true`, pero procede con su conjunto por defecto).

  Conclusión operativa para quien retome esto: **lo que el proveedor rechaza es `baseRef` combinado con
  `lenses`, no los lentes por sí solos**, y el código de error nombra el campo equivocado. La forma de
  revisar una unidad de trabajo es pasar `baseRef` con `committedOnly` y **omitir** los lentes.
  Recordado además el límite ya anotado en L11: `baseRef` solo rebanar **sufijos** (`baseRef..HEAD`).

  Resultado: linaje `review-cd4013456007de5a`, riesgo **medio**, `state: approved` en el último evento
  admitido, con **un único hallazgo informativo y no bloqueante** —`R3-001`, lente `reliability`,
  `src/scripts/catalogo/index.ts:88-93`, severidad WARNING, disposición `informational`—. El proveedor
  dice explícitamente que ninguno de los hallazgos abre una corrección ni reabre la revisión, y que se
  traten como trabajo posterior separado.

  El reconocimiento exacto se ejecutó y la autoridad quedó **quemada**
  (`burn_evidence: gentle-ai.review-acknowledged/v1`). La entrega, por política ordinaria del
  repositorio, sigue siendo decisión del humano: la revisión nunca autoriza publicar, comitear ni abrir
  un PR.

### L13 — Cierre del tema oscuro, y una trampa que no era la que yo creía

T19 quedó cerrada, pero **no por el camino que yo había anunciado**. Mi hipótesis era contención de
recursos: 56 navegadores en paralelo y la suite cayéndose. Era **falsa**.

La causa real, reproducida antes de decidir: había un `astro dev` vivo en el puerto 4321 —levantado para
mirar el sitio a mano— y `reuseExistingServer: true` hacía que Playwright **reutilizara ese servidor de
desarrollo** en vez de compilar y servir `dist/`. Ese servidor no aplica la CSP, sirve los módulos sin
empaquetar y compila a demanda, así que con la suite entera encima casi todas las pruebas se caían por
tiempo de espera, y el síntoma se leía como «las pruebas están mal».

El arreglo que iba a aplicar —limitar `workers`— habría tapado el síntoma y dejado la trampa viva. Es
exactamente la razón de la regla de reproducir antes de decidir: la hipótesis plausible y el arreglo
plausible se sostenían el uno al otro, y ninguno de los dos miraba el puerto.

Se cerró de las dos formas:

1. El tema oscuro entra en la puerta: 21 páginas × 2 temas = **42 pruebas de accesibilidad**, 56 con los
   flujos, todas en verde contra `dist/`. `emulateMedia({ colorScheme })` va **antes** de `goto` para que el
   tema quede fijado desde el primer pintado, **no porque el orden cambie lo que se mide**: un verificador
   comprobó que emular después de navegar pinta la misma paleta y da el mismo resultado de axe. Una versión
   anterior de esta entrada decía que navegar primero mediría el tema equivocado, y era falso.
2. La guarda pasa a ser estructural: `reuseExistingServer: false`. Si el puerto está ocupado, la puerta
   **falla avisando que la url ya esta en uso** (`already used, make sure that nothing is running on the
   port`) —nombra la url, no el proceso que la ocupa—, comprobado ocupando el puerto con un señuelo y
   viendo el error. Un verde que no significa lo que dice
   es peor que un rojo, porque un verde no lo investiga nadie. Queda explicado en
   `docs/CONTRIBUTING.md`.

El trabajo pendiente quedó traspasado en **`docs/PENDING.md`**: diez entradas, cada una con síntoma,
evidencia medida, por qué no se hizo, próximo paso exacto y criterio de aceptación. Ahí está T16 (la
prosa del núcleo), la trampa de puerto compartido como mejora estructural —separar el puerto del e2e del
que usa `astro dev`—, la línea base de Biome que se cae sobre `main`, y la receta de revisión ya pagada
en L12.

Nota de método, que vale para la próxima vez: el `pkill -f "http.server 4321"` con el que iba a liberar el
puerto **mató mi propio script**, porque su línea de comandos contenía el texto buscado. Matar por PID
del que escucha, no por patrón.
