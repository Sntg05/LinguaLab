---
status: active
updated: 2026-11-17
---

# Rework v4: cada herramienta con su teoría, sus motores y su validación

Objetivo: rehacer los motores y su unión con la interfaz para que cada herramienta sea modular, esté
respaldada por bibliografía verificable y la entienda un estudiante de lenguas o de lingüística; sumar
lenguas al fonemizador, un visor acústico al estilo de Praat y una herramienta de estadística.
Rama: `feat/rework-v4` (desde `main` @ `baa8322`). Entrega: commits por unidad de trabajo en esta rama,
**sin push ni merge hasta que el dueño la pruebe en local** con `npm run dev`.
Runner: `npm run verify:all` y `npm run test:e2e`. Referencias externas disponibles en esta máquina para
validar: **Praat 6.4.06** y **R 4.3.3**.

## Specs

- **S1 (modularidad).** «quiero que hagas las cosas más modulares», sobre «los motores que hay en el
  backend y la implementación con el front».
- **S2 (fonemizador).** «he notado que hay problemas de transcripción fonética con el motor de espeak,
  puede que esté desactualizado para el español latinoamericano y el inglés».
- **S3 (más lenguas).** «me gustaría que trabajara con otras lenguas de altos recursos también».
- **S4 (árboles).** «podríamos revisar si son realmente correspondientes a la teoría de la que salen los
  metodos de los árboles».
- **S5 (soporte académico).** «pon un hipervinculo con su teoría para que los usuarios puedan encontrar
  una explicación completa de las teorías que soportan cada una de las herramientas, no quiero que nada
  esté porque si y ya, todo debe tener un soporte validado academicamente, las referencias bibliográficas
  pueden estar en un apartado dentro de la pestaña acerca de por ejemplo».
- **S6 (para estudiantes).** «quiero que la página funcione de forma que cualquier persona que sea
  estudiante de lenguas o lingüística puedan utilizarlo y entenderlo correctamente».
- **S7 (visor acústico).** «el visualizador acústico tiene que ser más intuitivo, que todo esté separado
  y modularizado puede mejorarse para que se parezca más a praat en sus partes más funcionales, sin
  importar si es sencillo».
- **S8 (libertad de rehacer y de stack).** «lo que ya está hecho no es inamovible, la idea es que las
  mejoras sean más importantes que mantener todo como viene de los repositorios de dónde aparecen, todo
  es mejorable y puedes utilizar un stack de tecnología más potente y más optimizado como rust o go, como
  por dar un ejemplo».
- **S9 (estadística).** «quiero que hagas una búsqueda e implementación de una herramienta de estadística
  para ciencias sociales, ya sea a nivel cualitativo o cuantitativo, has la diferenciación para que cada
  persona pueda hacer sus experimentos y hacer gráficos o cálculos estadísticos en ciencias sociales».
- **S10 (forma de trabajo).** «pregúntame y explícame lo más posible de lo que vayas a hacer y montalo en
  una branch para mergearlo después de probar localmente como queda todo».
- **S12 (árboles y exportaciones, 2026-11-17).** «revisa adicionalmente los errores en los árboles y en
  las exportaciones de cada herramienta que sean correctas en todos los formatos, si debes eliminar
  algunos formatos hazlo pero necesito que funcione» y «not only in trees, review the exportation in all
  labs». Hecho cuando: cada ejemplo de cada tipo de árbol se dibuja sin error; cada formato que ofrece
  cada laboratorio se descarga y su contenido se valida (o se reimporta) en una prueba; un formato que no
  es lo que su nombre promete se corrige o se quita.
- **S13 (comparación de documentos, 2026-11-17).** «I think we could add a feature to the website that would
  allow users to upload 2 or, at most, 3 documents in docx or PDF format with extractable text and conduct
  comparative corpus analyses» y «start the document comparison first». Hecho cuando: en la estación de
  texto se cargan de 2 a 3 documentos .docx, PDF con texto extraíble (o .txt); un PDF sin texto se rechaza
  diciéndolo; se comparan frecuencias normalizadas, palabras clave de cada documento frente al resto
  (log-likelihood y log ratio, con cifras contrastadas con R), diversidad léxica, vocabulario compartido y
  propio, y concordancias por documento; los resultados se descargan y se leen de vuelta en una prueba.
  Supuesto, sin pedir: la comparación entra como una sección nueva de la estación; la reorganización
  completa de su interfaz y el etiquetado POS/NER de la misma propuesta (L40) quedan para después.
- **S11 (diseño).** «me gusta mucho el front pero puedes hacerlo mejor, revisa páginas parecidas y copia
  diseños o escanea repositorios de diseño para que sea más llamativa, intuitiva y útil para los
  estudiantes».

## Decisiones abiertas (del dueño)

Se preguntan de a una, al empezar la fase que las necesita.

- **D1 (resuelta el 2026-11-10: navegador, con Rust a WebAssembly donde se mida que hace falta).** Dónde corren los motores: en el navegador (TypeScript, y Rust compilado a
  WebAssembly donde una medición lo justifique, lo que pide instalar Rust en esta máquina) o en un
  servidor propio (Go o Rust), que rompería la regla «los datos no salen del navegador» (ADR 0002).
- **D2 (resuelta el 2026-11-10).** «déjalo en español e inglés no más entonces».
- **D3 (T4).** Qué hacer con los formalismos que hoy son solo una etiqueta: rehacerlos con su notación
  propia o retirarlos hasta hacerlos bien; y si las estructuras de datos (AVL, heap, trie…) siguen en un
  sitio para lingüistas.
- **D4 (T6).** Motor de estadística cuantitativa: R real en el navegador (webR) o un motor propio
  validado contra R.
- **D5 (T8).** Dirección de diseño, sobre maquetas.

## Tasks

| ID | Specs | Qué | Ruta | Estado | Commit |
|---|---|---|---|---|---|
| T0 | S10 | Rama, este documento y diagnóstico medido | inline | hecha | — |
| T1 | S5, S6 | Modelo de referencias por herramienta en el núcleo; apartado en Acerca; bloque «¿De dónde sale esto?» en cada herramienta; prueba que exige teoría y al menos una referencia verificada por herramienta | inline | hecha | `bf93d89` y el commit siguiente. Rojo: la prueba del núcleo sin el módulo; mutación: una herramienta sin referencias hace fallar la regla. 22 obras verificadas en Crossref o en su página |
| T2 | S1, S2 | Transcriptor propio: reglas para el español y CMUdict para el inglés, en lugar de eSpeak | inline (TypeScript: no hay nada que medir que pida Rust) | hecha | `03ec0d8`: motores con rojo y verde. Commit siguiente: CMUdict empaquetado (`scripts/build-cmudict.mts`), adaptador `createNativePhonemizer` (rojo: suite sin módulo; verde: 9 pruebas), página conectada con variedad, nivel, palabras sin transcribir y variantes, y eSpeak retirado. `verify:all` y e2e completa en verde. Español: 96,6 % propio frente a 76,9 % de eSpeak |
| T3 | S3 | Lenguas nuevas | — | fuera de alcance por decisión del dueño (D2) | — |
| T4 | S4, S5 | Árboles: validador y notación por teoría, o retiro declarado | por decidir (D3) | pendiente | — |
| T5 | S1, S7 | Visor acústico al estilo de Praat; contraste numérico contra Praat (cierra P17) | inline y delegada (5.3–5.7: escritores acotados, contexto y paralelismo) | hecha en código (L21–L32) | `0b514b7`: F0, F1 y F2 iguales a Praat 6.4.49 en tres vocales (rojo: la prueba exige `passed` y antes daba `missing-fixtures`). 5.1 hecha (editor de una pantalla, L21); 5.8 hecha en código (L23–L25; falta la evidencia humana); 5.2 hecha salvo la captura con Praat (L26); 5.3 hecha (curvas sobre el espectrograma, L27); 5.6 y 5.7 hechas (`c9bf799`, `f19f6b6`, L30); 5.4 hecha (`9316dce`, L31); 5.5 hecha (`6726b4a`, L32). Pendiente humano: la persona que no conoce el visor y la captura junto a Praat |
| T6 | S9 | Estadística cuantitativa, contrastada con R 4.3.3 | por decidir (D4) | pendiente | — |
| T7 | S9 | Análisis cualitativo: codificación, libro de códigos, coocurrencias, acuerdo entre codificadores | inline | hecha | `c1bed4f` motor contra `irr` de R; `b5e1707` página `/cualitativo` con e2e y axe (L39). `verify:all` 1593 pruebas y e2e completa (236) en verde |
| T8 | S6, S11 | Diseño: referencias, maquetas, aplicación | por decidir (D5) | pendiente | — |
| T9 | S1 | Contrato único de herramienta y carga bajo demanda en todas | inline | hecha | `0b514b7`: FonoLab usa el transcriptor del sitio. Inventario y trinquete (L33); `d45b8e9` PhonemizerLab; `4417cac` FonoLab, Glosario y Bibliografía; `e56b84a` ArborLab, con su primera e2e funcional; `c565ee5` TextStation. Ningún componente pasa de 30 líneas de script (L34) |
| T11 | S12 | Árboles sin errores y exportaciones válidas en todos los laboratorios | inline | hecha | `c48e142` árboles (L37); commit siguiente, `e2e/exports.spec.ts` (L38) |
| T12 | S13 | Lectura de documentos: puerto en el núcleo, .txt y .docx propios (ZIP + XML, sin dependencia) | inline | pendiente | — |
| T13 | S13 | PDF con pdf.js (dependencia nueva: riesgo 5), rechazo de PDF sin texto | inline + verificador | pendiente | — |
| T14 | S13 | Motor de comparación: frecuencia por 10 000, G² y p, log ratio, diversidad, vocabulario compartido; contrastado con R base | inline | pendiente | — |
| T15 | S13 | Sección «Comparar documentos» en la estación, exportaciones leídas de vuelta, e2e y axe | inline | pendiente | — |
| T10 | S1–S11 | Puerta completa, verificación independiente, traspaso | verificador | pendiente | — |

## Log

- **L1 (2026-11-10).** Pedido original, textual: «Quiero que revises el repositorio y comiences a mejorar
  todo, los motores que hay en el backend y la implementación con el front, quiero que hagas las cosas
  más modulares, he notado que hay problemas de transcripción fonética con el motor de espeak, puede que
  esté desactualizado para el español latinoamericano y el inglés, adicionalmente me gustaría que
  trabajara con otras lenguas de altos recursos también, en las cuestiones de árboles sintácticos,
  podríamos revisar si son realmente correspondientes a la teoría de la que salen los metodos de los
  árboles, pon un hipervinculo con su teoría para que los usuarios puedan encontrar una explicación
  completa de las teorías que soportan cada una de las herramientas, no quiero que nada esté porque si y
  ya, todo debe tener un soporte validado academicamente, las referencias bibliográficas pueden estar en
  un apartado dentro de la pestaña acerca de por ejemplo, quiero que la página funcione de forma que
  cualquier persona que sea estudiante de lenguas o lingüística puedan utilizarlo y entenderlo
  correctamente, el visualizador acústico tiene que ser más intuitivo, que todo esté separado y
  modularizado puede mejorarse para que se parezca más a praat en sus partes más funcionales, sin
  importar si es sencillo, si debes modificarlo para que sea mejor, hazlo, haz lo mismo con todo, lo que
  ya está hecho no es inamovible, la idea es que las mejoras sean más importantes que mantener todo como
  viene de los repositorios de dónde aparecen, todo es mejorable y puedes utilizar un stack de tecnología
  más potente y más optimizado como rust o go, como por dar un ejemplo, quiero que este rework deje la
  página más increíble de todo el mundo con respecto a las herramientas que utiliza un lingüista, por
  último quiero que hagas una búsqueda e implementación de una herramienta de estadística para ciencias
  sociales, ya sea a nivel cualitativo o cuantitativo, has la diferenciación para que cada persona pueda
  hacer sus experimentos y hacer gráficos o cálculos estadísticos en ciencias sociales, pregúntame y
  explícame lo más posible de lo que vayas a hacer y montalo en una branch para mergearlo después de
  probar localmente como queda todo, por último me gusta mucho el front pero puedes hacerlo mejor, revisa
  páginas parecidas y copia diseños o escanea repositorios de diseño para que sea más llamativa,
  intuitiva y útil para los estudiantes, make no mistakes, te quiero».
- **L2 (diagnóstico del fonemizador, medido).** Se corrió el motor instalado (`espeak-phonemizer` 0.2.0)
  sobre frases de prueba. La hipótesis «desactualizado» no se sostiene: la última versión publicada de
  eSpeak NG es la 1.52.0, de diciembre de 2024 (no se pudo leer qué compilación exacta trae el paquete).
  El problema es de diseño: eSpeak es la entrada de un sintetizador de voz, no un transcriptor. Medido:
  - español (`es-419`): «allá» → `ajjˈa` (esperado `aˈʝa`); «pingüino» → `pˌiŋɡuˈino` (esperado
    `piŋˈɡwino`); «México» → `mˈɛxiko`, con una `ɛ` que el español no distingue;
  - inglés (`en-us`): «bird», «word» → `bˈɜːd`, `wˈɜːd`, sin la vocal rótica del inglés americano
    (`bɝd`); usa `ᵻ`, que no es un símbolo del AFI, y `ɐ` donde se espera `ə`; no distingue homógrafos
    («read», «record»);
  - en las dos lenguas, la marca de acento va delante de la vocal (`kˈasa`) y no delante de la sílaba
    (`ˈkasa`), que es la convención del AFI, y mezcla sin avisar el nivel fonémico con alófonos (`β ð ɣ`).
  El paquete trae además voces para ar, de, en-gb, fr, hi, it, ko, pt, pt-br y ru que hoy no se ofrecen.
- **L3 (diagnóstico de los árboles).** De los 14 tipos lingüísticos, solo «X-barra» y «Movimiento (GB)»
  tienen comprobaciones propias (`src/scripts/trees/checks.ts`). Minimalista, cartográfica, CCG, LFG,
  HPSG, gramática relacional, semántica, TAG, Reed–Kellogg y morfología usan el mismo analizador de
  corchetes y el mismo dibujo, con otro nombre y otro ejemplo: no hay nada que compruebe que el árbol
  cumple la teoría que anuncia. Varias de esas teorías no se representan con árboles de corchetes (CCG
  usa derivaciones, LFG y HPSG matrices de rasgos, la gramática relacional diagramas de estratos,
  Reed–Kellogg diagramas de línea). La ficha de X-barra dice «espéculo» por «especificador» y afirma que
  toda proyección tiene complemento, adjunto y especificador, lo cual no es cierto. Ninguna ficha enlaza
  su teoría.
- **L4 (entorno).** No hay Rust ni Go utilizable instalados. Sí hay Praat 6.4.06 y R 4.3.3: por primera vez
  el contraste del visor acústico (P17) y el de la estadística se pueden hacer en esta máquina.
- **L5 (fuentes candidatas, verificadas en GitHub el 2026-11-10).** CMUdict (inglés, licencia BSD de
  Carnegie Mellon); `open-dict-data/ipa-dict` (MIT; incluye `es_MX`, `en_US`, `en_UK`, `pt_BR`, `fr_FR`,
  `de`, `ja`, `ko`, `zh_hans`, `ar`, entre otras, con fuentes que traen licencias propias que hay que
  respetar una por una); webR 0.6.1 (R compilado a WebAssembly, paquete de 38 MB, R bajo GPL, compatible
  con la GPL-3.0 del proyecto).
- **L6.** `odd/tasks/frontend-rework.md` pasa a `closed`: sus seis tareas estaban hechas y fusionadas en
  el PR #17, pero el documento seguía como activo.
- **L7 (2026-11-10).** D1 resuelta por el dueño: «Navegador + Rust». Rust 1.99.1 instalado en la carpeta
  de usuario con el destino `wasm32-unknown-unknown`. El dueño pidió además un transcriptor propio («si
  Espeak ng no es necesario entonces creemos un transcriptor propio») y que la rama se publique para
  trabajarla desde otro equipo, sin fusionar.
- **L8 (T1, a medias).** Hecho: modelo `Reference` y `checkScholarlySupport` en el núcleo (rojo y verde),
  `src/data/references.json` con 22 referencias verificadas una por una y el lector del catálogo acepta
  `theory` y `references`. Falta: volver a escribir la teoría y las referencias de cada herramienta en
  `tools.json` (se perdieron al revertir el archivo por error durante una prueba de mutación), la prueba
  que lo exige, el bloque «teoría» en cada página y el apartado en Acerca.
- **L9 (T1 cerrada).** Teoría y referencias reescritas en `tools.json` para las diez herramientas
  integradas; `TheoryNote.astro` cierra cada página de herramienta en los dos idiomas y Acerca tiene el
  apartado `#referencias`. Puerta completa y e2e en verde. T2 cambia de alcance por pedido del dueño: un
  transcriptor propio (reglas para el español, diccionario publicado para el inglés) en lugar de eSpeak.
- **L10 (2026-11-10).** El dueño, textual: «déjalo en español e inglés no más entonces, intenta optimizar
  el rework lo más que puedas». T3 sale del alcance. Los dos motores quedan escritos y medidos (`03ec0d8`).
- **L11 (2026-11-10).** El dueño pidió un traspaso minucioso para continuar con otro agente u otro modelo:
  `odd/handoff/ACTUAL.md` se reescribió con el estado, las reglas, los pasos exactos de lo que falta de T2
  y las decisiones abiertas; el traspaso anterior quedó en `odd/handoff/archivo/`.
- **L12 (2026-11-10).** T2 cerrada. Decisiones: (a) el puerto `PhonemizerPort` gana opciones (`variety`,
  `level`) y el resultado lleva `skipped` y `variants`, opcionales, para no esconder lo que el motor no
  resolvió; (b) el adaptador no usa worker: indexar 126 052 palabras tarda decenas de milisegundos una
  vez; (c) la versión de CMUdict es la fecha de su commit fijo (`2025.10.24`), con `sha256` comprobado
  al empaquetar; (d) el presupuesto de motores baja de 21 a 19 MB (hoy pesan 17,1). Medición del inglés
  contra ipa-dict `en_US`: 4697 de 4698 palabras, pero es **coherencia y no acierto**: esa referencia
  deriva del mismo CMUdict, así que solo valida la conversión de ARPABET a AFI. La referencia
  `cmudict2015` se verificó abriendo el repositorio oficial y su `LICENSE`; `espeakng2024` y
  `bernard2021` salieron de la bibliografía. **Sin hacer, anotado:** el transcriptor de FonoLab
  (`src/scripts/fono/phonetics.ts`) y el de la portada siguen con sus reglas propias; unificarlos con
  este motor queda para T9. La licencia del proyecto sigue en GPL-3.0-only: quitar eSpeak no la cambia
  (praatfan es GPL) y volver a una más permisiva sería decisión del dueño.
- **L13 (2026-11-12).** El dueño, textual: «continua con el trabajo, vamos a seguir mejorando esta
  aplicación, quiero que dejes un documento de handoff al terminar la sesión con el 70% del limite de 5
  horas, en este handoff tienes que dejar una estructuración completa de cómo se planean hacer las
  siguientes tareas de implementación, las búsquedas, el deck de tecnología y demás cuestiones para que
  sea extremadamente sencillo continuar con opus o con otra tecnología de código».
- **L14 (2026-11-12).** Hecho en `0b514b7`: (a) validación acústica. En la máquina hay Praat **6.4.49**,
  no 6.4.06 como decían los documentos. `scripts/build-acoustic-reference.mjs` mide con Praat tres
  vocales del AFI ya publicadas (CC BY-SA) en tres marcos del tramo con voz; las 27 comparaciones de F0,
  F1 y F2 dan el mismo valor con cuatro decimales. La interfaz deja de decir «experimental» y dice qué
  se validó y qué no (intensidad, voces agudas, habla continua). (b) FonoLab usa
  `lingualab.phonemizeText`; se borra `src/scripts/fono/phonetics.ts`, que aplicaba distinción y reglas
  de expresiones regulares para el inglés. (c) Ficha de X-barra: decía «espéculo» y que toda proyección
  **tiene** complemento, adjunto y especificador; son opcionales. Diagnóstico del visor para T5: la
  página mide unos 8000 px de alto y los lienzos unos 80 px; el plan por unidades está en el traspaso.
  La portada conserva a propósito la tabla de Ortografía.
- **L15 (2026-11-12).** T5, unidad 5.2 en parte (rojo: `spectrogram-color.test.ts`, cuatro fallos): el
  espectrograma sigue por defecto a Praat (grises, ventana de 5 ms, 0 a 5000 Hz, 70 dB) con la paleta de
  color como opción, y los lienzos crecen con la altura de la ventana. La ventana sigue siendo de Hann y
  la de Praat es gaussiana: la interfaz lo dice. **Hallazgos al mirar la captura, sin resolver:** el
  dibujo queda en bloques por la poca resolución en frecuencia de una FFT de 128 puntos, y las líneas de
  formantes superpuestas no parecen coincidir con los valores de Praat (detalle y forma de comprobarlo en
  el traspaso, T5). La validación contra Praat cubre el motor, no el dibujo.
- **L16 (2026-11-12).** Defecto real encontrado al mirar la captura y corregido con rojo y verde: la
  página pedía 3 formantes y ese número llegaba a Praat como «número máximo de formantes»; la misma [a]
  daba F1 = 1141 Hz en la página y 919 Hz en Praat. El motor analiza ahora con al menos 5 y devuelve las
  pistas pedidas. La validación de `0b514b7` era cierta para el motor y no para la página: falta una e2e
  que compare la tabla de medidas con la referencia.
- **L17 (2026-11-12).** El dueño, textual: «revisa que también la segmentación sea un poco más sencillan y
  acorde con el programa original, necesitamos que sea sencillo e intuitivo de usar así no tenga todas las
  funcionalidades, la idea es que se pueda usar pedagógicamente». Se añade a S7 como unidad 5.8 de T5, con
  prioridad sobre 5.3–5.7; el flujo objetivo y qué se simplifica están en el traspaso. No se implementó
  en esta sesión.
- **L18 (2026-11-13).** El dueño, textual: «haz la implementación en la rama main de todos los cambios que
  se han hecho hasta el momento, continuaremos trabajando en la branch de pruebas luego». PR
  https://github.com/Sntg05/LinguaLab/pull/20. CodeQL del PR marcó cinco alertas nuevas, corregidas antes
  de fusionar: (a) dos de ReDoS en los transcriptores, reales: quitar signos de los bordes con una regex
  anclada al final era cuadrático; una palabra de 50 000 signos tardaba 4,2 s (rojo medido) y ahora se
  recorre en tiempo lineal (`packages/core/src/g2p/trim-edges.ts`); (b) tres en `scripts/build-cmudict.mts`:
  el script guardaba la descarga antes de comprobar su hash; ahora comprueba y después escribe, y lee la
  caché sin preguntar antes si existe. `scripts/eval-g2p.mts` se corre ahora con `node scripts/run-ts.mjs`,
  porque Node no resuelve las importaciones sin extensión del núcleo. Se fusiona con merge commit para que
  `feat/rework-v4` siga en uso.
- **L19 (2026-11-13).** El dueño, textual: «actualiza el traspaso y empieza con la T5, vamos a trabajar
  hasta terminar el rework, recuerdas el cambio de motores y el traspaso a rust o go para que sea más
  optimizado? hazlo efectivo». Lo que consta: D1 dice navegador y Rust a WebAssembly solo donde se mida;
  Go se descartó con el servidor. praatfan, el motor acústico, ya es Rust en WebAssembly. Medido el
  espectrograma de TypeScript sobre 60 s a 44,1 kHz: 2,3 ms con 512 columnas, 11,9 ms con 2720, 134 ms
  sin tope; bajo el umbral de ~300 ms. Traspaso actualizado con la fusión del PR #20 y esta medición.
- **L20 (2026-11-13).** El dueño elige «Medir y decidir»: el espectrograma sigue en TypeScript y se mide
  otra vez en 5.2 con la FFT rellenada; pasa a Rust solo si supera ~300 ms. La misma regla vale para T6.
- **L21 (2026-11-13). T5, unidad 5.1.** Cargar y reproducir pasan a una barra encima de los lienzos
  (el zoom va en la fila de reproducir) y los tres lienzos se reparten la altura del editor,
  `min(68vh, 620px)`: onda 25 %, espectrograma 45 %, capas 30 %. Rojo: la e2e nueva «caben en una
  pantalla» falló con las capas en 96 px; con 70vh/640 px medía 907 px y se bajó a 68vh/620 px. Verde:
  `verify:all` y la e2e completa. Antes, en este equipo, `npm ci`: `node_modules` era de una versión
  anterior y faltaban las fuentes nuevas (todas las páginas daban 404 en la prueba de consola).
- **L22 (2026-11-13).** El dueño, textual: «hazlo, prefiero el término fonológico ya que estamos
  acostumbrados a ese». La interfaz en español y los documentos para el lector dicen «fonológico» por
  «fonémico» (tradición hispánica); el inglés sigue con «phonemic». El glosario gana la entrada
  «Transcripción fonológica», que dice que en manuales en inglés se llama fonémica. Rojo: tres pruebas en
  `src/data/data.test.ts`. Los comentarios de código y los PR archivados no se tocan.
- **L23 (2026-11-13). T5, unidad 5.8, primera parte: los gestos de Praat.** Atajos verificados en el
  manual de Praat («TextGridEditor»): Intro pone un límite en la capa seleccionada, Tab reproduce o para
  el intervalo seleccionado, un límite se mueve arrastrándolo y un clic en una capa o en un intervalo lo
  selecciona; quitar un límite es un menú en Praat y aquí es Supr o Retroceso. Intro, Supr y Tab solo
  valen con el foco en el editor (el marco de los lienzos, enfocable) y Mayús+Tab sale de él, para no
  atrapar el teclado. Ventana de texto arriba (`[data-audio-label]`) con la etiqueta del intervalo
  seleccionado; el teclado AFI escribe en ella. Sin ratón, el límite recién puesto y el que alcanzan coma
  y punto quedan seleccionados, para que Supr funcione. La geometría de la franja vive en
  `src/scripts/audio/tier-geometry.ts` (dibujo y puntero usan la misma). Rojo: 10 pruebas de geometría
  sin módulo y 3 de atajos; las dos e2e de flujo completo (ratón y teclado, con TextGrid exportado) se
  comprobaron por mutación: sin Intro fallan las dos, sin aplicar el arrastre falla la de ratón.
  Hallazgo: a 1360×900 el editor empieza debajo del primer pliegue, porque la cabecera de la página y los
  avisos lo empujan; queda para la segunda parte de 5.8.
- **L24 (2026-11-13). T5, unidad 5.8, segunda parte: menos a la vista.** Capas e Intervalos pasan a un
  solo panel «Segmentar» con lo de la primera clase (capa activa, «Poner límite en el cursor», anterior,
  siguiente, deshacer, rehacer, añadir capa); plegados: teclado AFI, «Más opciones de capas» (renombrar,
  quitar, subir, bajar) y «Ver como tabla». El panel dice qué queda fuera (capas de puntos, varias pistas).
  La barra de cargar y reproducir es una sola fila compacta y, al cargar el audio, el editor se desplaza a
  la vista (`instant`: `auto` hereda el `scroll-behavior: smooth` del sitio). Medido a 1360×900: la
  cabecera fija reserva 88 px; barra y editor caben en los 812 restantes. Rojo: la e2e «queda a la vista»
  falló con las capas en 1730 px; las e2e que tocan la tabla la abren primero, como una persona.
  Textos más cortos en la barra («Ver antes», «Ver después», «Repetir intervalo»); los formatos de audio
  van en el mensaje inicial. Falta de 5.8: «Cargar ejemplo» y el modo guiado.
- **L25 (2026-11-13). T5, unidad 5.8, tercera parte: ejemplo y modo guiado.** «Practicar con «pato»»
  carga el audio sin anotar y guía tres pasos en la línea de estado (escuchar, poner un límite, escribir
  la etiqueta), que avanzan solos con cada gesto (`src/scripts/audio/guide.ts`, pura y probada). «Ver
  «pato» resuelto» carga el mismo audio con su TextGrid. Audio: «pato» de Lingua Libre, hablante Millars,
  CC BY-SA 4.0, original sin cambios (SHA-1 igual al de Commons), en `public/audio/ejemplos/` con su
  `ATTRIBUTION.md`; el crédito se ve en la página al cargarlo. El TextGrid lo segmentó LinguaLab a mano
  sobre la energía en ventanas de 5 ms y un espectrograma, y lo dice: no es una referencia de Praat
  (en este equipo no hay Praat). Rojo: seis pruebas de la guía sin módulo; las dos e2e se comprobaron por
  mutación (la guía que no avanza y el ejemplo sin TextGrid fallan). Queda como evidencia humana, en
  `docs/HUMAN-EVIDENCE.md`, que alguien que no conoce el visor lo consiga sin leer la ayuda.
  Con esto 5.8 queda hecha en código. Siguen 5.2 (resto), 5.3–5.7.
- **L26 (2026-11-13). T5, unidad 5.2, resto.** (a) La FFT se rellena con ceros hasta 1024 puntos
  (`MIN_FFT_SIZE`): con la ventana de 5 ms las bandas pasan de 172 Hz a 43 Hz, y al pintar se interpola
  entre bandas vecinas. (b) Eje de frecuencia rotulado en Hz cada 1000 (o 500) Hz. Defecto encontrado y
  corregido: el espectrograma se pintaba con `putImageData` en píxeles CSS y en pantallas de doble
  densidad ocupaba solo el cuarto de arriba a la izquierda; ahora se arma en píxeles del dispositivo.
  Rojo: dos pruebas de resolución (banda < 50 Hz; tono de 1000 Hz con error < 50 Hz) y una e2e a DPR 2
  (la fila del tono de 440 Hz caía en 0,44 de la altura). Medido según L20, Node 26, 60 s a 44,1 kHz,
  FFT de 1024: análisis 9,7 ms con 512 columnas y 48 ms con 2720; bajo ~300 ms, se queda en TypeScript.
  Medido en Chromium a 1360×900: el redibujo completo costaba 15 ms por cuadro a DPR 2 (casi todo el
  cuadro de 16,7 ms, y durante la reproducción se redibuja en cada cuadro); con la imagen del
  espectrograma guardada por lienzo baja a 0,4 ms. Pendiente: (c) ventana gaussiana como la de Praat,
  opcional, y la captura junto a la de Praat en `docs/validation/acoustic.md` (en este equipo no hay
  Praat).
- **L27 (2026-11-13). T5, unidad 5.3: curvas sobre el espectrograma.** Tono (azul, con su escala a la
  derecha, del piso al techo), formantes F1–F3 (puntos rojos, sobre la escala en Hz) e intensidad
  (amarillo, 50–100 dB, el «view range» de Praat) se dibujan sobre el espectrograma y se calculan solos
  para el tramo visible, con un margen de un cuarto a cada lado; con más de 10 s a la vista no se
  analiza y se dice sobre el lienzo y en una línea de estado (`[data-audio-overlay-status]`). Casillas
  «Mostrar tono / formantes / intensidad» en el panel Espectrograma, marcadas por defecto: el editor no
  crece. El panel acústico pierde los botones «Calcular» y los dos lienzos aparte (F0 e intensidad); los
  campos de piso, techo y frecuencia máxima recalculan al cambiar. Partición: `acoustic-tracks.ts` (un
  análisis por magnitud, por tramo, con caché y de a un pedido al worker; la medición y las curvas lo
  comparten), `acoustic-overlay.ts` (qué se dibuja y cuándo), `acoustic-measure-table.ts` (filas de la
  tabla); `acoustic-analysis.ts` baja de 725 a ~460 líneas. Rojo: 13 pruebas de `acoustic-tracks` sin
  módulo y 2 de `acoustic-render` (`formantDots`, colores de Praat) sin exportar. Las dos e2e nuevas se
  comprobaron por mutación: sin pedir el análisis falla «se dibujan solos», con las casillas ignoradas
  falla la misma, y con el límite en 1000 s falla «más de 10 s». La e2e «calcula el contorno de F0» se
  quitó a propósito: su botón y su lienzo ya no existen y la reemplaza la de las curvas. Las claves
  `acoustic.pitch.run`, `acoustic.formant.run`, `acoustic.formant.overlay`, `acoustic.intensity.run`,
  `acoustic.canvas.f0`, `acoustic.canvas.intensity` y `acoustic.status.{f0,formants,intensity}` quedan
  sin uso en `src/i18n/messages/features/acoustic.*.ts` (fuera de lo autorizado en esta unidad).
  Verde: `verify:all` y la e2e completa.
- **L28 (2026-11-13). Verificación independiente de 5.3 (riesgo 4: orden asíncrono):** sin bloqueos.
  Sondas en navegador: audio B cargado antes de terminar el análisis de A (no se filtran curvas de A),
  15 desplazamientos rápidos fuera del tramo cubierto (termina en `drawn` en ~1,4 s), casillas cambiadas
  durante el análisis, 12 s a la vista (`skipped`, sin mensajes al worker; un zoom las trae). Suite
  completa 192 e2e y `verify:all` en verde. Avisos, no bloqueos: los análisis de tramos abandonados no se
  cancelan (cuestan, no se traban); una curva que falla marca todo el overlay `failed`; el mensaje
  `audio.status.mismatch` imprime «s s» (defecto previo, no de este cambio). Sobre lo quitado: los botones
  y lienzos aparte de F0 e intensidad no exportaban valores; la tabla de medidas con CSV sigue igual.
- **L29 (2026-11-14).** El dueño, textual: «desactiva el RDD review de gentle ai». Hecho con
  `gentle-ai review mode disable`: queda apagado en el ámbito global. Las pruebas, la verificación
  independiente de lo de alto riesgo y la revisión del diff antes de cada commit siguen igual.
- **L30 (2026-11-14). T5, unidades 5.6 y 5.7: intensidad y TextGrid contra Praat.** En esta máquina hay
  Praat **7.0.03**. (a) Intensidad: `To Intensity: 100, 0, "yes"` (el piso del visor) y `Get value at
  time` con "nearest"; bloque `intensity` aparte en cada JSON de referencia, con su versión
  (`build-acoustic-reference.mjs --intensity`), sin tocar F0, F1 ni F2. Tolerancia de ±0,5 dB absolutos,
  fijada antes de medir; las nueve comparaciones dan 0,0000 dB. Praat 7.0.03 no reproduce exactamente
  6.4.49 (en [e], F1 358,0499 Hz frente a 357,6936: 0,10 %) y praatfan coincide con 6.4.49, así que esas
  referencias no se regeneraron. Rojo: tres pruebas del arnés y la de fixtures; mutación: +0,6 dB en una
  referencia la hace fallar. (b) TextGrid: `scripts/textgrid-praat-roundtrip.mts`
  (`npm run validate:textgrid-praat`) exporta con `serializeTextGrid`, lo abre con `praat --run`, compara
  capas, intervalos, puntos y etiquetas y relee lo que Praat guarda: 5 de 5 casos iguales (varias capas,
  etiquetas vacías, AFI, comillas, tiempos sin decimal exacto y `pato.TextGrid`). Mutación: sin doblar
  comillas Praat rechaza el archivo; un límite movido se marca. La prueba solo corre con `praat` en el
  PATH. P17 cerrada en lo del TextGrid. La interfaz ya dice que la intensidad está validada y la ficha
  `textgrid-viewer` pasa a `stable` (su nota decía que no había análisis acústico y que Praat no se podía
  medir). Queda el aviso `audio.experimental` del visor, que se quita junto con 5.4 (mismo archivo).
- **L31 (2026-11-14). T5, unidad 5.4: selección, lecturas, barras y zoom.** Arrastrar sobre la onda o el
  espectrograma selecciona un tramo (desde 4 px; menos es un clic y pone el cursor). El cursor va al
  inicio del tramo, como en Praat, y la selección vale mientras siga ahí; sin arrastre, la selección es el
  intervalo bajo el cursor. Lecturas en la fila del cursor: selección (inicio, fin, duración;
  `aria-live`) y puntero (tiempo y, sobre el espectrograma, Hz). Bajo las capas, «Reproducir» Visible,
  Selección, Todo (las barras de Praat como botones: tres barras apiladas no cabían en una pantalla) y
  «Ver» Todo, Acercar, Alejar, Selección, Atrás. Atajos con el foco en el editor, verificados en el
  manual de Praat («Keyboard shortcuts»): Ctrl+A, I, O, N; «Atrás» no tiene atajo porque el manual no lo
  lista; Chrome se queda Ctrl+N y la ayuda lo dice. Mayús+←/→ extienden la selección (propio de
  LinguaLab: en Praat Mayús+Tab reproduce la ventana, y aquí Mayús+Tab sale del editor). Cambio de
  comportamiento: al terminar o interrumpir un tramo, el cursor vuelve a donde estaba; antes quedaba al
  final y la selección saltaba al intervalo siguiente. Rojo: 23 pruebas unitarias; cuatro e2e por
  mutación. Verificación independiente sin bloqueos (arrastre, clic de 2 px, Tab y barras, zoom e
  historia, Hz en el puntero, Ctrl+A fuera del editor sin interceptar, guía de «pato»); solo hay Chromium
  en esta máquina, Firefox y Safari sin probar. En el mismo commit: se quita el aviso «experimental» del
  visor (la ida y vuelta por Praat pasa, L30) y se corrige `audio.status.mismatch`, que imprimía «s s»
  (rojo: `src/scripts/audio/strings.test.ts`).
- **L32 (2026-11-14). T5, unidad 5.5: consultas y atajos.** «Consultar» en la fila de abajo del editor
  (Tono, F1, F2, Intensidad) y, con el foco en el editor, las teclas del manual de Praat («Keyboard
  shortcuts»): F1 «Get first formant», F2 «Get second formant», F5 «Get pitch» (F10 en Mac) y F8 «Get
  intensity»; fuera del editor F1, F5 y F10 siguen siendo del navegador, y la ayuda lo dice. Con un tramo
  arrastrado se da la media en el tramo; si no, el valor en el cursor (manual, «Intro 4.3» y «5.3»). La
  respuesta va en una línea `aria-live` y dice «tramo sordo» o «sin valor» en vez de 0 Hz. Diferencias
  con Praat, a la vista: el cursor toma el marco más cercano (Praat interpola), la intensidad de un tramo
  es la media de energía y la selección no se recorta a lo visible. Nueva e2e que lee F1 y F2 de la tabla
  de medidas sobre `vocal-{a,e,i}.wav` (la lección del defecto de los 3 formantes) y otra de teclado que
  compara F0, F1, F2 e intensidad con el JSON de referencia, con `DEFAULT_TOLERANCES`: error máximo
  0,10 % y 0,04 dB. Nota: con el techo de formantes por defecto de la página (5500 Hz) [a] da F1 ≈ 800 Hz;
  las referencias se midieron con 5000 Hz, y la e2e fija ese valor. Rojo: 14 pruebas unitarias; e2e por
  mutación (sin el campo de frecuencia máxima, con F1 tomado de F2, sin F8: fallan). Verde: `verify:all`
  y 202 e2e; solo Chromium. **Con esto T5 queda hecha en código.**
- **L33 (2026-11-17). T9, inventario y primera migración.** El dueño, textual: «read the handoff of the
  project, and continue with the pending tasks, give me a report of the actual situation of the
  project». Inventario de líneas de script por componente: TextStation 638, ArborLab 369, FonoLab 319,
  ExperimentsLab 318, PhonemizerLab 267, Glossary y Bibliography 62, SecurityPage 26; los que ya siguen
  el patrón del visor, de 1 a 7. Decisión: **no** se crea `defineTool`; el contrato común ya existe y lo
  usan nueve componentes: el `<script>` hace `safeInit("x", initX)` e `initX`, en
  `src/scripts/<área>/index.ts`, busca su raíz por `data-*`. Un envoltorio más sería una segunda forma
  de hacer lo mismo. Tope fijado en 30 líneas de script, con trinquete: `PENDING_EXTRACTION` lista los
  que faltan y la prueba falla si uno de la lista ya cumple. PhonemizerLab pasa sus reglas a
  `src/scripts/phonemizer/rules.ts` (opciones, mensajes, errores, comparación con la tabla) y el
  cableado a `index.ts`. Rojo: el trinquete marcó `PhonemizerLab.astro: 242`; 15 pruebas de reglas sin
  módulo. Verde: `verify:all` y 202 e2e.
- **L34 (2026-11-17). T9 cerrada.** El dueño, textual: «do the task and push it to github repo, when all
  the validations are ok merge to main, push and implement, review in vercel and finish». Migrados, uno
  por commit: FonoLab (`src/scripts/fono/rules.ts` e `index.ts`), Glosario y Bibliografía (tenían el
  mismo script copiado; ahora comparten `initCatalogueFilter`, con prueba sobre un DOM que no existía),
  ArborLab (`src/scripts/trees/workbench-rules.ts` y `workbench.ts`) y la estación de texto
  (`src/scripts/tools/station-rules.ts` y `station.ts`; la prueba fija las claves de la exportación).
  ExperimentsLab ya solo conectaba: el contador contaba de más porque un comentario del frontmatter
  nombraba `<script>`; se corrigió con su prueba. ArborLab no tenía e2e funcional: `e2e/arbor.spec.ts`
  (siete casos) se escribió contra el código anterior, pasó, y sigue pasando después de mover el código.
  La lista de pendientes quedó vacía y se quitó: el tope de 30 líneas vale para todos. `claims.test`
  ahora busca la llamada al motor en `src/scripts/fono/index.ts`. Verde: `verify:all` y 209 e2e, solo
  Chromium; el peso de la peor página no cambió. La portada sigue con la tabla de Ortografía (decisión
  menor abierta).
- **L35 (2026-11-17). Defecto real del visor, encontrado por la CI del PR #22.** «Ver pato resuelto»
  fallaba en CI y no en esta máquina. La prueba de CI no guardaba evidencia: se añadió subir los rastros
  de Playwright solo cuando falla la e2e. El rastro mostró que la página dejaba de pintar cuadros. La
  causa, reproducida forzando el `AudioContext` a 44,1 kHz (esta máquina decodifica a 48 kHz; el runner,
  sin tarjeta de sonido, y muchos equipos, a 44,1): «pato» está a 48 kHz y su TextGrid termina en el
  último instante; decodificado a 44,1 kHz el audio queda un poco más corto, lo analizado se corta en
  el audio y `planVisibleAnalysis` nunca lo daba por cubierto, así que cada redibujo volvía a analizar sin
  fin. Ahora compara con la parte de la vista que tiene audio. Rojo: dos pruebas unitarias; una e2e que
  fija 44,1 kHz, comprobada por mutación (con el código anterior falla). En el mismo PR, CodeQL marcó
  `js/bad-tag-filter` en el contador de líneas de `architecture.test.ts`: ahora reconoce `</SCRIPT >`,
  con prueba. Verde: `verify:all` y 210 e2e.
- **L36 (2026-11-17). T11 abierta (S12).** PR #22 fusionado (`769b233`) con CI, CodeQL y Vercel en verde;
  producción desplegada y `live:check` en verde en las 30 páginas. Auditoría de árboles, construyendo cada
  ejemplo de cada tipo: seis fallan al dibujarse («Texto sobrante tras el árbol» o «Carácter inesperado»).
  Causas: (a) las líneas `move:` no se quitan antes de analizar los corchetes, y el banco descarta las
  flechas que sí se leen (`draw(tree, [])`), así que ningún movimiento se dibujó ni se comprobó;
  (b) `checkMovement` lee `move: a -> b` al revés de lo que dice la ayuda («origen -> destino») y de lo
  que escriben todos los ejemplos; (c) ejemplos rotos: `ccg#0` es una categoría y no un árbol,
  `semantic#1` tiene una estructura que el analizador no lee, `movement#1` y `minimalist#2` apuntan a
  marcas `#id` que no existen, `lfg#0` usa una línea `note:` que nada interpreta. Exportaciones de
  árboles: «Brat» descarga solo el texto de las hojas (Brat es un formato de anotación con `.ann`:
  no lo es); CoNLL-U inventa núcleos («todo depende de la palabra 1») y categorías por la longitud de la
  palabra para árboles que no son de dependencias; Newick borra caracteres reservados y puede inventar
  la etiqueta «nodo». Los cuatro escritores de CSV (anotaciones, mediciones, resultados, reglas)
  entrecomillan bien según RFC 4180.
- **L37 (2026-11-17). T11, árboles.** Arreglado, cada cosa con su prueba en rojo primero: (a) las líneas
  `move:` se quitan antes de analizar y las flechas llegan al dibujo y a las comprobaciones; (b) el
  mando-c lee `move: origen -> destino` como dice la ayuda, y usa el primer nodo que ramifica por encima
  del sitio de aterrizaje (Reinhart 1976), no su padre: una marca sobre una hoja bajo un nodo unario no
  mandaba-c a nada; (c) ejemplos: elevación, pasiva («Pasoiva» y el sintagma con «by» colgado de un CP),
  fases y QR reescritos en su estructura estándar con marcas y flechas que pasan el mando-c; `lfg#0` sin
  la línea `note:` que nada interpretaba; `ccg#0` quitado (una categoría no es una derivación; CCG sigue
  en D3). `src/scripts/trees/examples.test.ts` dibuja todos los ejemplos y exige que toda flecha pase.
  Exportaciones: **el SVG no era XML válido** (la familia tipográfica `"Noto IPA", …` cerraba el
  atributo) y por eso **el PNG nunca se descargaba** (el error se tragaba en silencio): ahora se escapa,
  los colores `lab()`/`oklch()` pasan a hex sRGB y el PNG avisa si falla. Newick entrecomilla en vez de
  borrar caracteres. CoNLL-U solo para árboles de dependencias, con los núcleos y relaciones escritos
  (UPOS si es de UD, si no XPOS). Brat quitado: solo bajaba el texto de las hojas. El JSON guarda las
  flechas. `e2e/arbor.spec.ts` descarga y valida cada formato. Revisión teórica de cada formalismo: sigue
  en T4, espera D3.
- **L38 (2026-11-17). T11 cerrada: exportaciones del resto de laboratorios.** `e2e/exports.spec.ts`
  descarga y lee de vuelta lo que no se validaba por contenido: TextGrid y CSV de intervalos del visor
  (mismas etiquetas que el TextGrid cargado; intervalos contiguos), ELAN de TextGrid a `.eaf` (XML
  válido con `ANNOTATION_DOCUMENT`) y de vuelta a TextGrid con las mismas etiquetas, la especificación
  JSON de experimentos (semilla y estímulos con comillas) y el CSV de reglas de ortografía, reimportado
  igual. Pasaron a la primera: no se encontró defecto fuera de los árboles. Ya se validaban por contenido
  y no se repiten: TextGrid contra Praat, CSV de mediciones, CSV de resultados, JSON de la estación de
  texto y de la tabla ortográfica. Aviso, sin cambio: los CSV no neutralizan celdas que empiezan con
  `=`, `+`, `-` o `@`; hacerlo alteraría datos lingüísticos legítimos (sufijos «-s», clíticos «=lo»), y los
  datos son de la propia persona. Verde: `verify:all` y 222 e2e.
- **L39 (2026-11-17). T7: análisis cualitativo.** Decisión del dueño, preguntada antes de empezar: la unidad
  que se codifica son **segmentos** (línea o párrafo), no tramos libres; con tramos libres el acuerdo
  pediría la alfa de unitización. Motor en `packages/core/src/qualitative/`: libro de códigos (MacQueen y
  colaboradores, 1998), hoja de codificación en CSV ancho (`segment,text,<códigos>`, 1/0/vacío = no
  codificado), frecuencias, coocurrencias, acuerdo porcentual, kappa de Cohen y alfa nominal de
  Krippendorff. Validación: `scripts/r/build-agreement-reference.R` corre `irr` 0.85 sobre cinco
  matrices (entre ellas el ejemplo de Krippendorff, α = 0,743) y versiona el resultado; las pruebas
  exigen las mismas cifras a 1e-12, y mutar el peso de la alfa o el azar de la kappa las rompe. La R de
  esta máquina es la 4.5.2, no la 4.3.3 que dice la cabecera; `irr` se instaló en una biblioteca temporal,
  no en la del sistema. Diferencia declarada con R: sin variación la alfa es indefinida (`null`); `irr`
  da 1. Página `/cualitativo` (área «documentación», estado experimental), con ejemplo inventado en
  cada idioma, siete referencias verificadas en Crossref o en CRAN y cinco descargas leídas de vuelta en
  `e2e/qualitative.spec.ts`. axe encontró dos defectos propios antes del commit, ya corregidos: una
  tabla vacía con cabecera (th-has-data-cells) y botones que no partían su rótulo a 320 px. Se añadió
  una prueba con axe sobre la página con datos, porque las tablas que construye el navegador no existen
  cuando `accessibility.spec.ts` mide la página vacía. De paso, el README ya no anuncia la exportación
  Brat que T11 quitó.
- **L40 (2026-11-17). Propuesta del dueño, sin decidir todavía.** Textual: «Is it possible to implement
  some POS tagging, NER tagging, and other NLP tools in the text editor? To complement and reorganize the
  entire interface of this lab—since it’s the simplest one—I think we could add a feature to the website
  that would allow users to upload 2 or, at most, 3 documents in docx or PDF format with extractable
  text and conduct comparative corpus analyses. What do you think?». Respuesta dada: viable; primero la
  comparación de 2–3 documentos (.docx/PDF con pdf.js, frecuencia normalizada, keyness con log-likelihood
  y log ratio, diversidad léxica, n-gramas compartidos, KWIC, contrastado con R); después POS y NER,
  eligiendo el motor por exactitud medida en los conjuntos de prueba de Universal Dependencies (AnCora,
  EWT). Queda como S13 cuando el dueño lo confirme.
- **L41 (2026-11-17). S13 empieza.** Pedido textual: «start the document comparison first, and give me the
  differences between webR and our own engine for maths». Plan: T12 a T15. Fixtures reales: .docx con
  pandoc y PDF con pandoc + xelatex, versionados con el script que los genera. Las cifras de palabras
  clave se contrastan con R base (devianza de un modelo de Poisson de independencia sobre la tabla 2×2 =
  G²; `pchisq` para p), sin paquetes. Para D4 se dio la comparación webR / motor propio (ver respuesta
  del 2026-11-17); D4 sigue abierta.

