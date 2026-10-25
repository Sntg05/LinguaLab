# LinguaLab

Herramientas de lingüística que corren enteramente en tu navegador: fonética con
corte sagital, transcripción ortográfica y fonémica, árboles sintácticos y de
estructuras de datos, y análisis de corpus. Sin cuentas, sin servidor de análisis,
sin telemetría.

**Sitio:** https://lingualab-beta.vercel.app · **Inglés:** `/en/`

---

## Qué hay dentro

Las filas siguen el mismo orden que el catálogo: de la fonética hacia el discurso.

| Página | Qué hace |
|---|---|
| `/fono` | **FonoLab** — alfabeto AFI, corte sagital del aparato fonador, audio con licencia y transcriptor de grafemas a AFI |
| `/ortografia` | **Ortografía a AFI** — editor de tablas grafema→AFI con contexto, prioridad, capa alofónica y rastro por carácter; trae demos en español, inglés, portugués brasileño y wayuunaiki, y plantillas indígenas vacías |
| `/fonemizador` | **Fonemizador** — texto a AFI para español e inglés con eSpeak NG compilado a WebAssembly, dentro de un Web Worker |
| `/arboles` | **ArborLab** — 23 tipos de árbol, 4 formatos de entrada, exportación a SVG, PNG, JSON, Newick, CoNLL-U y Brat |
| `/tools` | **Estación textual** — frecuencia con dispersión, colocaciones con log-Dice y PMI, concordancias KWIC, estadísticas léxicas y legibilidad, más un **constructor de n-gramas** (n de 2 a 5) |
| `/visualizador` | **Visor de audio** — forma de onda, espectrograma y edición de capas de intervalos, con importación y exportación de TextGrid y exportación CSV (**experimental**) |
| `/experimentos` | **Experimentos** — constructor y ejecutor de cuatro tareas de psicolingüística con jsPsych: estímulos por CSV, semilla reproducible, vista previa y resultados a CSV |
| `/elan` | **Conversor ELAN ↔ TextGrid** — Pyodide con pympi-ling en un worker, informe de lo que no se pudo convertir (**experimental**) |
| `/lenguas` | **Mapa de lenguas de Colombia** — 136 lenguas de Glottolog en un mapa propio (sin teselas ni terceros), con tabla accesible, filtros y ficha por lengua |
| `/catalogo` | **Catálogo de herramientas** — todas las herramientas ordenadas por nivel de análisis, con su estado real, incluidas las alojadas fuera |
| `/glosario` | Glosario bilingüe filtrable |
| `/bibliografia` | Recursos con licencia y enlace de origen |
| `/seguridad` | Verificación en vivo de las salvaguardas, leyendo el DOM real |
| `/acerca` | Qué es, para quién, licencias y preguntas frecuentes |

Cada página existe en español (raíz) y en inglés (`/en/`), declaradas con
`hreflang`.

La barra superior tiene tres entradas fijas —**Catálogo de herramientas**,
**Bibliografía** y **Acerca de**— y no crece con cada herramienta nueva: las
herramientas viven dentro del catálogo, agrupadas por nivel de análisis. El pie
mantiene la lista completa, derivada de la misma configuración.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:4321
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila el sitio estático en `dist/` |
| `npm run check` | Comprueba tipos del sitio con `astro check` |
| `npm run typecheck:packages` | Comprueba tipos del workspace; el núcleo no tiene `lib.DOM` |
| `npm run lint` | Biome sobre `packages/**` y los archivos de herramienta |
| `npm run deps:check` | Reglas de dependencia hexagonales (dependency-cruiser) |
| `npm test` | Pruebas unitarias (Vitest): sitio, núcleo y adaptadores |
| `npm run test:e2e` | Playwright contra el sitio compilado: accesibilidad y flujos reales (necesita `npx playwright install chromium` una vez) |
| `npm run audit` | Bloquea si el árbol de producción tiene una vulnerabilidad `high`; informa el de desarrollo sin cortar |
| `npm run lint:baseline` | Atribuye cada aviso del linter a `main` o al árbol actual, en vez de inferirlo (ver P8) |
| `npm run verify` | Tipos + pruebas + compilación + verificación del resultado |
| `npm run verify:build` | Solo la verificación del resultado compilado |
| `npm run verify:all` | **La puerta completa**: todo lo anterior en orden |

`npm run verify:all` es la puerta completa: si pasa, el sitio es publicable y el
núcleo no rompió ninguna de sus reglas. `npm run verify` se conserva con el
mismo significado que tenía antes de que existiera el workspace.

## Arquitectura

LinguaLab es un **npm workspace** con un hexágono en el centro:

```
packages/
├── core/           dominio, puertos y casos de uso — TypeScript puro, sin DOM
└── adapters/       implementaciones de los puertos sobre APIs del navegador
src/                el adaptador primario: el sitio Astro
```

El núcleo **no sabe que existe un navegador**, y eso no se le pide por favor:
`packages/core/tsconfig.json` declara `"lib": ["ES2022"]` y `"types": []`, así
que `document`, `window` y `fetch` simplemente no existen ahí dentro. Las flechas
de dependencia se comprueban en CI con dependency-cruiser: el núcleo no importa
adaptadores, un adaptador no conoce la pantalla que lo invoca, y la interfaz solo
toca adaptadores desde el composition root. El mapa completo, con la tabla de
puertos y su adaptador previsto, está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

El sitio, encima de ese núcleo, es Astro 7 con salida estática, TypeScript
estricto y **ningún framework de UI**. Las herramientas son cálculo puro más DOM,
así que un runtime de framework se pagaría sin obtener nada a cambio: la
interactividad son bloques de TypeScript que Astro empaqueta por página.

```
src/
├── components/     componentes de página (Astro)
├── layouts/        Base.astro: documento, fuentes, SEO, CSP
├── pages/          rutas; es en la raíz, en en /en/
├── data/           datos tipados: AFI, glosario, bibliografía, árboles
├── i18n/           diccionarios y resolución de rutas por idioma
├── scripts/
│   ├── core/       tema, navegación, guardrails, comprobaciones de seguridad
│   ├── fono/       fonética, audio, corte sagital
│   ├── trees/      parse, layout, render, checks, solvers, export
│   └── tools/      tokenización, análisis, legibilidad, catálogos
└── styles/         tokens, base, layout, componentes, utilidades
```

Las traducciones se resuelven **en la compilación**: cada idioma es su propia
página estática. No hay diccionario en el cliente, ni parpadeo de idioma, y
desaparece toda la superficie de `innerHTML` que tenía el motor de i18n anterior.

Los datos de `src/data/` y los diccionarios de `src/i18n/messages/` se portaron
desde el sitio original en JavaScript sin compilación. Ese árbol de referencia se
retiró del repositorio una vez terminado el port, y sigue recuperable desde el
historial:

```bash
# ver la última revisión que lo contenía
git log --oneline --diff-filter=D -- legacy/

# restaurarlo en una carpeta aparte, sin tocar el árbol de trabajo
git archive <commit> legacy/ | tar -x -C /tmp
```

## Decisiones que conviene conocer

- **Sin framework de UI.** Deliberado. Añadir React o Svelte costaría entre 40 y
  130 KB comprimidos por página sin aportar nada a estas herramientas.
- **CSP con hashes, sin `unsafe-inline`.** Astro calcula un hash por script; el
  script anti-parpadeo del tema, que debe ser inline, obtiene el suyo a partir de
  la misma constante que se emite, de modo que no pueden divergir. La política
  viaja como metaetiqueta —donde `frame-ancestors` no se aplica— y `vercel.json`
  emite además las cabeceras que sí valen ahí: `frame-ancestors 'none'`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS.
  **El sitio se publica solo en Vercel**, desde `main`.
- **Fuentes autoalojadas.** No hay petición a Google Fonts. La cara del AFI
  cubre latín extendido, extensiones AFI, modificadores y griego, porque `θ` es
  U+03B8, es decir griego, no AFI.
- **Presupuesto de rendimiento.** La verificación falla si una página supera
  60 KB comprimidos, si aparece `unsafe-inline`, si se cuela un subrecurso
  externo, si hay dos `<h1>` o si un archivo de audio se publica sin atribución.

## Verificación

| Comprobación | Estado |
|---|---|
| `astro check` | 0 errores |
| Pruebas unitarias | 943 en 55 archivos |
| Pruebas de extremo a extremo | 88 sobre el sitio compilado (50 de accesibilidad), en su propio puerto |
| Reglas hexagonales | 198 módulos, 452 dependencias, 0 violaciones |
| Verificación de compilación | pasa |
| Página más pesada | 29,1 KB gzip, sobre un presupuesto de 60 KB |
| Auditoría de dependencias | 0 en producción y 0 en desarrollo (`npm run audit`, también en CI) |

`scripts/verify-build.mjs` comprueba el resultado compilado: cobertura de la CSP
por script inline, ausencia de `unsafe-inline`, ausencia de subrecursos externos,
un solo `<h1>`, `lang` y descripción presentes, integridad del manifiesto de audio
y presupuesto de peso.

## Audio

Las grabaciones proceden de Wikimedia Commons, casi todas CC BY-SA 3.0, y están
incluidas en el repositorio para que la compilación no necesite red.

```bash
node scripts/fetch-ipa-audio.mjs          # usa la caché si ya existe
node scripts/fetch-ipa-audio.mjs --force  # vuelve a descargar todo
```

El script agrupa la consulta de licencias en **una sola** petición a la API
(una por archivo agota el límite de peticiones), reintenta con espera creciente,
guarda los metadatos en caché para que una segunda ejecución no necesite red,
normaliza a Ogg mono con `ffmpeg` (1,1 MB de WAV quedaron en 456 KB) y **rechaza
cualquier licencia fuera de CC0, CC BY, CC BY-SA o dominio público**. La
atribución de cada archivo está en [`public/audio/ATTRIBUTION.md`](public/audio/ATTRIBUTION.md).

Si un símbolo no tiene grabación, el reproductor usa la voz del sistema y
pronuncia una palabra que contiene el sonido: la síntesis no puede pronunciar un
símbolo AFI aislado.

## Privacidad

- Sin cookies, sin analítica, sin telemetría.
- `localStorage` solo con dos claves: `lingualab-lang` y `lingualab-theme`. El
  botón de borrado elimina exactamente esas dos y nunca vacía el almacenamiento
  entero.
- Límite de 100 KB por texto y lista blanca de extensiones.
- Los textos se insertan como nodos de texto, nunca como HTML.

## Límites conocidos

Se declaran aquí porque una página que exagera sus herramientas es la parte menos
fiable del sitio.

- El transcriptor AFI es una **aproximación didáctica** grafema a fonema. No
  sustituye a un transcriptor morfológico. El inglés no marca la tensión vocálica
  (`sing` da `/siŋ/`, no `/sɪŋ/`) y el español asume distinción, sin seseo.
- El modo «Frase» de ArborLab adivina las categorías con una lista cerrada y
  reglas simples. El dibujo es exacto; la etiquetación, no.
- Las sílabas del inglés son una aproximación declarada; las del español usan
  reglas de diptongo e hiato.
- La exportación a CoNLL-U emite un árbol sintácticamente válido, no un análisis
  lingüístico.
- No hay lematización: no hay léxico.

## Guía de contribución

El flujo de trabajo completo —ramas, Conventional Commits, cómo agregar una lengua
o una herramienta, cómo escribir un ADR y qué hacer cuando una librería marcada
`[VERIFICAR]` no hace lo que se esperaba— está en
[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

Las decisiones de arquitectura y su porqué, incluidas las alternativas que se
descartaron, están en [`docs/adr/`](docs/adr/).

Y cómo alimentar la bibliografía y ampliar el sitio, con las convenciones, los
invariantes que el compilador protege y las trampas que ya costaron tiempo:
[`docs/GUIDE.md`](docs/GUIDE.md).

Si llegás a este repositorio en medio de una entrega sin fusionar —o querés retomarla desde otra
computadora—, el estado, el mapa de archivos y las trampas del entorno están en
[`odd/handoff/`](odd/handoff/), un documento por entrega. Lo que falta está en
[`docs/PENDING.md`](docs/PENDING.md); lo que se midió, en [`docs/STATUS.md`](docs/STATUS.md).

## Licencias

El código es **GPL-3.0-only** — ver [`LICENSE`](LICENSE). No fue una elección estética: desde la
3.0.0 el sitio incluye eSpeak NG compilado a WebAssembly para fonemizar texto, y como ese binario
viaja al navegador con el resto del bundle, la distribución completa tiene que ser GPL. Lo que se
publicó antes bajo MIT sigue bajo MIT: una licencia no es retroactiva.

Los datos conservan la licencia de su fuente, indicada en cada ficha; las grabaciones de audio, en la
tabla de atribución. La lista completa de terceros y sus licencias vive en
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
