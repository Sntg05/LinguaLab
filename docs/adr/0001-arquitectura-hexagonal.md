# 0001 — Arquitectura hexagonal y reglas de dependencia

- **Estado:** aceptada
- **Fecha:** 2025-10-15
- **Contexto del que surge:** `odd/tasks/LinguaLab_prompt_vibecoding.md`, segmentos 0 y 2

## Contexto

LinguaLab nació como un sitio Astro con toda la lógica dentro de `src/scripts/`, pegada al DOM.
Eso funcionó mientras las herramientas eran cálculo puro más unos pocos nodos, pero el prompt de
vibe-coding propone cinco herramientas más —fonemizador, visor de audio con TextGrid, experimentos
con jsPsych, análisis acústico y conversión ELAN— y cada una trae una librería externa pesada
(WASM, workers, IndexedDB).

Con la lógica pegada a la interfaz, cada librería nueva se cuela hasta el centro de la aplicación.
La pregunta que decide todo es: **¿qué parte de LinguaLab debería seguir funcionando igual si
mañana cambiamos de librería, de formato de audio o de framework de UI?** Esa parte es la que hay
que aislar.

Segundo problema, más concreto: parte de la audiencia son estudiantes de pregrado sin experiencia
en programación. Un cambio en el motor de transcripción AFI no debería poder romper el reproductor
de audio, y hoy nada lo impide.

## Decisión

Se adopta arquitectura hexagonal (puertos y adaptadores) con tres capas y una única dirección de
dependencia:

```
adaptadores  →  aplicación  →  dominio
(secundarios)   (casos de uso)   (entidades y valores)
```

- **`packages/core`** contiene el hexágono: entidades de dominio, puertos de salida y casos de uso.
  Es TypeScript puro. Su `tsconfig.json` declara `"lib": ["ES2022"]` y `"types": []` a propósito:
  eso hace que `document`, `window` y `fetch` **no existan** para el compilador dentro del núcleo.
  La pureza no se pide por favor, se comprueba con `tsc -p packages/core`.
- **`packages/adapters`** contiene las implementaciones de esos puertos sobre APIs del navegador
  (IndexedDB, Web Audio, y más adelante WASM y workers). Puede tocar el navegador; lo que no puede
  es conocer la pantalla que lo invoca.
- **La interfaz web** (`src/**`, el sitio Astro) es el adaptador primario. Solo importa
  `@lingualab/core`; los adaptadores se cablean en un único composition root.

### El prompt pedía React + Vite; aquí no se adopta

El prompt describe `apps/web` con React + Vite. Se descarta, por dos razones verificables:

1. El sitio declara «sin framework de UI» como decisión deliberada y medida: añadir React costaría
   entre 40 y 130 KB comprimidos por página, y `scripts/verify-build.mjs` falla si una página supera
   60 KB comprimidos. Un framework rompería una puerta que ya existe.
2. El usuario pidió explícitamente dejar la v2.0.0 «lo más fiel posible».

Lo que sí se adopta del prompt es lo que tiene valor estructural: la separación hexagonal, las
reglas de dependencia comprobadas en CI, los contratos reutilizables y la ubicación de la interfaz
como adaptador primario. La UI sigue siendo Astro y la interactividad sigue siendo TypeScript
empaquetado por página.

## Consecuencias

- `packages/core` puede probarse sin navegador, sin red y sin relojes: los puertos
  `IdGeneratorPort` y `ClockPort` existen justo para eso.
- Cada puerto tiene una suite de contrato (`runXxxPortContract`) que se ejecuta igual contra el fake
  en memoria y contra el adaptador real. Un adaptador nuevo no se considera terminado hasta que pasa
  la suite que ya pasaba el fake.
- Las flechas se comprueban con dependency-cruiser en `.dependency-cruiser.cjs`. Las reglas son
  `core-is-hermetic`, `adapters-do-not-know-the-ui` y
  `ui-to-adapters-only-from-composition-root`; `npm run deps:check` falla si alguna se invierte.
- Se excluyen de la detección de ciclos las aristas puramente de tipo (`type-only`, `type-import`).
  Un ciclo que el compilador borra no existe en el JavaScript emitido y no puede producir un error
  de inicialización; perseguirlo obligaría a refactorizar módulos de datos que hoy son correctos.
- El composition root es un solo archivo. Sin singletons globales ni service locator: si hay que
  sustituir un adaptador, hay un único lugar donde mirar.
