# Estado de LinguaLab

Este documento responde a una sola pregunta: **¿en qué se puede confiar hoy, y en qué no?** Existe
porque una página que exagera lo que hace es la parte menos fiable de un proyecto, y porque quien llegue
después necesita saber qué se probó y qué se supuso sin tener que reconstruirlo del historial de
commits.

## En corto

| | |
|---|---|
| **Publicado** | `main`, versión **3.1.0**, en `https://lingualab-beta.vercel.app` (Vercel, ADR 0009) |
| **Última entrega** | El cierre de la auditoría del 2026-11-03, fusionado desde el PR #13 (`2eddc2b`) y verificado en producción con `npm run live:check`. Documento ODD: [`odd/tasks/audit-v3.1-closure.md`](../odd/tasks/audit-v3.1-closure.md) |
| **Cifras medidas** | [`docs/metrics.json`](metrics.json), que escribe `npm run status:measure`. Este documento no copia cifras: se quedan viejas |
| **Qué falta** | [`docs/PENDING.md`](PENDING.md) para el código; [`docs/HUMAN-EVIDENCE.md`](HUMAN-EVIDENCE.md) para lo que solo puede cerrar una persona |
| **Para retomar** | [`odd/handoff/ACTUAL.md`](../odd/handoff/ACTUAL.md), y antes que nada `npm run doctor` |

`main` recibió de una vez, el 25 de octubre de 2026, la cadena completa de la entrega v3
—`feat/toolbox-v3-security` → `-navigation` → `-languages` → `-audio` → `-closure` →
`feat/v3-segments-7-11`—, con los segmentos 7 a 11 y el cierre de `docs/PENDING.md` y
`docs/SECURITY-REVIEW.md`.

El detalle de las decisiones está en [`docs/adr/`](adr/), y el mapa del hexágono en
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Dónde se publica

**Un solo destino: Vercel, desde `main`, en `https://lingualab-beta.vercel.app`.** Hasta el 25 de octubre
de 2026 el push a `main` publicaba también en GitHub Pages, en un subdirectorio, y el dominio que el
repositorio anunciaba como canónico (`lingualab.pages.dev`) **pertenecía a otra persona**: cada página
publicaba un `canonical` que apuntaba a un sitio ajeno. Se corrigió la URL a una sola constante, se retiró
el flujo de Pages y `vercel.json` emite las cabeceras que Pages no permitía —entre ellas
`frame-ancestors 'none'`, que hasta entonces viajaba en una metaetiqueta donde no se aplica—. El detalle y
las alternativas descartadas están en [`docs/adr/0009-publicacion-solo-en-vercel.md`](adr/0009-publicacion-solo-en-vercel.md).

## Cómo ejecutarlo

```bash
nvm use 22          # el proyecto fija Node 22; el shell de Pi no lo carga solo
npm install
npm run dev         # http://localhost:4321
```

| Comando | Qué comprueba |
|---|---|
| `npm run verify:all` | La puerta completa: lint, tipos, reglas hexagonales, tipos del sitio, pruebas y build verificado |
| `npm run test:e2e` | Playwright contra el sitio compilado: accesibilidad con axe y flujos reales |
| `npm run verify:build` | Verifica el resultado compilado: CSP, un solo `<h1>`, subrecursos, presupuesto de peso |

`npm run test:e2e` necesita `npx playwright install chromium` una vez.

---

## Herramientas que existen (v3.1.0)

La versión vive en `package.json`; no hay etiquetas en Git todavía, porque el sitio se publica como
una unidad y release-please quedó fuera del alcance (ADR 0003). El salto a 3.0.0 no fue cosmético: la
licencia cambió a GPL por eSpeak NG, y un cambio de licencia es incompatible hacia atrás. El 3.1.0 suma
las cinco herramientas de los segmentos 7 a 11; es aditivo, así que es un cambio menor.

Todas corren por completo en el navegador: lo que se escribe o se carga no sale de la pestaña. **No hay
service worker**, así que abrir o recargar una página necesita conexión; una herramienta ya abierta sigue
calculando si la red se corta. `src/lib/claims.test.ts` impide volver a prometer más que eso.

| Herramienta | Ruta | Estado | Qué se probó | Límites declarados |
|---|---|---|---|---|
| **FonoLab** — alfabeto AFI, corte sagital, audio, transcriptor grafema→AFI | `/fono` | **Estable** | Que los 108 símbolos del AFI resuelven a un diagrama dibujable; reproducción con audio con licencia y respaldo por voz del sistema | El transcriptor es una **aproximación didáctica**, no un transcriptor morfológico. El inglés no marca la tensión vocálica (`sing` da `/siŋ/`, no `/sɪŋ/`); el español usa distinción, a diferencia del fonemizador y de Ortografía, que usan seseo, y la interfaz lo anuncia junto al transcriptor |
| **ArborLab** — 23 tipos de árbol, 4 formatos de entrada, exportación a SVG, PNG, JSON, Newick, CoNLL-U y Brat | `/arboles` | **Estable** | El dibujo y el *layout* de los 23 tipos, los 4 formatos de entrada y cada exportación | El modo «Frase» adivina las categorías con una lista cerrada: el dibujo es exacto, la etiquetación no. La exportación a CoNLL-U es un árbol sintácticamente válido, no un análisis lingüístico |
| **Estación textual** — frecuencia con dispersión, colocaciones, concordancias KWIC, estadísticas léxicas y legibilidad, con un **constructor de n-gramas** (n de 2 a 5, frecuencia mínima, máximo de filas y orden por G², log-Dice, PMI, t-score o recuento) | `/tools` | **Estable** | El cálculo de cada medida y la tokenización, con pruebas unitarias; el acotado de lo que escribe el constructor, con pruebas propias; y el constructor en sí, con e2e sobre el sitio compilado | **No hay lematización**: no hay léxico, así que las mismas palabras flexionadas cuentan por separado. Por encima de n = 2 las medidas de asociación se calculan contra la primera y la última palabra del n-grama, así que solo el recuento es fiable de ese tamaño |
| **Glosario bilingüe filtrable** | `/glosario` | **Estable** | El filtrado por faceta y el contenido del glosario | Es material de referencia, no una herramienta de análisis |
| **Bibliografía de recursos con licencia** | `/bibliografia` | **Estable** | Que cada ficha declara su licencia y su enlace de origen | — |
| **Verificación de salvaguardas** | `/seguridad` | **Estable** | Lee el DOM real y comprueba en vivo las salvaguardas; el resultado compilado se verifica en cada build | Comprueba lo que el propio sitio declara; no es una auditoría externa |
| **Acerca de** | `/acerca` | **Estable** | — | — |
| **Catálogo de herramientas** — tarjetas filtrables por área, idioma y tipo de integración, **agrupadas por nivel de análisis y con índice**, con el estado real de cada una | `/catalogo` | **Estable** | El filtrado, que una herramienta planeada no se vea como una que existe, la agrupación por nivel con su índice y su accesibilidad con axe | Solo se enlazan las URL externas verificadas antes de publicarlas (segmento 11, abajo); la ficha de la Universidad de los Andes sigue `planned` porque su URL no se pudo verificar |

| **Experimentos de psicolingüística** — cuatro plantillas con jsPsych, estímulos por CSV, semilla reproducible, resultados a CSV | `/experimentos` | **Estable** | El generador con semilla, el adaptador del puerto y una e2e que corre una plantilla y descarga el CSV. Detalle en la sección de los segmentos 7 a 11 | Los tiempos de reacción de un navegador tienen precisión limitada, y la página lo advierte antes de empezar |
| **Conversor ELAN ↔ TextGrid** — Pyodide + pympi-ling en un worker, con informe de pérdida | `/elan` | **Experimental** | El puente Python, el adaptador en proceso y en worker, y una e2e que carga un `.eaf` y exporta un TextGrid. Detalle abajo | Que ELAN abra lo exportado no se probó: no hay ELAN aquí. La primera conversión descarga 13 MB desde este origen |
| **Mapa de lenguas de Colombia** — mapa propio en SVG, tabla accesible, filtros y detalle | `/lenguas` | **Estable** | El dataset (con fixture CLDF), el filtrado, la proyección y una e2e en los dos idiomas. Detalle abajo | 9 de las 136 lenguas no tienen coordenadas y se listan aparte, sin inventarlas |
| **Visor de audio** — forma de onda, espectrograma y edición de capas de intervalos, con importación y exportación de TextGrid y exportación CSV | `/visualizador` | **Experimental** | El codec de TextGrid (archivos de referencia, ida y vuelta sobre cinco documentos, truncados, codificaciones), la FFT contra una sinusoide, la edición de intervalos y la accesibilidad con axe | Si Praat abre el archivo exportado y si el espectrograma coincide con el suyo **no se probó**: necesita el programa, no el repositorio. Está en `P17` |

**La barra superior ya no es una lista de herramientas.** Tiene tres entradas fijas —catálogo,
bibliografía y acerca de— y las herramientas se alcanzan dentro del catálogo. Con siete herramientas la
barra anterior se había vuelto una lista que crecía con cada entrega; esta no crece. El orden de los
niveles vive en `ANALYSIS_LEVELS`, en el núcleo, porque la secuencia fonética → documentación es
conocimiento lingüístico y no una preferencia de diseño. El pie se deriva de `NAV_ITEMS` desde
`d34059b`: antes tenía su propia lista, y se había quedado vieja dos veces.

**La revisión de seguridad tiene su propio documento:**
[`docs/SECURITY-REVIEW.md`](SECURITY-REVIEW.md), con lo que se midió, lo que se corrigió y los seis
puntos que estaban abiertos. Los seis están cerrados o tienen su límite declarado: la puerta audita las
dependencias de producción en cada corrida, las ocho acciones de GitHub van fijadas por SHA, CodeQL
analiza el código, las alertas de Dependabot y el escaneo de secretos están activados con
`push protection`, y `frame-ancestors 'none'` lo envía el servidor como cabecera (`vercel.json`). Hasta la auditoría del
2026-11-03 viajaba además en la metaetiqueta, donde el navegador la ignora y lo anuncia con un error de
consola en **cada** página; ya no, y `verify-build` falla si vuelve. TypeScript 7 sigue fuera por el
peer de `@astrojs/check`, que es una decisión y no una deuda.

## Herramienta A: ortografía → IPA (segmento 4 del prompt)

| | |
|---|---|
| **Estado** | **Estable**, con los límites de abajo declarados |
| **Qué se probó** | El motor de reglas (NFC, coincidencia más larga, contexto, prioridad, capas fonémica y alofónica, rastro por carácter, cobertura) y el validador con seis códigos de hallazgo, todo con pruebas unitarias. Las **ocho pruebas de español que pide el prompt**, incluido el par `perro`/`pero` con sus puntos de código explícitos. El repositorio sobre IndexedDB pasando la suite de contrato contra IndexedDB **y** contra el respaldo en memoria. Y ocho pruebas e2e que recorren el flujo completo: cargar la demo, probar una palabra, ver qué regla ganó, añadir una regla, exportar, recargar y volver a importar |
| **Supuestos asumidos** | El formato JSON de las tablas vive en el núcleo y no en cada adaptador, para que un archivo exportado por uno se pueda importar en otro. `remove` es idempotente: borrar algo que ya no está no es un fallo. El idioma demo es español latinoamericano con seseo, con dos variantes que difieren solo en `ll`. El CSV es **deliberadamente incompleto** (una capa, seis columnas) y el JSON es el formato completo |
| **Límites declarados** | Sin editor de clases `{V}`: se escriben en el JSON y el editor las preserva, pero no hay interfaz para crearlas. `render.ts` no tiene prueba unitaria —Vitest corre en entorno `node` y su configuración quedaba fuera de las superficies de esa tarea—; lo cubren las e2e. La rama de cuota agotada del adaptador **sí** se provoca desde una prueba —interceptando `IDBObjectStore.prototype.put`, ver P3—, y las frases de validación dejaron de viajar escritas desde el núcleo: el núcleo devuelve código y datos y la oración se arma en la capa de presentación, con una prueba e2e que carga la misma tabla rota en los dos idiomas y afirma que ninguna salida contiene texto del otro (P1). Tampoco tienen prueba unitaria `src/scripts/ortografia/index.ts` (835 líneas) ni `src/scripts/catalogo/index.ts`: solo la tienen los módulos puros, y a los dos orquestadores los cubren las e2e. Y hay **seis avisos de complejidad cognitiva** en el código nuevo, ninguno bloqueante. **Todo esto, y el resto del trabajo pendiente, está traspasado en `docs/PENDING.md`** —de detalle desigual: las hay completas, las hay que solo anotan el síntoma y el próximo paso, y las que ya están cerradas con su medición al lado; la tabla de arriba de ese documento dice cuál es cuál—. Cada entrada que ofrece un próximo paso lo da con su criterio de aceptación; ninguna promete los cinco campos, porque no las tienen todas |
| **Cómo ejecutarla** | `npm run dev` y abrir `/ortografia` |

**Plantillas de lenguas indígenas.** Inga (`inb`), wayuunaiki (`guc`), nasa yuwe (`pbb`) y arhuaco
(`arh`) existen como plantillas **vacías**, con `status: "draft"`. Los códigos se verificaron en
`iso639-3.sil.org`, que coincide con Glottolog. Una prueba exige que sigan vacías y que conserven el
aviso:

> Esta tabla debe construirse y validarse con hablantes y fuentes lingüísticas de la comunidad

No se inventó ni un solo par grafema→AFI, y no es una limitación temporal: es una regla del proyecto.

## Herramienta B: texto → AFI (segmento 5 del prompt)

| | |
|---|---|
| **Estado** | **Estable**, con los límites de abajo declarados |
| **Qué se probó** | Los dos motores (`packages/core/src/g2p/`) con pruebas por regla: grafemas, diptongos, silabeo, acento y alófonos del español; conversión de ARPABET a AFI, acento y variantes del inglés. El adaptador con la suite de contrato del puerto y un `fetch` de mentira: el español no toca la red, el diccionario se descarga una sola vez y un fallo de descarga es un error tipado que se reintenta. En navegador real, que la variedad y el nivel llegan al motor, que el diccionario se sirve bajo la CSP y que una palabra desconocida se marca. Medido con `scripts/eval-g2p.mts` contra ipa-dict: el español acierta el 96,6 % de 5006 palabras (eSpeak NG, el motor anterior, el 76,9 %); el resto son nasales asimiladas que la referencia anota y el nivel fonémico no |
| **Supuestos asumidos** | El español sigue la descripción de Hualde (2013); por defecto es latinoamericano con seseo, para no contradecir a la herramienta de ortografía, y se puede pedir el peninsular con distinción. El inglés es el estadounidense general de CMUdict, con `ɝ`/`ɚ` y `ə` átona |
| **Límites declarados** | Es una transcripción de **referencia**, no la de un hablante: la interfaz lo dice antes de mostrar nada. El español no conoce excepciones léxicas (extranjerismos, la «x» de topónimos fuera de «México» y derivados, siglas). El inglés es solo fonémico y no adivina: una palabra que no está en el diccionario sale entre `⟨ ⟩` y en una lista aparte; solo se derivan el plural y el posesivo regulares. La medida del inglés contra ipa-dict es de coherencia, no de acierto, porque esa referencia deriva del mismo CMUdict. La primera transcripción en inglés descarga el diccionario (3,4 MB, cerca de 1 MB comprimido) desde este origen, `public/cmudict/<versión>/` |
| **Cómo ejecutarla** | `npm run dev` y abrir `/fonemizador` |

## Herramientas D a G: los segmentos 7 a 11 del prompt

Los cinco segmentos que faltaban están implementados. Cuatro son herramientas; el undécimo es el catálogo
externo y el contrato de la fase 2. **Ninguno se declara más de lo que se midió.**

| Segmento | Herramienta | Ruta | Estado | Qué se probó | Límites declarados |
|---|---|---|---|---|---|
| 7 | **Experimentos de psicolingüística** — cuatro plantillas con jsPsych (aceptabilidad, 2AFC, lectura autocontrolada, decisión léxica), estímulos por CSV, semilla reproducible, bloques y práctica, resultados a CSV | `/experimentos` | **Estable** | El generador de ensayos con semilla (dos corridas iguales dan el mismo orden), el adaptador del puerto con un jsPsych doble, el CSV de entrada con sus errores de línea y columna, y una e2e que corre la plantilla de aceptabilidad y descarga el CSV con participante, condición, respuesta, tiempo y semilla | Los tiempos de reacción de un navegador tienen precisión limitada, y la página lo advierte **antes** de empezar. Los estímulos de audio se ejercitaron con el doble, no con audio real: la reproducción depende de la política de autoplay del navegador |
| 8 | **Análisis acústico** — F0 con presets de voz, F1–F3 superpuestos al espectrograma, intensidad en dB, medición por intervalo con CSV y gráfico vocálico | `/visualizador` | **Validado en parte**: F0, F1 y F2 coinciden con Praat 6.4.49 en tres vocales (`docs/validation/acoustic.md`); intensidad sin contrastar | El motor `praatfan` 0.1.13 vendoreado (611 KB de wasm) con un tono de 200 Hz en Node, la delegación al worker, la medición (media, mediana, mínimo, máximo, formantes al 25/50/75 % y en el centro), el CSV y una e2e con audio sintético | **Falta el contraste contra Praat sobre voces reales**: `e2e/fixtures/reference/` no existe, así que el arnés informa `missing-fixtures` y la etiqueta sigue puesta. El procedimiento para quitarla está en `docs/validation/acoustic.md` |
| 9 | **Conversor ELAN ↔ TextGrid** — Pyodide + pympi-ling en un worker, informe de pérdida, ida y vuelta | `/elan` | **Experimental** | Pyodide real en Node (instala el wheel de pympi y lee un `.eaf`), el puente Python (XML mal formado, capas jerárquicas, referencias, vocabularios), el adaptador en proceso y en worker, y una e2e en Chromium que carga un `.eaf`, ve sus capas y exporta un TextGrid | Que **ELAN** abra el `.eaf` exportado y que **Praat** abra el `.TextGrid` no se probó: no hay ninguno de los dos aquí. La primera conversión descarga 13 MB de Pyodide desde este mismo origen; después el navegador lo guarda, porque la ruta lleva la versión y se sirve como inmutable |
| 10 | **Mapa de lenguas de Colombia** — mapa propio en SVG, tabla accesible, filtros por familia y búsqueda, panel de detalle | `/lenguas` | **Estable** | El generador del dataset con un fixture CLDF (filtro por país, lenguas sin coordenadas, determinismo), el filtrado y la búsqueda, la proyección, el lector validado del JSON, y una e2e que filtra por familia y abre el detalle en los dos idiomas | 136 lenguas, 9 sin coordenadas (listadas aparte, sin inventarlas) y 6 lenguas no indígenas que Glottolog asigna al país: la página lo dice y el filtro permite dejarlas fuera. Los nombres y las ubicaciones son de la fuente y pueden no ser la autodenominación |
| 11 | **Catálogo de enlaces externos** y **puerto de reconocimiento de fonos** | `/catalogo` | **Estable** (los enlaces) · **No disponible** (el reconocimiento, fase 2) | Que cada URL externa responda y corresponda a lo descrito antes de publicarla (medido el 2026-10-25), que el lector rechace una ficha externa sin `url` https y una ficha integrada que la declare, y que el enlace se abra con `rel="noopener noreferrer"` y su aviso de pestaña nueva | La ficha de la Universidad de los Andes queda `planned` porque **no se pudo verificar una URL pública estable**, y el catálogo no publica enlaces que no abrió. `PhoneRecognitionPort` tiene contrato, fake y propuesta de servicio (`docs/phase2/allosaurus.md`), y **nada de eso está desplegado** |

**El motor del análisis acústico no es una dependencia de npm.** `praatfan` se publica como artefacto de
una release de GitHub; se copió a `public/praatfan/<versión>/` con su licencia GPL-3.0, su procedencia y
sus hashes, porque lo que se audita tiene que ser lo que se sirve. Lo mismo con Pyodide, `micropip` y
`pympi-ling` en `public/pyodide/<versión>/` (13 MB, con hashes en su README): la CSP es
`default-src 'self'` y no admite un CDN.

**Los tres motores viven en una carpeta con su versión** desde la auditoría del 2026-11-03. Se servían con
`max-age=0` y cada visita volvía a preguntar por 19 MB de archivos; con la versión en la ruta, una versión
nueva es una URL nueva y `vercel.json` los declara inmutables sin riesgo de servir el motor viejo. La
versión sale de `src/config/engines.json`, y `src/config/engines.test.ts` la cruza con `package.json`, con
la procedencia de praatfan, con las carpetas de `public/` y con `vercel.json`.

## Desviaciones respecto al prompt, y por qué

| El prompt pedía | Qué se hizo | Motivo |
|---|---|---|
| `pnpm` workspaces | npm workspaces | `pnpm` no estaba instalado y `corepack` ya no viene con Node 25; el usuario pidió no tocar el entorno global. Misma estructura, sin dependencias fuera del repositorio. ADR 0003 |
| `apps/web` con React + Vite | El sitio Astro existente como adaptador primario | El sitio declara «sin framework de UI» y la verificación **falla** si una página supera 60 KB comprimidos. Un framework rompería una puerta que ya existe, a cambio de nada. ADR 0001 |
| CLI de dependency-cruiser | Su API programática desde `scripts/deps-check.mjs` | El CLI aborta en Node 25 por su matriz de soporte. Mismo motor, mismo archivo de reglas |
| Biome formateando todo el repositorio | Adopción gradual: el linter cubre todo, el formateador no toca el árbol heredado | Reformatear 40 archivos habría escondido los cambios que importan. ADR 0003 |
| release-please para versionar | Etiqueta a mano mientras el sitio se publique como unidad | Introducir automatización de releases antes de tener algo que liberar añade un flujo que nadie usa |

## Qué se verifica, y dónde

Las cifras de cada corrida están en [`docs/metrics.json`](metrics.json) (`npm run status:measure`). Lo que
sigue es qué garantiza cada puerta, que cambia mucho menos que sus números.

| Puerta | Qué garantiza | Dónde |
|---|---|---|
| Pruebas unitarias | El núcleo, los adaptadores y los módulos puros del sitio; las promesas del sitio contra el código (`claims.test.ts`) y los documentos contra sus fuentes (`docs.test.ts`) | `npm test` |
| Accesibilidad | axe con las reglas de WCAG 2.2 AA en **cada** página pública y en los **dos** temas, sin errores de consola, y sin desborde a 320 px (WCAG 1.4.10), una prueba por página. Los nodos que axe no puede medir están declarados (P11) y un `incomplete` sin motivo falla (P12) | `npm run test:e2e` |
| Flujos | Cada herramienta, de punta a punta, sobre el sitio compilado | `npm run test:e2e` |
| Hexágono | Las flechas apuntan hacia adentro; `architecture.test.ts` cubre las plantillas `.astro`, que dependency-cruiser no analiza | `npm run deps:check`, `npm test` |
| Tipos | `astro check` y los dos paquetes del workspace | `npm run check`, `npm run typecheck:packages` |
| Lint | 0 errores; los avisos se reparten entre heredados y nuevos con `npm run lint:baseline` (P8) | `npm run lint` |
| Build | CSP sin `unsafe-inline` ni `frame-ancestors` en la metaetiqueta, un solo `<h1>`, sin subrecursos externos ni atributos `style`, cada enlace interno resuelve, robots y sitemap nombran el origen propio y coinciden con los canónicos, icono e imagen para compartir, ningún archivo grande duplicado, 60 KB por página y 21 MB para los motores | `npm run build:verify` |
| Dependencias | 0 vulnerabilidades en producción desde `high` | `npm run audit`, en CI |
| Sitio publicado | Cabeceras reales, robots, sitemap, consola y axe en cada página, 404 y caché de los motores, contra producción después de cada despliegue y cada semana | `npm run live:check`, `live-check.yml` |
| Entorno | Node, rama al día con `origin`, Chromium y puerto 4331, antes de empezar | `npm run doctor` |

**La puerta de accesibilidad ya se ganó su lugar:** encontró un `aria-pressed` puesto sobre los enlaces
del selector de idioma, que ARIA no permite fuera de los roles de botón, en el sitio que ya estaba en
producción. Se corrigió y la prueba lo confirma.
