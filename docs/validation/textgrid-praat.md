# Validación del TextGrid del visor contra Praat

- **Estado:** validado (2026-11-14, Praat 7.0.03). Cierra P17 de [`docs/PENDING.md`](../PENDING.md) en
  lo que toca al TextGrid.
- **Script:** `scripts/textgrid-praat-roundtrip.mts` (`npm run validate:textgrid-praat`)
- **Script de Praat:** `scripts/praat/textgrid-roundtrip.praat`
- **Prueba:** `packages/adapters/src/acoustic/validation/textgrid-praat.test.ts`, que solo corre si
  `praat` está en el PATH
- **Codec:** `packages/core/src/data/textgrid.ts` (`serializeTextGrid`, `parseTextGridBytes`), el
  mismo que usa el visor en `src/scripts/audio/textgrid-io.ts`

## Qué se comprueba

Para cada caso:

1. El documento se escribe con `serializeTextGrid`, como al pulsar «Exportar TextGrid», en UTF-8 sin
   BOM, que es lo que descarga el navegador.
2. `praat --run scripts/praat/textgrid-roundtrip.praat` lo abre con `Read from file` y escribe lo que
   leyó: `Get start time`, `Get end time`, `Get number of tiers` y, por capa, `Get tier name`,
   `Is interval tier`, `Get number of intervals` con `Get start time of interval`,
   `Get end time of interval` y `Get label of interval`, o `Get number of points` con
   `Get time of point` y `Get label of point`. Si Praat no puede leer el archivo, el script de Praat se
   detiene con error y el caso falla con el mensaje de Praat.
3. Lo que leyó Praat se compara con el documento original: mismas capas, en el mismo orden, con el
   mismo nombre y la misma clase; mismos intervalos o puntos; mismas etiquetas, carácter a carácter.
   Los tiempos que imprime Praat llevan 15 decimales, así que se admite 1e-9 s (una muestra a 44,1 kHz
   dura 2,3e-5 s).
4. Praat guarda el mismo objeto en formato largo (`Save as text file`) y corto
   (`Save as short text file`), y el lector de LinguaLab lee los dos: tienen que dar el documento
   original con los tiempos **idénticos** y sin huecos.

Las comillas se escriben dobladas dentro de una etiqueta, como dice el manual de Praat («TextGrid file
formats»): `dijo "hola"` va en el archivo como `"dijo ""hola"""`. Praat 7.0.03 guardó en UTF-8 los
archivos con caracteres fuera de ASCII.

## Resultados (2026-11-14, Praat 7.0.03, Linux)

| Caso | Capas | Intervalos o puntos | Resultado |
|---|---|---|---|
| Varias capas, etiquetas vacías y una capa de puntos («H*») | 4 | 11 | igual |
| Etiquetas AFI y no ASCII: «ʃ», «ɲ», «ˈpa.to», «t͡ʃ», «ʎ̝», «ã», «ŋ ʔ ɾ», «ñandú»; capa «glosa ñ» con «canción «dicha»» | 2 | 9 | igual |
| Comillas: `dijo "hola"`, `"`, `""`, `termina en "`; capa `capa "con" comillas` | 2 | 5 | igual |
| Tiempos sin representación decimal exacta (0,1 + 0,2; 1/3; 2/3) | 1 | 4 | igual |
| `public/audio/ejemplos/pato.TextGrid`, importado y exportado como en el visor | 1 | 6 | igual |

**Comprobación de que la comparación muerde** (mutación en una copia del script, devuelta después):
sin doblar las comillas al exportar, Praat rechaza tres archivos («Character p following quote…
End of string or undoubled quote?»); con un límite movido de 0,6 a 0,61 s, la comparación lo marca
(«fin 0.6 ≠ 0.61»).

## Lo que esto NO valida

- Etiquetas con tabuladores o saltos de línea: la salida del script de Praat usa una línea por dato y
  el tabulador como separador. El núcleo prueba esos casos contra su propio lector
  (`packages/core/src/data/textgrid.test.ts`).
- Otras versiones de Praat ni otros sistemas: se midió con 7.0.03 en Linux.
- El espectrograma: compararlo con el de Praat es la captura pendiente de la unidad 5.2 de T5.

## Cómo se ejecuta

```bash
npm run validate:textgrid-praat
```

Sin `praat` en el PATH el script sale con código 2 y lo dice; la prueba de Vitest se salta con ese
motivo en el nombre, para que la CI sin Praat siga en verde sin fingir un resultado. Los archivos
intermedios quedan en `node_modules/.cache/textgrid-praat/`.
