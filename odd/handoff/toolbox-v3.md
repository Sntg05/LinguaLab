# Traspaso: la entrega v3 y su cierre

Documento de continuidad. Existe para que otra sesión —o la misma persona en otra computadora— pueda
retomar este trabajo sin reconstruirlo del historial de commits ni de una conversación que ya no está.

**Estado:** una cadena de cinco ramas, **sin fusionar y sin pull requests abiertos, a propósito**.
`main` **no se tocó**: sigue en `1ee15c6`, que es lo publicado. Las ramas están en `origin` para poder
traerlas desde cualquier máquina.

```
main (1ee15c6)
 └─ feat/toolbox-v3-security           08dbaeb   documentación y dependencias
     └─ feat/toolbox-v3-navigation    d34059b   navegación y catálogo por nivel
         └─ feat/toolbox-v3-languages 6ee3d35   portugués y wayuunaiki
             └─ feat/toolbox-v3-audio 4505ddf  visor de audio, espectrograma y TextGrid
                 └─ feat/toolbox-v3-closure    cierre de los pendientes
```

`feat/toolbox-v3-security-languages` apunta al mismo commit que `feat/toolbox-v3-audio`: era el nombre
largo de la rama de trabajo antes de partirla en la cadena.

---

## Cómo retomar en otra computadora

```bash
git clone https://github.com/Sntg05/LinguaLab
cd LinguaLab
git checkout feat/toolbox-v3-closure    # la última de la cadena, con todo lo anterior debajo

nvm use 22          # el proyecto fija Node 22; sin esto no corren las puertas
npm install
npx playwright install chromium         # una vez: sin navegador, la puerta e2e no arranca
npm run dev         # http://localhost:4321
```

Herramientas que se ven en esta cadena: **`/visualizador`** (visor de audio, espectrograma y TextGrid,
marcado experimental) y el **catálogo agrupado por nivel de análisis** en `/catalogo`.

### Trampas del entorno, ya pagadas

1. **La puerta e2e necesita el puerto 4321 libre.** `reuseExistingServer: false`, así que con
   `npm run dev` vivo la corrida **falla a propósito** y avisa que la url ya está en uso (ver `P7`).
   `npx astro dev stop` y `npx astro preview stop` cierran los servidores en segundo plano.
2. **Ya no hace falta `env -u AI_AGENT`.** Astro 7 detecta que lo lanza un agente y manda `preview` al
   fondo, y Playwright exige un proceso en primer plano; la puerta lo resuelve con `--ignore-lock`, la
   bandera que el CLI documenta para «servidor de una sola corrida, en primer plano». Está en
   `playwright.config.ts` con el porqué, y `P16` lo cuenta entero.
3. **El navegador de Playwright no viene con `npm install`.** `npx playwright install chromium` es un
   paso previo, y sin él las 88 pruebas fallan al lanzar Chromium con un mensaje que habla de otra cosa.
4. **Node 26 también pasa la puerta**, aunque el proyecto declare `>=22.12.0`: medido en esta máquina,
   `npm run verify:all` en verde con 26.12.1. Si `nvm` no tiene el 22 instalado, no hace falta pelearse.

## Qué está hecho y verificado

| Unidad | Commits | Qué se probó |
|---|---|---|
| Documentación y dependencias | `d027462`, `08dbaeb` | `npm audit` en 0, 9 paquetes actualizados, `playwright-core` deduplicado, a11y de ArborLab corregida |
| Navegación y catálogo | `d34059b` | barra de 3 entradas, catálogo por nivel con índice, pie derivado del config, axe en 25 páginas × 2 temas |
| Lenguas de ejemplo | `d1dc9f1` | demos de portugués brasileño y wayuunaiki, 22 pruebas del codec, ADR 0005 |
| Visor de audio (segmento 6) | `2c525f1`, `3e4218d` | codec TextGrid con archivos de referencia, FFT, edición de intervalos, 9 e2e propios |
| Endurecimiento del visor | `8ac9d5b`, `2edf72c` | 8 defectos de una verificación independiente, cerrados con rojo observado |
| Catálogo honesto | `9f623f2` | «Análisis acústico» deja de anunciarse como existente; prueba que lo impide (`P21`) |
| **Cierre de pendientes** | rama `feat/toolbox-v3-closure` | P3, P8, P12, P13, P16, P18, P19 cerrados con medición; P1 traducido; O1–O6 cerrados |

**Cifras medidas en el último commit:** las de `docs/STATUS.md`, sección «Verificación, en números». No
se copian acá porque se quedan viejas dos veces.

## Qué se cerró en la rama de cierre, y con qué

- **P1 — la prosa del núcleo.** `OrthographyIssue` devuelve **código y datos**, no frases: el texto se
  arma en la capa de presentación con el mecanismo de i18n que ya existía, y una prueba e2e carga la misma
  tabla rota en `/ortografia` y en `/en/ortografia` afirmando que ninguna salida contiene texto del otro
  idioma.
- **P3 — la rama de cuota agotada.** Provocada de verdad interceptando `IDBObjectStore.prototype.put` con
  un `QuotaExceededError`; se afirma que la tabla nueva se guarda, que la anterior sigue exportable y que
  `persistence()` informa la degradación. Comprobado por mutación.
- **P8 — el reparto de los avisos del linter.** `node scripts/lint-baseline.mjs` extrae `main` con
  `git archive` y mide los dos árboles: **42 heredados, 5 nuevos**, y corrige dos afirmaciones falsas de
  P4.
- **P12 — el `incomplete` sin motivo.** La puerta ya falla si aparece uno, y el caso de `/arboles` quedó
  exceptuado **por nombre y con la medición**: con la página recién cargada hay 0 `<li>` y axe no puede
  decidir; después de «Dibujar» hay 1 y deja de reportarlo.
- **P13 — las cinco inexactitudes documentales.** Corregidas contra el archivo y la línea que cada una
  nombraba.
- **P16 — la puerta e2e y los agentes.** `--ignore-lock`, sin variables borradas ni scripts que mantengan
  una mentira; `reuseExistingServer` sigue en `false`.
- **P18 — los puntos fuera de su capa.** `point-out-of-tier` con su entrada en el contrato del puerto, y
  el borde probado para no rechazar de más.
- **P19 — los topes de audio.** `src/scripts/audio/limits.ts` con prueba propia en Node puro.
- **O1–O6 — la revisión de seguridad.** Auditoría en CI, acciones fijadas por SHA, CodeQL, alertas de
  Dependabot y escaneo de secretos activados, `frame-ancestors` declarado como lo que es, TypeScript 7
  cerrado como decisión. Detalle y evidencia en `docs/SECURITY-REVIEW.md` §4.
- **Los siete PRs de Dependabot**, cerrados con su motivo escrito en cada uno y con lo que ocupa su lugar.

## Lo que quedó experimental, y por qué

`/visualizador` está marcado **experimental** en la página, en el catálogo y en `docs/STATUS.md`. No es
una etiqueta de cortesía: hay dos cosas que **no se pudieron medir** porque necesitan el programa, no el
repositorio.

1. Que **Praat** abra el `.TextGrid` exportado.
2. Que el **espectrograma** coincida con el de Praat (ventana 0,025 s, rango 0–5500 Hz, 70 dB).

El criterio para pasar a estable está escrito en **`P17`** de `docs/PENDING.md`, con la versión de Praat
y la fecha que hay que anotar. Hasta entonces, exportá una vez y abrilo antes de confiarle una sesión
larga.

## El «analizador acústico»: no existe, y eso está decidido

El segmento 8 del prompt («análisis acústico con praatfan en WASM») **nunca se implementó**. Lo único que
hay son el puerto `AcousticAnalysisPort` y su fake en el núcleo. La ficha del catálogo lo anunciaba como
`experimental`, que era falso; ahora dice `planned` y el caso completo está en **`P21`**.

Si se quiere de verdad: es alcance nuevo, arranca por `praatfan`, y el prompt ya lo marca como
experimental por el estado de ese paquete. Antes conviene decidir si el espectrograma de `/visualizador`
ya cubre la necesidad real de un curso de fonética.

## Decisiones que esperan a la persona, no a la siguiente sesión

- **Fusionar o no** la cadena a `main`. Nada se fusionó, y una verificación en verde no autoriza a
  fusionar: eso lo decide una persona.
- **Abrir los pull requests** de la cadena: ver `docs/pr/06-cadena-toolbox-v3.md`, con las cuatro ramas,
  su presupuesto y su guion de prueba manual. La rama de cierre es una quinta rebanada, con su propio
  presupuesto.
- **P5** (cómo se edita una clase `{V}` en la interfaz) y **P20** (borrar un proyecto guardado y no
  todos): las dos son interfaz nueva y las dos piden una decisión de producto antes de escribir código.
- **P9** (tablas indígenas vacías) no es una tarea de programación: pide hablantes o fuentes citables.
- **P11** (los nodos que axe no puede medir) sigue abierto con su aviso: medirlos **desde píxeles**, con
  el método en el repositorio, no por estilos computados, que ya se probó y da resultados falsos.
- **P14** (recompilar el wasm de eSpeak con dos voces) cambia el binario auditado y no cabe en una sesión
  de repositorio.
- **P4** (complejidad cognitiva) queda como deuda aceptada y **ahora medida**.

## Mapa de los archivos nuevos, para no buscarlos

| Qué | Dónde |
|---|---|
| Codec de TextGrid y dominio de edición | `packages/core/src/data/textgrid.ts`, `packages/core/src/domain/annotation-edit.ts` |
| Puertos extendidos | `packages/core/src/ports/textgrid-codec.ts`, `.../annotation-storage.ts` |
| Controlador, dibujo, audio, topes | `src/scripts/audio/` (`index.ts`, `limits.ts`, `spectrogram.ts`, `render.ts`, …) |
| Página y marcado | `src/pages/visualizador.astro`, `src/pages/en/visualizador.astro`, `src/components/AudioLab.astro` |
| Orden de los niveles de análisis | `packages/core/src/domain/tool-descriptor.ts` (`ANALYSIS_LEVELS`) |
| Catálogo y rutas | `src/components/ToolCatalog.astro`, `src/config/site.ts`, `src/data/tools.json` |
| Lenguas de ejemplo | `packages/core/src/data/demo-tables.ts`, `docs/adr/0005-lenguas-de-ejemplo-portugues-y-wayuunaiki.md` |
| Pruebas del visor | `e2e/audio.spec.ts`, `src/scripts/audio/*.test.ts`, `packages/core/src/data/textgrid.test.ts` |
| Medición de la línea base del linter | `scripts/lint-baseline.mjs` |
| Estado honesto | `docs/STATUS.md`, `docs/PENDING.md` (P1–P21), `docs/SECURITY-REVIEW.md`, `odd/tasks/v3-closure.md` |
| Cadena de PRs | `docs/pr/06-cadena-toolbox-v3.md` |
| Decisiones de arquitectura | `docs/adr/` |

## La regla que no cambia

`main` es la rama publicada. Todo lo de arriba vive en las ramas de trabajo hasta que su dueña diga lo
contrario, y una verificación en verde no autoriza a fusionar: eso lo decide una persona.
