# Segmentos 7 a 11 y cierre a `main`

Completar lo que faltaba del prompt de trabajo —los segmentos 7 a 11—, pasarle a todo el sitio un escaneo
de seguridad, fiabilidad, accesibilidad, legibilidad y diseño UX/UI, y fusionar a `main` para que Vercel
publique.

Rama de integración: `feat/v3-segments-7-11`, encima de `feat/toolbox-v3-closure` (`56ca20b`).
Cada segmento se trabajó en su propio worktree y su propia rama, y se integra acá de a uno.

## Specs

- **S1.** Pedido del dueño, textual: «termina toda las implementaciones del prompt de trabajo y terminar
  con un escaneo de seguridad, confibilidad, accesibilidad, lectura, diseño ux/ui para trabajo y merge a
  main para la implementación en vercel, quiero que trabajes y finalices de una vez por todas este
  proyecto, tienes permisos para trabajar en lo que necesites pero igual puedes pasar por encima del YOLO
  para preguntarme por algo crítico que necesite mi intervención».
- **S2.** Decisiones del dueño sobre las tres preguntas críticas: **S9 con Pyodide + pympi** (ida y vuelta
  completa, ~13 MB de assets servidos desde este origen), **S10 con mapa propio en SVG, sin terceros**
  (nada de Leaflet ni teselas), y **publicación solo en Vercel desde `main`**, retirando GitHub Pages
  porque «está malconfigurado, la página que sale en el readme no es la que estamos desarrollando».
- **S3 (segmento 7, verbatim del prompt).** «Constructor y ejecutor de experimentos psicolingüísticos
  sencillos en el navegador, sin servidor, independiente de la lengua», con las cuatro plantillas, la
  aleatorización con semilla, el CSV de resultados con participante anónimo, semilla y versión, y las
  pruebas que el segmento pide.
- **S4 (segmento 8).** «tono (F0), formantes e intensidad dentro del visor del Segmento 6, detrás de un
  puerto y marcado como experimental hasta validarlo contra Praat», con el arnés de validación en
  `packages/adapters/acoustic/validation/` y la etiqueta que solo se quita al pasar el contraste.
- **S5 (segmento 9).** «Convertir entre archivos ELAN (.eaf) y Praat (.TextGrid) en el navegador», con
  Pyodide en un Web Worker, el informe de pérdida y el aviso «Experimental. Conserva siempre el archivo
  original».
- **S6 (segmento 10).** «Mapa estático y consultable de lenguas de Colombia, generado en tiempo de
  build, sin servidor», con la tabla accesible, los filtros, el panel de detalle y el texto de respeto
  textual: «Los nombres y las ubicaciones provienen de fuentes académicas y pueden no reflejar la
  autodenominación de los pueblos.»
- **S7 (segmento 11).** Catálogo de enlaces externos con **cada URL verificada antes de publicarla**
  («si una no responde, márcala `status: planned` o elimínala»), `PhoneRecognitionPort` con su fake, y
  `docs/phase2/` con la propuesta de servicio opcional.
- **S8.** Escaneo final de **seguridad, fiabilidad, accesibilidad, legibilidad y diseño UX/UI** sobre el
  sitio completo, con lo que aparezca corregido o declarado.
- **S9.** Merge a `main` y despliegue en Vercel, con la cadena de ramas verificada antes.

## Tasks

| ID | Qué | Spec | Ruta | Commit |
|---|---|---|---|---|
| T1 | Mensajes por herramienta (módulos i18n sin colisión) | S3–S7 | inline | `6ea00cc` |
| T2 | Segmento 11: catálogo verificado, puerto de fonos y fase 2 | S7 | inline | `a7fd703` |
| T3 | Publicación solo en Vercel, cabeceras y URL canónica | S2 | inline | `20aaa33` |
| T4 | Segmento 7: experimentos con jsPsych | S3 | worker | `1ddc97b` + integración |
| T5 | Segmento 8: análisis acústico con praatfan | S4 | worker | `16be94f` + integración |
| T6 | Segmento 9: ELAN ↔ TextGrid con Pyodide | S5 | worker | `254f517` + integración |
| T7 | Segmento 10: mapa de lenguas desde Glottolog | S6 | worker | `eba5a86` + integración |
| T8 | Integración: rutas, catálogo, avisos de terceros, puertas | S3–S7 | inline | pendiente |
| T9 | Escaneo final de seguridad, fiabilidad, a11y, legibilidad y UX/UI | S8 | inline + verifier | pendiente |
| T10 | Merge a `main` y despliegue en Vercel | S9 | inline | pendiente |

## Log

- **L1.** Pedido del dueño, textual, en S1.
- **L2.** Tres decisiones críticas consultadas antes de escribir código (S2). Las tres por encima del YOLO
  porque cambian la arquitectura del sitio: una descarga de 13 MB, la promesa de «un solo origen» y el
  destino de publicación.
- **L3.** Hechos verificados antes de planificar, para no prometer lo que no existe: `praatfan` **no está
  en npm** pero **sí** publica un build wasm (`praatfan-gpl.zip`, GPL-3.0, 611 KB de wasm) que se
  vendorea con sus hashes; `jspsych@8.3.0` es MIT y cumple la regla de los 14 días; `pyodide@314.0.7` más
  `pympi-ling@1.71` **funcionan** (probado en Node con `micropip`); el CLDF de Glottolog se puede leer; y
  `https://lingualab.pages.dev` **no es este sitio**: pertenece a otra persona y sirve otra página, así
  que la URL canónica publicada estaba mal en todo el repositorio.
- **L4.** Los cuatro segmentos se trabajaron en worktrees separados con superficies de edición disjuntas y
  un módulo de mensajes propio por herramienta, para que dos workers no choquen en el mismo archivo. La
  integración de rutas, catálogo y avisos de terceros queda del lado del padre.
- **L5.** Los cuatro workers corrieron en paralelo, cada uno en su worktree y su rama, y los cuatro
  volvieron con rojo observado y sus puertas en verde. La integración fue de a uno: fusión, ajustes de
  ruta y catálogo, y puertas completas antes de seguir con el siguiente.
- **L6.** Dos defectos que solo aparecieron al ejecutar en un navegador de verdad, ninguno visible en las
  pruebas unitarias de los workers:
  1. **Pyodide no arrancaba**: con `indexURL` en `/pyodide/` la ruta vale para `fetch` y para `import()`,
     y no como base de una URL: `loadPackage` reventaba con «Failed to construct 'URL': Invalid base
     URL» y la página decía «motor no disponible». Se arregla resolviendo la base a URL absoluta.
  2. **La CSP bloqueaba los atributos `style`**, y el sitio tenía 17 escritos a mano más uno generado
     desde JavaScript (el centinela del masthead) y otro en el SVG del tracto vocal. Un atributo `style`
     bloqueado no es un matiz: es un campo sin ancho o un margen que desaparece. Se sustituyeron por
     utilidades en `src/styles/utilities.css` y `verify-build` ahora **falla** si una página publicada
     trae uno, para que no vuelva.
- **L7.** El lockfile volvió a podarse en los cuatro worktrees (npm 12, ver la trampa en `docs/GUIDE.md`).
  La integración conserva el lock del árbol principal y lo regenera con npm 10 al final.
