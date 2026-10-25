# Cadena de PRs de la entrega v3

La rama `feat/toolbox-v3-security-languages` reúne cuatro unidades de trabajo que se revisan mejor por
separado. Cada una tiene su rama, su presupuesto de líneas y su forma de probarse a mano. La cadena va
de lo que no cambia el producto visible a lo que sí, para que un fallo en lo grande nunca tape un fallo
en lo chico.

Estrategia: `chain_strategy=stacked-to-main`. Cada PR apunta a la rama de su predecesor inmediato, no a
`main`, y el primero de la cadena apunta a `main`.

```
main
 └─ PR1 feat/toolbox-v3-security      documentación y dependencias      ~316 líneas
     └─ PR2 feat/toolbox-v3-navigation navegación y catálogo            ~378 líneas
         └─ PR3 feat/toolbox-v3-languages lenguas de ejemplo             ~390 líneas
             └─ PR4 feat/toolbox-v3-audio  visor de audio y TextGrid     ~745 líneas
                 └─ PR5 feat/toolbox-v3-closure cierre de pendientes     ~1232 líneas
```

---

## PR1 — Documentación que decía otra cosa, y dependencias que estaban en rojo

**Rama:** `feat/toolbox-v3-security` · **Base:** `main` · **Commits:** `d027462`, `08dbaeb`
**Empieza en:** `1ee15c6`. **Termina en:** `08dbaeb`.
**Depende de:** nada. **Lo sigue:** PR2.

**Qué entra.** La corrección de la deriva documental (`STATUS.md` y `PENDING.md` nombraban una rama ya
fusionada; el README no listaba tres páginas que existen; el lockfile declaraba otra licencia que
`package.json`), la actualización de las nueve dependencias del grupo minor/patch, la eliminación del
`overrides` de `playwright-core` que rompía los e2e, el cierre de los cinco avisos de `npm audit`, el
arreglo de etiquetado de los botones de zoom de ArborLab y `docs/SECURITY-REVIEW.md`.

**Fuera de alcance.** Fijar las acciones de GitHub por SHA (punto O2 del documento de seguridad), la
auditoría de dependencias en CI (O1) y CodeQL (O5). Están documentados con su próximo paso, no resueltos.

**Cómo probarlo a mano.**

```bash
npm install                       # el lockfile cambia: las versiones suben
npm run verify:all                # la puerta completa, sin e2e
env -u AI_AGENT -u PI_CODING_AGENT npm run test:e2e   # 69 pruebas; el `env -u` es por P16
npm audit                         # 0 vulnerabilidades
```

Lo visible en el navegador: los botones de zoom de `/arboles` ahora dicen «Alejar», «Acercar»,
«Ajustar» y «Tamaño real». Nada más cambia de aspecto en esta entrega.

**Riesgo de reversión.** Se revierte completo: son metadatos de dependencias y documentos.

---

## PR2 — La barra entra al catálogo y el catálogo se ordena por nivel de análisis

**Rama:** `feat/toolbox-v3-navigation` · **Base:** `feat/toolbox-v3-security` · **Commits:** `d34059b`
**Empieza en:** `08dbaeb`. **Termina en:** `d34059b`.
**Depende de:** PR1. **Lo sigue:** PR3.

**Qué entra.** La barra superior pasa de siete entradas —una por herramienta— a tres fijas: **Catálogo
de herramientas**, **Bibliografía** y **Acerca de**. El catálogo agrupa las herramientas por nivel de
análisis, con un índice que salta a cada nivel, y esconde las secciones que se quedan vacías al filtrar.
El orden vive en `ANALYSIS_LEVELS`, en el núcleo, y `ToolArea` se deriva de esa constante. El pie se
deriva de `NAV_ITEMS` en vez de repetir su propia lista. El catálogo enlaza por fin el fonemizador.

**Fuera de alcance.** Ninguna herramienta nueva. El segmento 6 llega en PR4 y aparecerá en el catálogo
sin tocar esta cadena.

**Cómo probarlo a mano.**

```bash
npm run dev     # http://localhost:4321
```

1. En la portada, la barra tiene tres entradas y los controles de idioma y tema. Ninguna herramienta
   suelta.
2. «Catálogo de herramientas» lleva a `/catalogo`: índice de niveles arriba, secciones de Fonética a
   Documentación, y cada ficha con su enlace.
3. Filtrá por «Fonética»: las secciones sin coincidencias desaparecen, encabezado incluido.
4. `/en/catalogo`: lo mismo en inglés.
5. Bajá al pie: la columna «Herramientas y recursos» lista las cinco herramientas y el catálogo.
6. Con teclado: tabular por la barra no salta nada, y el menú móvil sigue abriéndose con el botón.

**Riesgo de reversión.** Alto en lo visible y bajo en lo técnico: toca la navegación de todas las
páginas. Se revierte completo sin migración de datos.

---

## PR3 — Lenguas de ejemplo: portugués brasileño y wayuunaiki

**Rama:** `feat/toolbox-v3-languages` · **Base:** `feat/toolbox-v3-navigation` · **Commits:** `d1dc9f1`
y el cierre documental.
**Empieza en:** `d34059b`. **Termina en:** `d1dc9f1`.
**Depende de:** PR2. **Lo sigue:** PR4.

**Qué entra.** Dos tablas de demostración para «Ortografía a AFI», construidas desde bibliografía
citada: **portugués brasileño** (`reviewed`, con reglas de realización en la capa alofónica) y
**wayuunaiki** (`draft`, correspondencia alfabeto→AFI y advertencia de validación comunitaria). El ADR
0005 registra por qué esas dos lenguas, por qué una tabla y no oraciones, y cómo se cumple el principio
de no inventar datos. El catálogo gana las dos lenguas en sus fichas y en su filtro.

**Fuera de alcance.** Ejemplos en el fonemizador: sus dos voces siguen siendo español e inglés, porque
no hay voz de eSpeak verificada para wayuunaiki y el motor no debe prometer lenguas que nadie probó.
FonoLab y la estación textual conservan sus ejemplos actuales: el pedido hablaba de las herramientas que
ofrecen texto de ejemplo, y esas ya lo tienen.

**Cómo probarlo a mano.**

```bash
npm run dev     # /ortografia
```

1. Abrí el selector de tablas: aparecen cinco demos, en el orden español (dos) → inglés → portugués →
   wayuunaiki.
2. Cargá la de portugués y probá «chave» (`ʃavi`), «leite» (`leitʃi`), «não» (`nɐ̃w̃`), «mal» (`maw`).
3. Cargá la de wayuunaiki y probá «wayuunaiki» (`wajuːnaiki`), «sh» (`ʃ`), «j» (`h`), «üü» (`ɨː`).
4. Mirá las notas de la tabla wayuu: ahí está la advertencia y las fuentes. Y las cuatro plantillas
   indígenas siguen vacías: la demo no las llenó.
5. `/catalogo`: la ficha de ortografía declara las cuatro lenguas.

**Riesgo de reversión.** Bajo: son datos de demostración; nada persistido depende de ellos.

---

## PR4 — Segmento 6: visor de audio, espectrograma y TextGrid

**Rama:** `feat/toolbox-v3-audio` · **Base:** `feat/toolbox-v3-languages`.
**Depende de:** PR3. **Lo sigue:** nada; cierra la entrega.

**Commits:** `2c525f1` (la herramienta), `3e4218d` (la puerta de accesibilidad la cubre), y el
endurecimiento posterior: `8ac9d5b` (codec) y `2edf72c` (almacenamiento, topes y pruebas que faltaban).
Ese endurecimiento salió de una verificación independiente que encontró ocho defectos con reproducción,
entre ellos uno que dejaba el visor inservible hasta borrar datos desde las herramientas de desarrollo.

**Qué entra.** `/visualizador` y `/en/visualizador`: cargar un audio local, ver forma de onda y
espectrograma, anotar capas de intervalos (dividir, fusionar, mover fronteras, etiquetar), autoguardar
en IndexedDB, e importar y exportar TextGrid, con exportación CSV adicional. El codec de TextGrid y el
motor de edición viven en `packages/core` como TypeScript puro, con archivos de referencia y propiedad
de ida y vuelta; el decodificador de Web Audio, el almacenamiento, el dibujo y la reproducción viven en
`src/scripts/audio/`. **Sin dependencias nuevas:** se descartó `wavesurfer.js` porque con sus plugins
pesa más que el presupuesto entero de 60 KB.

El espectrograma es propio —FFT radix-2, ventana de Hann— y la página declara **experimental** lo que no
se pudo medir: que Praat abra el archivo exportado y que el dibujo coincida con el de Praat. Detalle y
criterio en **P17** de `docs/PENDING.md`.

**Fuera de alcance.** Probar contra Praat (necesita el programa, no el repositorio), tope de tamaño en
la importación de TextGrid (P17, tercer pendiente) y el bucle sobre un rango de selección arbitrario: el
control declara que reproduce el intervalo activo.

**Cómo probarlo a mano.**

```bash
npm run dev     # /visualizador
```

1. Cargá un WAV corto (o arrastralo). Se dibujan onda y espectrograma; nada sale del equipo.
2. Dividí un intervalo, escribí texto con el teclado AFI, fusioná dos intervalos, mové una frontera.
3. Exportá el TextGrid, recargá la página y volvé a importarlo: mismos tiempos y mismos textos.
4. Probá un archivo corrupto: tiene que decir qué falló, no quedarse en blanco.
5. Recorré la página con Tab: los botones de acción de la tabla anuncian la acción completa.
6. El aviso de privacidad y el de experimental se ven antes de cargar nada.

**Riesgo de reversión.** Medio: la herramienta es nueva y aislada, pero escribe en IndexedDB del usuario
(bajo sus propias claves) y analiza archivos que vienen de afuera. Retirarla no rompe ninguna otra página.

---

---

## PR5 — El cierre: los pendientes y los puntos abiertos de seguridad

**Rama:** `feat/toolbox-v3-closure` · **Base:** `feat/toolbox-v3-audio` (`4505ddf`)
**Depende de:** PR4. **Lo sigue:** nada; cierra la entrega.
**Commits:** los de la rama, `5c183ad`…`3ebb121` (19 commits).

**Qué entra.** Todo lo que `docs/PENDING.md` y `docs/SECURITY-REVIEW.md` tenían abierto y no necesitaba
a una persona:

- **P1** — el núcleo dejó de redactar: `OrthographyIssue` es una unión de **código y datos** y la frase se
  arma en la capa de presentación, con seis claves nuevas por idioma y una e2e que carga la misma tabla
  rota en las dos rutas y afirma que ninguna salida contiene texto del otro idioma.
- **P3** — la rama de cuota agotada, provocada interceptando `IDBObjectStore.prototype.put`.
- **P8** — `scripts/lint-baseline.mjs`: el reparto de los avisos del linter se mide, no se infiere.
- **P12** — la puerta falla ante un `incomplete` sin motivo textual; `/arboles` queda exceptuado por
  nombre y con la medición (0 `<li>` al cargar, 1 después de dibujar).
- **P13** — las cinco inexactitudes documentales, corregidas contra el archivo que las desmentía.
- **P16** — la puerta e2e arranca el preview con `--ignore-lock`, sin variables borradas.
- **P18** — `point-out-of-tier` en el codec de TextGrid, con su entrada en el contrato del puerto.
- **P19** — `src/scripts/audio/limits.ts`, con prueba en Node puro.
- **O1–O6** — auditoría de dependencias en CI, doce referencias de acciones fijadas por SHA, CodeQL,
  alertas de Dependabot y escaneo de secretos activados, `frame-ancestors` declarado como lo que es, y
  TypeScript 7 cerrado como decisión.

**Fuera de alcance.** P5 y P20 (interfaz nueva, piden decisión de producto), P9 (hablantes o fuentes),
P11 (medir 186 nodos desde píxeles: es un método nuevo, no un arreglo), P14 (recompilar el wasm cambia el
binario auditado) y P17 (necesita Praat). Fusionar y abrir los PRs: decisión de la dueña.

**Cómo probarlo a mano.**

```bash
npm ci
npx playwright install chromium
npm run verify:all                                  # 943 unitarias, 0 errores de tipos, build verificado
npm run test:e2e                                    # 88, incluidas 50 de accesibilidad
npm run audit                                       # 0 en producción y 0 en desarrollo
npm run lint:baseline                               # 42 heredados, 5 nuevos
```

1. `/en/ortografia`: cargá una tabla con un error y mirá que la oración esté **en inglés**, no solo la
   insignia.
2. `/arboles`: la lista de comprobaciones se llena al pulsar «Dibujar»; la puerta no la marca.
3. `/seguridad`: el apartado «Lo que esta política no puede hacer aquí» explica `frame-ancestors`.
4. En GitHub: los siete PRs de Dependabot cerrados con su motivo, y la pestaña de seguridad con
   Dependabot, escaneo de secretos y `push protection` activos.

**Riesgo de reversión.** Medio: toca el contrato de errores del núcleo (P1) y los flujos de CI. Se revierte
entero sin migración de datos. La rama se verificó en el runner: la primera corrida puso rojo el paso
hexagonal por una importación profunda de una prueba nueva, y esa corrida es la prueba de que la regla
funciona.

---

## Lo que no entra en ningún PR de la cadena

- Nada de seguridad: O1, O2, O4, O5 y O6 están resueltos en PR5, y O3 queda declarado donde se afirmaba
  lo contrario. La cabecera real de `frame-ancestors` sigue esperando un host que la permita, y eso no es
  código.
- Las herramientas de los segmentos 7 a 11 del prompt: siguen fuera del alcance autorizado.
