# Traspaso: rama `feat/toolbox-v3-security-languages`

Documento de continuidad. Existe para que otra sesión —o la misma persona en otra computadora— pueda
retomar este trabajo sin reconstruirlo del historial de commits ni de una conversación que ya no está.

**Estado:** sin fusionar y sin pull requests abiertos, a propósito. La rama está publicada en `origin`
para poder traerla desde cualquier máquina, y `main` **no se tocó**.

---

## Cómo retomar en otra computadora

```bash
git clone https://github.com/Sntg05/LinguaLab
cd LinguaLab
git checkout feat/toolbox-v3-security-languages

nvm use 22          # el proyecto fija Node 22; sin esto no corren las puertas
npm install
npm run dev         # http://localhost:4321
```

Herramientas nuevas que se ven en esa rama: **`/visualizador`** (visor de audio, espectrograma y
TextGrid, marcado experimental) y el **catálogo agrupado por nivel de análisis** en `/catalogo`.

### Tres trampas del entorno, ya pagadas

1. **La puerta e2e se cae si la lanza un agente de IA.** `astro preview` se manda al fondo cuando
   detecta variables como `AI_AGENT`, y Playwright exige un proceso en primer plano. Correr:
   `env -u AI_AGENT -u PI_CODING_AGENT npm run test:e2e`. Está en `P16`.
2. **El puerto 4321 tiene que estar libre para la puerta e2e.** Con `npm run dev` vivo, la puerta
   falla a propósito (`reuseExistingServer: false`, ver `P7`). `npx astro dev stop` y
   `npx astro preview stop` cierran los servidores en segundo plano.
3. **Astro deja un preview huérfano** después de cada corrida de Playwright en este entorno. Si la
   siguiente corrida dice «already used», es eso.

## Qué está hecho y verificado

| Unidad | Commits | Qué se probó |
|---|---|---|
| Documentación y dependencias | `d027462`, `08dbaeb` | `npm audit` en 0, 9 paquetes actualizados, `playwright-core` deduplicado, a11y de ArborLab corregida |
| Navegación y catálogo | `d34059b` | barra de 3 entradas, catálogo por nivel con índice, pie derivado del config, axe en 25 páginas × 2 temas |
| Lenguas de ejemplo | `d1dc9f1` | demos de portugués brasileño y wayuunaiki, 22 pruebas del codec, ADR 0005 |
| Visor de audio (segmento 6) | `2c525f1`, `3e4218d` | codec TextGrid con archivos de referencia, FFT, edición de intervalos, 9 e2e propios |
| Endurecimiento del visor | `8ac9d5b`, `2edf72c` | 8 defectos de una verificación independiente, cerrados con rojo observado |
| Catálogo honesto | `9f623f2` | «Análisis acústico» deja de anunciarse como existente; prueba que lo impide (`P21`) |

**Cifras medidas en el último commit:** 925 pruebas unitarias en 53 archivos, 87 e2e (50 de
accesibilidad), 193 módulos y 441 dependencias sin violaciones, página más pesada 28,9 KB sobre 60.

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

El segmento 8 del prompt («análisis acústico con praatfan en WASM») **nunca se implementó**. Lo único
que hay son el puerto `AcousticAnalysisPort` y su fake en el núcleo. La ficha del catálogo lo anunciaba
como `experimental`, que era falso; ahora dice `planned` y el caso completo está en **`P21`**.

Si se quiere de verdad: es alcance nuevo, arranca por `praatfan`, y el prompt ya lo marca como
experimental por el estado de ese paquete. Antes conviene decidir si el espectrograma de `/visualizador`
ya cubre la necesidad real de un curso de fonética.

## Decisiones que esperan a la persona, no a la siguiente sesión

- **Fusionar o no** esta rama a `main`. Nada se fusionó.
- **Abrir los pull requests** de la cadena: ver `docs/pr/06-cadena-toolbox-v3.md`, con las cuatro ramas
  (`feat/toolbox-v3-security`, `-navigation`, `-languages`, `-audio`), su presupuesto y su guion de
  prueba manual.
- Los seis puntos abiertos de seguridad en `docs/SECURITY-REVIEW.md` (auditoría en CI, acciones por
  SHA, `frame-ancestors` real, alertas de Dependabot, CodeQL, TypeScript 7).
- Los siete pull requests de Dependabot, respondidos uno por uno el 2026-10-23: #1, #2 y #5 para
  fusionar; #3 y #4 juntos y mirando el despliegue; #6 y #7 para cerrar. **Siguen abiertos.**

## Mapa de los archivos nuevos, para no buscarlos

| Qué | Dónde |
|---|---|
| Codec de TextGrid y dominio de edición | `packages/core/src/data/textgrid.ts`, `packages/core/src/domain/annotation-edit.ts` |
| Puertos extendidos | `packages/core/src/ports/textgrid-codec.ts`, `.../annotation-storage.ts` |
| Controlador, dibujo, audio | `src/scripts/audio/` |
| Página y marcado | `src/pages/visualizador.astro`, `src/pages/en/visualizador.astro`, `src/components/AudioLab.astro` |
| Orden de los niveles de análisis | `packages/core/src/domain/tool-descriptor.ts` (`ANALYSIS_LEVELS`) |
| Catálogo y rutas | `src/components/ToolCatalog.astro`, `src/config/site.ts`, `src/data/tools.json` |
| Lenguas de ejemplo | `packages/core/src/data/demo-tables.ts`, `docs/adr/0005-lenguas-de-ejemplo-portugues-y-wayuunaiki.md` |
| Pruebas del visor | `e2e/audio.spec.ts`, `src/scripts/audio/*.test.ts`, `packages/core/src/data/textgrid.test.ts` |
| Estado honesto | `docs/STATUS.md`, `docs/PENDING.md` (P1–P21), `docs/SECURITY-REVIEW.md` |
| Cadena de PRs | `docs/pr/06-cadena-toolbox-v3.md` |
| Decisiones de arquitectura | `docs/adr/` |

## La regla que no cambia

`main` es la rama publicada. Todo lo de arriba vive en la rama de trabajo hasta que su dueño diga lo
contrario, y una verificación en verde no autoriza a fusionar: eso lo decide una persona.
