# Estado de LinguaLab

Este documento responde a una sola pregunta: **¿en qué se puede confiar hoy, y en qué no?** Existe
porque una página que exagera lo que hace es la parte menos fiable de un proyecto, y porque quien llegue
después necesita saber qué se probó y qué se supuso sin tener que reconstruirlo del historial de
commits.

Rama: **`main` tiene todo**, y es lo que se publica en `https://lingualab-beta.vercel.app`. El 25 de
octubre de 2026 se fusionó de una vez la cadena completa —`feat/toolbox-v3-security` → `-navigation` →
`-languages` → `-audio` → `-closure` → `feat/v3-segments-7-11`—, con los segmentos 7 a 11 y el cierre de
`docs/PENDING.md` y `docs/SECURITY-REVIEW.md`. La versión es la **3.1.0**. El estado que queda, las
trampas del entorno, el mapa de archivos y las decisiones que esperan a una persona están en
[`odd/handoff/toolbox-v3.md`](../odd/handoff/toolbox-v3.md).

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

Todas ellas corren por completo en el navegador y funcionan sin conexión después de la primera carga.

| Herramienta | Ruta | Estado | Qué se probó | Límites declarados |
|---|---|---|---|---|
| **FonoLab** — alfabeto AFI, corte sagital, audio, transcriptor grafema→AFI | `/fono` | **Estable** | Que los 108 símbolos del AFI resuelven a un diagrama dibujable; reproducción con audio con licencia y respaldo por voz del sistema | El transcriptor es una **aproximación didáctica**, no un transcriptor morfológico. El inglés no marca la tensión vocálica (`sing` da `/siŋ/`, no `/sɪŋ/`); el español asume distinción, sin seseo |
| **ArborLab** — 23 tipos de árbol, 4 formatos de entrada, exportación a SVG, PNG, JSON, Newick, CoNLL-U y Brat | `/arboles` | **Estable** | El dibujo y el *layout* de los 23 tipos, los 4 formatos de entrada y cada exportación | El modo «Frase» adivina las categorías con una lista cerrada: el dibujo es exacto, la etiquetación no. La exportación a CoNLL-U es un árbol sintácticamente válido, no un análisis lingüístico |
| **Estación textual** — frecuencia con dispersión, colocaciones, concordancias KWIC, estadísticas léxicas y legibilidad, con un **constructor de n-gramas** (n de 2 a 5, frecuencia mínima, máximo de filas y orden por G², log-Dice, PMI, t-score o recuento) | `/tools` | **Estable** | El cálculo de cada medida y la tokenización, con pruebas unitarias; el acotado de lo que escribe el constructor, con pruebas propias; y el constructor en sí, con e2e sobre el sitio compilado | **No hay lematización**: no hay léxico, así que las mismas palabras flexionadas cuentan por separado. Por encima de n = 2 las medidas de asociación se calculan contra la primera y la última palabra del n-grama, así que solo el recuento es fiable de ese tamaño |
| **Glosario bilingüe filtrable** | `/glosario` | **Estable** | El filtrado por faceta y el contenido del glosario | Es material de referencia, no una herramienta de análisis |
| **Bibliografía de recursos con licencia** | `/bibliografia` | **Estable** | Que cada ficha declara su licencia y su enlace de origen | — |
| **Verificación de salvaguardas** | `/seguridad` | **Estable** | Lee el DOM real y comprueba en vivo las salvaguardas; el resultado compilado se verifica en cada build | Comprueba lo que el propio sitio declara; no es una auditoría externa |
| **Acerca de** | `/acerca` | **Estable** | — | — |
| **Catálogo de herramientas** — tarjetas filtrables por área, idioma y tipo de integración, **agrupadas por nivel de análisis y con índice**, con el estado real de cada una | `/catalogo` | **Estable** | El filtrado, que una herramienta planeada no se vea como una que existe, la agrupación por nivel con su índice y su accesibilidad con axe | Ninguna herramienta lleva enlace: el prompt exige verificar cada URL publicada y no se ha verificado ninguna |

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
`push protection`, y `frame-ancestors` se declara como lo que es —una directiva que viaja en una
metaetiqueta y por eso **no se aplica**— en `/seguridad` y aquí arriba. TypeScript 7 sigue fuera por el
peer de `@astrojs/check`, que es una decisión y no una deuda.

## Herramienta A: ortografía → IPA (segmento 4 del prompt)

| | |
|---|---|
| **Estado** | **Estable**, con los límites de abajo declarados |
| **Qué se probó** | El motor de reglas (NFC, coincidencia más larga, contexto, prioridad, capas fonémica y alofónica, rastro por carácter, cobertura) y el validador con seis códigos de hallazgo, todo con pruebas unitarias. Las **ocho pruebas de español que pide el prompt**, incluido el par `perro`/`pero` con sus puntos de código explícitos. El repositorio sobre IndexedDB pasando la suite de contrato contra IndexedDB **y** contra el respaldo en memoria. Y ocho pruebas e2e que recorren el flujo completo: cargar la demo, probar una palabra, ver qué regla ganó, añadir una regla, exportar, recargar y volver a importar |
| **Supuestos asumidos** | El formato JSON de las tablas vive en el núcleo y no en cada adaptador, para que un archivo exportado por uno se pueda importar en otro. `remove` es idempotente: borrar algo que ya no está no es un fallo. El idioma demo es español latinoamericano con seseo, con dos variantes que difieren solo en `ll`. El CSV es **deliberadamente incompleto** (una capa, seis columnas) y el JSON es el formato completo |
| **Límites declarados** | Sin editor de clases `{V}`: se escriben en el JSON y el editor las preserva, pero no hay interfaz para crearlas. `render.ts` no tiene prueba unitaria —Vitest corre en entorno `node` y su configuración quedaba fuera de las superficies de esa tarea—; lo cubren las e2e. La rama de cuota agotada del adaptador **sí** se provoca desde una prueba —interceptando `IDBObjectStore.prototype.put`, ver P3—, y las frases de validación dejaron de viajar escritas desde el núcleo: el núcleo devuelve código y datos y la oración se arma en la capa de presentación, con una prueba e2e que carga la misma tabla rota en los dos idiomas y afirma que ninguna salida contiene texto del otro (P1). Tampoco tienen prueba unitaria `src/scripts/ortografia/index.ts` (835 líneas) ni `src/scripts/catalogo/index.ts`: solo la tienen los módulos puros, y a los dos orquestadores los cubren las e2e. Y hay **seis avisos de complejidad cognitiva** en el código nuevo, ninguno bloqueante. **Todo esto, y el resto del trabajo pendiente, está traspasado en `docs/PENDING.md`** —veintiuna entradas, P1 a P21, de detalle desigual: las hay completas, las hay que solo anotan el síntoma y el próximo paso, y las que ya están cerradas con su medición al lado—. Cada entrada que ofrece un próximo paso lo da con su criterio de aceptación; ninguna promete los cinco campos, porque no las tienen todas |
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
| **Qué se probó** | El puerto `PhonemizerPort` con su suite de contrato, contra el fake y contra el adaptador real —en Node, el camino de motor no disponible, que es lo que ese entorno puede demostrar—. La traducción de códigos ISO 639-3 a voces de eSpeak, con pruebas propias, porque equivocarla daría una transcripción en la lengua equivocada en silencio. Y en navegador real, que la página carga, fonemiza y muestra el resultado. El motor se importa solo dentro de un Web Worker |
| **Supuestos asumidos** | El español que se ofrece es `es-419`, latinoamericano con seseo, para no contradecir a la herramienta de ortografía, que declara esa misma variante; el inglés es `en-us`. De las 51 voces que trae el motor se exponen dos: ofrecer las demás sería ofrecer lenguas cuyos diccionarios nadie probó aquí |
| **Límites declarados** | El AFI de eSpeak NG es **aproximado**: es un sintetizador, no un transcriptor revisado, y la interfaz lo advierte antes de mostrar nada. La primera fonemización descarga **5,6 MB** de datos —un solo archivo para las 51 voces, sin recorte por lengua salvo el ruso, que no se publica—. Esa descarga queda fuera del presupuesto de peso por página porque se busca en tiempo de ejecución, y se sirve desde este origen: si faltara, el paquete caería en un CDN público que la CSP bloquea y la promesa de funcionar sin conexión dejaría de ser cierta |
| **Cómo ejecutarla** | `npm run dev` y abrir `/fonemizador` |

## Herramientas D a G: los segmentos 7 a 11 del prompt

Los cinco segmentos que faltaban están implementados. Cuatro son herramientas; el undécimo es el catálogo
externo y el contrato de la fase 2. **Ninguno se declara más de lo que se midió.**

| Segmento | Herramienta | Ruta | Estado | Qué se probó | Límites declarados |
|---|---|---|---|---|---|
| 7 | **Experimentos de psicolingüística** — cuatro plantillas con jsPsych (aceptabilidad, 2AFC, lectura autocontrolada, decisión léxica), estímulos por CSV, semilla reproducible, bloques y práctica, resultados a CSV | `/experimentos` | **Estable** | El generador de ensayos con semilla (dos corridas iguales dan el mismo orden), el adaptador del puerto con un jsPsych doble, el CSV de entrada con sus errores de línea y columna, y una e2e que corre la plantilla de aceptabilidad y descarga el CSV con participante, condición, respuesta, tiempo y semilla | Los tiempos de reacción de un navegador tienen precisión limitada, y la página lo advierte **antes** de empezar. Los estímulos de audio se ejercitaron con el doble, no con audio real: la reproducción depende de la política de autoplay del navegador |
| 8 | **Análisis acústico** — F0 con presets de voz, F1–F3 superpuestos al espectrograma, intensidad en dB, medición por intervalo con CSV y gráfico vocálico | `/visualizador` | **Experimental** | El motor `praatfan` 0.1.13 vendoreado (611 KB de wasm) con un tono de 200 Hz en Node, la delegación al worker, la medición (media, mediana, mínimo, máximo, formantes al 25/50/75 % y en el centro), el CSV y una e2e con audio sintético | **Falta el contraste contra Praat sobre voces reales**: `e2e/fixtures/reference/` no existe, así que el arnés informa `missing-fixtures` y la etiqueta sigue puesta. El procedimiento para quitarla está en `docs/validation/acoustic.md` |
| 9 | **Conversor ELAN ↔ TextGrid** — Pyodide + pympi-ling en un worker, informe de pérdida, ida y vuelta | `/elan` | **Experimental** | Pyodide real en Node (instala el wheel de pympi y lee un `.eaf`), el puente Python (XML mal formado, capas jerárquicas, referencias, vocabularios), el adaptador en proceso y en worker, y una e2e en Chromium que carga un `.eaf`, ve sus capas y exporta un TextGrid | Que **ELAN** abra el `.eaf` exportado y que **Praat** abra el `.TextGrid` no se probó: no hay ninguno de los dos aquí. La primera conversión descarga 13 MB de Pyodide desde este mismo origen; después funciona sin conexión |
| 10 | **Mapa de lenguas de Colombia** — mapa propio en SVG, tabla accesible, filtros por familia y búsqueda, panel de detalle | `/lenguas` | **Estable** | El generador del dataset con un fixture CLDF (filtro por país, lenguas sin coordenadas, determinismo), el filtrado y la búsqueda, la proyección, el lector validado del JSON, y una e2e que filtra por familia y abre el detalle en los dos idiomas | 136 lenguas, 9 sin coordenadas (listadas aparte, sin inventarlas) y 6 lenguas no indígenas que Glottolog asigna al país: la página lo dice y el filtro permite dejarlas fuera. Los nombres y las ubicaciones son de la fuente y pueden no ser la autodenominación |
| 11 | **Catálogo de enlaces externos** y **puerto de reconocimiento de fonos** | `/catalogo` | **Estable** (los enlaces) · **No disponible** (el reconocimiento, fase 2) | Que cada URL externa responda y corresponda a lo descrito antes de publicarla (medido el 2026-10-25), que el lector rechace una ficha externa sin `url` https y una ficha integrada que la declare, y que el enlace se abra con `rel="noopener noreferrer"` y su aviso de pestaña nueva | La ficha de la Universidad de los Andes queda `planned` porque **no se pudo verificar una URL pública estable**, y el catálogo no publica enlaces que no abrió. `PhoneRecognitionPort` tiene contrato, fake y propuesta de servicio (`docs/phase2/allosaurus.md`), y **nada de eso está desplegado** |

**El motor del análisis acústico no es una dependencia de npm.** `praatfan` se publica como artefacto de
una release de GitHub; se copió a `public/praatfan/` con su licencia GPL-3.0, su procedencia y sus hashes,
porque lo que se audita tiene que ser lo que se sirve. Lo mismo con Pyodide, `micropip` y `pympi-ling` en
`public/pyodide/` (13 MB, con hashes en su README): la CSP es `default-src 'self'` y la promesa de
funcionar sin conexión no admite un CDN.

## Desviaciones respecto al prompt, y por qué

| El prompt pedía | Qué se hizo | Motivo |
|---|---|---|
| `pnpm` workspaces | npm workspaces | `pnpm` no estaba instalado y `corepack` ya no viene con Node 25; el usuario pidió no tocar el entorno global. Misma estructura, sin dependencias fuera del repositorio. ADR 0003 |
| `apps/web` con React + Vite | El sitio Astro existente como adaptador primario | El sitio declara «sin framework de UI» y la verificación **falla** si una página supera 60 KB comprimidos. Un framework rompería una puerta que ya existe, a cambio de nada. ADR 0001 |
| CLI de dependency-cruiser | Su API programática desde `scripts/deps-check.mjs` | El CLI aborta en Node 25 por su matriz de soporte. Mismo motor, mismo archivo de reglas |
| Biome formateando todo el repositorio | Adopción gradual: el linter cubre todo, el formateador no toca el árbol heredado | Reformatear 40 archivos habría escondido los cambios que importan. ADR 0003 |
| release-please para versionar | Etiqueta a mano mientras el sitio se publique como unidad | Introducir automatización de releases antes de tener algo que liberar añade un flujo que nadie usa |

## Verificación, en números

| Comprobación | Resultado |
|---|---|
| Pruebas unitarias | **1168 en 78 archivos** |
| Accesibilidad (axe, WCAG 2.2 AA) | **Sin violaciones** en las **25 páginas públicas** —las 22 rutas y la 404— en español y en inglés. Ampliar la puerta a todas encontró **una violación real más** que nadie había mirado: la 404 usaba un token de LÍNEA (`--line-strong`) como color de texto, que da 2.0:1 en claro y 2.4:1 en oscuro, donde se exigen 3:1 para texto grande. Corregido a `--ink-faint`, **medido en un navegador real**: 5.2:1 en claro y 5.4:1 en oscuro. La puerta recorre ahora **cada página en los dos temas** —50 pruebas de accesibilidad sobre `dist/`, dentro de una suite de 88— porque un contraste aprobado en una paleta no dice nada de la otra. Y la guarda quedó estructural: `reuseExistingServer` pasó a `false`, porque con `true` un `astro dev` vivo en el puerto hacía que la puerta probara el **servidor de desarrollo**, sin CSP y compilando a demanda, y casi toda la suite se caía por tiempo de espera. Un verde que no significa lo que dice no lo investiga nadie. Ahora también afirma sobre los resultados `incomplete` de axe, y ahí declaró un **punto ciego**: en los nodos que axe no puede medir —texto sobre SVG, botones de un solo carácter— la puerta no sabe nada del contraste y no lo finge. Son **186 nodos** medidos cuando la puerta cubría 21 páginas y los dos temas —`inicio` 9 por página y tema, `FonoLab` 15, `salvaguardas` 16, `acerca` 4, `arboles` 2, `no-existe` 1; **esas cifras no se suman**, son por página y por tema y la 404 no tiene versión inglesa—, y quedan como **P11** y **P12** en `docs/PENDING.md`: P11 con el aviso de que medirlos por estilos computados da resultados falsos, y P12 —**cerrado**: la puerta falla ante un `incomplete` sin motivo textual y el caso de `/arboles` quedó exceptuado **por nombre y con la medición** (0 `<li>` al cargar → axe no puede decidir; 1 `<li>` después de «Dibujar» → deja de reportarlo)— |
| Pruebas de extremo a extremo | **117**, sobre el sitio compilado: 54 de accesibilidad (27 páginas × 2 temas) y 63 de flujo |
| Reglas de dependencia hexagonales | 282 módulos y 646 dependencias, **0 violaciones**. La regla atajó una importación profunda al núcleo desde una prueba nueva, y `src/lib/architecture.test.ts` cubre el hueco que dejaba: dependency-cruiser no analiza plantillas `.astro` |
| Tipos | `astro check` y los dos paquetes del workspace, **0 errores** |
| Linter | 0 errores. **48 avisos**: 42 que ya están en `main` y **6 nuevos**, todos de complejidad (`textgrid.ts` ×4, `audio/index.ts` y `catalog-data.ts`). El reparto está **medido**, no inferido, con `npm run lint:baseline` (P8) |
| Página más pesada | 31,1 KB comprimidos (`/visualizador`), sobre un presupuesto de 60 KB. Los dos motores pesados —Pyodide, 13 MB, y praatfan, 611 KB— no cuentan: se buscan en tiempo de ejecución, desde este origen |
| Vulnerabilidades de producción | 0 (`npm run audit`, que además informa el árbol de desarrollo y corre en CI) |
| Atributos `style` en el marcado | **0**: la CSP los bloquea y `verify-build` falla si aparece uno (eran 19 el 2026-10-25) |
| Cabeceras de seguridad | `vercel.json` las emite: `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS (ADR 0009) |

**La puerta de accesibilidad ya se ganó su lugar:** encontró un `aria-pressed` puesto sobre los enlaces
del selector de idioma, que ARIA no permite fuera de los roles de botón, en el sitio que ya estaba en
producción. Se corrigió y la prueba lo confirma.
