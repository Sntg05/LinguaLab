# LinguaLab — Prompt de vibe-coding por segmentos

Caja de herramientas web y open source para estudiantes de lingüística y lingüística computacional.
Foco: lenguas indígenas de Colombia, español e inglés.

## Cómo usar este archivo

**Opción A (recomendada): por segmentos.** Pega el *Segmento 0* una sola vez como contexto permanente del agente. Después pega un segmento a la vez, en orden. Cada segmento termina con criterios de "hecho" y los commits esperados. Revisa y haz merge del PR de cada segmento antes de pasar al siguiente.

**Opción B: one-shot.** Pega el *Segmento 0*, luego el *Segmento 12 (Prompt maestro one-shot)*, y por último los segmentos 1 a 11 como anexo. El agente trabajará en el orden indicado, abriendo un PR por segmento.

Convenciones del archivo:
- Los bloques entre `PROMPT` y `FIN PROMPT` son lo que se pega al agente.
- El código y los identificadores van en inglés. La interfaz, la documentación y los commits de cara al usuario van en español.
- Donde dice **[VERIFICAR]**, el agente debe comprobar el dato real (API, versión, comportamiento) antes de usarlo. Yo no pude ejecutar esas librerías.

Mapa de segmentos:

| # | Segmento | Tipo |
|---|----------|------|
| 0 | Contexto global y reglas del agente | Permanente |
| 1 | Repositorio, tooling, CI/CD y versionado | Base |
| 2 | Núcleo hexagonal: dominio, casos de uso y puertos | Base |
| 3 | Shell web, composition root, i18n y catálogo | Base |
| 4 | Herramienta A: ortografía → IPA por tablas | Imprescindible |
| 5 | Herramienta B: fonemizador es/en (eSpeak NG WASM) | Imprescindible |
| 6 | Herramienta C: visor de audio, espectrograma y TextGrid | Imprescindible |
| 7 | Herramienta D: experimentos con jsPsych | Imprescindible |
| 8 | Herramienta E: análisis acústico (praatfan WASM) | Experimental |
| 9 | Herramienta F: ELAN ↔ TextGrid con Pyodide + pympi | Experimental |
| 10 | Herramienta G: mapa de lenguas indígenas de Colombia | Opcional |
| 11 | Catálogo de enlaces y fase 2 (Allosaurus) | Opcional |
| 12 | Prompt maestro one-shot | Alternativa |

---

## Segmento 0 — Contexto global y reglas del agente (pegar una vez)

```
PROMPT
Eres un ingeniero de software senior con criterio lingüístico. Vas a construir
"LinguaLab", una aplicación web open source que reúne herramientas pequeñas y
útiles para estudiantes de lingüística y lingüística computacional de la
Universidad Nacional de Colombia y de cualquier persona interesada.

AUDIENCIA Y LENGUAS
- Estudiantes de pregrado, muchos sin experiencia en programación.
- Lenguas de trabajo: lenguas indígenas de Colombia (por ejemplo inga,
  wayuunaiki, nasa yuwe, arhuaco), español e inglés.
- Casi no existen modelos entrenados para las lenguas indígenas. Por eso
  priorizamos herramientas que no dependan del idioma o donde la persona
  aporta los datos y las reglas.

PRINCIPIOS NO NEGOCIABLES
1. Privacidad y soberanía de datos: el audio, los textos y las anotaciones se
   procesan en el navegador. Nada se sube a ningún servidor. No agregues
   analítica ni telemetría. Muestra un aviso claro de esto en la interfaz.
2. No inventes datos lingüísticos. Para lenguas indígenas, entrega plantillas
   vacías y mensajes que pidan verificar con hablantes y fuentes. Solo el
   español y el inglés llevan ejemplos de demostración.
3. Honestidad técnica: toda función poco probada se marca como EXPERIMENTAL en
   la interfaz y en la documentación, con un aviso visible.
4. Sin backend por defecto. El sitio debe funcionar como estático en GitHub
   Pages. No uses SharedArrayBuffer ni hilos de WebAssembly (Pages no permite
   las cabeceras COOP/COEP).
5. Accesibilidad: WCAG 2.2 AA, navegación por teclado, contraste suficiente,
   etiquetas en todos los controles, modo claro y oscuro.
6. Interfaz en español por defecto, con inglés como segundo idioma.

ARQUITECTURA (HEXAGONAL / PUERTOS Y ADAPTADORES)
- El dominio y los casos de uso viven en TypeScript puro, sin DOM, sin
  window, sin fetch, sin librerías de UI.
- Las dependencias apuntan siempre hacia adentro:
  adaptadores → aplicación → dominio. Nunca al revés.
- Puertos de salida (driven) = interfaces definidas en el núcleo.
  Adaptadores secundarios = implementaciones con librerías externas
  (WASM, wavesurfer, jsPsych, Pyodide, almacenamiento).
- Adaptador primario (driving) = la UI web, que solo invoca casos de uso.
- Un único composition root (apps/web/src/composition-root.ts) cablea
  adaptadores con casos de uso. No uses singletons globales ni service
  locators.
- Cada puerto tiene una suite de pruebas de contrato reutilizable que se
  ejecuta contra todos sus adaptadores, incluido un fake en memoria.
- Las reglas de dependencia se verifican automáticamente en CI con
  dependency-cruiser. Si una regla se rompe, el CI falla.

CALIDAD
- TypeScript en modo estricto. Sin `any` salvo justificación comentada.
- Pruebas: Vitest para dominio y adaptadores, Playwright para flujos clave.
- Funciones pequeñas, nombres descriptivos, errores tipados (Result o
  excepciones de dominio), sin comentarios que repitan el código.
- Cada decisión de arquitectura relevante se registra como ADR en docs/adr/.

VERSIONADO Y COLABORACIÓN (aplícalo desde el primer commit)
- Rama principal `main` protegida. Todo cambio entra por Pull Request.
- Ramas cortas con nombre `tipo/alcance-descripcion`, por ejemplo
  `feat/g2p-table-engine`. Un PR por segmento o sub-funcionalidad.
- Commits con Conventional Commits en español o inglés consistente:
  feat, fix, docs, test, refactor, perf, build, ci, chore.
  Ejemplo: `feat(g2p): agrega motor de reglas con contexto`.
- Merge por "squash" con el título del PR como mensaje convencional.
- Versionado semántico automatizado con release-please (modo monorepo),
  CHANGELOG generado y etiquetas de versión.
- Versiones exactas en package.json y lockfile commiteado. No uses rangos
  ni "latest". Elige versiones publicadas hace al menos 14 días.
  Verifica la versión real antes de fijarla [VERIFICAR].

FORMA DE TRABAJAR
- Trabaja en rebanadas verticales: cada segmento deja algo que funciona de
  punta a punta, con pruebas, documentación y un PR.
- No hagas preguntas salvo que estés bloqueado. Si falta un dato, toma la
  decisión más razonable, regístrala en un ADR y sigue.
- Al terminar cada segmento: ejecuta lint, typecheck, pruebas y build; corrige
  hasta que pasen; resume en cinco líneas qué hiciste, qué quedó pendiente y
  qué supuestos tomaste.
- Cuando algo marcado [VERIFICAR] no funcione como esperabas, no lo
  simules. Implementa el adaptador con el puerto, deja un fake que
  funcione, marca la herramienta como no disponible y documenta el motivo.
FIN PROMPT
```

---

## Segmento 1 — Repositorio, tooling, CI/CD y versionado

```
PROMPT
OBJETIVO: crear el esqueleto del repositorio `lingualab` listo para colaborar.

ESTRUCTURA (monorepo con pnpm workspaces)
lingualab/
├─ apps/
│  └─ web/                    # adaptador primario (UI) + composition root
├─ packages/
│  ├─ core/                   # dominio + casos de uso + puertos (TS puro)
│  └─ adapters/               # adaptadores secundarios (un subdirectorio por puerto)
├─ docs/
│  ├─ adr/                    # decisiones de arquitectura
│  └─ ARCHITECTURE.md
├─ .github/
│  ├─ workflows/              # ci.yml, deploy.yml, release-please.yml
│  ├─ ISSUE_TEMPLATE/         # formularios: bug, herramienta, lengua
│  ├─ PULL_REQUEST_TEMPLATE.md
│  ├─ CODEOWNERS
│  └─ dependabot.yml
├─ e2e/                       # Playwright
└─ (raíz) README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE,
   THIRD_PARTY_NOTICES.md, .editorconfig, .nvmrc, biome.json,
   .dependency-cruiser.cjs, commitlint.config.cjs, tsconfig.base.json

TOOLING
- pnpm, Node LTS fijado en .nvmrc, TypeScript estricto.
- Vite para apps/web; Vitest para pruebas; Playwright para e2e.
- Biome para lint y formato. dependency-cruiser para reglas hexagonales:
  * core no puede importar de adapters ni de apps.
  * adapters puede importar de core, nunca de apps.
  * apps/web puede importar de core y de adapters solo en
    composition-root.ts; el resto de la UI solo importa de core.
- Husky + lint-staged + commitlint (Conventional Commits).
- Scripts raíz: dev, build, lint, typecheck, test, test:e2e, deps:check.

CI (GitHub Actions)
- ci.yml en cada PR: instalar con lockfile congelado, lint, typecheck,
  deps:check, test, build. Cachea pnpm.
- deploy.yml: en push a main, publicar apps/web/dist en GitHub Pages
  (configura `base` de Vite para el nombre del repositorio).
- release-please.yml: modo monorepo con manifest; genera PR de release,
  CHANGELOG y tags.
- Fija las acciones por versión exacta o SHA. Permisos mínimos por job.

REPOSITORIO
- LICENSE: deja un marcador claro en el README indicando que la licencia
  final se decide después; no elijas una por tu cuenta.
- THIRD_PARTY_NOTICES.md: tabla vacía con columnas
  (paquete, versión, licencia, uso). Se llenará con cada herramienta.
- README en español: qué es, aviso de privacidad, cómo correrlo, cómo
  contribuir, estado de cada herramienta (Estable / Experimental).
- CONTRIBUTING: flujo de ramas, Conventional Commits, cómo agregar una
  lengua o una herramienta, cómo escribir un ADR.
- Plantillas de issues como formularios YAML. Etiquetas sugeridas:
  area:fonetica, area:fonologia, area:morfosintaxis, area:semantica,
  area:pragmatica, area:psicolinguistica, area:documentacion,
  area:tipologia, type:bug, type:feature, status:experimental,
  good first issue, lengua:indigena.
- Entrega además un script `scripts/bootstrap-github.sh` (opcional, con `gh`)
  que cree etiquetas, hitos (uno por segmento) y un issue por herramienta.
- Protección de rama: documenta en CONTRIBUTING la configuración
  recomendada (PR obligatorio, CI verde, historial lineal). No intentes
  aplicarla por API.

ADRs INICIALES
- 0001 Arquitectura hexagonal y reglas de dependencia.
- 0002 Sitio estático, privacidad local y sin SharedArrayBuffer.
- 0003 Convenciones de versionado y releases.

HECHO CUANDO
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  pasan en limpio, con paquetes vacíos que compilan.
- `pnpm deps:check` falla si introduzco a propósito un import prohibido
  (comprueba y revierte).
- Los workflows están validados sintácticamente.

COMMITS ESPERADOS
chore: inicializa monorepo con pnpm y typescript
build: agrega biome, vitest y dependency-cruiser
ci: agrega workflows de ci, deploy y release-please
docs: agrega README, CONTRIBUTING y ADRs iniciales
FIN PROMPT
```

---

## Segmento 2 — Núcleo hexagonal: dominio, casos de uso y puertos

```
PROMPT
OBJETIVO: implementar packages/core en TypeScript puro (sin DOM ni red).

DOMINIO (entidades y valores inmutables)
- Language { id (ISO 639-3 o Glottocode), name, kind: 'indigenous' | 'national' | 'other' }
- OrthographyTable { languageId, name, version, classes, rules[], notes, status: 'draft' | 'reviewed' }
- G2PRule { grapheme, ipa, before?, after?, priority?, note? }
- IpaString, PhonemeSequence (tokens separados; no asumas un carácter = un fonema)
- Interval { start, end, text }, Tier { name, kind: 'interval' | 'point', items }
- AnnotationDocument { tiers[], xmin, xmax }
- AcousticTrack { kind: 'f0' | 'formant' | 'intensity', times[], values[] }
- ExperimentSpec { id, kind, items[], parameters }
- ToolDescriptor { id, area, integration: 'embedded' | 'external-link' | 'needs-backend', status: 'stable' | 'experimental' | 'planned', languages[], url?, notes }

PUERTOS DE SALIDA (interfaces en packages/core/src/ports)
- PhonemizerPort: phonemize(text, languageCode): Promise<Result<PhonemeSequence, PhonemizerError>>
- OrthographyRepositoryPort: list(), get(id), save(table), remove(id), exportJson(id), importJson(text)
- TextGridCodecPort: parse(bytes: Uint8Array): Result<AnnotationDocument>, serialize(doc): string
- ElanCodecPort: parse(bytes) / serialize(doc) (para el segmento 9)
- AudioDecoderPort: decode(file): Promise<DecodedAudio { sampleRate, channels, samples: Float32Array }>
- AcousticAnalysisPort: pitch(audio, params), formants(audio, params), intensity(audio, params)
- AnnotationStoragePort: load(projectId), save(projectId, doc)
- LanguageCatalogPort: list(), byId(id)
- ToolRegistryPort: list(filter)
- IdGeneratorPort y ClockPort (para pruebas deterministas)

CASOS DE USO (application services; una clase o función por caso)
- ConvertOrthographyToIpa({ text, tableId }) → { ipa, trace[] }  (trace = reglas aplicadas, para modo "explicar")
- ValidateOrthographyTable(table) → issues[] (reglas duplicadas, ciclos, símbolos no IPA, solapamientos)
- SaveOrthographyTable, ImportOrthographyTable, ExportOrthographyTable
- PhonemizeText({ text, languageCode })
- ImportTextGrid, ExportTextGrid, AddInterval, SplitInterval, MergeIntervals, MoveBoundary, RenameTier
- AnalyzePitch, AnalyzeFormants, AnalyzeIntensity
- BuildExperimentSpec, ExportExperimentResultsCsv
- ListTools({ area?, language?, integration? })

ERRORES
- Define una unión discriminada de errores de dominio por puerto.
- Nunca lances excepciones por flujos esperados (archivo mal formado, lengua
  no soportada, WASM no disponible). Devuelve Result.

PRUEBAS DE CONTRATO
- Para cada puerto, crea una función `runXxxPortContract(createAdapter)`
  en packages/core/src/testing/ que valide el comportamiento esperado.
- Crea fakes en memoria para todos los puertos en packages/core/src/testing/fakes.
- Más adelante cada adaptador real debe pasar su suite de contrato.

HECHO CUANDO
- Cobertura de casos de uso con fakes. Sin imports de DOM en core.
- `pnpm deps:check` pasa y core no depende de nada externo salvo utilidades
  de TypeScript sin efectos.
- docs/ARCHITECTURE.md describe el diagrama de puertos y adaptadores.

COMMITS ESPERADOS
feat(core): agrega entidades y valores de dominio
feat(core): define puertos y errores tipados
feat(core): implementa casos de uso con fakes
test(core): agrega suites de contrato para puertos
FIN PROMPT
```

---

## Segmento 3 — Shell web, composition root, i18n y catálogo

```
PROMPT
OBJETIVO: crear apps/web (adaptador primario) con navegación, tema, i18n y
catálogo de herramientas, sin lógica de negocio.

STACK
- React + Vite + TypeScript. CSS con variables y modo claro/oscuro
  (prefers-color-scheme, con selector manual). Sin librerías de UI pesadas.
- Enrutado por hash (compatible con GitHub Pages).
- i18n con diccionarios tipados es/en. Español por defecto. Las claves
  faltantes fallan en tiempo de compilación.

COMPOSITION ROOT
- apps/web/src/composition-root.ts construye adaptadores y casos de uso y los
  expone a la UI mediante un contexto de React (`useCases()`).
- Los componentes nunca importan adaptadores ni librerías de infraestructura.
- Carga perezosa (lazy) de adaptadores pesados (WASM, wavesurfer, Pyodide,
  jsPsych) solo cuando se abre la herramienta correspondiente.

PÁGINAS
- Inicio: propósito, aviso de privacidad ("tus archivos nunca salen de tu
  navegador"), accesos a herramientas.
- Catálogo: tarjetas filtrables por área, lengua y tipo de integración
  (incrustada / enlace externo / requiere servidor), con insignia
  "Experimental". Alimentado por ToolRegistryPort desde un JSON versionado
  en apps/web/src/data/tools.json.
- Página por herramienta: contenedor común con título, descripción,
  estado, aviso de privacidad y enlace a "cómo citar" cuando aplique.
- Acerca de: créditos, licencias de terceros (leídas de
  THIRD_PARTY_NOTICES) y cómo contribuir.

ACCESIBILIDAD
- Enlace "saltar al contenido", foco visible, landmarks semánticos, textos
  alternativos, anuncios para lectores de pantalla en cambios de estado.
- Pruebas con axe en Playwright para Inicio y Catálogo.

HECHO CUANDO
- La app arranca con `pnpm dev`, el catálogo filtra correctamente y el
  cambio de idioma y tema persiste (localStorage dentro de try/catch).
- Ningún componente de UI importa de packages/adapters (verificado por
  dependency-cruiser).

COMMITS ESPERADOS
feat(web): agrega shell, enrutado hash y temas
feat(web): agrega i18n es/en con claves tipadas
feat(web): agrega catalogo de herramientas desde tools.json
test(e2e): agrega pruebas de accesibilidad con axe
FIN PROMPT
```

---

## Segmento 4 — Herramienta A: ortografía → IPA por tablas

La pieza más valiosa para lenguas indígenas: la persona escribe y comparte sus propias reglas.

```
PROMPT
OBJETIVO: motor y editor de tablas ortografía → IPA, independiente del idioma.

MOTOR (en packages/core, TS puro, determinista)
- Normaliza la entrada a Unicode NFC y respeta mayúsculas según opción.
- Reglas con: grapheme, ipa, before?, after?, priority?, note?.
- Clases de símbolos definidas por la tabla, por ejemplo
  V = [a e i o u], C = [p t k ...], y el símbolo # para límite de palabra.
- Estrategia: para cada posición, selecciona la coincidencia más larga
  (dígrafos antes que letras sueltas); entre iguales, gana la regla con
  contexto más específico y luego la de mayor prioridad.
- Dos capas opcionales: capa fonémica y capa alofónica (segunda pasada de
  reglas sobre la salida de la primera, por ejemplo [b d g] → [β ð ɣ] entre
  vocales). El usuario elige qué capas ver.
- Los caracteres sin regla se marcan como "sin cobertura" y se devuelven
  resaltados, nunca se descartan en silencio.
- Devuelve un `trace` por carácter: regla aplicada, posición y contexto.
- Sin dependencias externas.

VALIDACIÓN (ValidateOrthographyTable)
- Reglas duplicadas o contradictorias, clases no definidas, símbolos
  fuera de IPA razonable (lista de caracteres IPA y diacríticos comunes),
  reglas inalcanzables por orden de prioridad.

EDITOR (apps/web)
- Tabla editable de reglas con alta, baja, reordenado por teclado y
  deshacer/rehacer.
- Panel de prueba: campo de texto → IPA en vivo, con modo "explicar" que
  muestra qué regla produjo cada símbolo.
- Lista de cobertura: letras de la entrada sin regla.
- Importar y exportar JSON y CSV. Compartir por URL (tabla comprimida en el
  hash, con límite de tamaño y aviso si lo excede).
- Persistencia en el navegador mediante OrthographyRepositoryPort
  (adaptador con IndexedDB, con fallback a memoria si no está disponible).
- Pestaña de plantillas por lengua. IMPORTANTE: para inga, wayuunaiki, nasa
  yuwe y arhuaco entrega solo una plantilla VACÍA con instrucciones y el
  campo `status: draft`. No rellenes correspondencias. Muestra el aviso:
  "Esta tabla debe construirse y validarse con hablantes y fuentes
  lingüísticas de la comunidad".
- Demostración en español (variedad latinoamericana, con interruptor para
  distinción o yeísmo) y en inglés americano básico como ejemplos
  claramente rotulados "demo".

PRUEBAS (español, deben pasar)
- "chico" → tʃiko; "queso" → keso; "guerra" → ɡera; "hijo" → ixo;
  "ñandú" → ɲandu; "perro" → pero con vibrante múltiple (r) y
  "pero" con vibrante simple (ɾ); "casa" → kasa.
- Propiedades: la función es idempotente sobre texto ya convertido cuando
  corresponde, no pierde caracteres y es determinista.
- Pruebas de contrato del OrthographyRepositoryPort contra IndexedDB y fake.

DATOS Y ÉTICA
- No incluyas audio ni corpus de comunidades en el repositorio.
- Añade a la página un texto breve sobre consentimiento y soberanía de
  datos al trabajar con lenguas indígenas.

HECHO CUANDO
- Un estudiante puede crear una tabla desde cero, probar palabras, ver la
  explicación, exportarla y volver a importarla.
- Todo funciona sin conexión después de la primera carga.

COMMITS ESPERADOS
feat(core): implementa motor de reglas ortografia-ipa
feat(core): agrega validacion de tablas y capas alofonicas
feat(adapters): agrega repositorio de tablas con indexeddb
feat(web): agrega editor de tablas con modo explicar
docs: documenta formato JSON de tablas y ejemplo en español
FIN PROMPT
```

---

## Segmento 5 — Herramienta B: fonemizador es/en (eSpeak NG en WASM)

```
PROMPT
OBJETIVO: texto → IPA para español e inglés ejecutándose en el navegador.

IMPLEMENTACIÓN (adaptador secundario de PhonemizerPort)
- Candidato: paquete npm `piper-phonemize` en su versión WASM, que usa
  eSpeak NG para convertir texto a IPA. [VERIFICAR] nombre exacto,
  versión, API y tipos leyendo su README y su código; adapta el adaptador
  a lo que realmente exponga.
- Ejecuta el WASM dentro de un Web Worker. Carga perezosa solo al abrir
  la herramienta, con indicador de progreso y manejo de error.
- Soporta como mínimo es (con variantes disponibles) y en-us. Expón en la
  interfaz solo las lenguas que el motor realmente soporte [VERIFICAR].
- Si el motor no carga o falla, devuelve un error tipado y muestra un
  mensaje claro. No simules resultados.
- Publica el aviso de que eSpeak NG es una herramienta de síntesis y que
  su IPA es aproximado: no sustituye una transcripción fonética revisada.
- Registra el paquete y su licencia en THIRD_PARTY_NOTICES.md.

INTERFAZ
- Campo de texto, selector de lengua, salida IPA copiable, y opción de
  comparar lado a lado con la salida del motor de tablas (Segmento 4)
  cuando existe una tabla para esa lengua.
- Indicador de que el procesamiento es local.

PRUEBAS
- Contrato de PhonemizerPort contra el adaptador real (en entorno
  compatible) y contra el fake.
- Prueba de humo con 5 palabras en español y 5 en inglés; compara solo
  propiedades estables (no vacío, solo símbolos IPA válidos, sin errores).
- Prueba e2e: la herramienta carga, convierte una frase y muestra el
  resultado.

HECHO CUANDO
- La herramienta funciona sin servidor propio y degrada con elegancia si
  el WASM no está disponible.

COMMITS ESPERADOS
feat(adapters): agrega adaptador de fonemizador con espeak wasm
feat(web): agrega herramienta de fonemizacion es/en
test: agrega contrato y prueba e2e del fonemizador
docs: agrega aviso de limites del fonemizador
FIN PROMPT
```

---

## Segmento 6 — Herramienta C: visor de audio, espectrograma y TextGrid

```
PROMPT
OBJETIVO: un visor de audio con espectrograma y anotación por intervalos que
importa y exporta TextGrid, suficiente para sustituir a Praat en tareas básicas.

ADAPTADORES
- AudioDecoderPort con Web Audio API (decodeAudioData) para wav, mp3, ogg y
  similares. Límite razonable de duración con mensaje claro.
- Visualización con wavesurfer.js, incluyendo sus plugins de regiones,
  espectrograma y línea de tiempo. [VERIFICAR] versión y API reales de
  los plugins antes de usarlos. Fija versión exacta.
- TextGridCodecPort implementado por ti en TypeScript (sin dependencias):
  * Formato de texto largo (ooTextFile): cabecera
    `File type = "ooTextFile"` y `Object class = "TextGrid"`, luego xmin,
    xmax, `tiers? <exists>`, `size`, y `item [n]:` con class
    IntervalTier o TextTier, name, xmin, xmax, y los intervalos o puntos.
  * Escapa las comillas dobles duplicándolas dentro del texto.
  * Al leer, detecta codificación: UTF-8, UTF-8 con BOM y UTF-16 (Praat
    puede guardar así). Escribe siempre UTF-8.
  * Soporta el formato corto además del largo al leer.
  * Valida que los intervalos sean contiguos y cubran xmin–xmax; si hay
    huecos, informa y ofrece rellenarlos con intervalos vacíos.

FUNCIONES
- Cargar audio por selección o arrastre. Reproducción con velocidad
  ajustable, bucle de selección, zoom y desplazamiento.
- Vista de forma de onda y espectrograma con ajustes de ventana y rango
  de frecuencia (por ejemplo 0–5500 Hz).
- Capas (tiers): crear, renombrar, borrar, reordenar. Intervalos: crear
  dividiendo, mover fronteras, fusionar, editar texto.
- Teclado completo: atajos documentados para reproducir, dividir en el
  cursor, siguiente y anterior intervalo, deshacer y rehacer.
- Teclado IPA: panel desplegable con los símbolos IPA más comunes para
  insertar en el texto del intervalo, accesible por teclado.
- Guardado automático local mediante AnnotationStoragePort (IndexedDB).
- Importar y exportar TextGrid. Exportar también CSV (tier, inicio, fin,
  texto).

PRUEBAS
- Contrato de TextGridCodecPort con archivos de referencia (golden files)
  en e2e/fixtures y propiedad: parse(serialize(doc)) equivale a doc.
- Casos límite: texto con comillas, intervalos de duración cero, UTF-16,
  archivo vacío y archivo corrupto (debe devolver error tipado).
- e2e: cargar un audio corto, crear dos intervalos, exportar TextGrid y
  reimportarlo.

HECHO CUANDO
- Se puede anotar un audio y abrir el TextGrid exportado en Praat sin
  errores [VERIFICAR] con un archivo de ejemplo.

COMMITS ESPERADOS
feat(adapters): agrega decodificador de audio y visor con wavesurfer
feat(adapters): implementa codec de textgrid con pruebas golden
feat(web): agrega editor de intervalos con espectrograma
feat(web): agrega teclado ipa accesible
test(e2e): agrega flujo de anotacion y exportacion
FIN PROMPT
```

---

## Segmento 7 — Herramienta D: experimentos con jsPsych

```
PROMPT
OBJETIVO: constructor y ejecutor de experimentos psicolingüísticos sencillos
en el navegador, sin servidor, independiente de la lengua.

IMPLEMENTACIÓN
- Usa jsPsych con versión exacta [VERIFICAR] última versión estable con al
  menos 14 días de publicada, y los plugins necesarios (instrucciones,
  respuesta por teclado, escala tipo Likert, audio por teclado si aplica).
  Verifica los nombres reales de los plugins en la documentación.
- ExperimentRunnerPort en el núcleo; el adaptador envuelve jsPsych. La UI
  nunca importa jsPsych directamente.

PLANTILLAS (cada una definida por un ExperimentSpec en JSON)
1. Juicios de aceptabilidad (escala de 1 a 7).
2. Elección forzada entre dos opciones (2AFC), por ejemplo percepción de
   pares mínimos con audio.
3. Lectura autocontrolada por palabras (self-paced reading) con tiempos.
4. Decisión léxica con tiempos de reacción.

CONSTRUCTOR
- Formulario accesible para cargar estímulos pegando CSV o subiendo un
  archivo, con columnas documentadas (id, condición, texto, archivo de
  audio opcional).
- Opciones: aleatorización con semilla, bloques, práctica, instrucciones
  editables en cualquier lengua (soporte completo de Unicode y de texto de
  derecha a izquierda si se necesita).
- Los audios se cargan localmente y nunca se suben.
- Vista previa antes de ejecutar y exportación de la especificación en JSON
  para reproducibilidad.

EJECUCIÓN Y DATOS
- Ejecuta el experimento en pantalla completa opcional. Al terminar,
  descarga un CSV con: participante (identificador anónimo generado
  localmente), id de ensayo, condición, respuesta, tiempo de reacción,
  versión de la herramienta y semilla.
- Aviso: los tiempos de reacción en navegador tienen precisión limitada;
  documéntalo en la página.
- Guía breve para docentes sobre consentimiento informado y almacenamiento
  de datos.

PRUEBAS
- Pruebas unitarias del generador de ensayos (aleatorización con semilla
  reproducible, conteo de ensayos por condición).
- e2e: ejecutar una plantilla de aceptabilidad con tres estímulos y
  comprobar el CSV resultante.

HECHO CUANDO
- Un docente puede montar un experimento de aceptabilidad en menos de diez
  minutos y descargar los resultados.

COMMITS ESPERADOS
feat(core): agrega generador de ensayos con semilla
feat(adapters): agrega adaptador de jsPsych
feat(web): agrega constructor de experimentos y plantillas
test(e2e): agrega ejecucion de experimento de aceptabilidad
FIN PROMPT
```

---

## Segmento 8 — Herramienta E: análisis acústico (praatfan en WASM) — EXPERIMENTAL

```
PROMPT
OBJETIVO: tono (F0), formantes e intensidad dentro del visor del Segmento 6,
detrás de un puerto y marcado como experimental hasta validarlo contra Praat.

IMPLEMENTACIÓN
- Candidato: paquete `praatfan` (reimplementación desde cero de algoritmos
  de Praat, con compilación para navegador). [VERIFICAR] disponibilidad
  como paquete para web (npm o build wasm), versión, licencia y API real
  (por ejemplo to_pitch_ac, to_formant_burg y equivalentes) leyendo su
  documentación y código. No asumas nombres: adapta el adaptador a lo que
  exista. Ejecútalo en un Web Worker.
- Implementa AcousticAnalysisPort con ese adaptador. Si la librería no se
  puede usar en el navegador, deja el adaptador como "no disponible" con
  un fake y documenta el motivo en un ADR. No escribas tu propio
  algoritmo acústico en esta etapa.

FUNCIONES
- Contorno de F0 con piso y techo configurables (valores por defecto
  razonables y presets para voz masculina, femenina e infantil).
- Formantes F1 a F3 con frecuencia máxima configurable (presets) y
  superposición sobre el espectrograma.
- Intensidad en dB.
- Medición en una selección: media, mediana, mínimo y máximo de F0; F1 y
  F2 en el punto medio y a 25/50/75 por ciento del intervalo; exportar a CSV.
- Gráfico vocálico F1–F2 simple (ejes invertidos) para las mediciones
  guardadas, con etiquetas tomadas del texto del intervalo.

VALIDACIÓN (condición para quitar la etiqueta Experimental)
- Crea un arnés en packages/adapters/acoustic/validation/ que compare la
  salida del adaptador contra valores de referencia calculados con Praat
  (o Parselmouth) sobre 3 audios cortos de prueba que dejaré en
  e2e/fixtures/reference/ junto con un JSON de referencia.
  Tolerancias iniciales: F0 ±2 %, F1 y F2 ±5 %. Registra los resultados en
  docs/validation/acoustic.md.
- Mientras no pase, la interfaz muestra "Experimental: contrasta tus
  resultados con Praat antes de publicarlos".

PRUEBAS
- Contrato de AcousticAnalysisPort con un tono sintético (por ejemplo
  seno de 200 Hz): el F0 estimado debe quedar cerca de 200 Hz.
- Prueba de que la UI no bloquea el hilo principal (el análisis corre en
  el worker).

HECHO CUANDO
- Se pueden ver y exportar F0 y formantes de una selección, con el aviso
  visible y el arnés de validación listo para ejecutarse.

COMMITS ESPERADOS
feat(adapters): agrega adaptador acustico con praatfan en worker
feat(web): agrega paneles de f0, formantes e intensidad
test(adapters): agrega arnes de validacion contra praat
docs: documenta limites y estado experimental del analisis acustico
FIN PROMPT
```

---

## Segmento 9 — Herramienta F: ELAN ↔ TextGrid con Pyodide + pympi — EXPERIMENTAL

```
PROMPT
OBJETIVO: convertir entre archivos ELAN (.eaf) y Praat (.TextGrid) en el
navegador, ayudando al flujo de documentación de campo.

IMPLEMENTACIÓN
- Usa Pyodide en un Web Worker y carga `pympi-ling` con micropip.
  [VERIFICAR] que se instala y funciona en Pyodide (es Python puro,
  pero compruébalo) y fija versiones exactas de Pyodide y del paquete.
  Descarga los archivos de Pyodide desde un host permitido o empaquétalos
  en el build; documenta la decisión en un ADR.
- ElanCodecPort con este adaptador. Reutiliza TextGridCodecPort del
  Segmento 6 para el otro extremo, de modo que la conversión pase
  siempre por el modelo de dominio AnnotationDocument.
- Si pympi no funciona en Pyodide, implementa solo la lectura básica de EAF
  (tiers y anotaciones alineadas) en TypeScript con DOMParser y marca la
  escritura como no disponible. Documenta el motivo.

FUNCIONES
- Cargar .eaf o .TextGrid, ver las capas y exportar en el otro formato.
- Informe de pérdida: lista lo que no se pudo convertir (por ejemplo capas
  jerárquicas, referencias entre anotaciones, vocabularios controlados).
- Aviso visible: "Experimental. Conserva siempre el archivo original".

PRUEBAS
- Archivos de ejemplo pequeños en e2e/fixtures: conversión de ida y vuelta
  y comparación de texto y tiempos con tolerancia de milisegundos.
- La carga de Pyodide no bloquea la interfaz y muestra progreso.

HECHO CUANDO
- Una anotación simple sobrevive a la conversión ELAN → TextGrid → ELAN
  con el informe de pérdida correcto.

COMMITS ESPERADOS
feat(adapters): agrega codec elan con pyodide y pympi en worker
feat(web): agrega convertidor elan-textgrid con informe de perdida
test: agrega pruebas de ida y vuelta con archivos de ejemplo
docs: agrega ADR sobre distribucion de pyodide
FIN PROMPT
```

---

## Segmento 10 — Herramienta G: mapa de lenguas indígenas de Colombia

```
PROMPT
OBJETIVO: mapa estático y consultable de lenguas de Colombia, generado en
tiempo de build, sin servidor.

DATOS
- Script `scripts/build-language-data.ts` que, en el build, lee el dataset
  CLDF de Glottolog (repositorio glottolog/glottolog-cldf) [VERIFICAR] URL,
  versión y columnas reales (identificador, nombre, familia, país,
  latitud y longitud), filtra las lenguas de Colombia y genera
  apps/web/src/data/languages-co.json con la versión de Glottolog usada.
- Para lenguas sin coordenadas, no inventes: márcalas como "sin ubicación"
  y lístalas aparte.
- Cada entrada enlaza a su ficha en Glottolog como fuente. Muestra la
  fecha y versión de los datos.

INTERFAZ
- Mapa con Leaflet [VERIFICAR] versión y atribución de las teselas;
  respeta la atribución obligatoria. Lista alternativa accesible (tabla)
  con el mismo contenido para lectores de pantalla.
- Filtros por familia lingüística y búsqueda por nombre.
- Panel de detalle: nombre, familia, identificadores (Glottocode, ISO),
  enlaces a recursos del catálogo (Segmento 11) cuando existan.
- Texto de respeto: los nombres y ubicaciones provienen de fuentes
  académicas y pueden no reflejar la autodenominación de los pueblos.
  Incluye un enlace para sugerir correcciones (issue de GitHub).

PRUEBAS
- Prueba del script con un fixture pequeño de CLDF.
- e2e: filtrar por familia y abrir el detalle de una lengua.

COMMITS ESPERADOS
feat(scripts): agrega generacion de datos de lenguas desde glottolog
feat(web): agrega mapa y tabla accesible de lenguas de colombia
test: agrega pruebas del script y del filtrado
FIN PROMPT
```

---

## Segmento 11 — Catálogo de enlaces y fase 2

```
PROMPT
OBJETIVO: completar tools.json con herramientas externas y dejar preparado el
puerto para una fase 2 con backend opcional.

CATÁLOGO (tools.json; cada entrada con id, nombre es/en, área,
lenguas, integración, estado, url, nota breve y cómo citar)
Solo enlace externo, con una breve guía de uso propia en español:
- Lexonomy (diccionarios): servicio alojado en lexonomy.elex.is.
- UDPipe en línea y UD Annotatrix (morfosintaxis, español e inglés;
  anotación propia para cualquier lengua).
- Lambda Notebook (semántica formal) y tutorial de RSA en WebPPL
  (pragmática), como material de aprendizaje.
- ELAN, FieldWorks Language Explorer y Flibl (documentación de campo).
- Recursos de lenguas indígenas colombianas de la Universidad de los
  Andes (corpus paralelos y modelos de traducción para wayuunaiki,
  arhuaco, inga y nasa).
- Praat (referencia oficial) como enlace complementario.
[VERIFICAR] cada URL abre y corresponde a lo descrito antes de
publicarla; si una no responde, márcala `status: planned` o elimínala.

FASE 2 (solo contrato, sin desplegar)
- Define en packages/core un puerto `PhoneRecognitionPort`
  (audio → secuencia de fonos con probabilidades opcionales) y un fake.
- Deja en docs/phase2/ un documento con: propuesta de adaptador HTTP para
  un servicio opcional con Allosaurus (contrato OpenAPI, límites de
  tamaño, CORS, Dockerfile de ejemplo, advertencia de que el resultado es
  un borrador que requiere corrección manual y que no se probó con
  lenguas colombianas). No lo integres en la UI todavía.

COMMITS ESPERADOS
feat(web): completa catalogo de herramientas externas
feat(core): agrega puerto de reconocimiento de fonos con fake
docs(phase2): propone contrato de servicio opcional con allosaurus
FIN PROMPT
```

---

## Segmento 12 — Prompt maestro one-shot

Úsalo con el Segmento 0 y los segmentos 1 a 11 como anexo.

```
PROMPT
Construye LinguaLab completo siguiendo el Segmento 0 (reglas permanentes) y
los segmentos 1 a 11 en ese orden.

ORDEN Y ENTREGAS
1. Para cada segmento: crea una rama `feat/segmento-NN-nombre`, implementa,
   ejecuta lint, typecheck, deps:check, pruebas y build, corrige hasta que
   pasen, y deja los commits convencionales indicados en el segmento.
2. Prepara el texto del Pull Request de cada segmento (resumen, decisiones,
   pruebas, riesgos, capturas si aplica) en docs/pr/NN-nombre.md. Yo abriré
   los PR y haré el merge.
3. Si un segmento depende de una librería que no funciona como se esperaba
   [VERIFICAR], aplica la regla de degradación del Segmento 0, documéntalo
   en un ADR y continúa con el siguiente segmento.

PRIORIDAD SI EL TIEMPO O EL CONTEXTO SE ACABAN
Completa en este orden: 1, 2, 3, 4, 5, 6, 7. Los segmentos 8 y 9 son
experimentales; el 10 y el 11 son opcionales. Es mejor entregar menos
herramientas funcionando y probadas que muchas a medias.

AL FINAL
Entrega un informe en docs/STATUS.md con una tabla por herramienta:
estado (Estable / Experimental / No disponible), qué se probó, qué
supuestos se tomaron, qué quedó pendiente y cómo ejecutarla.
FIN PROMPT
```

---

## Lista de verificación final antes de publicar

- [ ] El CI está en verde y `main` tiene protección de rama activada.
- [ ] `THIRD_PARTY_NOTICES.md` lista cada paquete con versión y licencia, y la licencia del proyecto está decidida.
- [ ] Las plantillas de lenguas indígenas siguen vacías y con el aviso de validación con hablantes.
- [ ] Probaste el TextGrid exportado en Praat y el análisis acústico contra valores de referencia.
- [ ] Revisaste a mano que todos los enlaces del catálogo abren.
- [ ] La página explica de forma visible que los archivos no salen del navegador.
