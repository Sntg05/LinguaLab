# Estado de LinguaLab

Este documento responde a una sola pregunta: **¿en qué se puede confiar hoy, y en qué no?** Existe
porque una página que exagera lo que hace es la parte menos fiable de un proyecto, y porque quien llegue
después necesita saber qué se probó y qué se supuso sin tener que reconstruirlo del historial de
commits.

Rama: `feat/lingualab-hexagonal-monorepo`. El detalle de las decisiones está en [`docs/adr/`](adr/), y
el mapa del hexágono en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Cómo ejecutarlo

```bash
nvm use 22          # el proyecto fija Node 22; el shell de Pi no lo carga solo
npm install
npm run dev         # http://localhost:4321
```

| Comando | Qué comprueba |
|---|---|
| `npm run verify:all` | La puerta completa: lint, tipos, reglas hexagonales, tipos del sitio, pruebas y build verificado |
| `npm run test:e2e` | Playwright contra el sitio compilado: accesibilidad con axe y flujos reales |
| `npm run verify:build` | Verifica el resultado compilado: CSP, un solo `<h1>`, subrecursos, presupuesto de peso |

`npm run test:e2e` necesita `npx playwright install chromium` una vez.

---

## Herramientas que existen (v2.0.0)

Todas ellas corren por completo en el navegador y funcionan sin conexión después de la primera carga.

| Herramienta | Ruta | Estado | Qué se probó | Límites declarados |
|---|---|---|---|---|
| **FonoLab** — alfabeto AFI, corte sagital, audio, transcriptor grafema→AFI | `/fono` | **Estable** | Que los 108 símbolos del AFI resuelven a un diagrama dibujable; reproducción con audio con licencia y respaldo por voz del sistema | El transcriptor es una **aproximación didáctica**, no un transcriptor morfológico. El inglés no marca la tensión vocálica (`sing` da `/siŋ/`, no `/sɪŋ/`); el español asume distinción, sin seseo |
| **ArborLab** — 23 tipos de árbol, 4 formatos de entrada, exportación a SVG, PNG, JSON, Newick, CoNLL-U y Brat | `/arboles` | **Estable** | El dibujo y el *layout* de los 23 tipos, los 4 formatos de entrada y cada exportación | El modo «Frase» adivina las categorías con una lista cerrada: el dibujo es exacto, la etiquetación no. La exportación a CoNLL-U es un árbol sintácticamente válido, no un análisis lingüístico |
| **Estación textual** — frecuencia con dispersión, colocaciones (log-Dice y PMI), concordancias KWIC, estadísticas léxicas y legibilidad | `/tools` | **Estable** | El cálculo de cada medida y la tokenización, con pruebas unitarias | **No hay lematización**: no hay léxico, así que las mismas palabras flexionadas cuentan por separado |
| **Glosario bilingüe filtrable** | `/glosario` | **Estable** | El filtrado por faceta y el contenido del glosario | Es material de referencia, no una herramienta de análisis |
| **Bibliografía de recursos con licencia** | `/bibliografia` | **Estable** | Que cada ficha declara su licencia y su enlace de origen | — |
| **Verificación de salvaguardas** | `/seguridad` | **Estable** | Lee el DOM real y comprueba en vivo las salvaguardas; el resultado compilado se verifica en cada build | Comprueba lo que el propio sitio declara; no es una auditoría externa |
| **Acerca de** | `/acerca` | **Estable** | — | — |
| **Catálogo de herramientas** — tarjetas filtrables por área, idioma y tipo de integración, con el estado real de cada una | `/catalogo` | **Estable** | El filtrado, que una herramienta planeada no se vea como una que existe, y su accesibilidad con axe | Ninguna herramienta lleva enlace: el prompt exige verificar cada URL publicada y no se ha verificado ninguna |

## Herramienta A: ortografía → IPA (segmento 4 del prompt)

| | |
|---|---|
| **Estado** | **Estable**, con los límites de abajo declarados |
| **Qué se probó** | El motor de reglas (NFC, coincidencia más larga, contexto, prioridad, capas fonémica y alofónica, rastro por carácter, cobertura) y el validador con seis códigos de hallazgo, todo con pruebas unitarias. Las **ocho pruebas de español que pide el prompt**, incluido el par `perro`/`pero` con sus puntos de código explícitos. El repositorio sobre IndexedDB pasando la suite de contrato contra IndexedDB **y** contra el respaldo en memoria. Y ocho pruebas e2e que recorren el flujo completo: cargar la demo, probar una palabra, ver qué regla ganó, añadir una regla, exportar, recargar y volver a importar |
| **Supuestos asumidos** | El formato JSON de las tablas vive en el núcleo y no en cada adaptador, para que un archivo exportado por uno se pueda importar en otro. `remove` es idempotente: borrar algo que ya no está no es un fallo. El idioma demo es español latinoamericano con seseo, con dos variantes que difieren solo en `ll`. El CSV es **deliberadamente incompleto** (una capa, seis columnas) y el JSON es el formato completo |
| **Límites declarados** | Sin editor de clases `{V}`: se escriben en el JSON y el editor las preserva, pero no hay interfaz para crearlas. `render.ts` no tiene prueba unitaria —Vitest corre en entorno `node` y su configuración quedaba fuera de las superficies de esa tarea—; lo cubren las e2e. La rama de cuota agotada del adaptador no se puede provocar de forma determinista con `fake-indexeddb`. Y las frases de validación del núcleo son solo en español: en `/en/ortografia` la insignia está localizada y la oración no (tarea T16, declarada). Tampoco tienen prueba unitaria `src/scripts/ortografia/index.ts` (835 líneas) ni `src/scripts/catalogo/index.ts`: solo la tienen los módulos puros, y a los dos orquestadores los cubren las e2e. Y hay **seis avisos de complejidad cognitiva** en el código nuevo, ninguno bloqueante. **Todo esto, y el resto del trabajo pendiente, está traspasado en `docs/PENDING.md`** —cada entrada con síntoma, evidencia medida, por qué no se hizo, próximo paso exacto y criterio de aceptación— |
| **Cómo ejecutarla** | `npm run dev` y abrir `/ortografia` |

**Plantillas de lenguas indígenas.** Inga (`inb`), wayuunaiki (`guc`), nasa yuwe (`pbb`) y arhuaco
(`arh`) existen como plantillas **vacías**, con `status: "draft"`. Los códigos se verificaron en
`iso639-3.sil.org`, que coincide con Glottolog. Una prueba exige que sigan vacías y que conserven el
aviso:

> Esta tabla debe construirse y validarse con hablantes y fuentes lingüísticas de la comunidad

No se inventó ni un solo par grafema→AFI, y no es una limitación temporal: es una regla del proyecto.

## Segmentos 5 a 11 del prompt: no disponibles

| Segmento | Herramienta | Estado |
|---|---|---|
| 5 | Fonemizador es/en con eSpeak NG en WebAssembly | **No disponible** — fuera del alcance autorizado |
| 6 | Visor de audio, espectrograma y TextGrid | **No disponible** — fuera del alcance autorizado |
| 7 | Experimentos con jsPsych | **No disponible** — fuera del alcance autorizado |
| 8 | Análisis acústico (praatfan) — **experimental** por diseño | **No disponible** — fuera del alcance autorizado |
| 9 | ELAN ↔ TextGrid con Pyodide y pympi | **No disponible** — fuera del alcance autorizado |
| 10 | Mapa de lenguas indígenas de Colombia | **No disponible** — fuera del alcance autorizado |
| 11 | Catálogo de enlaces externos y puerto de reconocimiento de fonos | **No disponible** — fuera del alcance autorizado |

El usuario autorizó los segmentos **1 a 4**. Lo que sí existe de esos segmentos futuros son sus **puertos
y sus fakes** en el núcleo —doce puertos con su unión de errores, y un fake en memoria para cada uno—, que es lo
que permite añadirlos después sin tocar el dominio. **No hay stubs vacíos**: `application/index.ts`
declara en un comentario qué casos de uso pertenecen a los segmentos 6 a 9 en vez de exportar funciones
que no hacen nada.

## Desviaciones respecto al prompt, y por qué

| El prompt pedía | Qué se hizo | Motivo |
|---|---|---|
| `pnpm` workspaces | npm workspaces | `pnpm` no estaba instalado y `corepack` ya no viene con Node 25; el usuario pidió no tocar el entorno global. Misma estructura, sin dependencias fuera del repositorio. ADR 0003 |
| `apps/web` con React + Vite | El sitio Astro existente como adaptador primario | El sitio declara «sin framework de UI» y la verificación **falla** si una página supera 60 KB comprimidos. Un framework rompería una puerta que ya existe, a cambio de nada. ADR 0001 |
| CLI de dependency-cruiser | Su API programática desde `scripts/deps-check.mjs` | El CLI aborta en Node 25 por su matriz de soporte. Mismo motor, mismo archivo de reglas |
| Biome formateando todo el repositorio | Adopción gradual: el linter cubre todo, el formateador no toca el árbol heredado | Reformatear 40 archivos habría escondido los cambios que importan. ADR 0003 |
| release-please para versionar | Etiqueta a mano mientras el sitio se publique como unidad | Introducir automatización de releases antes de tener algo que liberar añade un flujo que nadie usa |

## Verificación, en números

| Comprobación | Resultado |
|---|---|
| Pruebas unitarias | **744 en 40 archivos** |
| Accesibilidad (axe, WCAG 2.2 AA) | **Sin violaciones** en las **21 páginas públicas** —las 20 rutas y la 404— en español y en inglés. Ampliar la puerta a todas encontró **una violación real más** que nadie había mirado: la 404 usaba un token de LÍNEA (`--line-strong`) como color de texto, que da 2.0:1 en claro y 2.4:1 en oscuro, donde se exigen 3:1 para texto grande. Corregido a `--ink-faint`, **medido en un navegador real**: 5.2:1 en claro y 5.4:1 en oscuro. La puerta recorre ahora **cada página en los dos temas** —42 pruebas de accesibilidad sobre `dist/`, dentro de una suite de 56— porque un contraste aprobado en una paleta no dice nada de la otra. Y la guarda quedó estructural: `reuseExistingServer` pasó a `false`, porque con `true` un `astro dev` vivo en el puerto hacía que la puerta probara el **servidor de desarrollo**, sin CSP y compilando a demanda, y casi toda la suite se caía por tiempo de espera. Un verde que no significa lo que dice no lo investiga nadie. Ahora también afirma sobre los resultados `incomplete` de axe, y ahí declaró un **punto ciego**: en los nodos que axe no puede medir —texto sobre SVG, botones de un solo carácter— la puerta no sabe nada del contraste y no lo finge. Son **186 nodos** en las 21 páginas y los dos temas —`inicio` 9 por página y tema, `FonoLab` 15, `salvaguardas` 16, `acerca` 4, `arboles` 2, `no-existe` 1—, y quedan como **P11** y **P12** en `docs/PENDING.md`: P11 con el aviso de que medirlos por estilos computados da resultados falsos, y P12 con el agujero que sigue abierto, los `incomplete` sin motivo textual, entre ellos uno de impacto crítico en `/arboles` |
| Pruebas de extremo a extremo | **56**, sobre el sitio compilado: 42 de accesibilidad (21 páginas × 2 temas) y 14 de flujo |
| Reglas de dependencia hexagonales | 162 módulos y 365 dependencias, **0 violaciones** |
| Tipos | `astro check` y los dos paquetes del workspace, **0 errores** |
| Linter | 0 errores. **42 avisos**: **27 de complejidad cognitiva** —6 en código nuevo, uno de ellos introducido por la afirmación sobre `incomplete`, y 21 heredados— y **15 de otras reglas**. De esos 15, **4 provienen de la regla nueva de `biome.json`**, que no existía en `main`, así que no son heredados en sentido estricto |
| Página más pesada | 28.5 KB comprimidos, sobre un presupuesto de 60 KB |
| Vulnerabilidades de producción | 0 (`npm audit --omit=dev`) |

**La puerta de accesibilidad ya se ganó su lugar:** encontró un `aria-pressed` puesto sobre los enlaces
del selector de idioma, que ARIA no permite fuera de los roles de botón, en el sitio que ya estaba en
producción. Se corrigió y la prueba lo confirma.
