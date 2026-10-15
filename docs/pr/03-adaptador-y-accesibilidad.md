# PR — Adaptador de IndexedDB, accesibilidad y puerta e2e

Rama: `feat/lingualab-hexagonal-monorepo` · Commits: `d386edd`, `b8c0209`, `6a6f359`, `569a4bb`

---

## Qué cambia

Tres cosas que aparecieron juntas porque la tercera encontró a la primera:

1. **`d386edd` — Defecto de accesibilidad corregido en el sitio en vivo.** La puerta nueva marcó
   `aria-allowed-attr` con impacto **crítico** en las dos páginas de inicio.
2. **`b8c0209` — La puerta de accesibilidad en sí**, más el `overrides` que resuelve el conflicto de
   versiones de Playwright que esa puerta destapó.
3. **`6a6f359` — Dos correcciones en el núcleo**, ambas nacidas del reporte del worker del adaptador.
4. **`569a4bb` — El adaptador de IndexedDB**: `OrthographyRepositoryPort` sobre IndexedDB, con
   respaldo en memoria y `persistence()` para que la interfaz pueda decir la verdad.

## 1. El defecto de accesibilidad: qué era y por qué importa

```astro
<!-- src/components/Masthead.astro, antes -->
<a class="segmented__btn" href={localePath(l, path)}
   aria-current={l === locale ? "true" : undefined}
   aria-pressed={l === locale ? "true" : "false"}>   <!-- inválido aquí -->
```

`aria-pressed` **solo** es válido en elementos con rol de botón. En un enlace (`role="link"`) es ARIA
inválido, y un lector de pantalla puede anunciar el enlace como un botón de alternancia pulsado.

Lo que hace esto un hallazgo y no un falso positivo: **los otros 14 usos de `aria-pressed` del proyecto
son sobre `<button type="button">` reales y son correctos.** El defecto estaba acotado a un archivo.

Corrección: se quita el atributo del enlace y el estado activo pasa a marcarlo `aria-current`, que ya
estaba puesto y sí es lo que ARIA permite en un enlace. En `components.css` el estilo activo cubre los
dos selectores, porque las demás herramientas siguen con `aria-pressed` en botones.

**Alcance, declarado honestamente:** esto toca código heredado, y la spec S1 pedía cambios «puramente
aditivos» en el sitio. La excepción está justificada y es la razón de ser de la puerta: una violación
crítica en un proyecto que declara WCAG 2.2 AA como requisito, comprobada por una prueba reproducible,
se arregla. La alternativa era una prueba en rojo o una prueba debilitada a propósito.

## 2. La puerta e2e

- `playwright.config.ts` prueba contra el **resultado compilado** (`npm run build && npm run preview`),
  no contra `astro dev`. La CSP viaja como metaetiqueta generada en la compilación y los estilos se
  inlinean según el presupuesto, así que el servidor de desarrollo probaría un sitio que nadie publica.
- Las etiquetas de WCAG 2.2 AA se declaran **explícitamente** en vez de usar el conjunto por defecto de
  axe, que incluye lo mejor de varios niveles y cambia entre versiones. Una etiqueta fija hace que un
  cambio en las reglas se note como un cambio.
- El resumen de fallo incluye el `failureSummary` de axe. Sin esa frase, una violación obliga a
  reproducirla a mano con navegador y todo; con ella, el propio informe dice qué atributo falta.

### El `overrides` que hizo falta

```
@axe-core/playwright@4.13.0  └── playwright-core@1.64.1
@playwright/test@1.63.0      └── playwright-core@1.63.0
```

Dos copias, dos tipos `Page` distintos, y `AxeBuilder({ page })` no compilaba. `@axe-core/playwright`
declara un peer laxo (`playwright-core >= 1.0.0`), así que npm satisfizo esa peer con la última
publicada. El `overrides` unifica en **1.63.0**, que es la versión que respeta la regla de las dos
semanas y la que ya tenía sus navegadores descargados. Verificado: `npm ls playwright-core` muestra una
sola copia, `overridden` para axe y `deduped` para el proyecto.

## 3. Las dos correcciones del núcleo (el defecto era del padre, no del worker)

El worker del adaptador terminó pidiendo una decisión y **tenía razón en las dos cosas que reportó**:

1. **`npm run deps:check` salía 1 por culpa de mi regla, no de su código.** `@lingualab/core/testing`
   es una segunda entrada pública, declarada en `packages/core/package.json` y creada precisamente para
   que los adaptadores ejecuten las suites de contrato. La regla `no-reaching-into-core-internals` solo
   excusaba `index.ts`, así que **prohibía exactamente lo que el diseño pide**. Se amplió a las dos
   entradas declaradas y sigue prohibiendo cualquier otra ruta profunda.

2. **El fake y el adaptador discrepaban, y el contrato no lo cubría.** `remove` de un id inexistente
   devolvía `not-found` en el fake y `ok` en el adaptador. Como el contrato solo probaba el camino
   feliz, **los dos pasaban la suite mientras se comportaban distinto** — que es precisamente lo que
   una suite de contrato existe para impedir. Se decide **idempotencia** (borrar algo que ya no está no
   es un fallo, y el listado que veía quien pulsó puede estar desactualizado), se escribe la razón en el
   puerto —donde la encuentra quien implemente el próximo adaptador— y el contrato ahora la comprueba
   para ambos. `not-found` sigue vivo para `exportJson`, donde la ausencia sí impide producir el archivo.

## 4. El adaptador

- Un único almacén `orthography-tables`, con la clave en `table.id` y el valor siendo **literalmente**
  `orthographyTableToJson(table)`. El id ya viaja dentro del JSON, así que duplicarlo en un `keyPath`
  sería una segunda fuente de verdad; y como lo guardado son los mismos bytes que se exportan, un
  archivo exportado siempre se puede volver a importar.
- **Degradación honesta**: sin IndexedDB, o si abrir falla, o si una escritura agota la cuota, se pasa a
  memoria y `persistence()` lo reporta con su motivo. El puerto sigue funcionando igual, pero la
  interfaz puede avisar de que las tablas no sobrevivirán a un recargado. Fingir que persiste es lo
  único que este adaptador no debe hacer.
- Una **falla genérica no cambia de backend**: se reporta `storage-unavailable`. La unión de tres
  valores no tiene etiqueta honesta para un aborto genérico, y etiquetarlo mal sería justo la
  deshonestidad que el adaptador existe para evitar.
- `list()` ordena por nombre y después por id. El orden de inserción exigiría un campo de fecha que la
  tabla no tiene y que los dos backends tendrían que acordar; `localeCompare` reordenaría el catálogo
  según el idioma del sistema.

## Cómo se probó

- [x] `npx vitest run` — **34 archivos, 684 pruebas** (eran 664: +20 del adaptador)
- [x] Las pruebas del adaptador ejecutan la **suite de contrato real** importada de `@lingualab/core/testing`,
      contra IndexedDB con `fake-indexeddb` **y** contra el respaldo en memoria: la regla del ADR 0001,
      un adaptador no está terminado hasta que pasa la suite que ya pasaba el fake
- [x] `npx playwright test` — **2 passed**: axe sin violaciones en las dos páginas de inicio
- [x] `npm run deps:check` — exit 0, 143 módulos y 324 dependencias
- [x] `npm run check` — exit 0, 92 archivos (con `e2e/` dentro del `include`)
- [x] `npm run verify:all` — exit 0; peor página 28.5 KB gz
- [x] `npm audit --omit=dev` — 0 vulnerabilidades en dependencias de producción

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un `overrides` enmascare un problema real de versiones | Resuelve una peer laxo mal satisfecha, no una incompatibilidad; se documenta y se unifica en la versión que ya está probada y con navegadores descargados |
| El adaptador finja persistencia | `persistence()` lo hace visible y la interfaz debe avisar; el adaptador no puede mentir por diseño |
| La rama `quota-exceeded` sin probar por ejecución | **Declarado**: `fake-indexeddb` no puede provocar `QuotaExceededError` de forma determinista y la firma de la fábrica no ofrece una costura para inyectar un `IDBFactory` que falle |
| El `overrides` o `fake-indexeddb` se desactualicen sin que nadie lo note | Dependabot los propone agrupados en menores y parches; los mayores llegan en PR aparte |

## Pendiente, declarado

- La rama `quota-exceeded` del adaptador no tiene prueba automática, por lo dicho arriba. Se cubrirá si
  en algún momento hace falta una costura de inyección para el `IDBFactory`.
- La página del editor y el catálogo de herramientas entran en sus propios commits, con sus propias
  pruebas de accesibilidad.
