---
status: current
updated: 2026-11-12
---

# Traspaso vigente: rework v4

Documento para que **otra persona, otro agente u otro modelo** (Opus, Sonnet, Codex, Cursor, lo que sea)
continúe el rework **sin la conversación original**. Todo lo necesario está aquí o enlazado desde aquí.
Se reescribe en cada entrega; los anteriores están en `odd/handoff/archivo/`. No copia cifras de la
suite: están en `docs/metrics.json`.

## 0. Si eres un agente y acabas de llegar

Pega esto como primera instrucción, o síguelo tal cual:

> Lee `odd/handoff/ACTUAL.md` entero y `odd/tasks/rework-v4.md` hasta `## Log`. No leas más documentos
> todavía. Trabaja en la rama `feat/rework-v4`. Toma la **primera tarea sin bloquear** de la tabla de §6,
> sigue sus pasos en orden, corre las puertas de §2 y haz commit y push al terminar cada unidad. No
> fusiones a `main`. Si una tarea necesita una decisión del dueño (§8), pregúntale **una sola** y espera.
> Háblale en español. Al terminar, reescribe este archivo.

Orden recomendado de trabajo: **T5 → T9 → T7 → T4 → T6 → T8 → T10**. T5, T9 y T7 no esperan ninguna
decisión del dueño; T4, T6 y T8 sí (D3, D4, D5).

## 1. Qué se está haciendo y dónde

- **Producto:** LinguaLab, un sitio estático con herramientas de lingüística que corren en el navegador.
  Público: estudiantes de lenguas y de lingüística. Publicado desde `main` en
  `https://lingualab-beta.vercel.app`.
- **Rama de trabajo:** `feat/rework-v4`, publicada en `origin`. Sale de `main` @ `baa8322`.
- **Regla del dueño:** commit y push a esta rama después de cada unidad terminada, para que el equipo
  la trabaje desde otros equipos. **No se fusiona a `main` ni se abre PR de merge** hasta que el dueño
  diga que todo funciona.
- **Fuente de verdad de la entrega:** [`odd/tasks/rework-v4.md`](../tasks/rework-v4.md): el pedido textual
  del dueño (L1), las especificaciones S1–S11, las decisiones, la tabla de tareas y la bitácora.
  **Toda decisión o avance nuevo se anota ahí, en `## Log`,** y la fila de la tarea se actualiza con su
  commit.
- **Idioma:** al dueño, en español. Comentarios de código y documentos del repositorio, en español neutro
  y explicando el porqué (como el código existente). Identificadores en inglés.

## 2. Antes de escribir una línea

```bash
git fetch && git checkout feat/rework-v4 && git pull --ff-only
nvm use 22                       # Node 22.x; el proyecto fija >=22.12
npm install
npx playwright install chromium  # una vez por máquina
npm run doctor                   # rama frente a origin, Chromium, puerto 4331, documentos ODD
npm run dev                      # http://localhost:4321
```

Rust solo hace falta para la tarea T5 (ver §6). En la máquina del dueño ya está instalado en
`~/.cargo/bin` (rustc 1.99.1, destino `wasm32-unknown-unknown`), **sin** tocar el `PATH`: se invoca como
`~/.cargo/bin/cargo`. En otra máquina: `rustup` con `--profile minimal --target wasm32-unknown-unknown`.

### Las puertas, y cuándo correrlas

| Comando | Cuándo |
|---|---|
| `npx vitest run <carpeta>` | Mientras se trabaja, sobre lo que se toca |
| `npm run verify:all` | Antes de cada commit de código: lint, formato, tipos, hexágono, pruebas y build verificado |
| `npm run test:e2e` | Antes de cada commit que toque páginas, estilos o motores (necesita el puerto 4331 libre) |
| `node --experimental-strip-types --no-warnings scripts/eval-g2p.mts` | Al tocar un transcriptor; descarga antes los diccionarios de referencia (cabecera del script) |
| `node scripts/build-acoustic-reference.mjs` | Solo para regenerar o ampliar las referencias de Praat (necesita `praat` y `ffmpeg`) |
| `npx vitest run packages/adapters/src/acoustic/validation/` | Al tocar el análisis acústico: compara con las referencias de Praat |

## 3. Reglas que no se negocian (y que ya costaron errores)

1. **Rojo antes de verde.** Cada regla nueva empieza por una prueba que falla; después el código. Si los
   datos se escribieron antes que la prueba, se comprueba por **mutación** (romper el dato a propósito y ver
   que la prueba falla).
2. **Nunca `git checkout <archivo>` ni `git restore` para deshacer una mutación.** Borra todos los cambios
   sin commit de ese archivo: así se perdieron los textos de teoría de `tools.json` en esta entrega. Para
   una mutación: copia el archivo a `node_modules/.cache/`, muta, prueba y vuelve a copiar.
3. **Nada temporal en `/tmp`.** Se limpia entre sesiones y Node no resuelve los paquetes desde ahí. Lo
   temporal va en `node_modules/.cache/` (ignorado por git). Ojo: Node **no** ejecuta TypeScript dentro de
   `node_modules`; un script `.mts` de medición va en `scripts/`.
4. **Nada «porque sí».** Toda herramienta integrada declara `theory` y `references` en
   `src/data/tools.json`, y cada referencia de `src/data/references.json` se verifica **abriéndola**
   (DOI en `https://api.crossref.org/works/<doi>` o la página, comprobando que el título coincide) y se
   anota `verifiedOn`. `src/scripts/referencias/references.test.ts` falla si falta algo. No se cita de
   memoria.
5. **No inventar datos lingüísticos ni resultados.** Lo que un motor no sabe, lo dice (`skipped`,
   `⟨palabra⟩`, etiqueta «experimental»). Una transcripción o una medida inventada es peor que ninguna.
6. **Los datos del usuario no salen del navegador** (ADR 0002). Decisión D1 del dueño: todo corre en el
   navegador; nada de servidor propio. La CSP es `default-src 'self'`: **ningún CDN**; todo recurso se
   sirve desde el propio sitio.
7. **Sin atributos `style` en el marcado** (la CSP los bloquea y `verify-build` falla). Estilos en el
   `<style>` del componente o en `src/styles/`.
8. **Hexágono (ADR 0001):** `packages/core` no usa DOM ni importa adaptadores; solo
   `src/composition-root.ts` importa `@lingualab/adapters`. Lo comprueban `npm run deps:check` y
   `src/lib/architecture.test.ts`.
9. **Un recurso pesado servido desde `public/`** va en `public/<motor>/<versión>/`, con su versión en
   `src/config/engines.json`, su carpeta en `ENGINE_DIRS` (`src/config/engines.ts`) y su regla
   `immutable` en `vercel.json`. `src/config/engines.test.ts` exige las tres cosas y que los archivos no
   sean ejecutables.
10. **Commits:** Conventional Commits en español, encabezado de 100 caracteres como máximo y líneas del
    cuerpo también cortas (commitlint rechaza las largas). **Sin** líneas `Co-Authored-By` ni atribución
    de IA. Push con
    `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push` si el push normal
    rechaza cambios en `.github/workflows/`.
11. **Documentos:** `docs/STATUS.md`, `README.md` y este traspaso no copian cifras de pruebas
    (`src/lib/docs.test.ts` falla). Solo un documento de `odd/tasks/` puede tener `status: active`.
12. **Preguntar de a una decisión.** El dueño pidió que se le explique y se le pregunte; las decisiones
    abiertas son D3–D5 (§8). No se decide por él.

## 4. Lo que ya está hecho en la rama

| Commit | Qué |
|---|---|
| `52ec25c` | Abre `odd/tasks/rework-v4.md` con el diagnóstico medido |
| `bf93d89`, `1ae6e36` | **T1.** Cada herramienta declara `theory` y `references` en `src/data/tools.json`; bibliografía verificada en `src/data/references.json`; `TheoryNote.astro` al pie de cada herramienta; apartado `#referencias` en Acerca |
| `03ec0d8`, `69e7cbb` | **T2.** Transcriptor propio (`packages/core/src/g2p/`): español por reglas, inglés con CMUdict (`public/cmudict/<versión>/`, generado por `scripts/build-cmudict.mts`). eSpeak NG retirado. Medición: `scripts/eval-g2p.mts` |
| `0b514b7` | **T5, primera parte.** F0, F1 y F2 validados contra Praat 6.4.49 en tres vocales (`scripts/build-acoustic-reference.mjs`, `e2e/fixtures/reference/`, `docs/validation/acoustic.md`). **T9, primera parte:** FonoLab usa el transcriptor del sitio. Ficha de X-barra corregida |

| (este commit) | **T5, unidad 5.2 en parte:** espectrograma en grises, 5 ms, 0–5000 Hz, 70 dB, lienzos más altos |

Puerta completa y e2e en verde en el último commit de código.

## 5. Tecnología: lo que hay y lo que se propone

### Lo que hay (no cambiar sin motivo medido)

| Capa | Tecnología | Nota |
|---|---|---|
| Sitio | Astro 7.4.1, salida estática, TypeScript 6 estricto | Astro 7.4.2 pide Node ≥ 22.23.4 (P23): no subir sin subir Node |
| Estilos | CSS propio con tokens en `src/styles/` | Sin framework de CSS ni de componentes. Sin atributos `style` |
| Núcleo | `packages/core`: dominio, casos de uso, puertos, motores puros | Sin DOM. Aquí va toda lógica lingüística o numérica |
| Adaptadores | `packages/adapters`: IndexedDB, workers, WebAssembly, red | Solo los importa `src/composition-root.ts` |
| Pruebas | Vitest 5 (`unit` en Node, `dom` con happy-dom para `*.dom.test.ts`), Playwright 1.64 + axe | e2e en el puerto 4331 |
| Calidad | Biome 2.6.3, dependency-cruiser, commitlint, Husky + lint-staged | |
| Motores servidos | Pyodide 314.0.7 (conversor ELAN), praatfan 0.1.13 (acústica), CMUdict 2025.10.24 | En `public/<motor>/<versión>/`, inmutables |
| Despliegue | Vercel, solo estático; cabeceras en `vercel.json` | CSP `default-src 'self'`: ningún CDN |
| En la máquina del dueño | Node 22.23.3, Praat 6.4.49, R 4.3.3, ffmpeg, Rust 1.99.1 (`~/.cargo/bin`, destino wasm32), sin Go | |

### Lo que se propone, por tarea

| Para | Propuesta | Por qué | Alternativa y cuándo |
|---|---|---|---|
| T5 visor | **Canvas 2D + TypeScript**, un solo componente «editor» | El cuello de botella no es el cálculo: es la disposición. praatfan ya da los números de Praat | **Rust → WebAssembly** solo para el espectrograma, y solo si medir (`performance.now()` sobre 60 s de audio a 44,1 kHz) da más de ~300 ms por redibujado |
| T6 estadística | **Motor propio en TypeScript validado contra R** para lo descriptivo y las pruebas básicas | Pesa kilobytes, carga al instante, y cada resultado se contrasta con R 4.3.3 igual que la acústica con Praat | **webR 0.6.1** (R real en WebAssembly, ~38 MB, GPL): solo si el dueño quiere modelos mixtos o paquetes de R. Es la decisión D4 |
| T6 gráficos | SVG generado a mano o **Observable Plot** empaquetado localmente | SVG es accesible, exportable y respeta la CSP | Verificar licencia (ISC) y peso antes de añadirlo; debe tener ≥ 14 días de publicada la versión |
| T7 cualitativo | TypeScript + IndexedDB (el patrón de `annotation-storage.ts`) | Son datos del usuario: no salen del navegador | — |
| T4 árboles | TypeScript; un analizador y un validador **por formalismo** | Cada teoría tiene su notación; un analizador de corchetes no sirve para todas | — |
| Go / servidor | **No** | Decisión D1 del dueño y ADR 0002: nada de servidor propio | — |

**Regla para añadir una dependencia:** versión fijada exacta; licencia compatible con GPL-3.0 leída del
propio paquete; publicada hace al menos catorce días; anotada en `THIRD_PARTY_NOTICES.md`; si se sirve
desde `public/`, regla 9 de §3. Si se puede escribir en menos de ~200 líneas probadas, no se añade.

## 6. Plan de las tareas que faltan

| Tarea | Estado | Bloqueada por | Tamaño |
|---|---|---|---|
| T5 Visor acústico estilo Praat | validación hecha; falta la interfaz | nada | grande |
| T9 Contrato único de herramienta | empezada | nada | mediana |
| T7 Análisis cualitativo | sin empezar | nada | grande |
| T4 Árboles | ficha corregida; falta lo demás | D3 | grande |
| T6 Estadística cuantitativa | sin empezar | D4 | grande |
| T8 Diseño | sin empezar | D5 | grande |
| T10 Cierre | sin empezar | todas | pequeña |

Cada tarea grande se parte en unidades de un commit. **Cada unidad:** prueba en rojo → código → puerta →
commit → push → fila y Log del documento ODD.

### T5 — Visor acústico al estilo de Praat (S7)

**Pedido textual:** «el visualizador acústico tiene que ser más intuitivo, que todo esté separado y
modularizado puede mejorarse para que se parezca más a praat en sus partes más funcionales».

**Diagnóstico medido (2026-11-12, con una vocal cargada y el análisis corrido):**

- La página `/visualizador` mide **unos 8000 px de alto** a 1360 px de ancho. En Praat todo cabe en una
  ventana. Ese es el problema principal: para ver el tono hay que alejarse de la onda.
- La forma de onda y el espectrograma miden unos **80 px de alto** cada uno. Son lo más importante y lo
  más pequeño.
- Los controles están repartidos en tarjetas apiladas: cargar, reproducir, espectrograma, análisis
  acústico, capas, intervalos, proyecto, exportar. Cada análisis (tono, formantes, intensidad) tiene su
  botón y su propio lienzo, lejos de la onda.
- El espectrograma usa una paleta de color y ventana de 25 ms. Praat usa **escala de grises y 5 ms**
  (banda ancha, la que deja ver los formantes): un estudiante que compare con su manual verá otra cosa.
- No hay ejes con unidades en el espectrograma, ni lectura de la selección (inicio, fin, duración), ni
  lectura del cursor en Hz.

**Qué es «parecerse a Praat» aquí** (ventana *SoundEditor* / *TextGridEditor*; verificar cada punto en el
manual, ver búsquedas):

1. **Una sola vista apilada y alineada en el tiempo:** onda arriba, espectrograma debajo, capas de
   anotación debajo, todo con el mismo eje y la misma selección.
2. **Las curvas van sobre el espectrograma:** tono en azul con su escala a la derecha, formantes como
   puntos rojos, intensidad en amarillo. No en lienzos aparte.
3. **Selección por arrastre** y lectura arriba: inicio, fin y duración; cursor con tiempo, y frecuencia a
   la altura del puntero.
4. **Barras de reproducción bajo las capas:** visible, selección, total.
5. **Botones de zoom:** todo, acercar, alejar, a la selección, atrás.
6. **Menús por magnitud** (Espectro, Tono, Intensidad, Formantes): mostrar u ocultar y ajustes.
7. **Consultas:** «Obtener tono», «Obtener F1…» sobre el cursor o la media de la selección.
8. **Atajos:** Tab reproduce la selección, Mayús+Tab el tramo visible, Ctrl+I acercar, Ctrl+O alejar,
   Ctrl+N a la selección, Ctrl+A todo.

**Unidades, en orden:**

| # | Unidad | Archivos principales | Hecho cuando |
|---|---|---|---|
| 5.1 | **Editor de una pantalla.** Rehacer el marcado: zona de lienzos alta (onda ~25 %, espectrograma ~45 %, capas el resto de `min(70vh, 640px)`), barra de herramientas arriba, y todo lo demás (proyecto, exportar, tabla de medidas, gráfico vocálico) en pestañas o paneles plegables debajo | `src/components/AudioLab.astro`, `src/scripts/audio/elements.ts`, `canvas-view.ts`, `render.ts` | Con audio cargado, onda + espectrograma + capas + transporte caben en 900 px de alto; e2e nueva que lo mide con `boundingBox()`; reflujo a 320 px sigue en verde |
| 5.2 | **Espectrograma como el de Praat.** *Hecho en parte:* grises por defecto con selector de paleta, ventana de 5 ms, 0–5000 Hz, 70 dB, lienzos más altos. **Falta:** (a) el dibujo queda en bloques: 5 ms a 22 kHz son 110 muestras y la FFT de 128 da bandas de ~172 Hz; rellenar con ceros hasta 512 o 1024 puntos e interpolar entre bandas al pintar; (b) eje de frecuencia rotulado en Hz; (c) ventana gaussiana como la de Praat, si se quiere el mismo dibujo | `src/scripts/audio/spectrogram.ts` (`spectrogramColumns`: `fftSize`), `render.ts` (`drawSpectrogram`) | Prueba: un tono de 1000 Hz cae en la fila correcta con error menor de 50 Hz; captura junto a la de Praat en `docs/validation/acoustic.md` |
| 5.3 | **Curvas superpuestas.** Tono, formantes e intensidad sobre el espectrograma, con casillas «mostrar», y análisis automático del tramo visible (con el límite de duración que Praat también aplica: no analizar si se ven más de 10 s) | `acoustic-render.ts`, `acoustic-analysis.ts` (725 líneas: partirlo por magnitud al tocarlo) | e2e: al cargar un audio corto las tres curvas se dibujan sin pulsar nada; se pueden ocultar |
| 5.4 | **Selección y lecturas.** Arrastre para seleccionar, lectura de inicio/fin/duración, cursor con Hz, barras de reproducción, zoom a la selección | `selection.ts` (existe y tiene pruebas), `transport.ts`, `playback.ts`, `viewer-controls.ts` | Pruebas unitarias de la geometría de la selección; e2e de arrastre con `page.mouse` |
| 5.5 | **Consultas y atajos.** «Obtener tono / F1 / F2 / intensidad» en el cursor o en la selección; atajos de Praat; ayuda de atajos visible | `acoustic-measure.ts`, `viewer-controls.ts` | Los valores de consulta coinciden con los de `e2e/fixtures/reference/*.json`; e2e de teclado |
| 5.6 | **Intensidad contra Praat.** Añadir `intensity` al arnés y al script de referencias (`To Intensity: 100, 0, "yes"`, `Get value at time`) | `packages/adapters/src/acoustic/validation/`, `scripts/build-acoustic-reference.mjs` | La intensidad pasa a «validada» en la interfaz y en el documento, o se documenta la diferencia |
| 5.7 | **TextGrid contra Praat (cierra P17).** Script que exporta un TextGrid del visor, lo abre con `praat --run` (`Read from file`, `Get number of tiers`, `Get number of intervals`, etiquetas) y compara | `scripts/`, `src/scripts/audio/textgrid-io.ts`, `docs/PENDING.md` P17 | La ida y vuelta por Praat da las mismas capas, intervalos y etiquetas; se quita el aviso «experimental» del visor |

**Hallazgo sin resolver, para la unidad 5.3 (comprobar antes de construir encima):** en una captura del
visor con `e2e/fixtures/reference/vocal-a.wav` y los formantes superpuestos, las líneas **no parecen**
caer donde Praat mide. Praat da, en t = 0,214 s, F1 = 914 Hz y F2 = 1328 Hz; a ojo, la línea azul («F1»)
queda cerca de 1150 Hz y la roja («F2») cerca de 2600 Hz, que es donde estaría F3. Puede ser la escala
vertical de la superposición, el orden o color de las pistas, o que el panel analiza con techo de 5500 Hz
y no de 5000. **No está diagnosticado.** Cómo comprobarlo: una prueba de `acoustic-render.ts` que pinte
una pista constante de 1000 Hz sobre un lienzo de 0 a 5000 Hz y exija la fila `0,8 × alto`; y una e2e que
lea de la tabla de medidas el F1 y el F2 de un intervalo sobre esa vocal y los compare con el JSON de
referencia. La validación numérica del motor (§4) **no** cubre lo que se dibuja ni la tabla de la página.

**Accesibilidad que no se puede perder:** hoy el cursor y los intervalos se manejan con teclado y hay una
tabla de intervalos equivalente al lienzo. Un lienzo no es accesible por sí solo: cada cosa que se haga
con el ratón debe poder hacerse con el teclado, y las lecturas van en texto con `aria-live`.

**Si hay que medir si hace falta Rust:** generar 60 s de ruido a 44,1 kHz, medir el cálculo del
espectrograma visible con `performance.now()` en Chromium y anotar la cifra en el Log. Menos de ~300 ms:
TypeScript se queda. Más: primero probar un worker y reducir a los píxeles visibles; Rust es el último
recurso (crate con `wasm-bindgen`, salida en `public/<motor>/<versión>/`, regla 9).

### T9 — Contrato único de herramienta y carga bajo demanda (S1)

**Pedido textual:** «quiero que hagas las cosas más modulares».

**Estado:** FonoLab ya usa `lingualab.phonemizeText`. Queda:

1. **Inventario primero.** Para cada página de herramienta (`src/components/*Lab.astro`,
   `TextStation`, `Landing`), anotar: qué importa de `composition-root`, qué lógica vive dentro del
   `<script>` del componente y cuánto pesa su script (lo imprime `scripts/verify-build.mjs`). Con
   CodeGraph: `codegraph_explore "composition-root lingualab safeInit"`.
2. **Sacar la lógica de los `.astro`.** Regla objetivo: un `<script>` de componente solo conecta
   elementos con funciones; toda regla con un `if` lingüístico o numérico vive en `src/scripts/<área>/`
   (con prueba) o en `packages/core`. El visor de audio ya sigue este patrón (`src/scripts/audio/`):
   úsalo de modelo. Candidatos conocidos: `PhonemizerLab.astro` y `FonoLab.astro` (cientos de líneas
   de script en el componente).
3. **Una forma común** `src/scripts/core/tool.ts`: `defineTool({ id, root, init })` que envuelva
   `safeInit`, localice la raíz por `data-*`, y dé `say(estado, mensaje)` para la región `aria-live`.
   Migrar una herramienta por commit.
4. **Portada.** `src/scripts/home/transcriber.ts` usa a propósito la tabla de la herramienta de
   Ortografía (muestra las dos capas y marca la diferencia). No es un tercer transcriptor que haya que
   borrar; decidir con el dueño si la portada debe mostrar el motor nuevo.
5. **Prueba de arquitectura:** ampliar `src/lib/architecture.test.ts` para que falle si un `.astro`
   de herramienta supera un tope de líneas de script (fijar el tope después del inventario).

**Hecho cuando:** ninguna herramienta tiene reglas dentro del `.astro`; todas se inicializan igual; la
puerta y la e2e siguen en verde; el peso por página no sube.

### T7 — Análisis cualitativo (S9)

**Pedido textual:** «una herramienta de estadística para ciencias sociales, ya sea a nivel cualitativo o
cuantitativo, has la diferenciación».

**Qué es** (el equivalente mínimo y honesto de ATLAS.ti / NVivo / Taguette, en el navegador):

| # | Unidad | Hecho cuando |
|---|---|---|
| 7.1 | **Dominio** en `packages/core/src/qualitative/`: `Document`, `Code` (nombre, definición, color, código padre), `Segment` (documento, inicio, fin, códigos), `Memo`. Funciones puras: aplicar y quitar un código, fusionar códigos, segmentos solapados | Pruebas por regla; ningún DOM |
| 7.2 | **Libro de códigos:** crear, definir, jerarquizar, fusionar; exportar a CSV y a REFI-QDA Codebook (`.qdc`, XML) | El `.qdc` valida contra el esquema publicado (ver búsquedas) |
| 7.3 | **Codificar texto:** pegar o cargar `.txt`, seleccionar, aplicar código con teclado o ratón, ver los segmentos resaltados (con patrón además de color: WCAG 1.4.1) | e2e: codificar, recargar la página y que siga ahí |
| 7.4 | **Consultas:** frecuencia por código y por documento, tabla de coocurrencias, recuperar todos los segmentos de un código; exportar CSV | Cifras comprobadas a mano sobre un ejemplo pequeño que vive en las pruebas |
| 7.5 | **Acuerdo entre codificadores:** kappa de Cohen (dos codificadores) y alfa de Krippendorff (nominal) | Valores iguales a los de R (`irr::kappa2`, `irr::kripp.alpha`) con cuatro decimales, sobre los ejemplos publicados en los artículos |
| 7.6 | **Página** `/cualitativo` (es y en), entrada en `tools.json` con `theory` y `references`, guardado en IndexedDB con el patrón de `src/scripts/audio/annotation-storage.ts` y exportación del proyecto completo | Regla 4 de §3 cumplida; axe sin violaciones |

**Límites que la interfaz debe decir:** no codifica sola ni «encuentra temas»; el acuerdo solo vale si los
dos codificadores trabajaron sobre las mismas unidades; es para corpus de tamaño de trabajo de curso.

### T4 — Árboles sintácticos fieles a su teoría (S4) — espera D3

**Pedido textual:** «podríamos revisar si son realmente correspondientes a la teoría de la que salen los
metodos de los árboles».

**Diagnóstico:** `src/data/trees/types.ts` declara 23 tipos: 14 formalismos lingüísticos, uno general, siete
estructuras de datos y una tabla comparativa. De los 14 lingüísticos, 13 usan el mismo analizador de
corchetes (`mode: "bracket"`) y solo `xbar` y `movement` tienen reglas propias en
`src/scripts/trees/checks.ts`; `dependency` tiene modo propio (`dep`). CCG, LFG, HPSG, gramática
relacional y Reed–Kellogg **no son árboles de constituyentes**: dibujarlos con corchetes es mostrar otra
cosa con su nombre. Las siete estructuras de datos son de informática (BST, AVL, rojo-negro, montículo,
trie, expresiones, Huffman).

**Recomendación para D3:** conservar y validar de verdad seis (constituyentes, X-barra, movimiento,
dependencias UD, minimista con Ensamble, morfología); **retirar del selector, con una nota que lo
explique,** los que no se pueden representar bien todavía (CCG, LFG, HPSG, relacional, Reed–Kellogg, TAG,
cartografía, semántico) hasta hacerlos uno por uno; y mover las estructuras de datos a un apartado
«Informática» o quitarlas. Retirar con explicación es mejor que mostrar algo incorrecto.

**Unidades (para cada formalismo que se quede):**

1. Fuente primaria verificada y añadida a `references.json` (ver búsquedas).
2. Lista escrita de **condiciones de buena formación** tomadas de esa fuente, en el comentario de
   cabecera del validador, cada una con su página o sección.
3. Validador en `src/scripts/trees/checks/<formalismo>.ts` con una prueba por condición: un árbol que la
   cumple y otro que la viola. Mensajes que **explican** la condición al estudiante y enlazan la teoría.
4. Ejemplos de `src/data/trees/examples.ts` revisados contra la fuente: cada ejemplo cita de dónde sale.
5. Ficha (`blurb_es`, `blurb_en`) reescrita y revisada.

Condiciones de partida a comprobar contra las fuentes (no darlas por buenas sin leerlas):

- **X-barra:** todo SX tiene un núcleo X de la misma categoría; niveles X → X′ → SX; complemento hermano
  de X; adjunto hermano e hijo de X′; especificador hijo de SX; ramificación binaria.
- **Dependencias (UD):** una sola raíz; cada palabra tiene exactamente un núcleo; sin ciclos; relación
  del inventario UD v2; proyectividad como aviso, no como error.
- **Minimista:** solo Ensamble binario; etiquetas proyectadas desde el núcleo; movimiento como Ensamble
  interno con copia; sin niveles barra intermedios como primitivos.
- **Movimiento:** la huella o copia queda mandada-c por el elemento movido; índices coincidentes.

### T6 — Estadística cuantitativa (S9) — espera D4

**Recomendación para D4:** motor propio en TypeScript, validado contra R 4.3.3 (instalado). Cubre lo que
un estudiante de ciencias sociales usa en un trabajo de curso; webR queda como ampliación futura si se
piden modelos avanzados.

| # | Unidad | Contraste con R |
|---|---|---|
| 6.1 | **Datos:** pegar o cargar CSV/TSV, detectar tipo de variable (nominal, ordinal, numérica), valores perdidos explícitos | — |
| 6.2 | **Descriptivos:** n, media, mediana, moda, desviación estándar, varianza, cuartiles (tipo 7, el de R), rango, asimetría; tablas de frecuencia | `summary`, `sd`, `quantile(type = 7)` |
| 6.3 | **Distribuciones** en `packages/core/src/stats/distributions.ts`: normal, t, χ², F (función de distribución e inversa) | `pnorm`, `pt`, `pchisq`, `pf`, `qt`… con al menos seis decimales |
| 6.4 | **Pruebas:** t de una muestra, de Welch y pareada; χ² de independencia y de bondad de ajuste; correlación de Pearson y de Spearman; ANOVA de un factor; Mann–Whitney y Wilcoxon | `t.test`, `chisq.test`, `cor.test`, `aov`, `wilcox.test` |
| 6.5 | **Tamaños del efecto e intervalos:** d de Cohen, V de Cramér, r, η²; intervalo de confianza al 95 % | paquete `effectsize`, o fórmula citada |
| 6.6 | **Regresión lineal simple y múltiple:** coeficientes, errores estándar, R², residuos | `lm`, `summary.lm` |
| 6.7 | **Gráficos** en SVG: histograma, caja, barras, dispersión con recta; exportables; con tabla equivalente | — |
| 6.8 | **Página** `/estadistica`, con un asistente «¿qué prueba necesito?» según el tipo de variables, los supuestos de cada prueba dichos antes del resultado, e informe en formato APA | — |

**Cómo se valida (el mismo método que la acústica):** un `scripts/build-stats-reference.R` que corre R
sobre conjuntos de datos fijos (`iris`, `mtcars`, `ToothGrowth`, que vienen con R) y escribe
`packages/core/src/stats/__fixtures__/*.json`; las pruebas comparan con tolerancia de 1e-6. Se versionan
los resultados para que la suite corra sin R.

**Lo que la interfaz no debe hacer:** dar un valor p sin el tamaño del efecto; elegir la prueba por el
usuario sin decir los supuestos; llamar «significativo» a nada sin el umbral a la vista.

### T8 — Diseño (S11, S6) — espera D5

**Pedido textual:** «me gusta mucho el front pero puedes hacerlo mejor, revisa páginas parecidas y copia
diseños o escanea repositorios de diseño para que sea más llamativa, intuitiva y útil».

1. **Referencias** (ver búsquedas): 6–8 sitios, con captura y una frase de qué se toma de cada uno.
2. **Tres direcciones en maqueta estática** (portada + una herramienta) para que el dueño elija: es la
   decisión D5. No se aplica nada antes de que elija.
3. **Aplicar por tokens:** los cambios van en `src/styles/` (tokens de color, tipografía, espacio), no
   en cada componente. Tipografías ya instaladas: Bricolage Grotesque, Atkinson Hyperlegible Next,
   JetBrains Mono, Noto Sans (para el AFI).
4. **Para estudiantes (S6):** cada herramienta abre con un ejemplo cargable de un clic, un «qué hace y
   qué no» de dos líneas y el glosario enlazado desde los términos técnicos.
5. **No se negocia:** WCAG 2.2 AA (axe en claro y oscuro), reflujo a 320 px, sin atributos `style`,
   presupuesto de 60 KB comprimidos por página (`verify-build`).

### T10 — Cierre

`npm run verify:all`, `npm run test:e2e`, `npm run status:measure`, un verificador independiente que
lea el documento ODD entero y dé veredicto por cada S1–S11, `npm run live:check` contra la vista previa
de Vercel de la rama, y el traspaso reescrito. Después, **el dueño** decide el merge.

## 7. Búsquedas: qué buscar, dónde y cómo se da por verificado

**Protocolo (regla 4 de §3):** fuente primaria antes que resúmenes; un DOI se comprueba en
`https://api.crossref.org/works/<doi>` y el título debe coincidir; una página se abre y se lee; cada
referencia entra en `src/data/references.json` con `verifiedOn`. Lo que no se pudo abrir **no se cita**.
Antes de añadir una dependencia: `npm view <paquete> version time license`.

| Para | Qué buscar | Dónde | Qué anotar |
|---|---|---|---|
| T5 | Manual de Praat: «SoundEditor», «TextGridEditor», «Intro 3.1 Viewing a spectrogram», «Spectrogram settings», «Sound: To Intensity», atajos | `https://www.fon.hum.uva.nl/praat/manual/` | Valores por defecto exactos y atajos; ya está la referencia `praat` y `boersma1993` |
| T5 | Formato TextGrid (largo y corto) | Manual de Praat, «TextGrid file formats» | Diferencias con `textgrid-io.ts` |
| T4 | Universal Dependencies v2: relaciones y condiciones de árbol | `https://universaldependencies.org/u/dep/` y `demarneffe2021` (ya verificada) | Inventario de relaciones para el validador |
| T4 | X-barra: Jackendoff (1977) *X̄ Syntax*; Chomsky (1970) «Remarks on nominalization». Manual de apoyo: Carnie, *Syntax: A Generative Introduction* | Catálogo de MIT Press / WorldCat (libros sin DOI: usar ISBN y página del editor) | Página de cada condición |
| T4 | Minimista: `chomsky1995` (ya verificada); Adger (2003) *Core Syntax* | Editor / WorldCat | Definición de Ensamble y etiquetado |
| T4 | CCG (Steedman 2000), LFG (Bresnan 2001; Dalrymple 2001), HPSG (Pollard y Sag 1994), TAG (Joshi y Schabes 1997), cartografía (Rizzi 1997) | Editor / Crossref | Solo si D3 decide rehacerlos |
| T6 | Cuantiles: Hyndman y Fan (1996). t de Welch (1947). Tamaño del efecto: Cohen (1988). Manual: Field, *Discovering Statistics*; Navarro, *Learning Statistics with R* (libre) | Crossref; `https://learningstatisticswithr.com` | Fórmula exacta que se implementa y su referencia |
| T6 | webR: versión, tamaño, licencia, requisitos de cabeceras (COOP/COEP) | `https://docs.r-wasm.org/webr/latest/` y `npm view webr` | Solo si D4 elige webR. Ojo: puede pedir `SharedArrayBuffer` y cabeceras que hoy `vercel.json` no envía |
| T7 | Kappa: Cohen (1960). Alfa: Krippendorff (2011) «Computing Krippendorff's Alpha-Reliability». Análisis temático: Braun y Clarke (2006). Codificación: Saldaña, *The Coding Manual* | Crossref (Cohen: `10.1177/001316446002000104`; Braun y Clarke: `10.1191/1478088706qp063oa`, **comprobar ambos**) | Fórmulas y ejemplos numéricos para las pruebas |
| T7 | Estándar REFI-QDA (intercambio entre ATLAS.ti, NVivo, MAXQDA) | `https://www.qdasoftware.org` | Esquema XML del libro de códigos |
| T8 | Sitios de referencia: Praat y ELAN (para lo que **no** copiar), Observable, Desmos, Wolfram|Alpha, Glottolog, WALS, Khan Academy, Distill | Navegador | Captura + qué se toma |
| T8 | Sistemas de diseño abiertos | Radix (colores), Open Props, `https://www.w3.org/WAI/ARIA/apg/patterns/` | Solo patrones y tokens; no instalar un framework |

Herramientas de búsqueda en este repositorio: **CodeGraph** antes que grep para preguntas de estructura
(`codegraph_explore "<símbolos>"`); `context7` para documentación de bibliotecas; el navegador para lo
demás. Los DOI de la tabla salen de memoria: **son pistas, no citas**, hasta abrirlos.

## 8. Decisiones del dueño

Se le pregunta **una** cuando se llega a la tarea que la necesita, con la recomendación y su porqué.

| | Estado | Recomendación |
|---|---|---|
| D1 Dónde corren los motores | **Resuelta:** navegador; Rust a WebAssembly solo donde se mida | — |
| D2 Lenguas del transcriptor | **Resuelta:** solo español e inglés | — |
| D3 Formalismos de árbol sin reglas propias, y estructuras de datos | Abierta | Validar seis de verdad; retirar con explicación el resto; estructuras de datos, fuera o aparte (§6, T4) |
| D4 Motor de estadística | Abierta | Motor propio en TypeScript validado contra R; webR solo si se piden modelos avanzados (§6, T6) |
| D5 Dirección de diseño | Abierta | Se decide sobre tres maquetas (§6, T8) |
| Portada: ¿motor nuevo o tabla de Ortografía? | Abierta, menor | Dejarla como está (§6, T9) |
| Licencia: seguir en GPL-3.0-only | Abierta, menor | No tocarla: praatfan es GPL |

## 9. Asuntos abiertos fuera del código

- **Revisión de gentle-ai.** El repositorio tiene activo el desarrollo guiado por recibos: al terminar un
  turno con commits nuevos, un gancho pide correr `gentle-ai review start …` tal como lo entrega. Si
  devuelve una consulta de consentimiento (`consent_required`), **se le traslada completa al dueño y no se
  responde por él**. El dueño declinó la revisión del commit `69e7cbb`. Un agente que no sea Claude Code
  no tiene ese gancho: puede ignorar este punto.
- **Memoria Engram:** en esta máquina las escrituras fallaron. El registro completo está en el
  repositorio, no en la memoria.
- **Límite de uso del dueño:** trabaja con un plan con tope de cinco horas y otro semanal. Conviene
  commitear seguido, no releer archivos ya leídos, limitar la salida de los comandos (`| tail`, `| grep`)
  y dejar este traspaso al día antes de agotar la sesión.
- **Pendientes anteriores** que siguen en `docs/HUMAN-EVIDENCE.md`: descartar en GitHub cinco alertas de
  CodeQL justificadas, proteger `main` también para administradores, subir el piso de Node para Astro
  7.4.2 (P23), etiquetas `v3.0.0` y `v3.1.0`.

## 10. Dónde está cada cosa

| Pregunta | Documento o carpeta |
|---|---|
| Qué pidió el dueño, textual, y qué se decidió | [`odd/tasks/rework-v4.md`](../tasks/rework-v4.md) |
| En qué se puede confiar hoy | [`docs/STATUS.md`](../../docs/STATUS.md) |
| Cifras de la última medición | [`docs/metrics.json`](../../docs/metrics.json) (`npm run status:measure`) |
| Qué falta en el código | [`docs/PENDING.md`](../../docs/PENDING.md) |
| Qué solo puede cerrar una persona | [`docs/HUMAN-EVIDENCE.md`](../../docs/HUMAN-EVIDENCE.md) |
| Cómo se trabaja aquí | [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) |
| Por qué el sistema es así | [`docs/adr/`](../../docs/adr/) y [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
| Validación acústica contra Praat | [`docs/validation/acoustic.md`](../../docs/validation/acoustic.md) |
| Catálogo y bibliografía | `src/data/tools.json`, `src/data/references.json` |
| Páginas (una por herramienta, y su par en `en/`) | `src/pages/`, componente en `src/components/<Nombre>Lab.astro` |
| Lógica de cada herramienta | `src/scripts/<área>/` y `packages/core/src/` |
| Textos de la interfaz | `src/i18n/messages/{es,en}.ts` y `src/i18n/messages/features/` |
| Cableado de adaptadores | `src/composition-root.ts` (el único que importa `@lingualab/adapters`) |
