# Trabajo pendiente

Este documento es un **traspaso**, no una lista de deseos. Cada entrada existe porque alguien —una
sesión, un verificador independiente o una medición— encontró algo concreto, y anota lo que haría falta
para cerrarlo sin tener que redescubrirlo.

## Cómo usar esto

Una entrada por sesión. Antes de empezar, leé la columna **Próximo paso exacto**: casi todas incluyen
una decisión ya tomada, y rehacerla suele dar un resultado peor que el que está escrito.

**Antes de tocar nada:**

```bash
cd ~/Documentos/06\ Proyectos/LinguaLab
nvm use 22            # sin esto no corren las puertas; hay .nvmrc
npm install
npm run verify:all    # lint, tipos, reglas hexagonales, 744 pruebas, build verificado
npx playwright test   # 56 e2e; requiere el puerto 4321 LIBRE (ver P7)
```

**Estado al escribir esto:** rama `feat/lingualab-hexagonal-monorepo`, sincronizada con `origin` y con
el árbol limpio,
`verify:all` en verde, 56 e2e en verde, 21 páginas sin violaciones de axe en los dos temas.

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

---

## P4 — Cinco avisos de complejidad cognitiva, y uno es un 40

**Síntoma.** Ninguno hoy. Es el costo de mantenimiento de la próxima persona.

**Evidencia.** `npm run lint` da **0 errores y 41 avisos**. De los 41, **26** son
`noExcessiveCognitiveComplexity`. Cinco están en código nuevo y concentrados:

| Archivo | Complejidad |
|---|---|
| `src/scripts/ortografia/index.ts` | **40**, más dos de 16 y 23 |
| `src/scripts/ortografia/csv.ts` | 23 y 21 |

Los otros 21 son de código heredado de la v2.0.0, y **4 provienen de la regla nueva de `biome.json`**:
no son heredados en sentido estricto, porque esa configuración no existía antes de esta rama.

**Por qué no se hizo.** El archivo de 40 es el manejador de un `click` **delegado**: un `switch` sobre
veinte acciones. Partirlo en funciones con nombre es lo correcto y es una refactorización que conviene
hacer **con** las pruebas de P2, no antes.

**Próximo paso exacto.** Empezá por `csv.ts`, que no toca el DOM y ya tiene pruebas: extraer el analizador
de encabezados baja los dos avisos sin riesgo. El de 40, dejalo para cuando exista la prueba del
invariante de nodos de P2.

**Criterio de aceptación.** Los avisos bajan y **ninguna prueba cambia de resultado**. Si alguna se cae,
la refactorización cambió comportamiento y hay que revertirla.

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

---

## P9 — Cuatro plantillas indígenas vacías, a propósito

**Síntoma.** Elegir inga, wayuunaiki, nasa yuwe o arhuaco muestra una tabla sin reglas.

**Evidencia.** `packages/core/src/data/indigenous-templates.ts` declara las cuatro con un aviso de
validación pendiente. No hay una sola correspondencia inventada.

**Por qué está así y por qué está bien.** Una correspondencia grafema-fonema inventada para una lengua
que alguien habla es peor que una tabla vacía: parece un dato y es una suposición, y la comunidad que la
ve no tiene forma de saber de dónde salió.

**Próximo paso exacto.** Esto **no es una tarea de programación**. Requiere hablantes o fuentes
lingüísticas citables, y el aviso de la interfaz tiene que seguir diciendo exactamente eso. Si aparece una
fuente, la tabla entra con su cita; si no, se queda vacía.

**Criterio de aceptación.** Cada regla de una tabla indígena tiene una fuente citable en el repositorio.

---

## P10 — Dos detalles que no son defectos y conviene no confundir con defectos

**`incomplete` de axe en `.btn__arrow`** (`messageKey: nonBmp`). axe no puede decidir el contraste de un
carácter fuera del plano básico: la flecha no es un error de la página, es un límite de la herramienta.
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
`violations`— aparecieron **36 + 28 + 16 resultados incompletos** en `inicio` y `FonoLab`, en los dos
temas. axe declara cuatro motivos y los cuatro significan que **no pudo medir**: `imgNode` («background
color could not be determined because element contains an image node»), `bgOverlap` («...because it is
overlapped by another element»), `shortTextContent` (`visibleText.length === 1`: no decide si el texto es
«grande») y `nonBmp` (caracteres fuera del plano básico). Los nodos son `<text>` y `<tspan>` de SVG,
`button[data-symbol]` del teclado AFI, y `.tract__labels--on-shape`.

**Por qué importa.** Es la diferencia entre «verificado» y «no mirado», y el proyecto declara WCAG 2.2 AA
como requisito. Un punto ciego declarado se puede cerrar; uno silencioso se convierte en una afirmación
falsa.

**Lo que NO hay que hacer: medirlo con estilos computados.** Se intentó y **la medición era falsa**. Subir
por los ancestros buscando el primer `background-color` o `fill` opaco toma el valor heredado de un `<g>`
de SVG **que no pinta nada**, e inventa un fondo: con ese método «gato» en la portada daba **1,67:1**, y
mirando los píxeles es texto oscuro sobre fondo claro. El método producía defectos donde no había ninguno
—estuvo a punto de entrar a este documento como dos hallazgos reales—. Queda escrito acá porque es el
atajo que va a tentar a la próxima sesión.

**Próximo paso exacto.** Medir **píxeles**, no estilos: capturar la caja del nodo, muestrear de la imagen
el color del texto y el del fondo real, y calcular el ratio. Sirve un `<canvas>` para leer los bytes y un
recorte de `page.screenshot`. Lo único ya medido de forma confiable es el botón del teclado AFI, por
estilos, y porque ahí el fondo es un `background-color` real de un `<button>`: **16,18:1 en claro y
14,08:1 en oscuro**. Las etiquetas del tracto vocal siguen sin medirse.

**Criterio de aceptación.** Cada nodo que aparece en `incomplete` tiene un ratio medido **desde píxeles**,
con el método guardado en el repositorio, y la lista `AXE_COULD_NOT_MEASURE` de `e2e/accessibility.spec.ts`
queda con una justificación por motivo en lugar de una promesa.
