# Trabajo pendiente

Este documento es un **traspaso**, no una lista de deseos. Cada entrada existe porque alguien —una
sesión, un verificador independiente o una medición— encontró algo concreto, y anota lo que haría falta
para cerrarlo sin tener que redescubrirlo.

## Cómo usar esto

Una entrada por sesión. Antes de empezar, leé la columna **Próximo paso exacto**: casi todas incluyen
una decisión ya tomada, y rehacerla suele dar un resultado peor que el que está escrito.

**La puerta e2e necesita el navegador instalado y el puerto 4321 libre.** `npx playwright install chromium`
una vez, y ningún `npm run dev` vivo: con el puerto ocupado la corrida falla a propósito (P7). Ya **no**
hace falta `env -u AI_AGENT`: la puerta arranca el preview con `--ignore-lock` (P16).

**Si llegás a este documento desde otra máquina o otra sesión:** el estado de la rama de trabajo, el mapa
de archivos nuevos y las trampas del entorno están en
[`odd/handoff/toolbox-v3.md`](../odd/handoff/toolbox-v3.md). Este archivo dice qué falta; ese otro dice
dónde está todo.

**Antes de tocar nada:**

```bash
cd ~/Documentos/06\ Proyectos/LinguaLab
nvm use 22            # sin esto no corren las puertas; hay .nvmrc
npm install
npm run verify:all    # lint, formato, tipos, reglas hexagonales, pruebas, build verificado
npx playwright test   # e2e; requiere el puerto 4321 LIBRE (ver P7)
```

**Estado al escribir esto:** `main` es lo publicado y la entrega v3 sigue en su cadena de ramas, sin
fusionar. Sobre la rama de cierre (`feat/toolbox-v3-closure`): `verify:all` en verde —**943 pruebas
unitarias en 55 archivos**, 0 errores de tipos, 198 módulos y 452 dependencias sin violaciones—,
**88 e2e** en verde (50 de accesibilidad sobre 25 páginas × 2 temas), `npm run audit` en 0 y
`npm run lint` con 0 errores y 47 avisos, de los cuales 42 ya están en `main`. Los números exactos del día
viven en `docs/STATUS.md`, no acá; estas cifras se midieron el 2026-10-25.

**Qué está cerrado y qué no.** De P1 a P21, están cerradas con su medición al lado: P1, P3, P8, P12, P13,
P16, P18 y P19. Siguen abiertas P2, P4, P5, P6, P7, P9, P10, P11, P14, P15, P17, P20 y P21, por los
motivos que cada una declara —decisión de producto, hablantes o fuentes, un programa externo, un binario
que se recompila, o un método de medición que todavía no existe—.

---

## P1 — La prosa vive en el núcleo, no en la capa de presentación

**Severidad:** la única deuda que el usuario puede ver en pantalla.

**Síntoma.** Abrí `/en/ortografia`, cargá una tabla con un error y mirá el mensaje: la insignia está en
inglés y **la oración está en español**.

**Evidencia.** `packages/core/src/application/validate-orthography-table.ts:27` define `OrthographyIssue` con un campo
`message: string` que ya viene redactado en español. Lo redacta el caso de uso
`packages/core/src/application/validate-orthography-table.ts`. La capa de presentación
(`src/scripts/ortografia/render.ts`) solo puede pintarlo tal cual, porque no recibe el dato, recibe la
frase. El núcleo tiene seis códigos de problema y todos viajan convertidos en prosa antes de cruzar el
puerto.

**Por qué no se hizo.** Es un cambio transversal al contrato de errores del núcleo, y el pedido del
usuario para esta rama no lo cubría. Hacerlo a mitad de camino habría dejado dos formatos conviviendo.

**Próximo paso exacto.** Que el núcleo devuelva **código + datos** (`{ code, field?, line?, value? }`) y
que el texto se arme en la capa de presentación, donde ya existe el mecanismo de i18n: el editor ya
serializa cadenas traducidas en `data-json` (ver `docs/adr/0004-textos-en-tiempo-de-ejecucion.md`). Las
seis traducciones van a `src/i18n/messages/es.ts` y `en.ts` como claves tipadas, con el mismo patrón
`EDITOR_STRING_KEYS satisfies readonly MessageKey[]` que ya usa el editor.

**Criterio de aceptación.** Una prueba que valide la misma tabla rota en `/ortografia` y en
`/en/ortografia` y afirme que **ninguna de las dos salidas contiene texto del otro idioma** —no basta con
comprobar la insignia. Y las 7 suites de contrato del núcleo siguen en verde, porque el tipo de
`OrthographyIssue` cambia.

**Estado: cerrado.** `OrthographyIssue` es ahora una **unión discriminada de código y datos**, sin un
campo de prosa: `grapheme` para `duplicate-rule` y `contradictory-rule`, `className` para
`undefined-class`, `symbol` para `symbol-outside-ipa`, y nada extra para `empty-grapheme` y
`unreachable-rule`. `OrthographyIssueCode` se deriva del tipo, así que las dos listas no pueden divergir.
La frase se arma en `src/scripts/ortografia/render.ts` con seis claves nuevas en `es.ts` y `en.ts`, y un
`ISSUE_KEYS satisfies Record<OrthographyIssue["code"], EditorStringKey>` hace fallar el typecheck si un
código se queda sin frase o una frase nombra una clave que el componente no serializa. El número de fila y
las llaves de `{V}` se agregan en presentación: son notación de la tabla, no datos que el validador deba
inventar.

Lo que se midió, y con qué: rojo observado en el núcleo antes del cambio (`expected [...] to deeply equal
['code','ruleIndex','severity']`, con `+ "message"` en lo recibido) y en la e2e (la oración seguía
llegando redactada desde el núcleo); después, **943 pruebas unitarias en 55 archivos** y **88 e2e** en
verde, incluidas las de `table-invalid` y la de `/en/ortografia` que afirma las seis oraciones en inglés y
la ausencia de las seis en español. La sección de validación de las dos rutas queda afirmada oración por
oración.

---

## P2 — Los dos orquestadores y el render no tienen prueba unitaria

**Síntoma.** Ninguno.

**Evidencia.** `grep -rn "scripts/ortografia\|scripts/catalogo" --include='*.test.ts'` no devuelve nada.
Existen pruebas para `csv.ts`, `rules.ts`, `share.ts`, `state.ts` y `catalog-data.ts` —la lógica pura—
pero **ninguna** para `src/scripts/ortografia/index.ts`, `src/scripts/ortografia/render.ts` ni
`src/scripts/catalogo/index.ts`, que son los que tocan el DOM.

**Por qué no se hizo.** La regla del proyecto prohíbe `innerHTML` y exige construir todo con
`document.createElement`; esa parte la sostienen las pruebas de extremo a extremo, que recorren el flujo
completo en un navegador de verdad. Una prueba unitaria del DOM con `jsdom` no aportaría más que la de
extremo a extremo, que además prueba el artefacto real.

**Próximo paso exacto.** **Antes de escribirlas, decidí si vale la pena.** Si la respuesta es sí, el
ángulo útil no es «renderiza esto» sino la **construcción por nodos**: una prueba que recorra el árbol
resultante y falle si aparece cualquier nodo cuyo camino pase por `innerHTML`, y otra que verifique que
un texto con `<` y `>` se inserta como texto y no como marcado. Eso es un invariante de seguridad, no una
repetición de lo que ya cubre Playwright.

**Criterio de aceptación.** La prueba tiene que poder fallar: introducí un `innerHTML` a propósito y
comprobá que se pone roja antes de darla por buena.

---

## P3 — La rama `quota-exceeded` del adaptador nunca se ejecutó

**Síntoma.** Si el navegador se queda sin cuota, el adaptador de IndexedDB debería degradar a memoria y
avisar. Ese camino nunca corrió en una prueba.

**Evidencia.** `packages/adapters/src/orthography-repository/indexeddb-orthography-repository.ts`
contempla el caso, pero `fake-indexeddb` no puede levantar un `QuotaExceededError`: no simula cuotas. El
caso hermano —IndexedDB no disponible— **sí** está probado, en el archivo
`indexeddb-orthography-repository.memory-fallback.test.ts`.

**Por qué no se hizo.** El doble de prueba no permite provocar la condición, y la respuesta honesta era
declararlo en vez de escribir una prueba que simule el error y afirme que el código que maneja ese error
existe.

**Próximo paso exacto.** La vía que sí prueba algo real es interceptar `IDBObjectStore.prototype.put`
desde la prueba y hacer que rechace con un `DOMException` de nombre `QuotaExceededError`. `fake-indexeddb`
respeta el prototipo real, así que el parche llega hasta el adaptador. Es media tarde, no una semana.

**Criterio de aceptación.** Después del fallo de escritura, la tabla **sigue siendo legible** (la memoria
tomó el relevo) y `persistence()` informa una degradación. Si el guardado se pierde en silencio, la
prueba falla y el adaptador está mal.

**Estado: cerrado.** `packages/adapters/src/orthography-repository/indexeddb-orthography-repository.quota.test.ts`
hace exactamente eso: guarda una tabla en IndexedDB, intercepta `put` con un `QuotaExceededError`, guarda
otra y afirma las tres cosas —la nueva se guarda, la anterior sigue exportable, y `persistence()` dice
`{ backend: "memory", reason: "quota-exceeded" }`—. Se comprobó por mutación: quitando la degradación, la
prueba se pone roja. Y tiene un segundo caso que no se había pedido: un `AbortError` **no** se disfraza de
degradación; se informa el código del puerto y el adaptador sigue en IndexedDB, porque cambiar de backend
por un error que no es de espacio taparía el problema real.

---

## P4 — Seis avisos de complejidad cognitiva, y uno es un 40

**Síntoma.** Ninguno hoy. Es el costo de mantenimiento de la próxima persona.

**Evidencia medida, no reconstruida (ver P8).** Con `node scripts/lint-baseline.mjs`, que extrae
`main` con `git archive` y corre el linter sobre los dos árboles con la misma configuración: `main` da
**0 errores y 42 avisos**, y el tip de esta entrega da **0 errores y 47**. De esos 42 heredados, **27**
son `noExcessiveCognitiveComplexity`. Los **5 nuevos** son todos de complejidad y están concentrados:

| Archivo | Complejidad | Lado |
|---|---|---|
| `packages/core/src/data/textgrid.ts` | 4 avisos (el codec que creció con el segmento 6) | **nuevo** |
| `src/scripts/audio/index.ts` | 1 aviso (el controlador del visor) | **nuevo** |
| `src/scripts/ortografia/index.ts` | **40**, más dos de 16 y 23 | heredado |
| `src/scripts/ortografia/csv.ts` | 23 y 21 | heredado |
| `e2e/accessibility.spec.ts` | **30** | heredado, y no lo agregó este cambio |

**Corrección medida de lo que decía esta entrada.** Afirmaba que el aviso de la puerta de accesibilidad
«lo agregó este mismo cambio», y que el reparto era 27 = 6 nuevos + 21 heredados. Las dos cosas son
falsas: el aviso de `e2e/accessibility.spec.ts` **ya está en `main`**, y el reparto real es **32 = 5
nuevos + 27 heredados**. Además, de los 15 avisos que no son de complejidad, los 4 de `useBiomeIgnoreFolder`
también están en `main`: esa regla no es nueva, y por eso son heredados en sentido estricto. La medición
está en P8 y se repite con `node scripts/lint-baseline.mjs`.

**Por qué no se hizo.** El archivo de 40 es el manejador de un `click` **delegado**: una cadena de `if`
con salidas tempranas sobre unas veinte acciones. Los `switch` de ese archivo (líneas 326, 450, 518) son
sobre `error.code` y `field`, y no tienen que ver con la complejidad. Partirlo en funciones con nombre es lo correcto y es una refactorización que conviene
hacer **con** las pruebas de P2, no antes.

**Próximo paso exacto.** Empezá por `csv.ts`, que no toca el DOM y ya tiene pruebas: extraer el analizador
de encabezados baja los dos avisos sin riesgo. El de 40, dejalo para cuando exista la prueba del
invariante de nodos de P2. Los cinco nuevos —`textgrid.ts` y el controlador del visor— se tocan con las
pruebas de esas dos piezas, que ya existen y son densas.

**Criterio de aceptación.** Los avisos bajan y **ninguna prueba cambia de resultado**. Si alguna se cae,
la refactorización cambió comportamiento y hay que revertirla.

**Estado: abierto a propósito, como deuda aceptada y ahora medida.** Esta entrada no se cierra en la rama
de cierre: partir funciones por bajar un contador, sin tocar el archivo por otro motivo, mezcla dos
historias en un mismo diff. Lo que cambió es que el reparto ya no es una inferencia.

---

## P5 — El motor resuelve las clases `{V}`; el editor no tiene interfaz para ellas

**Síntoma.** El prompt original describe clases de contexto con la forma `{V}`. Se pueden escribir en el
JSON de la tabla y el motor las resuelve, pero en el editor no hay forma de crearlas ni de editarlas.

**Evidencia — y una corrección.** Una versión anterior de este documento afirmaba que `{V}` «no aparece
en el repositorio». **Es falso, y el error era grave** porque desalentaba una tarea que en realidad es
mucho más chica de lo que parecía. `{V}` **está implementado**: `packages/core/src/engine/patterns.ts:13`
lo define como «cualquier carácter de la clase `V`», y hay pruebas que lo ejercitan —
`patterns.test.ts:12,27` lo resuelve contra `["a","e","i","o","u"]`; `convert-layer.test.ts:104` lo
resuelve contra las clases de la tabla; `validate-orthography-table.test.ts:72` rechaza una regla cuya
clase no existe—. Está documentado en `docs/orthography-tables.md`. Lo que falta es **solo la interfaz**:
sin editor de clases, hay que escribir la sintaxis a mano.

**Por qué no se hizo.** El pedido del usuario cubría hasta la «Herramienta A: ortografía → AFI». El motor
necesitaba las clases para poder expresar contexto, así que se implementaron; la interfaz para editarlas
quedó fuera de ese alcance.

**Próximo paso exacto.** Es una tarea de **interfaz sobre algo que ya funciona**, no de motor. Antes de
empezar, preguntá al usuario **cómo quiere editar** una clase: ¿un campo donde escribe los caracteres?,
¿elegirlos de la tabla de símbolos?, ¿una lista derivada de las reglas existentes? La **notación** ya está
decidida; lo que falta decidir es la edición.

**Criterio de aceptación.** Crear una clase desde la interfaz produce **exactamente el mismo JSON** que
escribirla a mano, y el `trace` nombra la clase que coincidió. Sin lo segundo no se puede revisar.

---

## P6 — La revisión de la rama acumulada no entra por tamaño

**Síntoma.** `gentle_review` con `inspect` ofrece `review.start` sobre la rama entera, y el arranque se
rechaza a sí mismo.

**Evidencia.** El preflight falló **dos veces** con `lens_context_budget_exceeded` sobre 156 rutas
(~14.900 líneas). La rebanada que sí entró fue un sufijo de 745 líneas en 13 archivos, con
`baseRef=7b6d033`, y cerró **aprobada y reconocida** (`review-cd4013456007de5a`, autoridad quemada).

**Próximo paso exacto — la receta, ya pagada con tres intentos:**

```json
{"mode": "ordinary", "baseRef": "<commit anterior al tramo>", "committedOnly": true}
```

**Sin `lenses`.** Ese es el hallazgo que costó dos intentos: `baseRef` **combinado** con `lenses` devuelve
`lenses-invalid` —la segunda vez con el conjunto de lentes que el propio proveedor había aceptado antes—,
y el código de error nombra el campo equivocado. Sin lentes, entra y el proveedor elige. Y `baseRef` solo
puede rebanar **sufijos**: no sirve para aislar un commit del medio.

**Defecto de proveedor a reportar.** `lenses-invalid` sobre `baseRef` + `lenses` es un diagnóstico
incorrecto: el campo culpable es `baseRef`, no `lenses`. Un mensaje de error que señala el campo sano
manda a quien lo lee a arreglar lo que no está roto.

**Criterio de aceptación.** `STATUS` llega a cierre aprobado y el reconocimiento quema la autoridad. Si
se corta a mitad, **se reanuda con `STATUS`** sobre el `lineageId` retenido: no se reabre otro linaje.

---

## P7 — La puerta prueba contra el servidor de desarrollo si hay uno levantado

**Síntoma.** `npx playwright test` se cae casi entero (4 de 56 pasan) y parece que las pruebas están mal.

**Evidencia.** Medido: `astro dev` vivo en el 4321 + `reuseExistingServer: true` en
`playwright.config.ts`. Playwright reutiliza **ese** servidor, que compila a demanda, no aplica la CSP y
sirve los módulos sin empaquetar. Con la suite entera encima, los tiempos de espera caen en cascada.

**Estado: cerrado.** `reuseExistingServer` pasó a `false` y `docs/CONTRIBUTING.md` lo explica. Con `false`
la puerta exige el puerto libre y **falla avisando que la url ya está en uso** —nombra la url, no el
proceso que la ocupa—, que es ruidoso y correcto; el verde
silencioso sobre el artefacto equivocado era peor, porque un verde no lo investiga nadie.

**Por qué queda anotado igual.** Porque la lección es la que importa: mi primera hipótesis fue «contención
de 56 navegadores en paralelo» y era **falsa**. El arreglo que iba a aplicar —limitar `workers`— habría
tapado el síntoma y dejado la trampa viva. Se reprodujo antes de decidir.

**Proximo paso exacto.** El puerto del e2e y el de `astro dev` siguen siendo el mismo (4321). Separarlos
—`preview:e2e` en el 4331— elimina la clase entera de defecto en vez de solo el caso.

---

## P8 — La línea base de lint es medible; el «se cae» era falso

**Síntoma.** El reparto entre avisos heredados y propios de P4 se estableció **por existencia del archivo**
en `main`, no corriendo el linter sobre él.

**Evidencia, corregida.** Una versión anterior de este documento afirmaba que Biome 2.5.15 se cae con
`exit=101` sobre un árbol de `main`. **Un verificador independiente no pudo reproducirlo en cinco
escenarios** —árbol extraído con `git archive`, clon nuevo, con y sin la configuración actual, `check` y
`lint`—: en todos, Biome termina con `exit=1` y **completa el informe**. Con la configuración de esta rama
sobre `main` informa «Checked 64 files. Found 5 errors. Found 36 warnings». Así que **la línea base sí es
medible** y el reparto se puede comprobar en vez de inferir.

**Por qué importa.** Un aviso heredado y uno propio se arreglan distinto: el heredado es deuda aceptada,
el propio es trabajo sin terminar. Mientras el reparto sea una inferencia, no se sabe cuál es cuál.

**Próximo paso exacto.** Extraé `main` a un directorio aparte, copiá la `biome.json` de esta rama y corré
`biome lint` con el informe en JSON. Compará contra el informe de la rama. Recién entonces P4 puede decir
«heredado» con una medición detrás.

**Criterio de aceptación.** Los dos informes JSON existen y cada aviso queda atribuido a uno de los dos
lados. Un aviso que aparece en los dos es heredado.

**Lo que sigue sin explicarse.** El `exit=101` original no se reproduce, así que o fue un estado
transitorio del árbol de prueba o un error de aquella medición. **No lo cuentes como un hecho.**

**Estado: cerrado, y esto es la medición.** `node scripts/lint-baseline.mjs` extrae `main` con
`git archive` a un directorio temporal, copia la `biome.json` del árbol actual y corre el linter sobre los
dos con el mismo binario y la misma configuración. Los dos informes JSON quedan en el directorio temporal
que imprime al final, y el reparto sale solo:

```
Base: main (42 avisos)
Actual: árbol de trabajo (47 avisos)

Heredados: 42 avisos   (0 errores en los dos lados)
   4  useBiomeIgnoreFolder                      biome.json
   1  noExcessiveCognitiveComplexity             e2e/accessibility.spec.ts
   1  noExcessiveCognitiveComplexity             scripts/fetch-ipa-audio.mjs
   1  noUnusedVariables                          scripts/fetch-ipa-audio.mjs
   1  noExcessiveCognitiveComplexity             scripts/verify-build.mjs
   1  noExcessiveCognitiveComplexity             src/data/articulation.ts
   1  noExcessiveCognitiveComplexity             src/scripts/fono/vocal-tract.ts
   2  noExcessiveCognitiveComplexity             src/scripts/ortografia/csv.ts
   3  noExcessiveCognitiveComplexity             src/scripts/ortografia/index.ts
   1  noExcessiveCognitiveComplexity             src/scripts/tools/analysis.ts
   2  noExcessiveCognitiveComplexity             src/scripts/tools/readability.ts
   1  noExcessiveCognitiveComplexity             src/scripts/tools/tokenize.ts
   2  noExcessiveCognitiveComplexity             src/scripts/trees/checks.ts
   3  noExcessiveCognitiveComplexity             src/scripts/trees/parse.ts
   2  noExcessiveCognitiveComplexity             src/scripts/trees/render.ts
   5  noGlobalIsNan                              src/scripts/trees/solvers.test.ts
   3  useOptionalChain                           src/scripts/trees/solvers.test.ts
   6  noExcessiveCognitiveComplexity             src/scripts/trees/solvers.ts
   2  noGlobalIsNan                              src/scripts/trees/solvers.ts

Nuevos: 5 avisos
   4  noExcessiveCognitiveComplexity             packages/core/src/data/textgrid.ts
   1  noExcessiveCognitiveComplexity             src/scripts/audio/index.ts
```

**Qué enseña, y corrige.** El reparto de P4 estaba mal en dos puntos: el aviso de la puerta de
accesibilidad **ya existe en `main`** —no lo agregó esta rama— y la regla `useBiomeIgnoreFolder` sobre
`biome.json` **también**, así que sus 4 avisos son heredados y no propios. Lo que sí es nuevo son cinco
avisos de complejidad en dos archivos del segmento 6. Y los `useLiteralKeys` que P4 no menciona son
**`info`**, no avisos: no cuentan en el total de 42 y por eso no aparecen en esta tabla.

**Cómo se repite.** `node scripts/lint-baseline.mjs` (acepta `--base <ref>` y `--out <dir>`). No bloquea
nada: informa. La puerta que bloquea sigue siendo `npm run lint`.

---

## P9 — Cuatro plantillas indígenas vacías, a propósito

**Síntoma.** Elegir inga, wayuunaiki, nasa yuwe o arhuaco muestra una tabla sin reglas.

**Evidencia.** `packages/core/src/data/indigenous-templates.ts` declara las cuatro con un aviso de
validación pendiente. No hay una sola correspondencia inventada.

**Por qué está así y por qué está bien.** Una correspondencia grafema-fonema inventada para una lengua
que alguien habla es peor que una tabla vacía: parece un dato y es una suposición, y la comunidad que la
ve no tiene forma de saber de dónde salió.

**Estado tras la decisión 0005.** `packages/core/src/data/demo-tables.ts` incluye `WAYUU_DEMO` (`guc-demo`),
una demo del **alfabeto** wayuu con correspondencias citadas (diccionario Webonary/SIL, «Panorámica de la
fonología y morfología de la lengua wayuu» en *Letras* 61(98), 2021, y Berkeley SAPhon), en `draft` y con
esta misma advertencia. **No cierra P9**: `guc-template` sigue vacía y una prueba lo pinnea. Lo que cambia
es que ya hay un ejemplo completo de cómo se ve una tabla indígena construida con fuentes, que era lo que
faltaba para pedir la siguiente. Ver `docs/adr/0005-lenguas-de-ejemplo-portugues-y-wayuunaiki.md`.

**Próximo paso exacto.** Esto **no es una tarea de programación**. Requiere hablantes o fuentes
lingüísticas citables, y el aviso de la interfaz tiene que seguir diciendo exactamente eso. Si aparece una
fuente, la tabla entra con su cita; si no, se queda vacía.

**Criterio de aceptación.** Cada regla de una tabla indígena tiene una fuente citable en el repositorio.

---

## P10 — Dos detalles que no son defectos y conviene no confundir con defectos

**`incomplete` de axe en `.btn__arrow`** (`messageKey: nonBmp`). axe saltea el contraste de un contenido
compuesto solo de caracteres que su regex trata como símbolos, y esa regex cubre flechas, operadores y
dingbats **dentro** del plano básico: la flecha es `→`, U+2192. O sea que **no** es «un carácter fuera del
plano básico», como decía una versión anterior de este documento. La flecha no es un error de la página:
es un límite de la herramienta.
Idéntico en los dos temas y **preexistente** a esta rama. No lo «arregles» cambiando el carácter sin
entender por qué axe duda.

**Los 21 avisos de complejidad heredados** de la v2.0.0. Son deuda aceptada de la versión anterior, no
trabajo de esta rama. Tocarlos mezcla dos historias en un mismo diff y le complica la revisión a quien
lea el cambio.

---

## P11 — El punto ciego de la puerta: los nodos que axe no mide

**Síntoma.** La puerta pasa y no dice nada sobre el contraste de ciertos nodos. No es que estén bien: es
que **nadie los midió**.

**Evidencia.** Al afirmar por primera vez sobre `results.incomplete` —hasta ahora la puerta solo miraba
`violations`— aparecieron muchísimos resultados incompletos que nadie había mirado. Medido por un
verificador, **por página y tema**: `inicio` **9**, `FonoLab` **15**, `salvaguardas` **16**, `acerca` 4,
`arboles` 2, `no-existe` 1. En total **186 nodos** sobre las 21 páginas en los dos temas.

**Esa lista no se suma.** Las cifras son por página **y por tema**, y la 404 no tiene versión en inglés:
sumarlas da 47 y el total medido es 186. Quien compare contra este párrafo tiene que repetir la medición,
no confiar en una cuenta que parece cerrada y no lo está.

De esos, axe declara motivos que significan **no pude medir**: `imgNode` («background color could not be
determined because element contains an image node»), `bgOverlap` («...because it is overlapped by another
element») y `nonBmp` (contenido compuesto solo de símbolos que su regex no trata como texto). Los nodos
son `<text>` y `<tspan>` de SVG, `button[data-symbol]` del teclado AFI, `.tract__labels--on-shape` y
`.btn__arrow` en `inicio`.

**`shortTextContent` NO entra en esa categoría, y al principio sí entró.** Se creyó que significaba «no
decide si un carácter es texto». El código de axe dice otra cosa: se asigna en una rama guardada por
`!isValid`, y esa guarda **también es verdadera cuando axe no pudo calcular nada** —de hecho, las 28
apariciones medidas en este sitio traen `contrastRatio: 0`, que el propio spec define como «no calculó»—.
Es decir: el motivo no garantiza ni una cosa ni la otra. Lo que sí se demostró con una mutación es que la
rama puede traer un ratio medido e insuficiente: un texto a **2,63:1** —por debajo del 3:1 exigido— pasaba
la puerta. Por eso la afirmación no es «este motivo está permitido» sino «este motivo no trae un contraste
medido por debajo del exigido»: el dato se comprueba antes que el motivo, y un `incomplete` falla también
cuando el motivo está permitido pero axe trae un `contrastRatio` positivo menor que el
`expectedContrastRatio`.

**Por qué importa.** Es la diferencia entre «verificado» y «no mirado», y el proyecto declara WCAG 2.2 AA
como requisito. Un punto ciego declarado se puede cerrar; uno silencioso se convierte en una afirmación
falsa.

**Lo que NO hay que hacer: medirlo con estilos computados.** Se intentó y **la medición era falsa**. Subir
por los ancestros buscando el primer `background-color` o `fill` opaco **no encuentra un fondo**: en el SVG
de la portada no hay ningún `<g>`, y lo que toma es el `fill` computado por defecto del propio `<svg>`,
que es `rgb(0, 0, 0)` sin que nada se pinte de negro. Con ese método «gato» daba **2,266:1**; el ratio
real, medido sobre el `background-color` de verdad y confirmado muestreando los píxeles del recorte
(`2061` píxeles de `rgb(254,253,248)` y `184` de `rgb(81,69,60)`), es **9,098:1**. El método inventaba
defectos donde no había ninguno —estuvo a punto de entrar a este documento como dos hallazgos reales—.
Queda escrito porque es el atajo que va a tentar a la próxima sesión.

**Próximo paso exacto.** Medir **píxeles**, no estilos: capturar la caja del nodo, muestrear de la imagen
el color del texto y el del fondo real, y calcular el ratio. Sirve un `<canvas>` para leer los bytes y un
recorte de `page.screenshot`. Lo único ya medido de forma confiable es el botón del teclado AFI, por
estilos, y porque ahí el fondo es un `background-color` real de un `<button>`: **16,18:1 en claro y
14,08:1 en oscuro**. Las etiquetas del tracto vocal siguen sin medirse.

**Criterio de aceptación.** Cada nodo que aparece en `incomplete` tiene un ratio medido **desde píxeles**,
con el método guardado en el repositorio, y la lista `AXE_COULD_NOT_MEASURE` de `e2e/accessibility.spec.ts`
queda con una justificación por motivo en lugar de una promesa.

---

## P12 — La afirmación de `incomplete` descarta en silencio los resultados sin motivo textual

**Síntoma.** Un resultado `incomplete` de axe puede pasar por la puerta sin que nadie lo vea.

**Evidencia.** La afirmación lee el motivo de `check.data.messageKey` y exige que sea texto. axe a veces
pone `data` como **array** en lugar de objeto, y ahí no hay `messageKey`. Un verificador lo encontró en
`/arboles`, en los dos temas:

```
rule=aria-required-children   impact=critical
  target=.checks__list   html="<ul class=\"checks__list\" role=\"list\"></ul>"
    message="Expecting ARIA child role to be added: listitem"   data=["listitem"]
```

Es de impacto **crítico** y la puerta pasó `/arboles` en todas las corridas.

**Por qué no se cerró entonces.** Cerrarlo es fácil —tratar «sin motivo» como no permitido hace fallar la
prueba— pero eso deja la suite **roja** hasta decidir antes una pregunta de producto: una `<ul role="list">`
vacía que se llena por JavaScript, ¿es un defecto real o un falso positivo de axe mirando el HTML inicial?
La respuesta cambia el arreglo: si es real se arregla el marcado, si no se documenta la excepción con su
razón. Decidirlo desde el código, sin mirar la página, sería adivinar.

**Estado: cerrado, y la pregunta se respondió midiendo.** Una sonda con Playwright sobre `/arboles`, en el
sitio compilado, dio esto: con la página recién cargada la lista tiene **0** `<li>` y axe devuelve el
`incomplete` de `aria-required-children` con `data: [["listitem"]]`; después de pulsar «Dibujar» hay **1**
`<li>` y axe **deja de reportarlo**. La lista se puebla por JavaScript en la primera acción, así que lo que
la regla mide es el estado vacío del marcado, no un defecto de la página. `role="list"` se queda: es lo que
conserva el rol de lista en Safari cuando se quita el `list-style`, y borrarlo habría «arreglado» la
herramienta rompiendo el lector de pantalla. La regla queda exceptuada **por nombre y con esa razón escrita
al lado**, y la afirmación estructural ya está: quitar esa excepción pone la puerta **roja** en las cuatro
pruebas de `/arboles` —verificado por mutación—, así que un `incomplete` sin motivo textual ya no puede
pasar sin dejar rastro.

**Criterio de aceptación.** La puerta falla si aparece un `incomplete` sin motivo textual, y el caso de
`/arboles` está o arreglado o exceptuado **por nombre y con su razón**, nunca filtrado sin dejar rastro.
Los dos lados están cumplidos; el detalle de la medición está en el estado de arriba.

---

## P13 — Cinco inexactitudes menores que quedaron sin corregir

Las encontró la cuarta verificación independiente, todas **preexistentes** a la ronda que las reportó. No
se corrigieron por presupuesto, y quedan con su ubicación exacta para que sea cuestión de minutos.

**Estado: cerrado.** Las cinco se corrigieron en la rama `feat/toolbox-v3-closure`, y cada corrección se
comprobó contra el archivo y la línea que la entrada nombra: `grep -rn "T16" docs/ odd/ | grep -v
docs/PENDING.md` ya no devuelve nada —las únicas apariciones que quedan son estas líneas, que están
hablando del rename—; el manejador delegado de `src/scripts/ortografia/index.ts` es una cadena de `if` y
los tres `switch`
son sobre `error.code` y `field`; la redacción de P11 coincide ahora con la del spec; y
`odd/tasks/hexagonal-v3-mix.md` ya no promete uniformidad —dice «trece entradas, de detalle desigual»—,
que era la corrección del punto 4. La entrada se conserva porque el error importa más que la corrección.

**1. Rename incompleto de `T16` a `P1`.** `docs/STATUS.md:53` ya se corrigió, pero quedan referencias
viejas en `docs/pr/04-editor-de-ortografia.md:97,106` y `docs/pr/05-catalogo.md:83`. `T16` era el id de la
lista de trabajo de la sesión; en este documento el tema es **P1**. Un lector que busque «T16» no encuentra
la tarea en la lista de este documento, solo las referencias viejas.

**2. `docs/PENDING.md` P4 describe mal el manejador.** Dice que el archivo de complejidad 40 es «un
`switch` sobre veinte acciones». Es falso: `src/scripts/ortografia/index.ts:592` es una **cadena de ramas
`if` con salidas tempranas**; los `switch` de ese archivo (líneas 326, 450, 518) son sobre `error.code` y
`field`, y no tienen que ver. Correcto: «una cadena de `if` sobre unas veinte acciones».

**3. La explicación de `shortTextContent` en P11 repite la lectura que los datos no sostienen.** El
verificador midió que **las 28 apariciones en el sitio traen `contrastRatio: 0`**, que
`e2e/accessibility.spec.ts` define como «axe no calculó nada». La guarda `!isValid` de axe es real, pero también es verdadera cuando
no pudo calcular. El **arreglo no cambia** —comprobar el dato antes que el motivo sigue siendo correcto y
está probado por mutación—, lo que cambia es cómo se explica. El spec ya quedó corregido; falta alinear la
redacción de P11 con esa corrección.

**4. `odd/tasks/hexagonal-v3-mix.md:302` promete más de lo que hay.** Dice que las doce entradas tienen
todas «síntoma, evidencia medida, por qué no se hizo, próximo paso exacto y criterio de aceptación». No es
así: **P10** no tiene ninguno de los cinco campos, **P7** no tiene criterio de aceptación, y **P6, P8 y
P11** no tienen «por qué no se hizo». O se completan, o la frase se acota a las entradas que sí los tienen.

**5. La lista por página puede inducir a error.** P11 y `docs/STATUS.md` enumeran `inicio 9, FonoLab 15,
salvaguardas 16, acerca 4, arboles 2, no-existe 1`. Sumar esos números da 47 y el total es **186**, porque
son **por idioma y por tema**, y **cada ruta localizada aparece dos veces por tema**; la 404 es única
—no tiene versión en inglés—, así que 47 × 4 = 188 no cierra: la cuenta real es
47 + 46 + 47 + 46 = **186**. El total está bien y `docs/STATUS.md` ya aclara que la lista es por página y
tema, así que lo que falta es solo cuidar que nadie sume la lista y espere el total.

**Criterio de aceptación.** Las cinco quedan corregidas, y ninguna introduce una afirmación nueva que no
esté medida. La lección de esta sesión se aplica a sí misma: **toda ronda de corrección necesita su propia
verificación**, porque en la ronda anterior tres de cinco errores los había introducido la corrección.

**6. Y esta misma entrada delata el problema del que habla.** Una verificación posterior encontró cuatro
falsedades en este texto recién escrito: «no encuentra nada» (hay seis referencias), «este mismo documento
define» (la definición vive en el spec), «cada ruta aparece dos veces por tema» (la 404 es única, y por eso
47 × 4 no cierra), y una más estructural: **agregar P13 volvió falsa la promesa de que las entradas tienen
los cinco campos**, porque ahora son trece y esta es la más pobre de todas, con uno solo. La promesa
universal no se arregla enumerando excepciones —siempre queda alguna— sino **dejando de prometer
uniformidad**. Y la lección se cierra sin adornos: **la ronda que corrige introduce errores, y verificarla
es lo único que los saca a la luz**. Este documento llegó a la quinta ronda de verificación; la sexta
probablemente encuentre algo en estas mismas líneas, y por eso el próximo paso no es escribir más prosa
sino verificar la que hay.

## P14 — El bundle del fonemizador pesa 5,6 MB y trae 49 voces que no se ofrecen

**Severidad:** la primera fonemización tarda lo que tarda una descarga de 5,6 MB, y el 96 % de esos
bytes son lenguas que la interfaz no muestra.

**Síntoma.** Abrí `/fonemizador` con la red lenta y pulsá «Fonemizar»: el indicador de trabajo se
queda ahí varios segundos antes de la primera transcripción. En móvil es peor, y no hay forma de
pedir solo español.

**Evidencia.** `public/espeak-phonemizer/data/data.data` es **un solo archivo** con las tablas
compartidas y los diccionarios de las 51 voces de `espeak-phonemizer@0.2.0`. El paquete únicamente
separa el ruso (`ru.data`, 9 MB), que no se publica porque nunca se llama a `initialize()` con
`includeRussian`. `packages/adapters/src/phonemizer/espeak-voices.ts` mapea dos voces,
`spa → es-419` y `eng → en-us`. La descarga la dispara
`packages/adapters/src/phonemizer/phonemizer-worker.ts` en `initialize()`, y no cuenta para el
presupuesto de 60 KB por página porque se busca en tiempo de ejecución.

**Por qué no se hizo.** Reducir el bundle exige **recompilar el wasm** con otro conjunto de voces, y
eso es un cambio de cadena de compilación, no de código del sitio:
`node_modules/espeak-phonemizer/BUILDING.md` describe el proceso, pero el binario resultante ya no es
el del paquete fijado, y entonces la versión que se audita deja de ser la que se sirve. Exponer las 49
voces restantes era la salida barata y se descartó por la razón opuesta: aquí nadie verificó que
transcriban bien, y ofrecerlas sería prometer una calidad que no se midió.

**Próximo paso exacto.** Medir qué ahorra un bundle propio con dos voces: seguir `BUILDING.md` con el
conjunto reducido, comparar el tamaño resultante y, si baja de ~1 MB, publicarlo como artefacto fijado
por hash y anotar su procedencia en `THIRD_PARTY_NOTICES.md`. Criterio de aceptación: la página
fonemiza igual, `npm run build:verify` sigue en verde y lo servido bajo `public/espeak-phonemizer/`
baja al menos un 80 %.

## P15 — El build avisa que `node:fs/promises` se externalizó para el navegador

**Severidad:** baja. La herramienta funciona —está probada en navegador real— pero el build emite una
advertencia que alguien va a leer algún día y va a querer entender.

**Síntoma.** `npm run build` imprime:
`Module "node:fs/promises" has been externalized for browser compatibility, imported by
node_modules/espeak-phonemizer/dist/espeak.mjs`.

**Evidencia.** `espeak-phonemizer` publica una sola entrada que sirve a Node y al navegador. La rama de
Node lee los datos del disco con `node:fs/promises`; Vite, al compilar para el navegador, sustituye ese
módulo por un marcador que falla si se usa. En el navegador nunca se usa: los datos llegan por `fetch`
desde `public/espeak-phonemizer/`, que es lo que hace `initialize()` cuando recibe una URL. La prueba
`e2e/phonemizer.spec.ts` fonemiza de verdad y pasa, así que la advertencia no describe un fallo.

**Por qué no se hizo.** Silenciarla requiere una rama de código que no es nuestra: el paquete tenDRÍA
que separar su entrada de navegador, o habría que interceptar el módulo desde la configuración de Vite.
Lo segundo es posible y esconde el problema en vez de resolverlo; lo primero no depende de este
repositorio.

**Próximo paso exacto.** Vigilar si el paquete publica una entrada solo-navegador (algo como
`/browser`, que sí tiene el otro candidato). Si aparece, fijarla y comprobar que la advertencia
desaparece. Criterio de aceptación: `npm run build` no menciona `node:fs` y `e2e/phonemizer.spec.ts`
sigue en verde.

**Corrección medida (2026-10-25).** El build no emite **una** advertencia de externalización sino tres:
`node:fs/promises` y `node:url` desde `espeak-phonemizer/dist/espeak.mjs`, y `node:module` desde
`.../wasm/espeak-ng.mjs`. El diagnóstico de esta entrada vale para las tres —el paquete sirve Node y
navegador desde la misma entrada, y en el navegador ninguna se usa—, pero el criterio de aceptación se
queda corto si solo mira `node:fs`: las tres desaparecen juntas cuando el paquete publique su entrada de
navegador, o no desaparece ninguna.

## P16 — La puerta e2e se cae sola si la lanza un agente de IA

**Severidad:** media, y solo para quien desarrolla con un agente. En CI no ocurre.

**Síntoma.** `npm run test:e2e` falla de inmediato con:

```
Error: Process from config.webServer exited early.
```

Y el mensaje no dice por qué. Parece un defecto del proyecto y son dos piezas que funcionan como se
espera por separado.

**Evidencia.** `playwright.config.ts` exige un servidor en primer plano (`reuseExistingServer: false`)
y su `webServer.command` es `npm run build && npm run preview`. Desde Astro 7, el CLI detecta que lo
lanza un agente —`am-i-vibing`, que lee variables como `AI_AGENT`— y **manda `astro preview` al fondo
automáticamente** (`node_modules/astro/dist/cli/preview/index.js:37`, `agentDetected`). El proceso en
primer plano termina, Playwright ve que el servidor «exited early» y aborta antes de la primera prueba.
En el runner no hay `AI_AGENT`, así que CI no lo ve nunca.

**Por qué no se parcheó en el config.** Hay dos salidas fáciles y las dos son peores: poner
`reuseExistingServer: true` reintroduce la trampa que P7 documenta (probar el servidor de desarrollo),
y sembrar `AI_AGENT` desde el config es mentirle al entorno para que un comando se comporte distinto.

**Próximo paso exacto.** Documentar y usar `env -u AI_AGENT -u PI_CODING_AGENT npm run test:e2e`; si
esto vuelve a costar una sesión, la solución real es un script `scripts/e2e.mjs` que borre la variable
solo para el proceso hijo y lo explique en su cabecera. Criterio de aceptación: `npm run test:e2e` en
verde desde una sesión de agente, sin variables a mano, y `P7` sigue valiendo (puerto ocupado = rojo).

**Estado: cerrado, y sin script.** Las dos salidas que este documento consideraba —reutilizar el servidor
o sembrar la variable— seguían siendo malas, pero hay una tercera que no se había mirado: Astro 7 acepta
`--ignore-lock` en `preview`, y su código dice exactamente lo que necesitamos —«servidor de una sola
corrida, en primer plano, sin escribir el archivo de bloqueo»—. Con esa bandera en `webServer.command` no
hay variable borrada, no hay entorno mentido y no hay script que mantener: la puerta pide lo que quiere en
vez de esconder lo que hay. `reuseExistingServer` sigue en `false`, así que **P7 sigue valiendo**: si el
puerto está ocupado, la corrida es roja.

## P17 — El visor de audio declara experimental el TextGrid y el espectrograma, y no puede probar Praat

**Severidad:** media, y es una promesa de interoperabilidad, no un fallo visible. La herramienta
funciona; lo que no está medido es que el archivo exportado abra en el programa de otra persona.

**Síntoma.** Abrí `/visualizador`, cargá un audio, dividí el intervalo, escribí dos etiquetas, exportá el
TextGrid y volvé a importarlo: vuelve con las mismas capas, los mismos textos y los mismos tiempos. Lo
que ninguna prueba de este repositorio puede decir es si **Praat** lo abre. La página lo dice en el
aviso de «Experimental» y la ficha del catálogo lo repite.

**Evidencia.** Lo que sí está medido, y con qué:

- `packages/core/src/data/textgrid.test.ts` — dos archivos de referencia escritos enteros (formato largo
  y formato corto del MISMO TextGrid) que producen el mismo documento; ida y vuelta sobre cinco
  documentos con comillas dobles, saltos de línea, tiempos con precisión de doble, intervalos de
  duración cero y un documento sin capas; BOM UTF-8, UTF-16LE y UTF-16BE —y rechazo de UTF-16 sin BOM y
  de UTF-8 sobrelargo, que se aceptaban como contenido—; archivo vacío, cabecera ausente, clase
  equivocada, capa truncada, huecos, número no finito, intervalo fuera de su capa, capa fuera del
  documento y bloques de más, todos con error tipado y sin excepciones. El contrato del puerto
  (`runTextGridCodecPortContract`) se ejecuta contra el codec real y cubre un archivo por cada código de
  error propio del codec.
- `src/scripts/audio/spectrogram.test.ts` — una sinusoide de 1000 Hz a 8000 muestras/s cae exactamente en
  la banda 32 de una FFT de 256 puntos, una constante se concentra en la banda 0, y las magnitudes
  quedan normalizadas en 0..1.
- `e2e/audio.spec.ts` — el viaje completo en Chromium: wav de un segundo generado en la prueba, dos
  divisiones, dos etiquetas, descarga del `.TextGrid`, y ese archivo —leído del disco— reimportado con
  las tres filas y los textos intactos.

Lo que NO está medido: que Praat lo abra; y que el espectrograma coincida con el de Praat, que depende de
ventana, rango dinámico y escala de grises. Una prueba automática no puede abrir un programa de escritorio
ni comparar contra una imagen de referencia que este repositorio no tiene.

**Por qué no se hizo.** Las dos salidas exigen algo que no puede entrar acá: un binario de Praat (o un
lector de su formato que valga como árbitro) y audio real. El ADR 0002 prohíbe meter grabaciones al
repositorio, y una imagen de espectrograma de referencia sin su audio es un número sin procedencia.

**Próximo paso exacto.** Con una grabación corta local (fuera del repositorio): anotar en `/visualizador`,
exportar el `.TextGrid`, abrirlo en Praat y comprobar que aparecen las capas con sus nombres, los
intervalos contiguos y los textos con comillas. Anotar el resultado en `docs/STATUS.md` con la versión de
Praat y la fecha; recién entonces pasar `textgrid-viewer` de `experimental` a `stable` en
`src/data/tools.json` y quitar el aviso de la página. Para el espectrograma, comparar el dibujo con el de
Praat con ventana de 0,025 s, rango 0–5500 Hz y 70 dB de rango dinámico: si no coinciden, el criterio es
ajustar la rampa de color, no cambiar la FFT, que ya está verificada contra una sinusoide.
Criterio de aceptación: el archivo abre en Praat sin mensajes y la verificación está escrita con su
versión y su fecha.

**Segundo pendiente, del mismo segmento — RESUELTO.** `src/pages/visualizador.astro` y
`src/pages/en/visualizador.astro` no estaban en `PUBLIC_PAGES` de `e2e/accessibility.spec.ts`, así que
`npx playwright test e2e/accessibility.spec.ts --grep visualizador` informaba «No tests found». Ya están
las dos entradas, y agregarlas encontró un defecto real: los botones de acción de la tabla de intervalos
mostraban un glifo («▶», «∪») y se llamaban «Reproducir el intervalo 1» / «Fusionar el intervalo 1 con el
siguiente», que incumple WCAG 2.5.3 (*Label in Name*) y es lo que axe 4.14.0 marca como
`label-content-name-mismatch`.

**Corrección de lo que decía antes esta misma entrada.** Una versión previa de este párrafo afirmaba que
«el glifo pasó a formar parte del nombre accesible». Es falso, y el código lo desmiente:
`src/scripts/audio/index.ts` deja el glifo (`▶`, `∪`) fuera del `aria-label` —el nombre es «Reproducir
el intervalo 1», sin el símbolo— y la regla queda **exceptuada por nombre** en
`AXE_INCOMPLETE_WITHOUT_MOTIVE` (`e2e/accessibility.spec.ts`). La razón está medida: con un texto visible
de un solo símbolo, axe 4.14.0 no puede decidir y devuelve `incomplete` aunque el nombre incluya el
glifo, así que meterlo no arreglaba nada. La decisión vigente es la del comentario del código: entre
anunciar «▶ Reproducir el intervalo 1» y aceptar que la puerta no puede decidir sobre glifos, gana el
lector de pantalla.

**La lección que deja, y que conviene no repetir.** El barrido de `e2e/audio.spec.ts` daba cero
violaciones porque solo mira `result.violations`; la puerta principal también afirma sobre los resultados
`incomplete` sin motivo textual, y ahí estaba el defecto. Dos puertas que miden cosas distintas sobre la
misma página es una trampa: una verde tapa a la otra. Si el barrido propio se conserva, tiene que usar el
mismo criterio de la puerta principal (`e2e/accessibility.spec.ts`, las listas `AXE_COULD_NOT_MEASURE` y
`AXE_INCOMPLETE_WITHOUT_MOTIVE`), o directamente no duplicarse.

**Tercer pendiente — RESUELTO.** `importTextGrid` leía el archivo entero sin tope de tamaño, mientras el
resto del sitio limita el texto a 100 KB (`src/scripts/core/guardrails.ts`). Un `.TextGrid` de decenas de
megas congelaba la pestaña al analizarlo: el verificador midió 44 MB / 400 000 intervalos → 896 ms y
+45 MB de heap, con picos de 4 a 6 veces el tamaño del archivo. Qué se hizo, y con qué se mide:

- El tope es una política y vive junto al formato: `MAX_TEXTGRID_BYTES` (1 MB) e
  `isTextGridTooLarge` en `packages/core/src/data/textgrid.ts`, probados en `textgrid.test.ts` (acepta el
  archivo justo en el tope, rechaza uno por encima).
- El controlador comprueba `file.size` **antes** de `readFileBytes`, así que el archivo grande no se lee
  ni llega al analizador, y lo dice con el tamaño real y el límite real traducidos a los dos idiomas
  (`audio.error.tooLarge`).
- El audio tiene su propio tope, `MAX_AUDIO_BYTES` en `src/scripts/audio/index.ts`, derivado del límite
  que ya existía para la duración (`MAX_DURATION_SECONDS` = 300 s): 300 s de wav sin comprimir a 96 kHz,
  estéreo y 16 bits son 115,2 MB, así que 128 MB solo rechaza lo que no puede ser un tramo de 300 s. Se
  comprueba también con `file.size`, antes de leer y de decodificar. **No** se unificaron las dos
  constantes: un archivo de anotaciones de texto y un contenedor de audio comprimido son límites con
  motivos distintos.
- Las dos lecturas van envueltas en `try/catch`: un fallo de lectura —permiso retirado, archivo movido—
  ahora es un mensaje (`audio.error.read`) y no una promesa rechazada sin manejar.
- `e2e/audio.spec.ts` genera un `.TextGrid` de más de 1 MB en la prueba, comprueba el mensaje con el
  límite y que el documento ya abierto no cambia.
- Criterio de aceptación cumplido: por encima del tope hay mensaje y el analizador no se ejecuta; por
  debajo, el archivo se importa igual (las pruebas de ida y vuelta y el e2e de importación siguen
  verdes).

**Cuarto pendiente, del mismo segmento — el verificador independiente encontró defectos reales.** Se
cerraron con pruebas que los reproducen primero: límites de capa al serializar, huecos de nivel
documento, números no finitos, `-.5`, bloques de más, `formatNumber` en magnitudes extremas, codificación
UTF-16 sin BOM y UTF-8 sobrelargo, validación de lo guardado con sobre de versión, actualización del
estado de persistencia también en el fallo, control para borrar los proyectos guardados, la memoria
ganando sobre IndexedDB al leer, el tope de tamaño y el contrato del puerto de almacenamiento contra el
adaptador real (`src/scripts/audio/annotation-storage.test.ts`, con `fake-indexeddb`). Lo que se decidió
**no** cerrar está en P18, P19 y P20.

## P18 — Los tiempos de una capa de puntos no se validan contra los límites de su capa

**Severidad:** baja. Es el mismo defecto que se cerró para los intervalos (D1), pero el arreglo se aplicó
solo a `IntervalTier`, así que la invariante queda a medias.

**Síntoma.** Un `TextTier` con `xmax = 3` dentro de un documento de 5 s, y un punto en `time = 7`, se lee
sin error: `parseTextGridText` devuelve el documento, el visor lo pinta sobre un eje que no llega y la
exportación escribe el punto fuera de la capa. Praat rechaza esa capa por la misma razón por la que
rechaza un intervalo fuera de rango.

**Evidencia.** `packages/core/src/data/textgrid.ts` valida `interval-out-of-tier` en la rama
`IntervalTier` y no toca la rama `TextTier`. `packages/core/src/data/textgrid.test.ts` cubre el caso de
intervalos (`D1 — un intervalo fuera de los limites de su capa`) y no tiene ningún caso de puntos fuera de
su capa. El contrato del puerto (`runTextGridCodecPortContract`) tampoco.

**Por qué no se hizo.** El verificador nombró el defecto de los intervalos, no el de los puntos, y el
código de error autorizado para este segmento (`interval-out-of-tier`) miente si se usa con un punto: el
consumidor del puerto merece un nombre que diga qué pasó. Inventar un segundo código sin decisión previa
era peor que dejarlo escrito.

**Próximo paso exacto.** Agregar `point-out-of-tier` a la unión `TextGridError`
(`packages/core/src/ports/textgrid-codec.ts`) con el mismo nivel de detalle que sus vecinos, validar en la
rama `TextTier` de `parseTokens` con `TIME_EPSILON` como en los intervalos, y cubrirlo en los dos sitios
donde ya se prueba el de intervalos: un caso en `textgrid.test.ts` y una entrada en `failureFixtures` de
`packages/core/src/testing/contracts/textgrid-codec.ts`. Criterio de aceptación: un archivo con un punto
fuera de su capa devuelve `point-out-of-tier` y el resto de las pruebas sigue verde.

**Estado: cerrado.** `point-out-of-tier` existe en la unión, la rama `TextTier` valida con `TIME_EPSILON`
como la de intervalos, y hay tres casos: un punto **después** de su capa, un punto **antes**, y —la otra
mitad del contrato— dos puntos **justo en los bordes** que siguen siendo válidos, porque rechazar de más
habría sido peor que el defecto. El rojo se observó antes del arreglo (tres pruebas: los dos casos y la
entrada nueva de `failureFixtures`), y el mensaje de interfaz no necesitó nada: `audio.error.textgrid` ya
viaja con el `code`, así que el código nuevo aparece solo.

## P19 — El tope de audio no tiene prueba propia

**Severidad:** baja, y es una deuda de prueba, no de comportamiento.

**Síntoma.** Si `MAX_AUDIO_BYTES` cambia de valor o la comparación `file.size` se mueve de sitio en
`src/scripts/audio/index.ts`, ninguna prueba se pone roja. El caso gemelo del TextGrid sí está cubierto,
en las dos capas: unitaria en el codec y e2e del mensaje.

**Evidencia.** `MAX_AUDIO_BYTES` vive en `src/scripts/audio/index.ts`, que no tiene archivo de prueba
propio porque `initAudioLab` necesita DOM y `AudioContext`. La e2e de `e2e/audio.spec.ts` mide el tope del
TextGrid (`un TextGrid de mas de 1 MB se rechaza...`) y no el del audio: generar en la prueba un archivo de
más de 128 MB para comprobar un rechazo que ocurre antes de leerlo costaría más que la cobertura que
aporta.

**Por qué no se hizo.** El tope de TextGrid sí tenía dónde vivir con prueba (el codec, dentro de las
superficies autorizadas de este segmento); el de audio no, y mover la lógica a un módulo nuevo solo para
poder probarla no estaba autorizado.

**Próximo paso exacto.** Extraer `MAX_AUDIO_BYTES`, el formateo de tamaño y la decisión
«¿este archivo supera el tope?» a `src/scripts/audio/limits.ts`, con `src/scripts/audio/limits.test.ts` al
lado (Node puro, sin DOM), y hacer que el controlador use solo esas funciones. Criterio de aceptación:
`npx vitest run src/scripts/audio/limits.test.ts` cubre el borde (justo en el tope y un byte más) para los
dos límites, y `verify:all` sigue verde.

**Estado: cerrado, con una desviación declarada.** `src/scripts/audio/limits.ts` tiene `MAX_AUDIO_BYTES`,
`formatBytes` e `isOverLimit`, y su prueba cubre el borde del audio (justo en el tope entra, un byte más no)
y también el del TextGrid. Pero el controlador **no** llama a `isOverLimit` para el TextGrid: sigue
llamando a `isTextGridTooLarge` del núcleo, que ya está probada junto al formato. Se probó cada tope a
través de la función que el controlador usa de verdad, en vez de mover la decisión del TextGrid a la capa
de presentación para que la prueba quedara más linda. `formatBytes` se movió sin cambiar un carácter de su
comportamiento: los mensajes miden lo mismo que antes.

## P20 — Borrar libera todo el almacén, no un proyecto

**Severidad:** baja. La promesa que hace el control se cumple —«borrar los proyectos guardados»—, pero
`AnnotationStoragePort.remove(projectId)` sigue sin usarse para lo que su firma permite.

**Síntoma.** Quien tiene tres proyectos guardados y quiere liberar el de una prueba no puede: el control
borra los tres. La alternativa actual es exportar los otros dos a TextGrid antes de borrar y volver a
importarlos después.

**Evidencia.** El control de `src/components/AudioLab.astro` (`data-audio-projects-clear`) enumera
`storage.list()` y llama `storage.remove(projectId)` para cada clave
(`clearSavedProjects` en `src/scripts/audio/index.ts`). No hay lista de proyectos con borrado individual; la
región solo muestra el conteo (`audio.projects.count`). La e2e
`borrar los proyectos guardados deja la lista vacia y la persistencia dice la verdad` fija el
comportamiento actual.

**Por qué no se hizo.** El encargo pedía una forma de liberar espacio con confirmación, y una lista con un
botón por proyecto es una interfaz nueva —con su estado, su confirmación y su accesibilidad—, no un
arreglo del defecto.

**Próximo paso exacto.** Convertir la región `data-audio-projects` en una lista (`<ul>`) con un botón
«Borrar» por proyecto, cada uno con la misma confirmación en el propio control que hoy tiene el borrado
total, y una cadena nueva por idioma para el nombre del proyecto y su borrado. El borrado individual ya
existe en el adaptador: `remove(projectId)`. Criterio de aceptación: con dos proyectos guardados, borrar
uno deja el otro en IndexedDB y el conteo pasa de 2 a 1, medido en la base como en la e2e actual.

## P21 — El catálogo anunció «Análisis acústico» como experimental durante meses, sin existir

**Severidad:** alta para la credibilidad del sitio. No rompe nada; miente.

**Síntoma.** El 2026-10-23 el usuario buscó «el analizador acústico» en `npm run dev` y no lo encontró.
No estaba roto: no existía. La ficha `acoustic-analysis` de `src/data/tools.json` declaraba
`status: "experimental"`, y el catálogo de este proyecto tiene como invariante explícita que **una
herramienta planeada no se vea como una que existe**. La tarjeta mostraba la insignia «Experimental» y
una descripción en presente («contorno de F0, formantes F1–F3 e intensidad en dB sobre el visor de
audio»), sin enlace y sin el aviso de «aún no disponible», que solo se dibuja para `planned`.

**Evidencia.** `src/components/ToolCatalog.astro` marca `planned` con aviso y sin enlace; `experimental`
solo con insignia. `acoustic-analysis` no tiene ruta en `SITE_ROUTES`, ninguna página, ni motor: lo único
que existe del segmento 8 son el puerto `AcousticAnalysisPort` y su fake en el núcleo, que es lo que el
prompt pedía dejar preparado.

**Arreglo.** `status: "planned"` y notas que dicen lo que es: previsto, no implementado. Y una prueba
nueva, `src/config/site.test.ts`, que cruza `tools.json` con `SITE_ROUTES` en las dos direcciones y
comprueba que cada ruta mapeada tiene página en el repositorio. Se verificó por mutación: volviendo el
estado a `experimental`, la prueba falla con `acoustic-analysis (experimental)`.

**Próximo paso exacto.** Si se quiere la herramienta, es el segmento 8 del prompt y necesita autorización
de alcance: arranca por `praatfan` en WASM, que es lo que el prompt marcó como experimental por el estado
del paquete. Antes de eso, decidir si el espectrograma de `/visualizador` ya cubre la necesidad real: buena
parte de lo que se busca con «analizador acústico» en un curso de fonética es eso, y ya está medido.
