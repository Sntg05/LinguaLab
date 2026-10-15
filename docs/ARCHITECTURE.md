# Arquitectura

LinguaLab es un hexágono: un núcleo de dominio y casos de uso rodeado de adaptadores. La regla que
gobierna todo lo demás es una sola — **las dependencias apuntan hacia adentro** — y el repositorio no
la pide por favor, la comprueba en CI.

La decisión y su porqué están en [`docs/adr/0001-arquitectura-hexagonal.md`](adr/0001-arquitectura-hexagonal.md).

---

## El mapa

```
                       ┌──────────────────────────────────────────────┐
   ADAPTADOR PRIMARIO  │  src/**  ·  el sitio Astro                   │
   (lo que se maneja)  │  sólo importa @lingualab/core                │
                       └───────────────────┬──────────────────────────┘
                                           │
                       ┌───────────────────▼──────────────────────────┐
   COMPOSITION ROOT    │  src/composition-root.ts                     │
   (el único lugar     │  cablea adaptadores con casos de uso         │
    donde se conocen   │                                              │
    ambos mundos)      └───────────────────┬──────────────────────────┘
                                           │
   ┌───────────────────────────────────────┴───────────────────────────────────────┐
   │  packages/core  ·  TypeScript puro. Sin DOM, sin red, sin relojes.            │
   │                                                                               │
   │    ┌─────────────────────────────────────────────────────────────────────┐    │
   │    │  application/   casos de uso: la única puerta de entrada al dominio │    │
   │    └──────────────────────────────┬──────────────────────────────────────┘    │
   │                                   │                                            │
   │    ┌──────────────────────────────▼──────────────────────────────────────┐    │
   │    │  domain/   entidades y valores inmutables + el motor de reglas       │    │
   │    └──────────────────────────────┬──────────────────────────────────────┘    │
   │                                   │                                            │
   │    ┌──────────────────────────────▼──────────────────────────────────────┐    │
   │    │  ports/   interfaces de salida. El núcleo las declara y las ignora:  │    │
   │    │           quien las implementa vive fuera.                          │    │
   │    └─────────────────────────────────────────────────────────────────────┘    │
   └───────────────────────────────────────┬───────────────────────────────────────┘
                                           │
                       ┌───────────────────▼──────────────────────────┐
   ADAPTADORES         │  packages/adapters  ·  IndexedDB, Web Audio, │
   SECUNDARIOS         │  WebAssembly, workers. Implementan puertos.  │
                       │  No conocen la pantalla que los invoca.      │
                       └──────────────────────────────────────────────┘
```

La frontera importante es la de arriba: **el núcleo no sabe que existe un navegador**. Lo garantiza
el compilador, no un acuerdo: `packages/core/tsconfig.json` declara `"lib": ["ES2022"]` y
`"types": []`, así que dentro del núcleo `document`, `window` y `fetch` simplemente no existen. Si
alguien los usa, `npm run typecheck:packages` falla antes del merge.

---

## Las tres capas

### `domain/` — entidades y valores

Objetos inmutables, todos `readonly`, sin comportamiento que dependa del exterior. `Language`,
`OrthographyTable`, `G2PRule`, `AnnotationDocument`, `Tier`, `AcousticTrack`, `ExperimentSpec`,
`ToolDescriptor`.

Aquí también vive el valor `Result<T, E>`. Los flujos esperados que fallan —un archivo mal formado,
una lengua sin tabla, un WebAssembly que no cargó— **no lanzan excepciones**: devuelven `Result`. Una
excepción obliga a quien llama a recordar que existe; el tipo la obliga a manejarla.

### `application/` — casos de uso

Una función por caso, creada con sus dependencias explícitas y sin estado global:

```ts
const convertOrthographyToIpa = createConvertOrthographyToIpa({ tables: orthographyRepository });

const result = await convertOrthographyToIpa({ text: "chico", tableId: "es-demo" });
```

Sin singletons, sin service locator, sin `import` de un adaptador concreto. La función recibe lo que
necesita y devuelve lo que produce. Eso es lo que permite probar la interfaz sin cargar un
WebAssembly de veinte megas.

### `ports/` — interfaces de salida

Cada puerto declara qué necesita el núcleo del mundo exterior y, junto a la interfaz, la unión
discriminada de errores que puede devolver. Los errores son parte del contrato: `PhonemizerError`
tiene `engine-unavailable`, y quien lo lee sabe que ahí hay que mostrar un mensaje y ofrecer el fake,
no reintentar.

| Puerto | Qué abstrae | Adaptador previsto |
|---|---|---|
| `OrthographyRepositoryPort` | guardar y recuperar tablas | IndexedDB, con memoria como respaldo |
| `PhonemizerPort` | texto → AFI con un motor entrenado | eSpeak NG en WebAssembly (segmento 5) |
| `TextGridCodecPort` | leer y escribir Praat | implementación propia en TypeScript |
| `ElanCodecPort` | leer y escribir ELAN | Pyodide con `pympi-ling` (segmento 9) |
| `AudioDecoderPort` | archivo de audio → muestras | Web Audio `decodeAudioData` |
| `AcousticAnalysisPort` | F0, formantes, intensidad | praatfan en WebAssembly (segmento 8) |
| `AnnotationStoragePort` | autoguardado de anotaciones | IndexedDB |
| `LanguageCatalogPort` | catálogo de lenguas | JSON generado en la compilación |
| `ToolRegistryPort` | catálogo de herramientas | `tools.json` versionado |
| `IdGeneratorPort` | identificadores | `crypto.randomUUID` |
| `ClockPort` | la hora | `Date` |
| `ExperimentRunnerPort` | ejecutar un experimento | jsPsych (segmento 7) |

`IdGeneratorPort` y `ClockPort` parecen exagerados hasta que se prueba algo que genera un
identificador o mide un tiempo. Un test que depende del reloj real no es un test: es una moneda al
aire que falla los martes.

### `testing/` — fakes y contratos

Se publica en un subpath aparte (`@lingualab/core/testing`) para que el código de producción no pueda
depender de él por accidente.

- **Fakes en memoria** por cada puerto. No son adornos: son lo que permite probar la interfaz antes de
  que exista el WebAssembly.
- **Suites de contrato**: `runOrthographyRepositoryPortContract(createAdapter)` se ejecuta contra el
  fake y contra IndexedDB. Un adaptador nuevo no está terminado hasta que pasa la misma suite que ya
  pasaba el fake. Eso es lo que convierte «dos implementaciones del mismo puerto» en «dos
  implementaciones que de verdad hacen lo mismo».

---

## Las reglas de dependencia, y cómo se comprueban

`.dependency-cruiser.cjs` define las flechas prohibidas:

| Regla | Qué impide | Por qué importa |
|---|---|---|
| `core-is-hermetic` | `packages/core` → `packages/adapters` o `src` | Un núcleo que conoce un adaptador ya no es un núcleo |
| `adapters-do-not-know-the-ui` | `packages/adapters` → `src` | Un adaptador que conoce la pantalla está mal diseñado: el puerto no alcanzaba |
| `ui-to-adapters-only-from-composition-root` | `src/**` → `packages/adapters`, salvo el composition root | Si cada componente cablea sus dependencias, no hay dónde sustituirlas |
| `no-reaching-into-core-internals` | imports por ruta profunda a `packages/core/src/` | La superficie pública es el índice del paquete, y solo él |
| `no-circular` | ciclos de imports en tiempo de ejecución | Un ciclo significa que no hay dirección de dependencia que respetar |

`npm run deps:check` las aplica. Se ejecuta en CI como un paso más del job `verify`.

Las aristas **puramente de tipo** (`import type`, y el `import("...")` dentro de una anotación) quedan
fuera de la detección de ciclos. El compilador las borra: no existen en el JavaScript emitido, así que
no pueden producir un error de inicialización. Perseguirlas obligaría a reestructurar módulos de datos
que hoy son correctos, a cambio de nada.

---

## Por qué no hay React

El prompt de vibe-coding original describe `apps/web` con React y Vite. Aquí no se adoptó, y la razón
está medida: el sitio declara «sin framework de UI» como decisión deliberada, y
`scripts/verify-build.mjs` **falla** si una página supera 60 KB comprimidos. La más pesada hoy son
28.5 KB. Añadir un framework costaría entre 40 y 130 KB comprimidos por página y rompería una puerta
que ya existe, a cambio de nada: estas herramientas son cálculo puro más unos pocos nodos, y lo que
hay es TypeScript empaquetado por página.

Lo que sí se tomó del prompt es lo que tenía valor estructural: la separación hexagonal, las reglas
comprobadas en CI, los contratos reutilizables y la interfaz entendida como adaptador primario. El
razonamiento completo está en
[`docs/adr/0001-arquitectura-hexagonal.md`](adr/0001-arquitectura-hexagonal.md).

---

## Cómo añadir algo

**Una herramienta nueva en el núcleo:**

1. ¿Necesita algo de fuera? Entonces hay un puerto nuevo en `packages/core/src/ports`, con su unión
   de errores.
2. El caso de uso en `packages/core/src/application`, como función que recibe sus dependencias.
3. Un fake en `packages/core/src/testing/fakes` y una suite de contrato en
   `packages/core/src/testing/contracts`.
4. El adaptador en `packages/adapters`, y esa misma suite de contrato ejecutada contra él.
5. El cableado en `src/composition-root.ts`. En ningún otro archivo de `src/`.

**Un adaptador nuevo:** pasa la suite de contrato del puerto que implementa. Si no la pasa, o el
adaptador está mal o el contrato estaba mal escrito; las dos cosas hay que discutirlas antes de
seguir, no después.

Detalle del flujo de trabajo, ramas y commits: [`docs/CONTRIBUTING.md`](CONTRIBUTING.md).
