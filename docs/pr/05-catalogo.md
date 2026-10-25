# PR — Catálogo de herramientas

Rama: `feat/lingualab-hexagonal-monorepo` · Commits: `8c17ffd`, `7b6d033`, `4cc4c95`

---

## Qué cambia

El catálogo del segmento 3: una página `/catalogo` (y `/en/catalogo`) que lista las herramientas con su
área, su tipo de integración y su estado real, alimentada por `ToolRegistryPort` desde un JSON
versionado.

| Commit | Qué trae |
|---|---|
| `8c17ffd` | El adaptador estático: `ToolRegistryPort` sobre una lista de descriptores que recibe |
| `7b6d033` | `tools.json` versionado, su validación y el cableado en el composition root |
| `4cc4c95` | La página, el componente, el cliente de filtros, 36 claves por idioma y las pruebas |

## Cómo se probó

- [x] `npm run verify:all` — exit 0
- [x] Pruebas — **744 en 40 archivos** (eran 727 en 38)
- [x] `npx playwright test` — **20 passed** (eran 12: +6 del catálogo, +2 páginas de accesibilidad)
- [x] `npm run deps:check` — exit 0, 162 módulos y 365 dependencias
- [x] `npm run check` — 115 archivos, 0 errores
- [x] Las dos páginas nuevas pasan axe con las etiquetas WCAG 2.2 AA

**La invariante arquitectónica sigue en pie**, verificada con el grep y no supuesta: la única línea de
`src/` que importa `@lingualab/adapters` es `src/composition-root.ts`.

| Página | Comprimido | Presupuesto |
|---|---|---|
| `/catalogo` | 12.4 KB | 60 KB |
| `/en/catalogo` | 12.3 KB | 60 KB |

Medido **antes** de los filtros (11.0 KB), así que los filtros costaron 1.4 KB.

## Decisiones

1. **Ninguna herramienta lleva `url`.** El prompt exige que todo enlace publicado se verifique como
   alcanzable y correspondiente a su descripción, y nada en esta tarea puede verificar una URL.
   `catalog-data.ts` **rechaza** el campo en lugar de dejarlo pasar, y hay una prueba que afirma que el
   JSON no declara ninguna. Las herramientas planeadas llevan una nota en los dos idiomas; las
   citas son sin enlace y se muestran dentro de un `<details>`.
2. **La lista se renderiza en el servidor.** El script de cliente solo alterna `hidden` en tarjetas que
   ya existen: la página funciona **sin JavaScript** y hay una sola lista, no dos que puedan discrepar.
3. **Una herramienta planeada no se ve como una que existe.** Insignia neutra más un aviso visible, y
   **sin ancla**, así que no es enfocable como enlace. Solo las herramientas cuya página interna existe
   reciben `<a>`.
4. **Las rutas internas viven en el componente, no en `ToolDescriptor`.** La ruta es una propiedad de
   *este* sitio, no de la herramienta; meterla en el dominio obligaría al núcleo a saber de rutas.
5. **Las opciones de área salen de los datos**, no de una lista escrita a mano: añadir una herramienta no
   obliga a tocar la interfaz.
6. **Estados reales.** Las cuatro herramientas propias `stable`; los segmentos 5-7, 9 y 10 `planned`; el
   análisis acústico `experimental`, porque el prompt lo marca así por diseño.
7. **`elan-textgrid` como `needs-backend`** es un juicio, no un dato: el prompt permite empaquetar
   Pyodide en la compilación, lo que lo haría `embedded`. Se eligió la etiqueta conservadora porque
   descargar un entorno de Python no es algo que un sitio sin conexión pueda garantizar, y la razón está
   escrita en la nota de la herramienta.

## Corrección del revisor sobre el trabajo del worker

El marcado usaba `.field`, `.field--inline` y `.field__label`: **tres clases que no existen** en
`src/styles`. Se confirmó midiendo, no leyendo: cero definiciones en todo el CSS.

El editor que pasó revisión no tiene ninguna clase sin definir, y su patrón es `<label for=…>` sin
clases, apoyado en el estilo global de `input` de `base.css` y en las utilidades de layout. El catálogo
pasa a ese mismo patrón, usando `faint`, que el componente **ya empleaba**. Cero CSS nuevo, cero
referencias muertas. Antes de tocar nada se comprobó que las pruebas e2e **no** seleccionan por esas
clases, para no romperlas arreglando otra cosa.

## Riesgos y límites, declarados

| Qué | Estado |
|---|---|
| **El RED del adaptador no se observó** | El adaptador y su prueba se escribieron en el mismo paso, así que no hubo un momento en que la prueba existiera sin la implementación. Se reporta tal cual en vez de fabricar una salida roja. El GREEN y el contrato real sí están verificados |
| Las cuentas de las pruebas e2e dependen de los datos | Cambiar `tools.json` obliga a actualizar `e2e/catalogo.spec.ts`. Es frágil a propósito: una prueba que no falle al cambiar los datos no estaría probando los datos |
| `tools` (análisis de corpus) no encaja en ningún `ToolArea` exacto | Se usó `documentacion`, que es lo menos malo de la lista del prompt. Es un juicio, y la lista de áreas la fijó el prompt |
| El mapa de lenguas queda con `languages: []` | Por diseño: es una herramienta sobre el inventario de lenguas, no sobre una lengua concreta, así que desaparece al filtrar por un idioma específico |

## Pendiente

- **P1**, declarada: `OrthographyIssue` lleva la frase en prosa española pero **no el dato** (nombre de
  clase, símbolo), así que la interfaz no puede traducirla. Es un defecto de capas —el núcleo no debería
  generar prosa, sino devolver códigos y datos— y **merece su propio cambio y su propia revisión**, por
  la misma razón por la que no se dividió el manejador de clic delegado al cierre de un cambio ya
  verificado: un cambio transversal al contrato de errores no se hace a las apuradas en la cola. Está en
  `docs/PENDING.md`, con su criterio de aceptación.
