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
             └─ PR4 feat/toolbox-v3-audio  visor de audio y TextGrid     (pendiente)
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

## Lo que no entra en ningún PR de la cadena

- Fijar las acciones de GitHub por SHA (O2): exige un push de verificación y no hay forma de probarlo
  en local. Se hace en una rama propia, mirando el CI.
- `npm audit` como paso de CI (O1), CodeQL (O5), alertas de Dependabot (O4, requieren permiso de
  administración), `frame-ancestors` real (O3, requiere un host con cabeceras) y TypeScript 7 (O6).
- Las herramientas de los segmentos 7 a 11 del prompt: siguen fuera del alcance autorizado.
