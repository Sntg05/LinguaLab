# Cierre de la entrega v3

Cerrar lo que quedó abierto en `docs/PENDING.md` (P1–P21) y `docs/SECURITY-REVIEW.md` (O1–O6) antes de
las decisiones finales del dueño del repositorio. Rama de trabajo: `feat/toolbox-v3-closure`, encima de
`feat/toolbox-v3-audio` / `feat/toolbox-v3-security-languages` (`4505ddf`).

`main` no se toca: fusionar, abrir los pull requests de la cadena y desplegar siguen siendo decisiones
de una persona. Este documento cierra el trabajo técnico que no necesita a nadie más.

## Specs

- **S1.** Pedido del dueño, textual: «escanea el proyecto y el repositorio de github, termina lo que
  haga falta, mantén claras las instrucciones de trabajo que llevamos haciendo durante todo el tiempo
  que llevamos con esta página, en el momento en el que termines me avisas para hacer cambios finales y
  poder darla por terminada».
- **S2 (P13).** Las cinco inexactitudes documentales de `docs/PENDING.md` P13 quedan corregidas y
  «ninguna introduce una afirmación nueva que no esté medida».
- **S3 (P16).** `npm run test:e2e` en verde desde una sesión de agente, «sin variables a mano», y `P7`
  sigue valiendo (puerto ocupado = rojo).
- **S4 (O1 + O5).** `npm audit --omit=dev --audit-level=high` como paso de CI más un script
  `npm run audit`; y `.github/workflows/codeql.yml` con `javascript-typescript` y
  `permissions: security-events: write`.
- **S5 (O3).** «declararlo en `/seguridad` con esa misma redacción», y que ni la página ni
  `docs/STATUS.md` insinúen que `frame-ancestors` protege hoy.
- **S6 (P18).** «un archivo con un punto fuera de su capa devuelve `point-out-of-tier` y el resto de las
  pruebas sigue verde», cubierto en `textgrid.test.ts` y en `failureFixtures` del contrato del puerto.
- **S7 (P19).** `MAX_AUDIO_BYTES`, el formateo de tamaño y la decisión «¿supera el tope?» viven en
  `src/scripts/audio/limits.ts` con `limits.test.ts` al lado (Node puro), cubriendo el borde para los dos
  límites, y `verify:all` sigue verde.
- **S8 (P3).** «Después del fallo de escritura, la tabla sigue siendo legible (la memoria tomó el relevo)
  y `persistence()` informa una degradación», provocando `QuotaExceededError` por intercepción en la
  prueba.
- **S9 (P12).** «La puerta falla si aparece un `incomplete` sin motivo textual, y el caso de `/arboles`
  está o arreglado o exceptuado **por nombre y con su razón**, nunca filtrado sin dejar rastro».
- **S10 (P1).** El núcleo devuelve código y datos en `OrthographyIssue`; el texto se arma en la capa de
  presentación con el mecanismo de i18n existente. Criterio: «Una prueba que valide la misma tabla rota
  en `/ortografia` y en `/en/ortografia` y afirme que ninguna de las dos salidas contiene texto del otro
  idioma —no basta con comprobar la insignia—. Y las 7 suites de contrato del núcleo siguen en verde».
- **S11 (P8).** «Los dos informes JSON existen y cada aviso queda atribuido a uno de los dos lados. Un
  aviso que aparece en los dos es heredado».
- **S12 (O2).** «fijar las siete por SHA completo, con la versión mayor en un comentario al lado para que
  Dependabot siga proponiendo subidas», verificado en CI (la rama nueva entra en los disparadores de
  `push`).
- **S13.** Los siete PRs de Dependabot quedan con la disposición que `docs/SECURITY-REVIEW.md` §5 ya
  decidió, y el documento refleja lo que se hizo.
- **S14.** `docs/STATUS.md`, `docs/PENDING.md`, `docs/SECURITY-REVIEW.md`, `README.md` y
  `odd/handoff/toolbox-v3.md` dicen lo mismo que el código; `verify:all` y la suite e2e completa en verde
  dentro de lo que este entorno permite.
- **Fuera de alcance, y por qué.** P5 (necesita una decisión de interfaz del dueño), P9 (necesita
  hablantes o fuentes citables), P14 (recompilar el wasm cambia el binario auditado), P17 (necesita
  Praat instalado), P20 (interfaz nueva de borrado por proyecto), P17/P11 en su parte de píxeles solo si
  el método se puede medir sin navegador real, O4 (activar alertas de Dependabot exige permiso de
  administración) y O6 (TypeScript 7 depende del peer de `@astrojs/check`). Fusionar a `main` y abrir los
  PRs de la cadena: decisión del dueño, no de esta sesión.

## Tasks

| ID | Qué | Spec | Ruta | Commit |
|---|---|---|---|---|
| T1 | Corregir las cinco inexactitudes de P13 | S2 | inline | `5c183ad` |
| T2 | La puerta e2e arranca el preview en primer plano (`--ignore-lock`) | S3 | inline | `4022c29` |
| T3 | `npm audit` en CI + `npm run audit` + CodeQL | S4 | inline | `862e9eb`, `61f6cc8` |
| T4 | `frame-ancestors` declarado donde se afirma | S5 | inline | `a569d5a` |
| T5 | `point-out-of-tier` en el codec de TextGrid | S6 | inline | `1e6c231` |
| T6 | `limits.ts` para los topes de audio | S7 | inline | `8575385` |
| T7 | Prueba de la rama de cuota agotada | S8 | inline | `c6c916a` |
| T8 | La puerta falla ante `incomplete` sin motivo | S9 | inline | `5bf6e77` |
| T9 | El núcleo devuelve código y datos; el texto se traduce | S10 | worker | `571ac0c` |
| T10 | Medir la línea base de lint y atribuir los avisos | S11 | inline | `2b90f06` |
| T11 | Fijar las acciones de GitHub por SHA | S12 | inline | `59d6689` |
| T12 | Cerrar los PRs de Dependabot con su motivo | S13 | inline | — (GitHub) |
| T13 | Sincronizar documentos y correr las puertas completas | S14 | inline | `docs:` |

## Log

- **L1.** Pedido del dueño, textual: «escanea el proyecto y el repositorio de github, termina lo que haga
  falta, mantén claras las instrucciones de trabajo que llevamos haciendo durante todo el tiempo que
  llevamos con esta página, en el momento en el que termines me avisas para hacer cambios finales y poder
  darla por terminada».
- **L2.** Estado de partida medido el 2026-10-25: rama `feat/toolbox-v3-audio` en `4505ddf`, árbol
  limpio, `until main`: 62 archivos; `npm run verify:all` en verde con Node 26.12.1 (el `.nvmrc` pide 22,
  que no está instalado en esta máquina); 925 pruebas unitarias en 53 archivos; 7 PRs de Dependabot
  abiertos; alertas de Dependabot desactivadas (`403`); sin CodeQL; última corrida de CI en `main` y en
  la rama larga, ambas en verde.
- **L3.** Decisión de rama: el trabajo de cierre no entra en la cadena documentada de cuatro PRs porque
  la desborda en líneas; va en `feat/toolbox-v3-closure`, que se agrega a los disparadores de `push` del
  CI para que O2 se verifique en el runner y no solo en local.
- **L4.** El `npm run build` emite tres avisos de externalización (`node:fs/promises`, `node:url`,
  `node:module`) y P15 solo nombra el primero. Se anota aquí y se corrige la redacción de P15 en T13.
- **L5.** La puerta e2e fallaba en esta máquina por dos motivos distintos que se confundían: los
  navegadores de Playwright no estaban instalados (`~/.cache/ms-playwright` no existía) y el proceso del
  servidor. El segundo se resolvió con `--ignore-lock`, la bandera que el propio CLI documenta para
  «servidor de una sola corrida, en primer plano», en vez de un `scripts/e2e.mjs` que borre variables. El
  primero se resolvió instalando Chromium, con autorización explícita de la dueña del repositorio.
- **L6.** Sondas y mutaciones que se corrieron antes de dar algo por cerrado: la lista de `/arboles` vacía
  y poblada medida con axe (0 `<li>` → `incomplete`; 1 `<li>` → sin hallazgo), la puerta de accesibilidad
  puesta roja a propósito quitando la excepción, y la degradación de cuota puesta roja quitando
  `degradeToMemory()`.
- **L7.** El repositorio de GitHub estaba con **siete** PRs de Dependabot abiertos, alertas de Dependabot
  desactivadas, `secret scanning` y `push protection` desactivados y sin CodeQL. Los siete PRs se
  cerraron con su motivo escrito, las alertas y las actualizaciones de seguridad **se activaron** —el
  token de la sesión tiene administración, así que el «no se puede desde este entorno» del documento de
  seguridad era falso— y el escaneo de secretos también. Eso no vive en el repositorio: vive en los
  ajustes del proyecto y queda escrito en `docs/SECURITY-REVIEW.md` con su fecha.
- **L8.** La primera corrida de CI sobre la rama puso **rojo el paso hexagonal**: la prueba nueva de
  los topes importaba `packages/core/src/data/textgrid.ts` por ruta profunda, y la regla
  `no-reaching-into-core-internals` la atajó. El arreglo es un commit propio (`3ebb121`) que importa el
  núcleo por su entrada pública. La corrida roja se deja en el historial a propósito: es la prueba de que
  la regla funciona y de que la rama se verifica en el runner, no solo en local.
- **L9.** T9 se delegó a `gentle-ai-worker` con las superficies de edición acotadas y volvió con rojo
  observado en el núcleo y en la e2e antes del arreglo, y el verde después. Lo revisé leyendo el diff: el
  núcleo no tiene un campo de prosa, el número de fila y las llaves de `{V}` se agregan en presentación, y
  el inglés es traducción real.
