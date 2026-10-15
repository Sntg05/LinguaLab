# 0003 — Convenciones de versionado, entrega y adopción gradual del lint

- **Estado:** aceptada
- **Fecha:** 2025-10-15
- **Contexto del que surge:** `odd/tasks/LinguaLab_prompt_vibecoding.md`, segmento 1

## Contexto

El prompt pide: `pnpm` workspaces, ramas cortas `tipo/alcance-descripcion`, Conventional Commits,
merge por squash, release-please en modo monorepo, versiones exactas sin rangos, y Biome más
dependency-cruiser como puertas de calidad.

Tres de esos puntos chocan con la realidad del repositorio y hay que decidir con evidencia:

1. **`pnpm` no está instalado** en la máquina de desarrollo y `corepack` ya no viene con Node 25.
   Instalarlo habría cambiado el entorno global del usuario, que pidió explícitamente no hacerlo.
2. **El CLI de dependency-cruiser rechaza Node 25.** Su `engines` es `^22 || ^24 || >=26`; Node 25
   no es LTS y queda fuera a propósito. En la máquina de desarrollo `npm run deps:check` no podría
   ejecutarse, y una puerta que no corre en local es una puerta que se ignora.
3. **Biome sobre el código heredado produce 68 hallazgos y reformatea el árbol entero.** Aplicarlo
   de golpe generaría un diff de cientos de líneas sobre código que funciona y que el usuario pidió
   no tocar, justo lo contrario de lo que necesita un revisor humano.

## Decisión

1. **npm workspaces en lugar de pnpm.** Misma estructura (`workspaces: ["packages/*"]`), mismos
   paquetes enlazados por symlink, sin tocar el entorno global de nadie. `package-lock.json` sigue
   siendo la única fuente de verdad de las versiones.
2. **Las dependencias nuevas se fijan exactas** (sin `^`, sin `~`, sin `latest`) y nunca a una
   versión publicada hace menos de catorce días. Las dependencias ya existentes conservan sus rangos:
   cambiarlas sería una actualización de dependencias disfrazada de tarea de tooling, y eso merece su
   propio cambio y su propia revisión.
3. **`npm run deps:check` llama a la API programática de dependency-cruiser** desde
   `scripts/deps-check.mjs`, usando el mismo motor y el mismo `.dependency-cruiser.cjs` que leería el
   binario. Así hay una sola ruta de código en local y en CI, sin depender de la matriz de versiones
   del CLI. El informe sale por el mismo formateador que usa el binario.
4. **Adopción gradual del lint.** Biome cubre `packages/**` y los archivos de herramienta de la raíz.
   El código heredado de `src/**` entra al linter pero **no** al formateador: se le exige cero errores
   y se le perdonan los avisos de estilo. Reformatear el sitio v2.0.0 no es parte de esta tarea y
   oscurecería la revisión de lo que sí lo es.
5. **Ramas y commits.** Ramas cortas `tipo/alcance-descripcion`; Conventional Commits en español o
   inglés, consistente dentro del mismo cambio; tipos permitidos en `commitlint.config.cjs`.
   `main` protegida: PR obligatorio, CI en verde e historial lineal, documentado en
   `docs/CONTRIBUTING.md` y aplicado a mano en GitHub (no por API: una configuración de repositorio
   no debería cambiar sin que una persona la apruebe).
6. **Versión y `CHANGELOG`.** El paquete raíz conserva su versión semántica. release-please queda
   como mecanismo previsto para cuando exista más de una entrega que versionar; mientras el sitio se
   publique como unidad, la etiqueta se crea a mano. Introducir automatización de releases antes de
   tener algo que liberar añade un flujo que nadie usa todavía.

## Consecuencias

- `npm run verify:all` es la puerta completa: lint, tipos de los paquetes, reglas hexagonales y la
  verificación que ya existía (tipos, pruebas, compilación y comprobación del resultado).
  `npm run verify` se deja intacto para que la promesa de la v2.0.0 no cambie de significado.
- Los cambios de dependencias llegan como su propio `chore(deps)` o `build(deps)`, separados de la
  funcionalidad. Un revisor puede ignorarlos con la conciencia tranquila.
- Si algún día se adopta Biome sobre `src/**`, la decisión ya está tomada en dos partes: primero
  corregir los cinco errores reales, después formatear en un commit que no contenga nada más.
- Se descarta explícitamente `pnpm` para este repositorio mientras no haya una razón medida. Si la
  hubiera —instalaciones mucho más rápidas en CI, `pnpm` como requisito de una librería—, este ADR se
  sustituye; no se improvisa en un PR de funcionalidad.
