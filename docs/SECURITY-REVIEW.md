# Revisión de seguridad — LinguaLab

Qué se miró, con qué se midió y qué sigue abierto. Existe porque el proyecto promete privacidad y
honestidad técnica, y una promesa sin medición es publicidad.

Todo lo de abajo se midió sobre la rama `feat/toolbox-v3-security-languages`, partiendo de `main` en
`1ee15c6`, con Node 22.23.3 y npm 10.9.9.

---

## 1. Lo que está sano, con la evidencia

| Control | Estado | Evidencia |
|---|---|---|
| **CSP sin `unsafe-inline`** | Sana | `astro.config.mjs`, bloque `security.csp`: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `script-src` y `style-src` los emite Astro con hash SHA-256 por recurso. `wasm-unsafe-eval` es la única concesión, y es la estrecha: permite compilar WebAssembly, no `eval()` |
| **La política se comprueba en cada build** | Sana | `scripts/verify-build.mjs` falla si aparece `unsafe-inline`, si se cuela un subrecurso externo, si hay dos `<h1>`, si un audio se publica sin atribución o si una página pasa de 60 KB comprimidos |
| **Sin inyección de marcado** | Sana | Cero usos de `innerHTML`, `eval`, `new Function` o `dangerouslySetInnerHTML` en `src/` y `packages/`. Los textos se insertan como nodos de texto |
| **Sin secretos en el repositorio** | Sana | `git ls-files` no devuelve ningún `.env`, ni clave, ni credencial. No hay ficheros de entorno |
| **Almacenamiento local acotado** | Sana | Dos claves y solo dos, `lingualab-lang` y `lingualab-theme`, con lista blanca en `src/scripts/core/guardrails.ts` y comprobación en vivo en `/seguridad` |
| **Dependencias de producción** | Sana | `npm audit --omit=dev` → **0 vulnerabilidades**. El árbol de producción de un sitio estático son 5 entradas, ninguna con script de instalación |
| **Permisos de CI mínimos** | Sana | `ci.yml`: `contents: read`. `deploy.yml`: `contents: read`, `pages: write`, `id-token: write` — lo mínimo que exige GitHub Pages |
| **Sin disparadores peligrosos** | Sana | Ni `pull_request_target` ni `workflow_run` en `.github/workflows/`, así que no hay superficie de inyección de scripts desde un PR externo |
| **Superficie de instalación** | Sana y pequeña | 493 paquetes en el lock, **2 con script de instalación**: `esbuild` (declarado en `allowScripts`) y `fsevents` (opcional, macOS) |

## 2. Lo que estaba mal y se corrigió aquí

**R1 — Cinco avisos de seguridad, tres de severidad alta, en dependencias de desarrollo.**
`npm audit` sobre `main` devolvía 5 vulnerabilidades (3 altas, 2 moderadas): `vite` con cinco avisos,
entre ellos ejecución arbitraria de comandos a través de `launch-editor`; `source-map-js` con denegación
de servicio por desbordamiento del bucle de eventos; `http-cache-semantics` con divulgación de
respuestas en caché entre usuarios. Después de las actualizaciones de §3: **0 vulnerabilidades**.
Ninguna de las cinco afectaba al artefacto publicado —el sitio es estático—, pero la primera sí afecta
a quien levanta el servidor de desarrollo, que es el entorno de cualquier colaborador.

**R2 — El `overrides` de `playwright-core` rompía la suite e2e, no la protegía.**
`package.json` fijaba `"overrides": { "playwright-core": "1.63.0" }` para deduplicar la copia que
arrastra `@axe-core/playwright`. Al subir `@playwright/test` a 1.64.1 sin tocar el override, Playwright
murre con `TypeError: createCallIdGenerator is not a function` antes de la primera aserción: **69
pruebas fallan por una versión fijada a mano**, no por 69 motivos. Es lo que hace rojo el PR #6 de
Dependabot. El override se eliminó: con las dos herramientas en 1.64.1 `npm ls playwright-core` muestra
**una sola copia, `deduped`**. La lección queda en el registro: un override de una dependencia interna
de una herramienta hay que moverlo con la herramienta o no tenerlo.

**R3 — El lockfile declaraba otra licencia que `package.json`.**
`package-lock.json` decía `GPL-3.0-or-later` y `package.json` dice `GPL-3.0-only`. Un desacuerdo de
licencia en los metadatos es exactamente el tipo de detalle que nadie mira hasta que importa. Alineado.

## 3. Dependencias actualizadas en esta rama

Nueve paquetes, los mismos que propone el PR #6, más lo que arrastró `npm audit fix`:

| Paquete | Antes | Ahora |
|---|---|---|
| `astro` | 7.3.5 | 7.4.1 |
| `@astrojs/check` | 0.9.4 | 0.9.11 |
| `@playwright/test` | 1.63.0 | 1.64.1 |
| `@axe-core/playwright` | 4.13.0 | 4.14.0 |
| `dependency-cruiser` | 18.5.0 | 18.7.0 |
| `@commitlint/cli` y `config-conventional` | 21.2.3 | 21.2.4 |
| `vitest` (y `vite`, `source-map-js`, `http-cache-semantics` por arrastre) | 5.0.2 | 5.0.5 |
| `fake-indexeddb` (workspace `adapters`) | 6.2.5 | 6.2.6 |

`typescript` quedó fijado en **6.0.3 exacto**: el PR #7 propone 7.0.2 y esa es una decisión aparte
(ver O6).

## 4. Lo que sigue abierto

**O1 — La puerta no audita dependencias (severidad media).**
`npm run verify:all` no ejecuta `npm audit`, así que un aviso nuevo no rompe nada y nadie se entera
hasta que alguien mira el panel. *Próximo paso:* añadir `npm audit --omit=dev --audit-level=high` como
paso de CI y un script `npm run audit` que además informe el árbol de desarrollo sin bloquear.

**O2 — Las acciones de GitHub están fijadas por etiqueta, no por SHA (severidad media).**
`actions/checkout@v4` y sus hermanas son referencias mutables: quien controle la acción puede mover la
etiqueta y ejecutar código en el runner con el `GITHUB_TOKEN` del proyecto. El prompt del proyecto pide
explícitamente «fija las acciones por versión exacta o SHA». *Próximo paso:* fijar las siete por SHA
completo, con la versión mayor en un comentario al lado para que Dependabot siga proponiendo subidas.

**O3 — `frame-ancestors` no protege nada hoy (severidad baja, pero es una afirmación falsa si no se
declara).**
GitHub Pages no permite cabeceras de respuesta, así que la CSP viaja en una metaetiqueta. Los
navegadores **ignoran** `frame-ancestors` cuando llega por `<meta>`: la directiva está en la política y
no se aplica. La página `/seguridad` y `docs/STATUS.md` no deben insinuar lo contrario. *Próximo paso:*
declararlo en `/seguridad` con esa misma redacción, y emitir la cabecera real el día que el sitio se
sirva desde un host con cabeceras.

**O4 — Las alertas de Dependabot están desactivadas en el repositorio (severidad baja).**
La API contesta `403 «Dependabot alerts are disabled for this repository»`, que es la fuente que
debería alimentar el panel de seguridad y el `dependency graph`. Lo que sí funciona son los PRs de
versión. *Próximo paso:* activarlas en Settings → Code security (requiere permiso de administración del
repositorio; no se puede hacer desde este entorno).

**O5 — No hay análisis estático de código en CI (severidad baja).**
CodeQL no está configurado. Para este sitio el riesgo es acotado —no hay entrada de usuario que llegue a
un sink peligroso, y eso está medido en §1— pero es una red que cuesta cero. *Próximo paso:* añadir
`.github/workflows/codeql.yml` con el idioma `javascript-typescript` y `permissions: security-events:
write`.

**O6 — `typescript` 7 no es una actualización de rutina (decisión, no vulnerabilidad).**
El PR #7 falla en 8 segundos: `npm ci` no puede satisfacer el peer de `@astrojs/check@0.9.11`, que
declara `typescript: ^5.0.0 || ^6.0.0`. TypeScript 7 es el compilador nuevo y Astro todavía no lo
admite. *Próximo paso:* cerrar el PR con ese motivo y reintentarlo cuando `@astrojs/check` amplíe el
peer.

## 5. Respuesta a los siete PRs de Dependabot

| PR | Qué propone | Decisión | Por qué |
|---|---|---|---|
| #1 | `upload-artifact` 4 → 7 | **No fusionar todavía** | Verde, pero deja la etiqueta mutable: fijar por SHA cubre el mismo riesgo y no caduca. Ver O2 |
| #2 | `checkout` 4 → 7 | **No fusionar todavía** | Igual que #1 |
| #3 | `configure-pages` 5 → 6 | **No fusionar todavía** | Igual que #1 |
| #4 | `upload-pages-artifact` 3 → 5 | **No fusionar todavía** | Igual que #1 |
| #5 | `cache` 4 → 6 | **No fusionar todavía** | Igual que #1 |
| #6 | 9 paquetes minor/patch | **Cerrar: ya está aplicado aquí** | Las nueve versiones entran en esta rama junto con el arreglo del override que hacía fallar sus e2e |
| #7 | `typescript` 6 → 7 | **Cerrar** | El peer de `@astrojs/check` no admite 7 todavía. Ver O6 |
