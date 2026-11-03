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
npm run doctor     # antes de tocar nada: Node, rama frente a origin, Chromium, puerto 4331
npm run dev        # http://localhost:4321
```

`npm run doctor` no es una formalidad: el 2026-11-03 una sesión planeó cuatro herramientas que ya
existían porque su copia estaba 59 commits detrás de `origin/main`. Si dice que la rama está atrás, se
trae antes de planear.

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
| `npm run format:check` | Formato con Biome. Dentro de `verify:all` y de CI desde este cambio |
| `npm run verify:all` | Todas las anteriores menos `test:e2e`, en orden |
| `npm run live:check [url]` | El sitio **publicado**: cabeceras, robots, consola, axe, 404 y caché de los motores |
| `npm run status:measure` | Mide y escribe `docs/metrics.json`, la única fuente de las cifras |

`npm run verify:all` es la puerta completa. Si pasa, el cambio es publicable.

`npm run test:e2e` no está dentro de `verify:all` porque necesita un navegador descargado y levanta un
servidor: `npx playwright install chromium` una vez, y después `npm run test:e2e`. Conviene correrlo
antes de un PR que toque la interfaz; en CI llega con su propio paso.

**La puerta corre en su propio puerto, 4331, y exige tenerlo libre.** Prueba el sitio **compilado**
(`dist/`), no el de desarrollo, y desde P7 no comparte puerto con `npm run dev` (4321): separarlos elimina
la trampa de probar el servidor equivocado sin que nadie se entere. Si algo ocupa el 4331, la corrida
falla diciendo que la url ya está en uso. Reutilizar el servidor de
desarrollo parece cómodo y es una trampa: ese servidor no aplica la CSP, sirve los módulos sin empaquetar
y compila a demanda, así que las pruebas miden un artefacto que nadie publica. Y con la suite entera
encima, casi todas se caen por tiempo de espera, así que el fallo se lee como un problema de las pruebas
y no como lo que es. No hace falta parar `npm run dev`: son puertos distintos. Y si la puerta se queja del 4331,
el error te dice qué url está ocupada.

**Toda página pública nueva entra en `e2e/accessibility.spec.ts`.** No es una formalidad: el proyecto
declara WCAG 2.2 AA como requisito, y una declaración que nadie comprueba se degrada sola. Esa prueba
encontró un `aria-pressed` puesto sobre un enlace —inválido en ARIA— en el sitio que ya estaba en
producción.

---

## Flujo de trabajo

El proyecto trabaja con **ODD** (*Organic Driven Development*): el cambio pequeño se hace directo, y el
grande se planea en un documento antes de escribir código.

1. **Documento de la entrega**, si el trabajo no se puede retomar solo con el pedido y el `git diff`:
   `odd/tasks/<nombre>.md`, con un encabezado `status:` (`active`, `closed`, `superseded` o
   `reference`), `## Specs` con lo pedido **textual**, `## Tasks` con su commit y `## Log` con el pedido
   original y cada corrección. Hay un solo documento `active` a la vez; `npm run doctor` avisa del que no
   declara estado.

2. **Rama corta desde `main`**, con un nombre que diga qué hace:

   ```
   feat/g2p-table-engine
   fix/textgrid-utf16
   docs/adr-acustica
   ```

   Tipos de rama: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`. CI corre en
   cada push a `main` y en cada PR: una rama de trabajo se verifica al abrir su PR, sin lista que mantener.

3. **Commits por unidad de trabajo, con la prueba en rojo antes del arreglo.** El código, su prueba y su
   documentación viajan juntos; un cambio de comportamiento sin la prueba que lo fija no está terminado.
   Conventional Commits en español o en inglés, consistentes dentro del mismo cambio; `commitlint` los
   valida con los ganchos de Husky.

4. **Un PR por rebanada, aunque trabajes solo.** Unas 400 líneas como guía, no como tope. El PR dispara
   CI y la vista previa de Vercel, que es el guion de prueba manual. «Cómo se probó» lleva los comandos
   que corriste, no «funciona». La entrega v3 entró a `main` empujando la cadena de ramas sin PR, y por
   eso nadie la revisó en el sitio antes de publicarla: eso es lo que esta regla evita.

5. **Merge por squash**, con el título del PR como mensaje convencional, para que cada entrada del
   historial de `main` corresponda a un cambio revisado. Fusionar lo decide una persona: una verificación
   en verde no autoriza a fusionar.

6. **Después del despliegue**, `live-check.yml` revisa el sitio publicado. Un rojo ahí es un defecto de
   producción, no una prueba inestable.

### Documentos que se mantienen, y cómo

| Documento | Regla |
|---|---|
| `docs/metrics.json` | Única fuente de las cifras. Se regenera con `npm run status:measure`; ningún otro documento las copia, y `src/lib/docs.test.ts` lo hace cumplir en README, STATUS y el traspaso |
| `docs/STATUS.md` | En qué se puede confiar hoy. Resumen arriba, detalle abajo |
| `docs/PENDING.md` | Qué falta en el código. La tabla resumen y la línea `**Estado:` de cada entrada dicen lo mismo, o falla `docs.test.ts` |
| `docs/HUMAN-EVIDENCE.md` | Lo que solo cierra una persona: un programa, una comunidad, un usuario o una decisión |
| `odd/handoff/ACTUAL.md` | El traspaso vigente. Se **reescribe** en cada entrega; el anterior se archiva con fecha en `odd/handoff/archivo/` |

### Revisión semanal de alertas

Una vez por semana, quince minutos: las alertas de CodeQL y de Dependabot, los PR de Dependabot y la última
corrida de `live-check.yml`. Cada alerta se corrige o se descarta **con su motivo escrito** en
`docs/SECURITY-REVIEW.md`. Las quince alertas del 2026-10-25 estuvieron nueve días sin que nadie las mirara
mientras la revisión de seguridad decía que no había ninguna.

### Configuración recomendada de `main`

Aplicada a mano en GitHub (**Settings → Branches**), porque una regla de repositorio no debería cambiar
sin que una persona la apruebe:

- Require a pull request before merging.
- Require status checks to pass, con el job `Types, tests and build` del workflow `CI` como obligatorio.
- Require linear history.
- Do not allow force pushes.
- **Do not allow bypassing the above settings**, para que valga también para administradores: hoy no está
  activado, y así entró la entrega v3 sin PR.

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
   `planned`— y añádela a la tabla de estado del README. Si es `embedded` y no está planificada,
   necesita además su ruta en `SITE_ROUTES` (`src/config/site.ts`) y su página en
   `src/pages/<ruta>.astro` **y** `src/pages/en/<ruta>.astro`: una ruta sin página o una ficha
   `stable` sin ruta es una promesa que alguien va a comprobar. `src/config/site.test.ts` cruza el
   catálogo con las rutas en las dos direcciones.
5. Escribe su copia en `src/i18n/messages/features/<herramienta>.{es,en}.ts` (ver la guía), no en el
   diccionario central, y añadí la página a `PUBLIC_PAGES` de `e2e/accessibility.spec.ts`: una página
   pública sin axe es una incógnita, no una certeza.
6. Anota el paquete y su licencia en `THIRD_PARTY_NOTICES.md`, con la versión **instalada**. Una
   dependencia sin licencia anotada no entra.
7. Si trae un motor pesado que se sirve desde `public/`, va en `public/<motor>/<versión>/`, con su versión
   en `src/config/engines.json` y su carpeta en `vercel.json` como inmutable: `src/config/engines.test.ts`
   exige las tres cosas.

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

Antes de escribir uno, mira si tu decisión es en realidad una consecuencia de uno de los que ya
existen. Si lo es, no necesita ADR propio: necesita un comentario donde se note.

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
