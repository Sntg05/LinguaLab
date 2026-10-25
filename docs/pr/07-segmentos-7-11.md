# PR6 — Los segmentos 7 a 11, el escaneo final y la publicación en Vercel

**Rama:** `feat/v3-segments-7-11` · **Base:** `main` (`1ee15c6`) · **Commits:** los 54 de la cadena de
trabajo, desde `feat/toolbox-v3-security` hasta esta rama.
**Depende de:** nada (se apila sobre las cuatro rebanadas de `docs/pr/06-cadena-toolbox-v3.md`).
**Lo sigue:** nada; cierra el proyecto.

**Qué entra.** Todo lo que faltaba del prompt de trabajo y el cierre:

- **Segmento 7 — Experimentos** (`/experimentos`): constructor y ejecutor de cuatro tareas con jsPsych
  (aceptabilidad 1–7, 2AFC, lectura autocontrolada, decisión léxica), estímulos por CSV, semilla
  reproducible, bloques, práctica, vista previa, instrucciones editables en cualquier lengua y descarga de
  resultados con participante anónimo, condición, respuesta, tiempo y semilla.
- **Segmento 8 — Análisis acústico** (dentro de `/visualizador`): F0 con presets de voz, F1–F3 sobre el
  espectrograma, intensidad en dB, medición por intervalo con CSV y gráfico vocálico F1–F2. Motor
  `praatfan` 0.1.13 vendoreado (611 KB de wasm, GPL-3.0) en un Web Worker. **Experimental.**
- **Segmento 9 — ELAN ↔ TextGrid** (`/elan`): Pyodide 314 + pympi-ling 1.71 servidos desde este origen
  (13 MB), conversión en los dos sentidos con informe de pérdida, en un worker. **Experimental.**
- **Segmento 10 — Mapa de lenguas** (`/lenguas`): 136 lenguas de Glottolog 5.2.1 en un mapa propio (sin
  teselas ni terceros), tabla accesible, filtros por familia y búsqueda, ficha por lengua, 9 lenguas sin
  coordenadas listadas aparte y texto de respeto con enlace para corregir.
- **Segmento 11 — Catálogo externo** (`/catalogo`): diez fichas nuevas, cada URL abierta y verificada
  antes de publicarla; `PhoneRecognitionPort` con su fake y `docs/phase2/allosaurus.md` con la propuesta
  de servicio opcional. La ficha de la Universidad de los Andes queda `planned`: no se pudo verificar una
  URL pública estable.
- **Publicación**: solo Vercel, desde `main`, con `vercel.json` emitiendo cabeceras reales
  (`frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
  Se retira el flujo de GitHub Pages. La URL canónica pasa a `https://lingualab-beta.vercel.app`: la
  anterior (`lingualab.pages.dev`) **es de otra persona** y servía otro sitio, así que cada página
  publicaba un `canonical` ajeno.
- **Defectos encontrados al ejecutar en un navegador de verdad**, ninguno visible en las pruebas unitarias:
  1. **Pyodide no arrancaba**: `indexURL` relativo → «Invalid base URL» al resolver paquetes.
  2. **La CSP bloqueaba los atributos `style`**: el centinela del masthead, 17 atributos en el marcado y
     dos propiedades muertas en el SVG del tracto. Ahora `verify-build` **falla** si aparece uno.
  3. **axe, impacto serio**: la región desplazable de mediciones no se podía recorrer con el teclado.
  4. **axe**: tablas con encabezados y sin filas (`th-has-data-cells`) en la vista previa y en las
     mediciones; se esconden hasta tener datos.
  5. **Desborde horizontal** en `/fono` a 360 px, y una prueba que recorre las 27 páginas a ese ancho.
  6. **`dependency-cruiser` no analiza `.astro`**: un import de adaptador dentro de un componente pasaba
     todas las puertas. `src/lib/architecture.test.ts` cierra el hueco (verificado por mutación).
  7. **Campos de archivo nativos** en inglés dentro de páginas en español: ahora son botones del sitio.

**Cómo probarlo a mano.**

```bash
npm ci
npx playwright install chromium
npm run verify:all        # 1168 unitarias, tipos, reglas hexagonales, build verificado
npm run test:e2e          # 117, incluidas 54 de accesibilidad (27 páginas × 2 temas)
npm run audit             # 0 en producción y 0 en desarrollo
npm run lint:baseline     # 42 avisos heredados, 6 nuevos, todos de complejidad
```

1. `/experimentos`: pegá tres estímulos, elegí «Juicios de aceptabilidad», ejecutá y descargá el CSV.
2. `/visualizador`: cargá un wav, pedí F0 y formantes (aviso experimental), medí el intervalo y exportá.
3. `/elan`: cargá `e2e/fixtures/simple.eaf`, mirá las capas, exportá el TextGrid. La primera vez descarga
   13 MB desde este mismo origen.
4. `/lenguas`: filtrá por «Tucanoan», buscá «wayuu», abrí su ficha.
5. `/catalogo`: cada ficha externa abre en otra pestaña con su aviso; la de la Universidad de los Andes
   dice «Aún no disponible».
6. `/seguridad`: el apartado de `frame-ancestors` explica por qué en la metaetiqueta no se aplica.

**Riesgo de reversión.** Medio. Toca el composition root, la CSP (una regla nueva que bloquea atributos
`style`), el destino de publicación y tres dependencias nuevas de terceros con sus assets vendoreados.
Todo se revierte junto; no hay migración de datos. La parte que no se puede probar aquí: que Praat abra el
TextGrid, que Praat coincida con el análisis acústico y que ELAN abra el `.eaf` exportado.
