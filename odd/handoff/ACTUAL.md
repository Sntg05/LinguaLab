---
status: current
updated: 2026-11-10
---

# Traspaso vigente: rework v4

Documento para que **otra persona, otro agente u otro modelo** continúe el rework sin la conversación
original. Léelo entero antes de tocar nada. Se reescribe en cada entrega; los anteriores están en
`odd/handoff/archivo/`. No copia cifras de pruebas: están en `docs/metrics.json`.

## 1. Qué se está haciendo y dónde

- **Rama de trabajo:** `feat/rework-v4`, publicada en `origin`. Sale de `main` @ `baa8322`.
- **Regla del dueño:** se hace commit y push a esta rama después de cada unidad terminada, para que el
  equipo la trabaje desde otros equipos. **No se fusiona a `main` ni se abre PR de merge** hasta que el
  dueño diga que todo funciona. `main` es lo publicado en `https://lingualab-beta.vercel.app`.
- **Documento de la entrega (la fuente de verdad):** [`odd/tasks/rework-v4.md`](../tasks/rework-v4.md).
  Tiene el pedido textual del dueño (L1), las especificaciones S1–S11, las decisiones D1–D5, la tabla de
  tareas T0–T10 y la bitácora. **Toda decisión o avance nuevo se anota ahí, en `## Log`.**
- **Idioma:** se le habla al dueño en español. Comentarios de código y documentos del repositorio, en
  español neutro, explicando el porqué (como el código existente).

## 2. Antes de escribir una línea

```bash
git fetch && git checkout feat/rework-v4 && git pull --ff-only
nvm use 22                       # Node 22.x; el proyecto fija >=22.12
npm install
npx playwright install chromium  # una vez por máquina
npm run doctor                   # rama frente a origin, Chromium, puerto 4331, documentos ODD
npm run dev                      # http://localhost:4321
```

Rust solo hace falta para la tarea T5 (ver §6). En la máquina del dueño ya está instalado en
`~/.cargo/bin` (rustc 1.99.1, destino `wasm32-unknown-unknown`), **sin** tocar el `PATH`: se invoca como
`~/.cargo/bin/cargo`. En otra máquina: `rustup` con `--profile minimal --target wasm32-unknown-unknown`.

### Las puertas, y cuándo correrlas

| Comando | Cuándo |
|---|---|
| `npx vitest run <carpeta>` | Mientras se trabaja, sobre lo que se toca |
| `npm run verify:all` | Antes de cada commit de código: lint, formato, tipos, hexágono, pruebas y build verificado |
| `npm run test:e2e` | Antes de cada commit que toque páginas, estilos o motores (necesita el puerto 4331 libre) |
| `node --experimental-strip-types --no-warnings scripts/eval-g2p-es.mts` | Al tocar el transcriptor de español; descarga antes el diccionario (ver §5) |

## 3. Reglas que no se negocian (y que ya costaron errores)

1. **Rojo antes de verde.** Cada regla nueva empieza por una prueba que falla; después el código. Si los
   datos se escribieron antes que la prueba, se comprueba por **mutación** (romper el dato a propósito y ver
   que la prueba falla).
2. **Nunca `git checkout <archivo>` ni `git restore` para deshacer una mutación.** Borra todos los cambios
   sin commit de ese archivo: así se perdieron los textos de teoría de `tools.json` en esta entrega. Para
   una mutación: copia el archivo a `node_modules/.cache/`, muta, prueba y vuelve a copiar.
3. **Nada temporal en `/tmp`.** Se limpia entre sesiones y Node no resuelve los paquetes desde ahí. Lo
   temporal va en `node_modules/.cache/` (ignorado por git). Ojo: Node **no** ejecuta TypeScript dentro de
   `node_modules`; un script `.mts` de medición va en `scripts/`.
4. **Nada «porque sí».** Toda herramienta integrada declara `theory` y `references` en
   `src/data/tools.json`, y cada referencia de `src/data/references.json` se verifica **abriéndola**
   (DOI en `https://api.crossref.org/works/<doi>` o la página, comprobando que el título coincide) y se
   anota `verifiedOn`. `src/scripts/referencias/references.test.ts` falla si falta algo. No se cita de
   memoria.
5. **No inventar datos lingüísticos ni resultados.** Lo que un motor no sabe, lo dice (`skipped`,
   `⟨palabra⟩`, etiqueta «experimental»). Una transcripción o una medida inventada es peor que ninguna.
6. **Los datos del usuario no salen del navegador** (ADR 0002). Decisión D1 del dueño: todo corre en el
   navegador; nada de servidor propio. La CSP es `default-src 'self'`: **ningún CDN**; todo recurso se
   sirve desde el propio sitio.
7. **Sin atributos `style` en el marcado** (la CSP los bloquea y `verify-build` falla). Estilos en el
   `<style>` del componente o en `src/styles/`.
8. **Hexágono (ADR 0001):** `packages/core` no usa DOM ni importa adaptadores; solo
   `src/composition-root.ts` importa `@lingualab/adapters`. Lo comprueban `npm run deps:check` y
   `src/lib/architecture.test.ts`.
9. **Un recurso pesado servido desde `public/`** va en `public/<motor>/<versión>/`, con su versión en
   `src/config/engines.json`, su carpeta en `ENGINE_DIRS` (`src/config/engines.ts`) y su regla
   `immutable` en `vercel.json`. `src/config/engines.test.ts` exige las tres cosas y que los archivos no
   sean ejecutables.
10. **Commits:** Conventional Commits en español, encabezado de 100 caracteres como máximo y líneas del
    cuerpo también cortas (commitlint rechaza las largas). **Sin** líneas `Co-Authored-By` ni atribución
    de IA. Push con
    `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push` si el push normal
    rechaza cambios en `.github/workflows/`.
11. **Documentos:** `docs/STATUS.md`, `README.md` y este traspaso no copian cifras de pruebas
    (`src/lib/docs.test.ts` falla). Solo un documento de `odd/tasks/` puede tener `status: active`.
12. **Preguntar de a una decisión.** El dueño pidió que se le explique y se le pregunte; las decisiones
    abiertas son D2–D5 (§7). No se decide por él.

## 4. Lo que ya está hecho en la rama

| Commit | Qué |
|---|---|
| `52ec25c` | Abre `odd/tasks/rework-v4.md` con el diagnóstico medido |
| `bf93d89` | Modelo `Reference` y `checkScholarlySupport` en `packages/core/src/domain/reference.ts`; `src/data/references.json` con 22 obras verificadas; el lector del catálogo acepta `theory` y `references` |
| `1ae6e36` | **T1 cerrada.** Teoría y referencias de las diez herramientas integradas en `tools.json`; `src/components/TheoryNote.astro` cierra cada página de herramienta (es y en); `src/components/ReferenceList.astro`; apartado `#referencias` en `src/components/About.astro` |
| `03ec0d8` | **T2, primera mitad.** Motores propios en `packages/core/src/g2p/`: `spanish.ts` y `english.ts`, con sus pruebas, exportados desde `@lingualab/core`. **Todavía no están conectados a la página** |

Puerta completa y e2e en verde al cerrar T1. Los motores de `03ec0d8` pasan sus pruebas, tipos, lint y
reglas del hexágono; **no** se corrió la e2e completa después de ese commit (no tocan páginas).

## 5. Tarea en curso: T2, el transcriptor propio

**Por qué:** el dueño notó errores de transcripción. Se midió el motor anterior (`espeak-phonemizer`
0.2.0): no está desactualizado (eSpeak NG 1.52.0 es la última versión), pero es la entrada de un
sintetizador de voz. Fallos medidos: «allá» → `ajjˈa`, «pingüino» → `pˌiŋɡuˈino`, «México» → `mˈɛxiko`,
«bird» → `bˈɜːd`; acento delante de la vocal y no de la sílaba; símbolo `ᵻ`, que no es del AFI. El dueño
pidió: «si Espeak ng no es necesario entonces creemos un transcriptor propio» y, después, «déjalo en
español e inglés no más».

### Lo que hay

- **`transcribeSpanish(text, { variety, level })`** (`packages/core/src/g2p/spanish.ts`). Reglas según
  Hualde (2013): grafema a fonema, diptongos, silabeo por ataque máximo y acento. `variety`:
  `"latin-american"` (seseo, por defecto) o `"castilian"` (`θ`). `level`: `"phonemic"` (por defecto) o
  `"phonetic"` (`β ð ɣ` y nasales asimiladas, sobre la frase entera). Salida: acento delante de la sílaba,
  punto entre sílabas, monosílabos sin marca. Devuelve `{ ipa, skipped }`.
- **`transcribeEnglish(text, lookup)`** y **`arpabetToIpa(phones)`** (`english.ts`). `lookup` es una
  función `(palabra) => pronunciaciones ARPABET | undefined`: el núcleo **no** carga el diccionario.
  Inglés americano general (`ɝ`/`ɚ`, `ə` átona, sin marcas de duración), acento primario y secundario
  delante de la sílaba. Devuelve `{ ipa, skipped, variants }`; `variants` lista las palabras con varias
  pronunciaciones («read»). Lo que no está en el diccionario sale como `⟨palabra⟩`. Deriva solo el plural
  y el posesivo regulares.
- **Medición del español** (`scripts/eval-g2p-es.mts`): contra `es_MX.txt` de `open-dict-data/ipa-dict`
  (MIT), una muestra determinista de 5006 palabras, comparando solo segmentos (sin acento ni sílabas) y
  con la notación igualada (deslizadas, `s` sonora, aproximantes). **Motor propio: 96,6 %; eSpeak:
  76,9 %.** El resto son nasales asimiladas que el diccionario anota y el nivel fonémico no. Para
  repetirla:
  `curl -o node_modules/.cache/es_MX.txt https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/es_MX.txt`
  y después el comando de §2.

### Lo que falta de T2, en orden

1. **Empaquetar CMUdict.** Fuente: `https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict`
   (commit `74790861f652`, 2025-10-24; 135 166 líneas; licencia BSD de Carnegie Mellon, que obliga a
   conservar el aviso de copyright). Formato: `palabra FONOS…`, variantes como `palabra(2)`, comentarios
   tras `#`. Escribir `scripts/build-cmudict.mts` que lo descargue, compruebe su `sha256`, quite
   comentarios, agrupe variantes y escriba `public/cmudict/<versión>/en-us.tsv`
   (`palabra<TAB>pron1|pron2`) junto con `LICENSE` y un `README.md` con procedencia y hash. Como versión,
   la fecha del commit (`2025.10.24`). Registrar el motor según la regla 9 de §3 y anotarlo en
   `THIRD_PARTY_NOTICES.md`. El presupuesto de motores de `scripts/verify-build.mjs` (21 MB) baja cuando
   salga eSpeak (5,7 MB).
2. **Adaptador.** En `packages/adapters/src/phonemizer/`, un `createNativePhonemizer({ dictionaryUrl })`
   que implemente `PhonemizerPort` (`packages/core/src/ports/phonemizer.ts`): `spa` llama a
   `transcribeSpanish`; `eng` descarga el `.tsv` la primera vez (bajo demanda, nunca al cargar la página),
   arma un `Map` y llama a `transcribeEnglish`. Debe pasar la suite de contrato
   `runPhonemizerPortContract` (`packages/core/src/testing/contracts/phonemizer.ts`). `PhonemeSequence`
   está en `packages/core/src/domain/ipa.ts`: revisar su forma antes de mapear. Si el resultado necesita
   llevar `skipped` y `variants` hasta la interfaz, se amplía el puerto **y** su contrato y su fake.
3. **Conectar.** En `src/composition-root.ts`, reemplazar `createEspeakPhonemizer` por el nuevo. En
   `src/components/PhonemizerLab.astro` (atributos `data-phon-*`): selector de variedad y de nivel para el
   español, lista de palabras no encontradas y de variantes para el inglés, y textos nuevos en
   `src/i18n/messages/{es,en}.ts` (claves `phon.*`; `phon.limits` y `phon.sub` hoy hablan de eSpeak).
   Actualizar `e2e/phonemizer.spec.ts` (hoy espera `kˈasa`; pasará a `ˈka.sa`).
4. **Retirar eSpeak** cuando lo anterior esté en verde: dependencia `espeak-phonemizer`, sus archivos del
   adaptador, `public/espeak-phonemizer/`, `scripts/sync-espeak-data.mjs`, la entrada en `engines.json`,
   `ENGINE_DIRS`, `vercel.json`, `scripts/live-check.mjs`, el plugin `dropUnrequestedEspeakWasm` de
   `astro.config.mjs`, `wasm-unsafe-eval` **no** se quita de la CSP (lo usan Pyodide y praatfan), y las
   referencias: en `tools.json`, la herramienta `phonemizer` pasa a citar `hualde2013`, `ipa1999` y una
   referencia nueva y verificada de CMUdict; `espeakng2024` y `bernard2021` salen de `references.json` si
   nadie más las cita (la prueba avisa con `unused-reference`). El transcriptor de la portada y el de
   FonoLab (`src/scripts/fono/phonetics.ts`) deberían usar el motor nuevo para no tener tres
   transcriptores distintos.
5. **Medir el inglés** igual que el español, contra `en_US.txt` de ipa-dict, y anotar la cifra en el Log.
6. Actualizar `docs/STATUS.md`, la entrada P14 de `docs/PENDING.md` (queda resuelta al salir eSpeak) y la
   fila T2 del documento ODD.

## 6. Tareas siguientes (ver la tabla del documento ODD)

- **T4 Árboles.** Diagnóstico medido: de 14 tipos lingüísticos (`src/data/trees/types.ts`), solo `xbar` y
  `movement` tienen reglas propias (`src/scripts/trees/checks.ts`); los otros 12 comparten el analizador
  de corchetes. CCG, LFG, HPSG, gramática relacional y Reed–Kellogg no son árboles de corchetes. La ficha
  de X-barra dice «espéculo» y afirma algo falso sobre las proyecciones. Espera la decisión **D3**.
- **T5 Visor acústico al estilo de Praat.** El orquestador ya está partido en módulos en
  `src/scripts/audio/`. En la máquina del dueño hay **Praat 6.4.06**: se puede generar la referencia con
  `praat --run script.praat` y cerrar P17 y `docs/validation/acoustic.md`. Aquí es donde Rust a
  WebAssembly puede entrar, **solo si una medición muestra que TypeScript no alcanza**.
- **T6 Estadística cuantitativa.** Candidato verificado: webR 0.6.1 (R en WebAssembly, paquete de 38 MB,
  GPL, compatible con la GPL-3.0 del proyecto). Hay **R 4.3.3** local para contrastar. Espera **D4**.
- **T7 Análisis cualitativo**, **T8 Diseño** (espera **D5**, con maquetas), **T9 contrato único de
  herramienta**, **T10 cierre** con verificador independiente.

## 7. Decisiones del dueño

| | Estado |
|---|---|
| D1 Dónde corren los motores | **Resuelta:** navegador; Rust a WebAssembly solo donde se mida que hace falta |
| D2 Lenguas del transcriptor | **Resuelta:** solo español e inglés |
| D3 Formalismos de árbol sin reglas propias; estructuras de datos | Abierta |
| D4 Motor de estadística (webR o propio validado contra R) | Abierta |
| D5 Dirección de diseño | Abierta |

## 8. Asuntos abiertos fuera del código

- **Revisión de gentle-ai.** El repositorio tiene activo el desarrollo guiado por recibos: al terminar un
  turno con commits nuevos, un gancho pide correr `gentle-ai review start …` tal como lo entrega. Si
  devuelve una consulta de consentimiento (`consent_required`), **se le traslada completa al dueño y no se
  responde por él**. Hay una consulta sin responder sobre el cambio de las referencias (riesgo medio). El
  revisor falló antes porque la sesión de la CLI de `claude` estaba vencida.
- **Memoria Engram:** en esta máquina las escrituras fallaron (el modo automático no pudo revisarlas). El
  registro completo está en el repositorio, no en la memoria.
- **Pendientes anteriores** que siguen en `docs/HUMAN-EVIDENCE.md`: descartar en GitHub cinco alertas de
  CodeQL justificadas, proteger `main` también para administradores, subir el piso de Node para Astro
  7.4.2 (P23), etiquetas `v3.0.0` y `v3.1.0`.

## 9. Dónde está cada cosa

| Pregunta | Documento |
|---|---|
| Qué pidió el dueño, textual, y qué se decidió | [`odd/tasks/rework-v4.md`](../tasks/rework-v4.md) |
| En qué se puede confiar hoy | [`docs/STATUS.md`](../../docs/STATUS.md) |
| Cifras de la última medición | [`docs/metrics.json`](../../docs/metrics.json) (`npm run status:measure`) |
| Qué falta en el código | [`docs/PENDING.md`](../../docs/PENDING.md) |
| Qué solo puede cerrar una persona | [`docs/HUMAN-EVIDENCE.md`](../../docs/HUMAN-EVIDENCE.md) |
| Cómo se trabaja aquí | [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) |
| Por qué el sistema es así | [`docs/adr/`](../../docs/adr/) y [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
