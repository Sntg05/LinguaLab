# 0006 — Análisis acústico con praatfan en WebAssembly, marcado como experimental

- **Estado:** aceptada
- **Fecha:** 2025-10-25
- **Contexto del que surge:** `odd/tasks/LinguaLab_prompt_vibecoding.md`, segmento 8

## Contexto

El visor de audio del segmento 6 dibuja la onda, el espectrograma y las capas de
anotación, pero no mide nada: sus propios comentarios lo dicen («No hace análisis
acústico (F0, formantes): eso es el segmento 8»). El segmento 8 pide tono (F0),
formantes e intensidad dentro de ese visor, detrás de un puerto y con la etiqueta
«Experimental» hasta validarlo contra Praat.

Hay tres caminos posibles para calcular eso:

1. **Escribir el algoritmo propio** (autocorrelación, LPC, energía por ventanas).
2. **Usar una librería publicada en npm** y fijarla como dependencia.
3. **Usar el build WebAssembly de praatfan**, un artefacto publicado como release de
   GitHub, y vendorearlo en el repositorio.

El primer camino es el más tentador y el más peligroso: un detector de F0 escrito a
mano produce números plausibles y **no comparables con los de nadie**. La
herramienta quedaría «validada» contra sí misma, la etiqueta «Experimental» dejaría
de ser una advertencia y pasaría a ser una excusa permanente.

El segundo camino no existe hoy: praatfan no se publica en npm.

## Decisión

1. **El motor es praatfan 0.1.13**, una reimplementación de los algoritmos de Praat
   con build para navegador (`to_pitch`, `to_formant_burg`, `to_intensity`). Sus
   números son comparables con los de Praat porque implementa los mismos algoritmos;
   validarlos es contrastar, no reinterpretar.
2. **El artefacto está vendoreado** en `public/praatfan/`: `praatfan_gpl.js`,
   `praatfan_gpl_bg.wasm`, `praatfan_gpl.d.ts`, `LICENSE` y `PROVENANCE.txt` con los
   hashes SHA-256 y la URL exacta de la release. Lo que se audita es lo que se sirve;
   no hay `curl | tar` en la compilación ni descarga desde un CDN en tiempo de
   ejecución. La CSP del sitio (`default-src 'self'`) y la promesa de funcionar sin
   conexión después de la primera carga exigen que el binario venga de este origen.
3. **El cálculo corre en un Web Worker** (`packages/adapters/src/acoustic/praatfan-worker.ts`).
   El hilo principal nunca ejecuta el análisis: el adaptador solo convierte el audio
   a mono, manda el pedido y traduce la respuesta. La prueba
   `praatfan-acoustic-analysis.test.ts` lo afirma de dos maneras: con un worker de
   prueba que registra lo que recibe, y comprobando que el archivo del adaptador no
   importa el motor.
4. **El adaptador implementa `AcousticAnalysisPort`** y no lanza nunca: si el wasm no
   carga —archivo ausente, CSP, navegador sin soporte, worker que muere— `isAvailable()`
   es falso y los métodos devuelven `unavailable` con detalle. Es la degradación que la
   especificación S7 pide y la que el puerto declara con sus errores tipados.
5. **La herramienta sigue marcada como experimental** y la interfaz lo dice en voz
   alta: «Experimental: contrasta tus resultados con Praat antes de publicarlos».
6. **El arnés de validación existe y hoy informa `missing-fixtures`**: no hay audios de
   referencia en `e2e/fixtures/reference/`. Nunca devuelve un «aprobado» por ausencia
   de datos (ver `docs/validation/acoustic.md`).

## Por qué GPL-3.0 es compatible con GPL-3.0-only

LinguaLab se distribuye bajo **GPL-3.0-only** y praatfan es **GPL-3.0**. No hay
conflicto de direcciones: la GPL-3.0 del componente y la GPL-3.0 del conjunto son la
misma licencia, así que distribuir el wasm junto con el sitio no agrega condiciones
nuevas al conjunto ni obliga a relicenciar nada.

Lo que sí agrega es una obligación de **atribución y trazabilidad**, que se cumple con:

- `public/praatfan/LICENSE`, copiado tal cual del paquete.
- `public/praatfan/PROVENANCE.txt` y `README.md` con origen, versión, hashes y fecha de
  compilación.
- `THIRD_PARTY_NOTICES.md`, que lista la dependencia con su versión y su licencia.

Una GPL-3.0 **no** sería compatible con un proyecto GPL-2.0-only, ni con uno MIT que
quisiera imponer restricciones adicionales; ese no es el caso aquí.

## Por qué sigue siendo experimental

La condición para quitar la etiqueta no es que el código compile ni que las pruebas
pasen: es que **los números coincidan con Praat sobre voces reales**. Hoy:

- Se midió un tono sintético de 200 Hz (F0 media 200,0000 Hz) y uno de 300 Hz, con el
  wasm real en Node. Eso demuestra que el motor carga y mide una señal con respuesta
  conocida. No demuestra nada sobre formantes de una vocal.
- No hay ni un audio de voz con su medición de Praat en el repositorio.
- No se comparó la intensidad contra el Praat oficial, ni el comportamiento del piso y
  el techo de F0 en voces infantiles.

Un tono puro tiene F0 y no tiene formantes vocales: presentar los formantes medidos
sobre él como validación sería afirmar algo que nadie midió.

## Cómo se quita la etiqueta

1. Dejar tres audios cortos y sus JSON de referencia en `e2e/fixtures/reference/`, con
   el formato de `docs/validation/acoustic.md`.
2. Correr `npx vitest run packages/adapters/src/acoustic/validation/` y registrar en
   ese documento las filas comparadas, con fecha y versión de Praat.
3. Si **todas** las comparaciones están dentro de tolerancia (F0 ±2 %, F1 y F2 ±5 %),
   cambiar los textos `acoustic.experimental` y `acoustic.limits` en
   `src/i18n/messages/features/acoustic.es.ts` y `acoustic.en.ts`.

No hay una bandera ni una variable de entorno que esconda el aviso: quitar la
etiqueta es editar el texto después de haber medido.

## Consecuencias

- El wasm (≈ 1 MB) **no viaja en el paquete de la página**: vive en `public/` y lo pide
  el worker la primera vez que se analiza algo. Las páginas que no analizan audio no lo
  descargan, y el presupuesto de peso por página (`scripts/verify-build.mjs`) no cambia.
- El audio se copia al worker por `postMessage` (transferencia del `Float64Array`
  convertido). Sin `SharedArrayBuffer`, que el despliegue en Pages no permite (ADR 0002),
  copiar es el precio de que el hilo principal siga respondiendo.
- El artefacto se actualiza a mano: cambiar de versión de praatfan exige rehacer el
  hash de `PROVENANCE.txt`, volver a correr el arnés y anotar el resultado. Es trabajo
  deliberado y no una actualización automática, para que un cambio de motor no pase
  inadvertido.
- El adaptador es la única implementación del puerto; el arnés de validación usa el
  mismo código que el navegador. Un motor distinto para las pruebas volvería a dejar
  la validación sin objeto.
