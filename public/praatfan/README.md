# praatfan-gpl 0.1.13 (build WebAssembly)

Análisis acústico bit a bit compatible con Praat (`to_pitch`, `to_formant_burg`, `to_intensity`).
Es el motor del puerto `AcousticAnalysisPort`; el adaptador vive en `packages/adapters/src/acoustic/`.

## Procedencia, y por qué estos bytes están en el repositorio

`praatfan` **no se publica en npm**: se distribuye como artefacto de una release de GitHub. Copiar el
paquete y fijarlo por hash es la forma de que lo que se audita sea lo que se sirve, en vez de un
`curl | tar` en cada compilación. Es el mismo criterio que se usó con `espeak-phonemizer`.

| Dato | Valor |
|---|---|
| Origen | `https://github.com/ucpresearch/praatfan-core-rs/releases/download/v0.1.13/praatfan-gpl.zip` |
| SHA-256 del zip | `e24ae59b277267b4b9df30693995b581212fcbd4cb3e085f820dd5f60b5fffb6` |
| `praatfan_gpl.js` | `5c889513d5a957b7d87a3ad6fa4e8b45fc017e7a23e7cebf1cfd0a8fe6dcafc4` |
| `praatfan_gpl_bg.wasm` | `9d6685b44e8e8998b92502d3f80550151fc54440ee497f15886155d860f992d0` |
| Licencia | **GPL-3.0** (`LICENSE`, copiado tal cual) |
| Compilado | 2026-10-19, `wasm-pack 0.14.0`, `wasm-bindgen 0.2.129` |

## Qué se copió y qué no

Se copian el módulo de JavaScript, el `.wasm`, su `.d.ts` (para que el adaptador tenga tipos reales y no
una copia a mano que se desincronice) y la licencia. **No** se copia `README.md` del paquete: su
contenido útil está resumido acá y en `PROVENANCE.txt`.

## Licencia y el proyecto

`praatfan` es GPL-3.0 y LinguaLab es GPL-3.0-only: son compatibles, y por eso el aviso de terceros del
repositorio lo lista con su versión. Un build GPL en un sitio GPL no agrega condiciones nuevas; lo que
sí agrega es la obligación de decir de dónde salió, que es este archivo.

## Cómo se usa

El `.js` es un módulo ES del target `web`: exporta `default init(module_or_path)` y las clases
(`Sound`, `Pitch`, `Formant`, `Intensity`). Se carga **desde un Web Worker** y desde este mismo origen:

```js
const module = await import(/* @vite-ignore */ "/praatfan/praatfan_gpl.js");
await module.default("/praatfan/praatfan_gpl_bg.wasm");
const sound = new module.Sound(samplesFloat64, sampleRate);
```

Nada de CDN: la CSP del sitio es `default-src 'self'`, y una copia remota rompería la promesa de que la
página funciona sin conexión después de la primera carga.
