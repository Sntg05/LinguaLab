# PR — Segmento 1: repositorio, tooling y versionado

Rama sugerida: `feat/lingualab-hexagonal-monorepo` · Commits: `b7ef8b8`, `cf5af44`, `7d1442c`,
`3b762df`, `684ec17`

> Nota para quien abra los PR: este documento cubre el segmento 1 completo, que en esta rama viaja
> como cinco commits separados a propósito. Si el repositorio prefiere un PR por segmento, este
> documento es el cuerpo del PR. Si prefiere un PR por unidad de revisión, el mismo contenido sirve
> para los cinco, recortando la sección «Qué cambia».

---

## Qué cambia

Se introduce el andamiaje de calidad del segmento 1 del prompt de vibe-coding **sobre el sitio Astro
existente**, sin cambiar su comportamiento:

- **npm workspaces** con dos paquetes nuevos, `packages/core` y `packages/adapters`, que por ahora
  compilan vacíos.
- **Biome** como linter y formateador, con adopción gradual (ver «Decisiones»).
- **dependency-cruiser** con las reglas de dependencia hexagonales del ADR 0001, ejecutado desde
  `scripts/deps-check.mjs`.
- **commitlint** con el conjunto de `type-enum` del proyecto y ganchos de Husky limitados al código
  nuevo.
- **Vitest** pasa a cubrir también `packages/**` en la misma corrida.
- **CI**: tres pasos nuevos (`lint`, `deps:check`, `typecheck:packages`) antes de la comprobación de
  tipos, para que falle primero lo más barato de arreglar.
- **Plantillas de repositorio**: plantilla de PR, tres formularios de issue en español (defecto,
  herramienta, lengua indígena), CODEOWNERS y Dependabot.
- **Documentación**: ADRs 0001–0003, `docs/CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `THIRD_PARTY_NOTICES.md` y el prompt original archivado como especificación.
- **Cinco hallazgos reales del linter** corregidos en el código heredado, sin reformatear nada.

## Por qué

El prompt pide construir siete herramientas más, cada una con una librería externa pesada
(WebAssembly, workers, IndexedDB). Con la lógica pegada a la interfaz, la primera librería nueva se
cuela hasta el centro. Este segmento no añade ninguna herramienta: añade el lugar donde ponerlas y
las puertas que impiden que se mezclen.

## Cómo se probó

- [x] `npm run lint` — exit 0 (0 errores, 36 avisos heredados declarados)
- [x] `npm run typecheck:packages` — exit 0
- [x] `npm run deps:check` — exit 0, 64 módulos y 78 dependencias
- [x] `npm run check` — 90 archivos, 0 errores, 0 avisos
- [x] `npm test` — 17 archivos, 537 pruebas
- [x] `npm run build:verify` — pasa; peor página 28.5 KB gz; 35 muestras de audio
- [x] `npm run verify:all` — exit 0 (todas las anteriores en orden)

**La puerta se probó fallando, no solo pasando.** Se añadió a propósito
`export * from "@lingualab/adapters"` en `packages/core/src/index.ts` y `npm run deps:check` devolvió
exit 1 con:

```
error core-is-hermetic: packages/core/src/index.ts → packages/adapters/src/index.ts
```

Revertido y vuelto a verde. Sin esa comprobación, la regla sería decorativa.

**La prohibición del DOM también se probó.** Se añadió `document.title` dentro de
`packages/core/src/`, `npm run typecheck:packages` falló nombrando el tipo ausente, y al quitarlo
volvió a pasar. El núcleo no evita el DOM por buena voluntad: no sabe que existe.

**Los YAML se validaron** con el paquete `yaml` ya presente en `node_modules`, más 25 aserciones
estructurales sobre los formularios de issue y el orden de los pasos de CI.

## Decisiones y supuestos

Las tres están registradas con su motivo en el ADR 0003, porque cada una es una desviación explícita
del prompt original:

1. **npm workspaces en lugar de pnpm.** `pnpm` no está instalado y `corepack` ya no viene con Node 25;
   el usuario pidió no tocar el entorno global. Misma estructura, sin cambios fuera del repositorio.
2. **`npm run deps:check` usa la API programática de dependency-cruiser.** Su CLI aborta en Node 25
   (`engines: ^22 || ^24 || >=26`, Node 25 no es LTS). Una puerta que no corre en local es una puerta
   que se ignora. Mismo motor, mismo archivo de reglas.
3. **Adopción gradual de Biome.** El árbol heredado entra al linter (cero errores, comprobado) pero no
   al formateador: reformatear ~40 archivos de la v2.0.0 generaría un diff de cientos de líneas que
   escondería los cambios que sí importan.
4. **Las dependencias nuevas se fijan exactas y con al menos 14 días de publicadas**; las existentes
   conservan sus rangos. Cambiarlas sería una actualización de dependencias disfrazada de tarea de
   tooling, y merece su propio PR.

Supuesto declarado: el sitio v2.0.0 es el adaptador primario y no se reescribe. React y Vite no se
adoptan; el razonamiento medido está en el ADR 0001.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Biome formatea archivos heredados sin que nadie lo pida | El formateador está desactivado por `override` para `src/**` y `scripts/**`; `biome format .` verifica 9 archivos y ninguno es heredado |
| Las nuevas puertas de CI fallan por algo preexistente | Se probaron: `verify:all` en verde con los 537 tests y la verificación de compilación intactas |
| Husky rompe el `npm install` en CI | El script es `husky \|\| true`; nunca falla |
| Dos `high` de `npm audit` en dependencias de desarrollo | `npm audit --omit=dev` → 0 vulnerabilidades. Son de herramientas de desarrollo, no del sitio publicado |
| Node local (25) fuera de la matriz de dependencias de desarrollo | CI usa Node 22, que es el runtime del proyecto y el que fija `.nvmrc` |

## Capturas

No aplica: este segmento no cambia nada visible. La captura relevante es la salida de
`npm run verify:all`, incluida arriba.

## Pendiente, declarado

- Los 36 avisos y 69 informaciones de Biome en el código heredado (mayoría de estilo: `useTemplate`,
  claves con comillas). No bloquean y se corrigen cuando se toque el archivo por otro motivo.
- `npm run lint:css` sigue apuntando a `stylelint`, que no está en `devDependencies`. Estaba así
  antes de esta rama; se deja intacto para no mezclar un arreglo no pedido con este cambio.
