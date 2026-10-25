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
| **Permisos de CI mínimos** | Sana | `ci.yml`: `contents: read`. `deploy.yml`: `contents: read`, `pages: write`, `id-token: write` — lo mínimo que exige GitHub Pages. `codeql.yml`: `contents: read` y `security-events: write`, lo único que necesita para publicar hallazgos |
| **Acciones fijadas por SHA** | Sana | Las **doce** referencias de los tres flujos —ocho acciones distintas— van por SHA completo con la versión mayor en un comentario al lado. Antes eran etiquetas movibles, que cualquiera con control de la acción puede reapuntar (O2) |
| **La puerta audita dependencias** | Sana | `npm run audit` corre en cada job de CI: bloquea el árbol de **producción** desde `high` e informa el de desarrollo sin cortar. Medido: **0 vulnerabilidades** en los dos árboles (O1) |
| **Análisis estático de código** | Sana | `.github/workflows/codeql.yml`, `javascript-typescript` con el conjunto `security-and-quality`, en push, en PR y una vez por semana. **Sin hallazgos abiertos** al activarlo (O5) |
| **Alertas de Dependabot y escaneo de secretos** | Sana | Alertas de Dependabot **activadas** (`0` alertas abiertas al activarlas), actualizaciones de seguridad automáticas activadas, y `secret scanning` más `push protection` activados el 2026-10-25 (O4) |
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

## 4. Lo que estaba abierto, y en qué quedó

Los seis puntos se cerraron en la rama `feat/toolbox-v3-closure`, salvo lo que no depende de este
repositorio. Ninguno se dio por cerrado sin la medición al lado.

**O1 — La puerta no audita dependencias (severidad media). *Cerrado*.**
`npm run audit` ejecuta `npm audit --omit=dev --audit-level=high` y, después, informa el árbol de
desarrollo **sin bloquear**: un aviso de desarrollo no llega al artefacto publicado y convertirlo en
emergencia enseña a ignorar la alarma. Es un paso propio de `ci.yml`, justo después de `npm ci`, porque
es lo más barato de arreglar y lo que más tarda en descubrirse por otro lado. Medido al cerrarlo: **0
vulnerabilidades** en los dos árboles.

**O2 — Las acciones de GitHub estaban fijadas por etiqueta, no por SHA (severidad media). *Cerrado*.**
Las **doce** referencias de `ci.yml`, `deploy.yml` y `codeql.yml` —ocho acciones distintas, `checkout` aparece en los tres— van ahora por SHA completo, con la versión
mayor en un comentario al lado (`# v7`) para que Dependabot siga proponiendo subidas y para que un humano
lea qué versión es. Las etiquetas elegidas son las que los PRs #1 a #5 ya habían ejercitado en verde; la
única sin corrida propia era `cache@v6` (PR #5 cancelado), y su primera verificación es el push a
`feat/toolbox-v3-closure`. **Esto no se puede probar en local**: lo prueba el runner.

**O3 — `frame-ancestors` no protege nada hoy (severidad baja). *Cerrado en lo que el repositorio puede
cerrar*.**
GitHub Pages no permite cabeceras de respuesta, así que la CSP viaja en una metaetiqueta, y los
navegadores **ignoran** `frame-ancestors` cuando llega por `<meta>`. `/seguridad` tiene ahora un apartado,
en los dos idiomas, que dice exactamente eso: la directiva está en la política y no se aplica, hoy nada
impide que otro sitio muestre la página en un marco, y el día que el sitio se sirva desde un host con
cabeceras se emitirá como cabecera y valdrá. La cabecera real sigue esperando un host que la permita.

**O4 — Las alertas de Dependabot estaban desactivadas (severidad baja). *Cerrado*.**
El `403` era real y el diagnóstico era correcto —requiere administración del repositorio—, pero no era
cierto que no se pudiera hacer desde aquí: el token de la sesión tiene permiso de administración y la API
aceptó el cambio. Alertas de Dependabot **activadas** (`0` alertas abiertas en el momento de activarlas),
actualizaciones de seguridad automáticas activadas, y de paso `secret scanning` y `push protection`, que
estaban desactivados en un repositorio público. Es la única medición de este documento que no vive en el
repositorio: vive en los ajustes del proyecto, y por eso queda escrita con fecha.

**O5 — No hay análisis estático de código en CI (severidad baja). *Cerrado*.**
`.github/workflows/codeql.yml`: `javascript-typescript` con el conjunto `security-and-quality`, en push a
las ramas de trabajo, en cada PR y una vez por semana por si el análisis mejora sin que cambie una línea.
Los permisos son los mínimos (`contents: read`, `security-events: write`) y sus dos acciones también van
fijadas por SHA, porque una etiqueta movible en un flujo con permiso de escritura es el mismo riesgo de
O2 con más consecuencias.

**O6 — `typescript` 7 no es una actualización de rutina (decisión, no vulnerabilidad). *Cerrado como
decisión*.**
El PR #7 cerrado, con el motivo escrito en el PR: `@astrojs/check@0.9.11` declara
`typescript: ^5.0.0 || ^6.0.0`, así que `npm ci` no satisface el peer y el job cae en 8 segundos.
`typescript` queda en 6.0.3 exacto y se reintenta cuando el peer lo admita; entonces el aviso de
Dependabot vuelve solo.

## 5. Los siete PRs de Dependabot: qué se decidió y qué pasó

Los siete están **cerrados**. La decisión de cada uno se tomó antes, con su motivo, y después se ejecutó;
la columna de la derecha dice qué quedó en el repositorio en lugar del PR.

| PR | Qué proponía | Decisión | Qué se hizo |
|---|---|---|---|
| #1 | `upload-artifact` 4 → 7 | No fusionar: fijar por SHA cubre el mismo riesgo y no caduca | `upload-artifact` quedó en `v7` fijado por SHA en `ci.yml` |
| #2 | `checkout` 4 → 7 | Igual | `checkout` quedó en `v7` fijado por SHA en `ci.yml` y `deploy.yml` |
| #3 | `configure-pages` 5 → 6 | Igual | `configure-pages` quedó en `v6` fijado por SHA en `deploy.yml` |
| #4 | `upload-pages-artifact` 3 → 5 | Igual | Quedó en `v5` fijado por SHA en `deploy.yml` |
| #5 | `cache` 4 → 6 | Igual | Quedó en `v6` fijado por SHA en `ci.yml`; era el único sin corrida verde propia y lo verifica el push a la rama de cierre |
| #6 | 9 paquetes minor/patch | Cerrar: ya está aplicado | Las nueve versiones entraron con las ramas de la entrega, junto con la eliminación del `overrides` de `playwright-core` que hacía fallar su job (R2) |
| #7 | `typescript` 6 → 7 | Cerrar: el peer de `@astrojs/check` no admite 7 todavía | `typescript` sigue en 6.0.3 exacto. Ver O6 |

Cada cierre lleva su comentario en el PR, con el motivo y con qué ocupa su lugar. La razón de escribir
esto acá además de allá es la de todo el documento: el PR cerrado se pierde de vista, y el motivo no.
