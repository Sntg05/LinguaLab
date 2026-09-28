# Guía: alimentar la bibliografía y ampliar el sitio

Dos cosas prácticas: cómo añadir recursos a la bibliografía, y cómo construir
encima del sitio sin romper las garantías que ya tiene.

Todo lo que sigue se comprueba con `npm run verify`. Si esa orden pasa, tus
cambios son publicables.

---

## Parte 1 — Alimentar la bibliografía

### Dónde vive el dato

Un solo archivo: **`src/data/bibliography.ts`**. Es un módulo TypeScript con un
array tipado. No hay base de datos ni CMS, y no hace falta: el sitio se compila
a HTML estático.

### La forma de un registro

```ts
export interface BibliographyEntry {
  id: string;          // identificador único, sin espacios ni tildes
  title_es: string;    // título en español
  title_en: string;    // título en inglés
  author: string;      // "Apellido, N." — se muestra tal cual
  year: number;        // número, no cadena
  topic: string;       // tema en español  → genera un filtro
  topic_en: string;    // tema en inglés
  type: string;        // "Artículo" | "Libro" | "Corpus" | "Guía" …
  type_en: string;
  lang: string;        // "ES" | "EN" | "ES/EN" — el idioma DEL RECURSO
  license: string;     // OBLIGATORIO. "CC BY 4.0", "MIT", "Dominio público"…
  file: string | null; // ruta descargable, o null
  url: string | null;  // enlace externo, o null
  note_es: string;     // una línea sobre por qué sirve
  note_en: string;
}
```

### Añadir un recurso

Abre `src/data/bibliography.ts` y añade un objeto al array `BIBLIOGRAPHY`:

```ts
{
  id: "mi-recurso-2026",
  title_es: "Prosodia del español rioplatense",
  title_en: "Prosody of Rioplatense Spanish",
  author: "Pérez, L.",
  year: 2026,
  topic: "Fonética",
  topic_en: "Phonetics",
  type: "Artículo",
  type_en: "Article",
  lang: "ES",
  license: "CC BY 4.0",
  file: null,
  url: "https://ejemplo.org/articulo",
  note_es: "Datos de contorno entonativo en habla espontánea.",
  note_en: "Intonation contour data from spontaneous speech.",
},
```

Eso es todo. **No hay que tocar la página**: la lista, los filtros por tema y
los contadores se generan a partir del array.

### Las tres reglas que el compilador te va a exigir

**1. Licencia obligatoria.** El proyecto promete que todo recurso declara su
licencia, y hay una prueba que lo verifica. Si dejas `license: ""`, `npm run
verify` falla.

**2. Al menos un enlace o un archivo.** Un registro sin `url` y sin `file` es
inalcanzable. La página lo marca como «Sin enlace público» en vez de dibujar un
enlace roto, pero la prueba te avisa.

**3. Los temas generan los filtros.** Escribe `topic` y `topic_en` con la misma
ortografía que los existentes si quieres agrupar. Si escribes «Fonética» y
«Fonetica» aparecerán como dos filtros distintos; la comparación ignora tildes
y mayúsculas, así que no pasa nada, pero conviene ser consistente.

### Ofrecer un archivo descargable

Pon el archivo en `public/` y referencia la ruta pública:

```
public/recursos/perez-2026-prosodia.pdf
```

```ts
file: "/recursos/perez-2026-prosodia.pdf",
```

`public/` se copia tal cual a `dist/`, así que la ruta funciona en los dos
destinos. Recuerda que **el archivo también debe tener licencia compatible**:
la que declares en `license` cubre la ficha, no el PDF.

### Verificar

```bash
npm run verify
```

Si pasa, publica:

```bash
git add -A
git commit -m "docs: add Pérez 2026 to the bibliography"
git push
```

Ambos destinos (Vercel y GitHub Pages) se reconstruyen solos al empujar.

### Añadir un tema nuevo

Nada que configurar. Añade el primer recurso con ese `topic` y el filtro
aparecerá con su contador. El orden de los filtros es el de primera aparición
en el array, así que si quieres un orden concreto, reordena los registros.

---

## Parte 2 — Ampliar el sitio

### Mapa rápido

```
src/
├── components/   el cuerpo de cada página (.astro)
├── layouts/      Base.astro: <head>, fuentes, SEO, CSP
├── pages/        rutas. Español en la raíz, inglés en /en/
├── data/         datos tipados (AFI, glosario, bibliografía, árboles)
├── i18n/         diccionarios y rutas por idioma
├── lib/          utilidades (rutas con base)
├── scripts/
│   ├── core/     tema, navegación, guardrails, seguridad
│   ├── fono/     fonética, audio, corte sagital
│   ├── trees/    parse, layout, render, checks, solvers, export
│   └── tools/    tokenización, análisis, legibilidad, catálogos
└── styles/       tokens, base, layout, componentes, utilidades
```

### La convención que hace fácil ampliar

**La lógica va en `src/scripts/`, el DOM en el `.astro`.** Toda función pura
—un parser, una medida, una fórmula— vive en un módulo que no toca el DOM, y por
eso se puede probar sin navegador. El componente solo conecta esa lógica con la
página.

Ejemplos reales: `trees/parse.ts` no sabe nada de HTML; `trees/render.ts` sí, y
por eso solo el segundo es difícil de probar.

Si vas a añadir algo con cálculo, **empieza por el módulo puro y sus pruebas**, y
después escribe la página.

### Añadir una página

1. Crea el componente en `src/components/MiPagina.astro`, recibiendo
   `locale: Locale` como prop.
2. Crea las dos rutas:

```astro
---
// src/pages/mi-pagina.astro
import MiPagina from "../components/MiPagina.astro";
import Base from "../layouts/Base.astro";
---

<Base
  locale="es"
  path="/mi-pagina"
  title="Mi página"
  description="Una descripción de una frase."
>
  <MiPagina locale="es" />
</Base>
```

```astro
---
// src/pages/en/mi-pagina.astro  (nota: un nivel más de ../)
import MiPagina from "../../components/MiPagina.astro";
import Base from "../../layouts/Base.astro";
---

<Base locale="en" path="/mi-pagina" title="My page" description="One sentence.">
  <MiPagina locale="en" />
</Base>
```

3. Añádela a la navegación en `src/config/site.ts`, en `NAV_ITEMS`.
4. Añade las claves de texto en `src/i18n/messages/es.ts` y `en.ts`.

El `path` que pasas a `<Base>` **no lleva la base de despliegue**: `localePath()`
la añade sola. Es el error más fácil de cometer.

### Añadir texto traducible

Los diccionarios son objetos planos con claves de punto:

```ts
// src/i18n/messages/es.ts
"mi.clave": "Texto en español",

// src/i18n/messages/en.ts
"mi.clave": "Text in English",
```

Se usan con `t(locale, "mi.clave")`. La clave se tipa automáticamente a partir
del diccionario español, así que **si te equivocas en el nombre, el compilador
te avisa** en vez de mostrar la clave en pantalla.

### Añadir otro idioma

1. Copia `src/i18n/messages/es.ts` a `fr.ts` y traduce los valores.
2. Añádelo a `LOCALES` y `LOCALE_NAMES` en `src/i18n/index.ts`.
3. Duplica cada ruta bajo `src/pages/fr/`.

Las páginas son estáticas por idioma, así que no hay diccionario en el cliente ni
parpadeo al cambiar de idioma.

### Los cinco invariantes que el compilador protege

`npm run verify` no es solo tipos y pruebas. Falla si:

| Invariante | Por qué |
|---|---|
| Todo script inline tiene su hash en la CSP | Sin él, la CSP lo bloquea en silencio |
| No aparece `unsafe-inline` | Es la mitad del valor de tener CSP |
| Ningún subrecurso es de otro origen | El sitio promete no llamar a terceros |
| Cada archivo de audio tiene su fila de atribución | El sitio promete no reproducir audio sin licencia |
| Un control delegado está dentro de su raíz | Si no, nunca responde y nada más lo detecta |

Ese último merece explicación. ArborLab llegó a producción con el listener en
`.bench` mientras los botones de tipo estaban en un `<nav>` hermano: los botones
no hacían nada. La página compilaba, las pruebas pasaban, y el único síntoma era
un control muerto. Por eso hay una comprobación **estructural** y no de
comportamiento.

### Añadir audio

```bash
node scripts/fetch-ipa-audio.mjs          # usa la caché
node scripts/fetch-ipa-audio.mjs --force  # vuelve a descargar
```

El script agrupa la consulta de licencias en **una sola** petición a la API,
reintenta con espera creciente, guarda la caché en `scripts/.ipa-audio-cache.json`
para que una segunda ejecución no necesite red, y **rechaza cualquier licencia
fuera de CC0, CC BY, CC BY-SA o dominio público**.

Para añadir un símbolo, edita el mapa `SOURCES` con el título del archivo en
Wikimedia Commons. Si no encuentras grabación, no pasa nada: el reproductor usa
la voz del sistema y pronuncia una palabra que contiene el sonido.

### Publicar

Ambos destinos se reconstruyen al empujar a `main`:

| Destino | URL | Base |
|---|---|---|
| Vercel | `https://lingualab-beta.vercel.app` | `/` |
| GitHub Pages | `https://sntg05.github.io/LinguaLab/` | `/LinguaLab` |

La diferencia importa: Vercel sirve desde la raíz del dominio y GitHub Pages
desde un subdirectorio. Por eso `SITE_BASE` se define **solo** en el flujo de
Pages (`.github/workflows/deploy.yml`), y en Vercel se deja sin definir.

Si algún día conectas un dominio propio, pon `SITE_BASE` en `/` en los dos y todo
se ajusta solo.

---

## Trampas que ya nos costaron tiempo

Las dejo escritas para que no vuelvas a caer.

**Un atributo sin valor rompe el XML.** Astro emite sus marcas de estilo como
`data-astro-cid-xxx` sin valor. Eso es HTML válido pero XML inválido, y hace que
`rsvg-convert`, Inkscape o Illustrator rechacen el archivo. Por eso `svgString()`
da valor a todo antes de exportar. Si añades un SVG descargable, haz lo mismo.

**La base de despliegue se escapa fácil.** Cualquier `href="/algo"` escrito a
mano se rompe en GitHub Pages. Usa `localePath()` para enlaces de página y
`withBase()` para todo lo demás.

**Los acentos y las mayúsculas.** Para buscar y contar se compara la forma
normalizada (sin tildes, en minúsculas), pero se **muestra** la forma más
frecuente del texto. Si muestras la clave normalizada, «tamaño» aparece como
«tamano» y parece una falta de ortografía.

**El TTR depende de la longitud.** Comparar el TTR de dos textos de distinto
tamaño no significa nada. Usa MSTTR o entropía.

**Una prueba que nunca falla no vale nada.** Cada comprobación del verificador se
probó reintroduciendo el fallo a propósito. Si añades una, haz lo mismo: rompe
el invariante y comprueba que se detecta.

---

## Órdenes útiles

```bash
npm run dev          # servidor de desarrollo
npm run build        # compila a dist/
npm run check        # solo tipos
npm test             # solo pruebas
npm run verify       # tipos + pruebas + compilación + verificación
npm run verify:build # solo la verificación del resultado compilado
```

`npm run verify` es la puerta completa. Si pasa, puedes empujar.
