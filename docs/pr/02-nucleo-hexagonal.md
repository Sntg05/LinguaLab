# PR — Segmento 2 y 4: núcleo hexagonal y motor ortografía → IPA

Rama: `feat/lingualab-hexagonal-monorepo` · Commits: `8216d2d`, `bb71166`, `36d644d`, `5cce9f8`,
`147fe9f`, `a037395`, `36c0009`

> **Cómo revisar esto.** Son siete commits a propósito. El proveedor de revisión rechazó un candidato
> de 66 archivos y 4.810 líneas por exceder su presupuesto de contexto, así que entregar el segmento
> como un solo commit habría reproducido el problema. El orden lo fijó el acoplamiento real: todas las
> pruebas de `engine` y `application` importan los fakes, de modo que los datos van primero, después
> los fakes, después los contratos, después el motor, después el validador y por último los casos de uso.
> Cada commit pasa la puerta completa por separado.

---

## Qué cambia

`packages/core` deja de ser un esqueleto vacío y pasa a ser el hexágono completo para la Herramienta A
(ortografía → IPA) y para las dos herramientas que delegarán en él:

| Commit | Qué trae |
|---|---|
| `8216d2d` | Dominio inmutable, doce puertos con su unión de errores y el primitivo `Result` |
| `bb71166` | Formato JSON compartido, tablas demo es/en y las cuatro plantillas indígenas vacías |
| `36d644d` | Un fake en memoria por cada puerto (los doce) |
| `5cce9f8` | Siete suites de contrato reutilizables, ejecutadas contra los fakes |
| `147fe9f` | El motor de reglas: NFC, coincidencia más larga, contexto, prioridad, capas y rastro |
| `a037395` | El validador con seis códigos de hallazgo |
| `36c0009` | Los casos de uso, incluido el modo «explicar» |

## Por qué

Sin este núcleo, cada una de las cinco herramientas que siguen en el prompt arrastraría su librería
pesada hasta el centro de la aplicación. `packages/core` es TypeScript puro con `"lib": ["ES2022"]` y
`"types": []`: dentro del núcleo `document` y `fetch` **no existen**, y eso no se pide por favor, se
comprueba con `tsc -p packages/core`.

## Cómo se probó

- [x] `npm run verify:all` — exit 0 (lint, tipos de paquetes, reglas hexagonales, `astro check`, pruebas, build y verificación del build)
- [x] Pruebas — **32 archivos, 664 pruebas** (eran 537 antes de este segmento: +127 en el núcleo)
- [x] `npm run deps:check` — exit 0, 140 módulos y 316 dependencias
- [x] `npx biome format packages/core` — sin cambios pendientes
- [x] La v2.0.0 sigue intacta: 17 páginas, 28.5 KB la más pesada

**Las ocho pruebas de español que exige el prompt pasan**, y las verifiqué leyendo el código de las
pruebas, no solo el resultado:

```
chico → tʃiko     queso → keso      guerra → ɡera     hijo → ixo
ñandú → ɲandu     casa → kasa
perro → pero   (vibrante múltiple, U+0072)
pero  → peɾo   (vibrante simple, U+027E)
```

El par `perro`/`pero` es el que una implementación apurada colapsa. Queda con los puntos de código
explícitos y con un comentario que impide el «arreglo» equivocado: la tabla describe **cómo se escribe**,
no cómo se pronuncia, así que la vibrante múltiple que produjo `perro` vuelve a caer en la regla `r` si
se reconvierte. Eso es una excepción documentada, no un defecto, y la prueba la afirma como tal.

También se probó que la puerta **falla**, no solo que pasa: al meter `document.title` dentro del núcleo,
`npm run typecheck:packages` falla con `TS2584`, y al revertirlo vuelve a verde.

## Decisiones y supuestos

Todas quedan registradas porque un revisor tiene derecho a discutirlas:

1. **El formato de exportación vive en el núcleo** (`data/table-json.ts`), no en cada adaptador. Dos
   serializadores distintos podrían discrepar y el archivo exportado es la copia de seguridad del
   usuario: tiene que poder importarse en cualquier otro adaptador.
2. **El desempate «aparición más temprana en la tabla» no compara índices.** El motor recorre la tabla
   en orden y solo desplaza al ganador con algo *estrictamente* mejor, así que el empate nunca desplaza
   a quien llegó primero. Menos código y menos formas de equivocarse.
3. **`unreachable-rule` exige además que la regla anterior tenga los mismos huecos de contexto.** La
   subsunción pura con menos huecos *sí* puede alcanzarse por el desempate de especificidad, así que la
   formulación más laxa habría producido avisos falsos — y un aviso falso enseña a ignorar los avisos.
4. **`casePolicy: "fold"` se aplica también a los patrones de contexto**, no solo a los grafemas, para
   que una tabla no tenga que llevar el gemelo en mayúscula de cada clase de vocales.
5. **`layers: []` se trata como el valor por defecto `["phonemic"]`**, no como «ninguna capa». Una
   petición vacía casi siempre es un formulario sin rellenar, no una intención.
6. **`createSaveOrthographyTable` devuelve `{ table, savedAt }`** y acepta `id`/`version` opcionales en
   el borrador para distinguir alta de modificación, porque `OrthographyTable` no tiene campo de fecha.
   La validación que rechaza tablas con errores corre solo en el alta.
7. **`isReasonableIpa` admite un conjunto explícito fuera de los bloques evidentes** (`β`, `θ`, `χ`,
   `ð`, y también `æ`, `ç`, `ø`, `ŋ`): `θ` es una fricativa dental en la tabla del AFI y una letra griega
   en Unicode, así que una comprobación ingenua de rangos marcaría como sospechosa toda transcripción
   correcta.

**Corrección del revisor sobre el trabajo del worker**, incluida en `36c0009`: `layerOutputs.allophonic`
solo se publica cuando la capa alofónica existe. Antes se rellenaba con la salida **fonémica**, de modo
que la interfaz habría mostrado «capa alofónica: aboɡado» en una tabla que no declara ninguna regla
alofónica, y quien la leyera creería que ahí se aplicó algo. La suite del worker cubría la cobertura de
esa rama pero no ese campo. La salida principal sí cae a la fonémica, porque es lo mejor disponible;
atribuírsela a la otra capa no. Tiene su prueba.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un solo candidato de revisión demasiado grande | Siete commits, el mayor de ~800 líneas, cada uno con la puerta en verde |
| Las plantillas indígenas se rellenen con datos inventados | Una prueba exige que las cuatro sigan con `rules: []`, `status: "draft"` y el aviso de validación con hablantes; el aviso se compara carácter por carácter |
| Un adaptador futuro discrepe del formato de exportación | El códec es compartido y el fake ya lo usa; el contrato verifica el ida y vuelta |
| Los símbolos AFI se confundan al revisar en el editor | Se escriben con escapes Unicode (`\u0283`), de modo que una esh y una ese no dependen de la fuente |
| Cinco puertos sin suite de contrato | Declarado y justificado: todavía no tienen caso de uso, y un contrato que no puede afirmar nada es ruido con apariencia de cobertura |

## Pendiente, declarado

- **Casos de uso fuera de alcance**, deliberadamente y sin stubs vacíos: TextGrid, ELAN, análisis
  acústico, experimentos y anotación. Pertenecen a los segmentos 6 a 9. `application/index.ts` lo dice
  en un comentario en lugar de exportar funciones que no hacen nada.
- **Suites de contrato** de `textgrid-codec`, `elan-codec`, `audio-decoder`, `acoustic-analysis` y
  `experiment-runner`: llegan con su segmento. Los cinco **sí** tienen fake desde ya, para que las
  interfaces se mantengan honestas.
- **Los 36 avisos de Biome** en el código heredado siguen ahí. No bloquean y se corrigen cuando se toque
  el archivo por otro motivo.
