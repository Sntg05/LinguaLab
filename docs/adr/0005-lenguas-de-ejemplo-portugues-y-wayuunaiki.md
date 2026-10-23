# 0005 — Lenguas de ejemplo: portugués y wayuunaiki

- **Estado:** aceptada
- **Fecha:** 2026-10-23
- **Contexto del que surge:** la herramienta «Ortografía a AFI» tenía tres demos (dos de español y una de inglés) y cuatro plantillas indígenas vacías

## Contexto

La herramienta «Ortografía a AFI» arranca con tablas de demostración, y hasta hoy todas las demos
venían de un solo lado del mapa lingüístico: dos variedades del español y el inglés estadounidense.
Eso deja sin probar justo lo que la herramienta promete: que el motor es genérico y que quien aporta
el conocimiento de una lengua aporta **datos**, no código.

Al mismo tiempo, `docs/PENDING.md` P9 registra el límite del proyecto: las cuatro plantillas indígenas
(inga, wayuunaiki, nasa yuwe, arhuaco) están vacías **a propósito**, porque una correspondencia
grafema-fonema inventada sobre una lengua que alguien habla parece un dato y es una suposición. Ese
límite no se levanta escribiendo de memoria: se levanta con bibliografía citable.

## Decisión

1. **Se añaden dos demos nuevas, elegidas por dos razones distintas.**

   - **Portugués brasileño (`pt-demo`, `por`)** como **lengua mayoritaria**: ortografía latina que el
     motor ya sabe leer, pero con reglas que el español no tiene —dígrafos propios (`lh`, `nh`), `ç`
     productiva, `x` ambigua, `c`/`g`/`qu`/`gu` con contexto, nasalidad escrita con tilde— y una capa
     de realización que cambia la salida. Una demo por lengua mayoritaria solo prueba el motor si la
     lengua **no** se parece a la que ya estaba.
   - **Wayuunaiki (`guc-demo`, `guc`)** como **lengua minoritaria vital y bien documentada**: del orden
     de 400 000 hablantes en La Guajira (Colombia) y el Zulia (Venezuela) —cifra de orden de magnitud,
     que este repositorio cita como referencia de vitalidad, no como dato que haya medido—, con
     alfabeto oficial de 20 letras y un diccionario publicado. Es exactamente el caso que P9 describe
     como resoluble: no hay que inventar nada, hay que citar. Incluye tres grafemas que el español no
     tiene (`ü`, `sh`, el saltillo), duración vocálica contrastiva y `j` con un valor que **no** es el
     español.

2. **El material es una tabla de correspondencias, no oraciones ni léxico.** Una fuente que publica un
   alfabeto sostiene una correspondencia letra→AFI; no sostiene un corpus. Por eso ninguna de las dos
   tablas incluye frases de ejemplo, y la de wayuunaiki lo escribe en sus propias `notes`: lo único
   que afirma es la correspondencia del alfabeto al AFI publicada en las fuentes citadas, sin léxico,
   sin morfología y sin oraciones. La de portugués va más lejos porque sus fuentes lo permiten: sus
   reglas de realización (elevación de `-e`/`-o` finales, vocalización de `-l` final, palatalización de
   coronales ante [i], vocales nasales) salen de la misma bibliografía, y las que dependen de variedad
   o de posición lo dicen en la `note` de la regla.

3. **Nada se escribe de memoria: cada par tiene fuente citada en las `notes` de su tabla.** Portugués:
   Mateus y d'Andrade (2000), *The Phonology of Portuguese*, OUP (inventario citado por PBase);
   PHOIBLE 2.0, inventario 2207; *The phonemes of Portuguese*, Routledge 2024. Wayuunaiki: el
   diccionario Wayuu de Webonary/SIL para el alfabeto de 20 letras, «Panorámica de la fonología y
   morfología de la lengua wayuu» (*Letras* 61(98), 2021) para `ü`, `ꞌ`, `sh`, `j`, las semiconsonantes
   y la duración, y el inventario wayuu de Berkeley SAPhon. Las citas van en texto plano dentro de
   `notes` porque es lo que la interfaz muestra y lo que una persona puede comprobar.

4. **La demo de wayuunaiki nace en `draft` y lleva la advertencia del proyecto**, la misma cadena
   (`COMMUNITY_VALIDATION_NOTICE`) que las cuatro plantillas, importada y no copiada. Una fuente
   publicada respalda la correspondencia; no sustituye la validación con hablantes, y el estado de la
   tabla lo dice sin que nadie tenga que leer este documento. **Las cuatro plantillas siguen vacías**:
   `guc-demo` es un artefacto distinto de `guc-template`, y una prueba lo deja pinneado para que
   rellenar una demo no pueda rellenar una plantilla por la puerta de atrás.

5. **El motor no gana una sola regla específica de lengua.** No se tocó `packages/core/src/engine/`: el
   portugués entra como datos con las mismas dos capas que el español, y el wayuunaiki como una lista
   de reglas sin capa alofónica. Si alguna de las dos tablas necesitara una rama en el algoritmo, sería
   la señal de que el motor no era genérico; no la necesitó.

## Consecuencias

- La herramienta arranca con cinco tablas: español (yeísmo), español (distinción), inglés, portugués y
  wayuunaiki. Quien abre el editor ve que la herramienta sirve para lenguas que no son el español, sin
  que nadie haya programado nada por lengua.
- **P9 sigue abierto como estaba.** La demo de wayuunaiki no es una tabla validada por la comunidad: es
  una correspondencia bibliográfica en `draft`. Lo que cambia es que ahora existe un ejemplo completo de
  cómo se ve una tabla indígena construida con fuentes, que es lo que faltaba para pedir la siguiente.
- Las aproximaciones quedan declaradas en las `note` de cada regla y en las `notes` de la tabla: la `x`
  portuguesa (ambigua: puede ser [ʃ], [s], [z] o [ks]) y la vocalización de la `-l` final (el sur del
  Brasil y Portugal conservan [l]). Una demo que esconde sus límites enseña una lengua que no existe.
- La tabla de portugués **no** modela acento, cualidad de las vocales medias (e/ɛ, o/ɔ), la `s`
  intervocálica sonora ni la nasalidad de una coda nasal escrita. Está escrito en sus `notes`, y es el
  precio de que cada regla tenga fuente en vez de tener intuición.
- Efecto lateral conocido y fuera de este cambio: `/fonemizador` lista los idiomas de comparación a
  partir de `DEMO_TABLES` con un diccionario de nombres que solo conoce `spa` y `eng`, así que las dos
  demos nuevas aparecen ahí por su código ISO (`por`, `guc`). Se arregla añadiendo dos entradas a
  `LANGUAGE_NAMES` en `src/components/PhonemizerLab.astro`; no forma parte de esta decisión porque ese
  archivo pertenece a otra superficie.
- Cualquier tabla nueva para una lengua real debe seguir la misma regla: fuente citada en `notes` o no
  hay tabla. Es más barato decir «no lo sé» que publicar una transcripción con apariencia técnica que
  nadie puede desmentir.
