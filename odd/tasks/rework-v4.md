---
status: active
updated: 2026-11-10
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
- **S11 (diseño).** «me gusta mucho el front pero puedes hacerlo mejor, revisa páginas parecidas y copia
  diseños o escanea repositorios de diseño para que sea más llamativa, intuitiva y útil para los
  estudiantes».

## Decisiones abiertas (del dueño)

Se preguntan de a una, al empezar la fase que las necesita.

- **D1 (antes de T2 y T5).** Dónde corren los motores: en el navegador (TypeScript, y Rust compilado a
  WebAssembly donde una medición lo justifique, lo que pide instalar Rust en esta máquina) o en un
  servidor propio (Go o Rust), que rompería la regla «los datos no salen del navegador» (ADR 0002).
- **D2 (T3).** Qué lenguas entran primero al fonemizador.
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
| T1 | S5, S6 | Modelo de referencias por herramienta en el núcleo; apartado en Acerca; enlace «teoría» en cada herramienta; prueba que exige al menos una referencia verificada por herramienta | inline | pendiente | — |
| T2 | S1, S2 | Fonemizador por capas: reglas, diccionario y eSpeak como respaldo declarado; salida normalizada al AFI; corpus de evaluación con tasa de error medida antes y después | por decidir (D1) | pendiente | — |
| T3 | S3 | Lenguas nuevas, cada una con su fuente y su medición | por decidir (D2) | pendiente | — |
| T4 | S4, S5 | Árboles: validador y notación por teoría, o retiro declarado | por decidir (D3) | pendiente | — |
| T5 | S1, S7 | Visor acústico al estilo de Praat; contraste numérico contra Praat 6.4.06 (cierra P17) | por decidir (D1) | pendiente | — |
| T6 | S9 | Estadística cuantitativa, contrastada con R 4.3.3 | por decidir (D4) | pendiente | — |
| T7 | S9 | Análisis cualitativo: codificación, libro de códigos, coocurrencias, acuerdo entre codificadores | inline | pendiente | — |
| T8 | S6, S11 | Diseño: referencias, maquetas, aplicación | por decidir (D5) | pendiente | — |
| T9 | S1 | Contrato único de herramienta y carga bajo demanda en todas | inline | pendiente | — |
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
