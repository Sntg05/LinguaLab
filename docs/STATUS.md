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

## Herramienta A: ortografía → IPA (segmento 4 del prompt)

| | |
|---|---|
| **Estado** | **En curso.** El núcleo y el adaptador están terminados y probados; la interfaz está en construcción |
| **Qué está listo y probado** | `packages/core`: el motor de reglas (NFC, coincidencia más larga, contexto, prioridad, capas fonémica y alofónica, rastro por carácter, cobertura), el validador con seis códigos de hallazgo, los casos de uso y las tablas demo es/en. Las ocho pruebas de español que pide el prompt pasan. `packages/adapters`: el repositorio sobre IndexedDB pasando la suite de contrato contra IndexedDB **y** contra el respaldo en memoria |
| **Supuestos asumidos** | El formato JSON de las tablas vive en el núcleo y no en cada adaptador, para que un archivo exportado por uno se pueda importar en otro. `remove` es idempotente: borrar algo que ya no está no es un fallo. El idioma demo es español latinoamericano con seseo, con dos variantes que difieren solo en `ll` (yeísmo o distinción) |
| **Pendiente** | La página del editor, el modo «explicar» en pantalla, la lista de cobertura visible, importar y exportar JSON y CSV, y compartir por URL. La rama de cuota agotada del adaptador no tiene prueba automática: `fake-indexeddb` no puede provocar `QuotaExceededError` de forma determinista |
| **Cómo ejecutarla** | `npm run dev` y, cuando la página exista, `/ortografia` |

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
y sus fakes** en el núcleo —trece puertos con su unión de errores, doce con fake en memoria—, que es lo
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
| Pruebas unitarias | **690 en 34 archivos** |
| Accesibilidad (axe, WCAG 2.2 AA) | **Sin violaciones** en las páginas de inicio, en español y en inglés |
| Reglas de dependencia hexagonales | 143 módulos y 324 dependencias, **0 violaciones** |
| Tipos | `astro check` y los dos paquetes del workspace, **0 errores** |
| Linter | 0 errores (36 avisos declarados en el código heredado) |
| Página más pesada | 28.5 KB comprimidos, sobre un presupuesto de 60 KB |
| Vulnerabilidades de producción | 0 (`npm audit --omit=dev`) |

**La puerta de accesibilidad ya se ganó su lugar:** encontró un `aria-pressed` puesto sobre los enlaces
del selector de idioma, que ARIA no permite fuera de los roles de botón, en el sitio que ya estaba en
producción. Se corrigió y la prueba lo confirma.
