# Validación del análisis acústico contra Praat

- **Estado:** pendiente. El arnés está escrito y se ejecuta; las referencias no existen.
- **Código:** `packages/adapters/src/acoustic/validation/`
- **Adaptador:** `packages/adapters/src/acoustic/praatfan-acoustic-analysis.ts`
- **Motor:** `public/praatfan/` (praatfan 0.1.13, GPL-3.0, fijado por hash)
- **Decisión de arquitectura:** [`docs/adr/0006-analisis-acustico-praatfan.md`](../adr/0006-analisis-acustico-praatfan.md)

## Qué se midió y qué no

Medido, con el WebAssembly real y sin navegador (`npx vitest run packages/adapters/src/acoustic/`):

| Comprobación | Resultado observado |
|---|---|
| Tono sintético de 200 Hz, 1 s, 16 kHz, amplitud 0,3 | F0 media de los marcos con voz: **200,0000 Hz** |
| Tono sintético de 300 Hz dentro de un rango 75–600 Hz | F0 media entre 294 y 306 Hz (la prueba exige ese margen) |
| Contorno de F0 de 1 s a 16 kHz | 97 marcos, todos con voz |
| Intensidad del mismo tono | media ≈ 80,5 dB, en la escala de Praat (no lineal) |
| Formantes de un tono puro | 152 marcos y una pista por formante; **los valores no se afirman** (ver abajo) |
| Audio más corto que la ventana de análisis | error tipado `too-short` con la duración real |
| Módulo ausente | error tipado `unavailable` con detalle, sin excepciones |

No medido, y es lo que importa para quitar la etiqueta «Experimental»:

- **Voces reales.** No hay ni un audio de voz con su medición de Praat en el repositorio.
- **Formantes.** Un tono puro no tiene formantes vocales: solo se comprueba que la
  forma de la salida es la esperada (una pista por formante, tiempos paralelos a
  valores), no sus valores.
- **Intensidad frente a Praat.** Se comprueba que está en decibelios y en un rango
  audible; no que coincida con lo que Praat informa para el mismo archivo.
- **Techo y piso de F0 en voces agudas o infantiles.** Los presets son rangos de
  trabajo, no valores validados.
- **Comparación con el Praat oficial.** Nadie ha corrido el mismo audio por Praat y
  por praatfan y anotado la diferencia.

Por eso la interfaz muestra «Experimental: contrasta tus resultados con Praat antes
de publicarlos», y por eso el arnés, cuando no encuentra referencias, devuelve
`missing-fixtures` en vez de un verde.

## Qué hay que dejar en `e2e/fixtures/reference/`

Un archivo `.json` por audio, y el audio al que apunta, en la misma carpeta:

```text
e2e/fixtures/reference/
├── voz-a.wav
├── voz-a.json
├── voz-e.wav
├── voz-e.json
└── voz-i.wav
└── voz-i.json
```

El prompt del segmento pide **tres audios cortos**. Los audios se graban o se
recortan de material con permiso de uso, y no entran al repositorio si son de una
comunidad sin autorización explícita (ADR 0002).

### Formato del JSON

```json
{
  "praatVersion": "6.4.06",
  "audio": "voz-a.wav",
  "pitch": { "floorHz": 75, "ceilingHz": 600 },
  "formant": { "maxFormantHz": 5500, "count": 3 },
  "points": [
    { "time": 0.25, "f0": 118.4, "f1": 512.0, "f2": 1487.0 },
    { "time": 0.5, "f0": 121.2, "f1": 498.0, "f2": 1502.0 }
  ]
}
```

| Campo | Obligatorio | Significado |
|---|---|---|
| `praatVersion` | no | Versión de Praat con la que se midió. Sin ella, la referencia no es reproducible. |
| `audio` | sí | Nombre del archivo en la misma carpeta. |
| `pitch` | sí | Piso y techo usados en Praat para ese audio; el arnés los pasa al adaptador. |
| `formant` | sí | Frecuencia máxima y número de formantes usados en Praat. |
| `points` | sí | Al menos un instante con F0, F1 y F2 medidos con Praat en ese instante. |

### Cómo obtener los valores con Praat

1. Abrir el audio en Praat y recortarlo a la vocal o al tramo que se quiera fijar;
   guardar el recorte como WAV **PCM de 16 bits** (el lector del arnés no acepta
   compresión ni flotantes; el mensaje de error lo dice).
2. `To Pitch…` con el piso y el techo que se anotarán en el JSON.
3. `To Formant (burg)…` con la frecuencia máxima y el número de formantes anotados.
4. Para cada instante del JSON: `Get value at time…` en el Pitch y en el Formant 1 y
   2, y anotar los tres números con la misma marca de tiempo.
5. Escribir el JSON y ejecutar `npx vitest run packages/adapters/src/acoustic/validation/`.

### Tolerancias

F0 ±2 %, F1 y F2 ±5 %, **relativas al valor de referencia**, con el borde incluido
(`<=`). Las constantes viven en `DEFAULT_TOLERANCES`
(`packages/adapters/src/acoustic/validation/acoustic-validation.ts`); cambiarlas
exige cambiar este documento en el mismo commit.

## Cómo se ejecuta

```bash
npx vitest run packages/adapters/src/acoustic/validation/
```

- Sin referencias: el informe es `missing-fixtures` y su mensaje dice «no hay
  fixtures de referencia». La prueba que corre contra la carpeta real del
  repositorio acepta ese estado y falla si alguna vez devolviera un «aprobado» sin
  filas comparadas.
- Con referencias: el informe trae **una fila por instante y por magnitud** con el
  valor de Praat, el medido, la tolerancia y si pasó. Un fallo no oculta las demás
  filas: se ven todas las diferencias, no solo la primera.

El wasm se carga en Node con sus bytes (`init` acepta `BufferSource` además de una
URL), que es lo que permite medir el motor real y no un doble. Como
`packages/adapters/tsconfig.json` fija `"types": []` a propósito, las APIs de Node
que usa el arnés están declaradas en
`packages/adapters/src/acoustic/node-builtins.d.ts`, sin globals: un `process.env`
en un adaptador de navegador sigue sin compilar.

## Cómo se quita la etiqueta «Experimental»

1. Dejar los tres audios y sus JSON en `e2e/fixtures/reference/`.
2. Ejecutar el arnés y registrar aquí los resultados, con la fecha y la versión de
   Praat.
3. Solo si **todas** las comparaciones pasan, cambiar los textos
   `acoustic.experimental` y `acoustic.limits` en
   `src/i18n/messages/features/acoustic.es.ts` y `acoustic.en.ts`, y actualizar el
   estado de este documento.

No hay ninguna bandera en el código que esconda el aviso: quitar la etiqueta es
editar el texto, después de que el arnés haya pasado con datos reales.
