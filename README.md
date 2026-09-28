# LinguaLab

Herramientas de lingüística que corren enteramente en tu navegador: fonética con
corte sagital, árboles sintácticos y de estructuras de datos, y análisis de
corpus. Sin cuentas, sin servidor de análisis, sin telemetría.

**Sitio:** https://lingualab.pages.dev · **Inglés:** `/en/`

---

## Qué hay dentro

| Página | Qué hace |
|---|---|
| `/fono` | **FonoLab** — alfabeto AFI, corte sagital del aparato fonador, audio con licencia y transcriptor de grafemas a AFI |
| `/arboles` | **ArborLab** — 23 tipos de árbol, 4 formatos de entrada, exportación a SVG, PNG, JSON, Newick, CoNLL-U y Brat |
| `/tools` | **Estación textual** — frecuencia con dispersión, colocaciones con log-Dice y PMI, concordancias KWIC, estadísticas léxicas y legibilidad |
| `/glosario` | Glosario bilingüe filtrable |
| `/bibliografia` | Recursos con licencia y enlace de origen |
| `/seguridad` | Verificación en vivo de las salvaguardas, leyendo el DOM real |
| `/acerca` | Qué es, para quién, licencias y preguntas frecuentes |

Cada página existe en español (raíz) y en inglés (`/en/`), declaradas con
`hreflang`.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:4321
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila el sitio estático en `dist/` |
| `npm run check` | Comprueba tipos con `astro check` |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run verify` | Tipos + pruebas + compilación + verificación del resultado |
| `npm run verify:build` | Solo la verificación del resultado compilado |

`npm run verify` es la puerta completa: si pasa, el sitio es publicable.

## Arquitectura

Astro 7 con salida estática, TypeScript estricto y **ningún framework de UI**.
Las herramientas son cálculo puro más DOM, así que un runtime de framework se
pagaría sin obtener nada a cambio: la interactividad son bloques de TypeScript
que Astro empaqueta por página.

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
- **CSP con hashes, sin `unsafe-inline`.** GitHub Pages no permite cabeceras
  propias, así que la política viaja como metaetiqueta. Astro calcula un hash por
  script; el script anti-parpadeo del tema, que debe ser inline, obtiene el suyo
  a partir de la misma constante que se emite, de modo que no pueden divergir.
- **Fuentes autoalojadas.** No hay petición a Google Fonts. La cara del AFI
  cubre latín extendido, extensiones AFI, modificadores y griego, porque `θ` es
  U+03B8, es decir griego, no AFI.
- **Presupuesto de rendimiento.** La verificación falla si una página supera
  60 KB comprimidos, si aparece `unsafe-inline`, si se cuela un subrecurso
  externo, si hay dos `<h1>` o si un archivo de audio se publica sin atribución.

## Verificación

| Comprobación | Estado |
|---|---|
| `astro check` | 0 errores, 0 avisos |
| Pruebas | 536 en 17 archivos |
| Verificación de compilación | pasa |
| Página más pesada | 28.3 KB gzip |

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

Cómo alimentar la bibliografía y cómo ampliar el sitio, con las convenciones, los
invariantes que el compilador protege y las trampas que ya costaron tiempo:
[`docs/GUIDE.md`](docs/GUIDE.md).

## Licencias

El código es libre — ver [`LICENSE`](LICENSE). Los datos conservan la licencia de
su fuente, indicada en cada ficha; las grabaciones de audio, en la tabla de
atribución.
