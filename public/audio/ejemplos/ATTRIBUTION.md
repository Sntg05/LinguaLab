# Audio de ejemplo del visor: atribución y licencia

El visor ofrece una palabra de ejemplo para practicar la segmentación antes de cargar una grabación
propia. Cada archivo de esta carpeta está aquí con su fuente y su licencia, verificadas en la página del
archivo en Wikimedia Commons el 2026-11-13.

| Archivo | Palabra | Fuente | Licencia | Hablante |
| --- | --- | --- | --- | --- |
| `pato.wav` | «pato» (español) | [LL-Q1321 (spa)-Millars-pato.wav](https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Millars-pato.wav), grabado con Lingua Libre | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Millars](https://lingualibre.org/wiki/Q213743) |

El archivo es el original, sin cambios: 48 kHz, mono, 16 bits, 0,883 s. SHA-1
`288d8276a79c4848a2d01417e6500d38008a3737`, igual al que publica Commons.

## `pato.TextGrid`

Segmentación hecha a mano para LinguaLab, publicada bajo la misma licencia que el audio
(CC BY-SA 4.0). **No es una referencia de Praat**: es un ejemplo para enseñar. Los límites se pusieron
sobre la energía en ventanas de 5 ms y un espectrograma de banda ancha:

- antes de 0,255 s el archivo es silencio digital, así que la oclusión de /p/ no se ve: [p] empieza en
  su explosión;
- [a] es el tramo de formantes fuertes, desde el inicio de la sonoridad (0,270 s) hasta que la energía
  cae y los formantes desaparecen (0,445 s);
- [t] cubre la oclusión (solo energía grave) y la explosión, una franja vertical hasta 6 kHz
  (0,500–0,515 s);
- [o] va desde el fin de la explosión hasta que la energía cae por debajo de unos −60 dB (0,700 s).

Quien la abra en Praat puede mover cualquier límite unos milisegundos con buenas razones: segmentar es
una decisión, y por eso el ejemplo se puede editar.
