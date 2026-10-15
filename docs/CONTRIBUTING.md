# Cómo contribuir a LinguaLab

Gracias por querer aportar. Este documento explica el flujo de trabajo y, sobre todo, las reglas que
no son negociables y el motivo de cada una. Si algo aquí contradice a tu sentido común, abre un issue:
probablemente el documento esté desactualizado y no tu criterio.

Para alimentar la bibliografía o ampliar el sitio, `docs/GUIDE.md` entra en el detalle de cada
estructura de datos. Este documento cubre el flujo de trabajo alrededor del código.

---

## Lo que no es negociable

1. **Los datos de la gente no salen de su navegador.** Nada de analítica, telemetría, cookies, ni
   peticiones a servidores ajenos. Si tu aporte necesita una llamada de red en tiempo de ejecución,
   no encaja: ver `docs/adr/0002-sitio-estatico-y-privacidad-local.md`.
2. **No se inventan datos lingüísticos.** Para lenguas indígenas, el repositorio entrega plantillas
   **vacías** con instrucciones. Solo el español y el inglés llevan ejemplos, y van rotulados `demo`.
   Si aportas correspondencias grafema→AFI para una lengua, tienen que venir de una fuente citable o
   de hablantes, y el `status` de la tabla debe pasar de `draft` a `reviewed` solo con esa evidencia.
3. **Lo poco probado se declara.** Una función sin verificación se marca `experimental` en la
   interfaz y en la documentación. Un aviso visible cuesta una línea; una transcripción equivocada
   presentada como confiable cuesta un trabajo de grado.
4. **Accesibilidad WCAG 2.2 AA.** Etiquetas en todos los controles, foco visible, navegación por
   teclado, contraste suficiente, modo claro y oscuro. No es un extra: parte de la audiencia depende
   de ello.

---

## Poner el proyecto a andar

```bash
npm install
npm run dev        # http://localhost:4321
```

El repositorio es un **npm workspace**. El sitio Astro vive en la raíz y el hexágono en `packages/`:

```
packages/core/        dominio, puertos y casos de uso — TypeScript puro, sin DOM
packages/adapters/    implementaciones de los puertos sobre APIs del navegador
src/                  el sitio Astro: el adaptador primario
```

### Puertas de calidad

| Comando | Qué comprueba |
|---|---|
| `npm run lint` | Biome sobre `packages/**`, `e2e/**` y los archivos de herramienta |
| `npm run typecheck:packages` | Tipos del workspace, con el núcleo sin `lib.DOM` |
| `npm run deps:check` | Reglas de dependencia hexagonales (dependency-cruiser) |
| `npm run check` | Tipos del sitio Astro |
| `npm test` | Vitest: sitio, núcleo y adaptadores |
| `npm run test:e2e` | Playwright contra el sitio **compilado**: accesibilidad con axe y flujos reales |
| `npm run build:verify` | Compila y verifica el resultado (CSP, peso, subrecursos) |
| `npm run verify:all` | Todas las anteriores menos `test:e2e`, en orden |

`npm run verify:all` es la puerta completa. Si pasa, el cambio es publicable.

`npm run test:e2e` no está dentro de `verify:all` porque necesita un navegador descargado y levanta un
servidor: `npx playwright install chromium` una vez, y después `npm run test:e2e`. Conviene correrlo
antes de un PR que toque la interfaz; en CI llega con su propio paso.

**Si tenés `npm run dev` corriendo, `test:e2e` falla —y está bien que falle.** La puerta exige el puerto
4321 libre porque prueba el sitio **compilado** (`dist/`), no el de desarrollo. Reutilizar el servidor de
desarrollo parece cómodo y es una trampa: ese servidor no aplica la CSP, sirve los módulos sin empaquetar
y compila a demanda, así que las pruebas miden un artefacto que nadie publica. Y con la suite entera
encima, casi todas se caen por tiempo de espera, así que el fallo se lee como un problema de las pruebas
y no como lo que es. Pará `npm run dev` antes de correr la puerta; el error te dice que hay algo ocupando
el puerto.

**Toda página pública nueva entra en `e2e/accessibility.spec.ts`.** No es una formalidad: el proyecto
declara WCAG 2.2 AA como requisito, y una declaración que nadie comprueba se degrada sola. Esa prueba
encontró un `aria-pressed` puesto sobre un enlace —inválido en ARIA— en el sitio que ya estaba en
producción.

---

## Flujo de trabajo

1. **Rama corta**, desde `main`, con un nombre que diga qué hace y dónde:

   ```
   feat/g2p-table-engine
   feat/ortografia-editor
   fix/textgrid-utf16
   docs/adr-acustica
   ```

   Tipos de rama: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.

2. **Un cambio, una idea.** Si tu rama toca dos cosas que un revisor evaluaría por separado,
   sepáralas en dos ramas. Una excepción: el código, sus pruebas y su documentación viajan juntos.
   Un cambio de comportamiento sin la prueba que lo fija no está terminado.

3. **Commits con Conventional Commits**, en español o en inglés, pero consistentes dentro del mismo
   cambio:

   ```
   feat(core): implementa motor de reglas ortografia-ipa
   fix(web): corrige el foco del editor al borrar una regla
   docs: documenta el formato JSON de tablas
   ```

   Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`.
   `commitlint` los valida si tienes los ganchos de Husky instalados.

4. **Pull request.** Usa la plantilla. Rellena «Cómo se probó» con los comandos que corriste, no con
   «funciona». Si el cambio supera unas 400 líneas, probablemente haya que partirlo: un PR que no se
   puede leer en una sentada no se revisa, se aprueba por cansancio.

5. **Merge por squash**, con el título del PR como mensaje convencional. Así `main` queda lineal y
   cada entrada del historial corresponde a un cambio revisado.

### Configuración recomendada de `main`

Aplicada a mano en GitHub (**Settings → Branches → Add branch protection rule**), porque una regla de
repositorio no debería cambiar sin que una persona la apruebe:

- Require a pull request before merging.
- Require status checks to pass, con el job `verify` del workflow `CI` como obligatorio.
- Require linear history.
- Do not allow force pushes.

---

## Cómo agregar una lengua

1. **No escribas las correspondencias si no las tienes.** Crea la tabla vacía con
   `status: "draft"` y las clases de símbolos que el equipo de documentación haya definido.
2. Añade la lengua al catálogo con su `id` (ISO 639-3 o Glottocode), su nombre tal como lo usa la
   comunidad y `kind: "indigenous"`.
3. La interfaz mostrará automáticamente el aviso:

   > Esta tabla debe construirse y validarse con hablantes y fuentes lingüísticas de la comunidad.

4. Cuando exista una tabla revisada con fuente citable, cámbiale el `status` a `reviewed` y anota la
   fuente en el campo `notes`. Ese cambio merece su propio PR y su propia discusión.

## Cómo agregar una herramienta

1. Decide **cómo se integra** y sé honesto: `embedded` (corre aquí, en el navegador), `external-link`
   (vive en otro sitio y añades una guía propia) o `needs-backend` (necesita servidor, así que se
   enlaza y se documenta, no se finge que es local).
2. Si es `embedded` y habla con el mundo exterior, **necesita un puerto** en `packages/core/src/ports`
   y un adaptador en `packages/adapters`. La interfaz nunca importa la librería directamente.
3. Escribe su suite de contrato (`runXxxPortContract`) y un fake en memoria. El fake no es un adorno:
   es lo que permite probar la interfaz sin cargar un WebAssembly de veinte megas.
4. Registra la herramienta en `tools.json` con su `status` real —`stable`, `experimental` o
   `planned`— y añádela a la tabla de estado del README.
5. Anota el paquete y su licencia en `THIRD_PARTY_NOTICES.md`. Una dependencia sin licencia anotada
   no entra.

## Cómo escribir un ADR

Un ADR (`docs/adr/NNNN-titulo-en-minusculas.md`) registra **una decisión y su porqué**, no una
descripción del código. Estructura:

```markdown
# NNNN — Título de la decisión

- **Estado:** propuesta | aceptada | sustituida por ADR NNNN
- **Fecha:** AAAA-MM-DD
- **Contexto del que surge:** ...

## Contexto      Qué problema apareció. El que obliga a decidir.
## Decisión      Qué se decide, en afirmativo y sin ambigüedad.
## Consecuencias Qué se gana, qué se pierde, qué queda pendiente.
```

Normas: numera en secuencia sin reutilizar huecos; las decisiones que ya no valen se marcan
«sustituida por ADR NNNN» en vez de borrarse — el valor de un ADR es que también registra los
caminos que se descartaron y por qué.

Antes de escribir uno, mira si tu decisión es en realidad una consecuencia de uno de los tres
existentes. Si lo es, no necesita ADR propio: necesita un comentario donde se note.

---

## Si algo no funciona

`[VERIFICAR]` en el prompt original marca los puntos donde una librería no estaba comprobada. Si te
toca uno y la librería no hace lo que se esperaba:

1. **No lo simules.** Deja el adaptador detrás del puerto, que el fake funcione, marca la herramienta
   como no disponible y explica el motivo en un ADR.
2. **No escribas tu propio algoritmo** para tapar el hueco, sobre todo en acústica: una
   reimplementación no validada es peor que una herramienta ausente, porque nadie sabe que hay que
   desconfiar de ella.
3. Abre un issue con lo que probaste, la versión exacta y la salida del error.
