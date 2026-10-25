# 0007 — Distribución de Pyodide: servido desde el propio sitio

- **Estado:** aceptada
- **Fecha:** 2026-10-25
- **Contexto del que surge:** segmento 9, el conversor ELAN ↔ TextGrid con Pyodide y `pympi-ling`

## Contexto

El conversor necesita leer y escribir ELAN (`.eaf`). Ese formato tiene ranuras de tiempo compartidas,
tipos lingüísticos, jerarquías de capas, anotaciones que apuntan a otras anotaciones y vocabularios
controlados. `pympi-ling` ya lo sabe hacer, es Python puro y corre en Pyodide sin compilar nada; el
Segmento 0 admitía como degradación escribir en TypeScript solo la lectura básica con `DOMParser`,
pero eso habría dejado fuera la escritura y, con ella, la mitad de la herramienta.

La pregunta que este ADR resuelve no es «¿Pyodide?» sino **«¿de dónde se descarga Pyodide?»**. La
respuesta cómoda es el CDN oficial (`cdn.jsdelivr.net`), que es lo que hace todo el mundo y lo que el
propio `pyodide.mjs` usa por defecto.

Esa comodidad choca con dos cosas ya decididas en este repositorio:

1. **La CSP del sitio es `default-src 'self'`** (`astro.config.mjs`). Un `import()` contra otro origen
   lo bloquea el navegador, y `scripts/verify-build.mjs` falla la compilación si una página referencia
   un subrecurso externo.
2. **La promesa del sitio es que el archivo no sale del navegador y que la herramienta funciona sin
   conexión después de la primera carga** (ADR 0002). Pedirle el motor a un tercero cada vez que
   alguien convierte un `.eaf` rompe la segunda mitad de esa promesa, y hace que un archivo de campo
   dependa de la disponibilidad de un CDN ajeno.

## Decisión

**Pyodide y los dos wheels se sirven desde el propio origen, vendorizados en `public/pyodide/`.**

1. **Versiones fijadas.** `pyodide@314.0.7` como `devDependency` de la raíz y `pympi-ling` 1.71 en su
   wheel. No hay rangos (`^`) para ninguna de las dos: el motor y el código Python que lo usa se
   entienden entre sí por versión, y un rango convertiría una actualización en una prueba de
   compatibilidad silenciosa.
2. **Cinco archivos del motor más dos wheels.** `pyodide.mjs`, `pyodide.asm.mjs`,
   `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` y, en `wheels/`, el de `micropip`
   (que Pyodide instala con `loadPackage`) y el de `pympi-ling` (que `micropip` instala desde su URL).
3. **Los hashes están escritos.** `public/pyodide/README.md` lo **genera** `scripts/vendor-pyodide.mjs`
   con el tamaño y el sha256 reales de cada archivo, su origen y su licencia. Un README escrito a mano
   se queda viejo en la primera actualización y entonces miente; por eso no se escribe a mano.
   El wheel de `micropip` se comprueba además contra el sha256 que declara `pyodide-lock.json`, y el
   de `pympi-ling` contra el que publica PyPI. `node scripts/vendor-pyodide.mjs --check` verifica sin
   escribir nada.
4. **La base es del sitio, no del CDN.** `loadPyodide({ indexURL: withBase("/pyodide/") })` y
   `packageBaseUrl` apuntando a `wheels/`: hasta `loadPackage` se resuelve contra nuestro origen.
   `withBase` importa porque GitHub Pages sirve el sitio bajo `/LinguaLab`.
5. **El motor vive en un worker y arranca tarde.** Construir el adaptador no descarga nada; la primera
   conversión es la que carga Pyodide y muestra el progreso.

## Cuánto pesa

`public/pyodide/` ocupa **13 675 937 bytes (13,04 MB)** en disco: 13 672 352 en
los siete archivos vendorizados y 3 585 en el `README.md` que genera el script.
La medición se repite con `node scripts/vendor-pyodide.mjs --check`, que imprime
el total exacto en bytes.

| Archivo | Bytes | gzip |
| --- | ---: | ---: |
| `pyodide.asm.wasm` | 9 598 218 | 3 533 615 |
| `python_stdlib.zip` | 2 545 637 | 2 503 672 |
| `pyodide.asm.mjs` | 1 250 344 | 261 309 |
| `pyodide-lock.json` | 119 077 | 27 556 |
| `pyodide.mjs` | 17 931 | 7 173 |
| `wheels/micropip-0.11.1-py3-none-any.whl` | 115 486 | 111 454 |
| `wheels/pympi_ling-1.71-py3-none-any.whl` | 25 659 | 25 080 |
| **Total** | **13 672 352** | **6 469 859** |

La columna `gzip` es lo que viaja de verdad cuando el servidor comprime: unos
6,2 MB en la primera conversión, no 13. El wasm baja a un tercio; la stdlib ya
viene comprimida y apenas cambia. Los hashes y la fecha de la medición están en
`public/pyodide/README.md`.

Ese peso **no** entra en el presupuesto de la página: `scripts/verify-build.mjs` mide HTML + los
scripts que la página referencia + sus hojas de estilo, y estos archivos se piden en tiempo de
ejecución, no viajan en el bundle. La página `/elan` sigue dentro de los 60 KB comprimidos.

## Qué se acepta a cambio

- **Una descarga grande la primera vez.** Unos 6,2 MB comprimidos (13 MB en disco) antes de la
  primera conversión. Por eso la herramienta se
  marca **experimental** y muestra una barra de progreso que dice en qué fase está en vez de fingir un
  porcentaje que Pyodide no expone.
- **El repositorio crece 13 MB.** Es el precio de servir el motor desde el propio origen; la
  alternativa era un CDN que la CSP bloquea.
- **Una actualización es un commit con archivos binarios.** El script la hace reproducible (copia,
  descarga, comprueba hashes, regenera el README), pero el diff sigue teniendo megabytes. Se acepta
  porque ocurre pocas veces y porque el `--check` la vuelve verificable.
- **La verificación de la compilación no cubre estos archivos.** `verify-build.mjs` comprueba que
  ninguna página referencia un origen externo; que los 13 MB estén completos y sean los correctos lo
  comprueba `scripts/vendor-pyodide.mjs --check` y, de verdad, la prueba
  `packages/adapters/src/elan/pyodide-elan-codec.test.ts`, que carga el Pyodide vendorizado, instala
  el wheel con `micropip` y lee un `.eaf`. Si algo falta o está cambiado, esa prueba se rompe.

## Alternativas descartadas

- **CDN oficial (`cdn.jsdelivr.net`).** Bloqueado por la CSP, prohibido por `verify-build.mjs` y
  contrario a la promesa sin conexión.
- **Empaquetar Pyodide en el bundle de la página.** Habría metido 13 MB en el presupuesto de peso por
  página y en el grafo de módulos de Vite, y habría obligado a compilar el wasm como asset de cada
  página que lo importe. Servirlo como archivo estático es lo que el propio Pyodide espera.
- **Leer `.eaf` solo en TypeScript.** Es la degradación que el Segmento 0 permite, y se descartó
  porque deja fuera la escritura: sin escritura no hay conversión en el otro sentido, y el segmento
  entero se queda en un visor de capas.
- **Cargar Pyodide en el hilo principal.** Congelaría la pestaña justo cuando la persona acaba de
  elegir el archivo, y el progreso no se podría pintar.

## Cómo se comprueba

- `node scripts/vendor-pyodide.mjs --check` — los archivos y sus hashes coinciden con lo declarado.
- `npx vitest run packages/adapters/src/elan/` — Pyodide vendorizado real, wheel instalado con
  `micropip`, `.eaf` leído, ida y vuelta ELAN → TextGrid → ELAN e informe de pérdida.
- `npm run verify:build` — ninguna página pide nada a otro origen y el presupuesto de peso se respeta.
