# cmudict 2025.10.24

Diccionario de pronunciación del inglés americano de Carnegie Mellon University (CMUdict), en el
formato que consulta el transcriptor de LinguaLab.

- **Fuente:** https://github.com/cmusphinx/cmudict, archivo `cmudict.dict`
- **Commit:** `74790861f652b15e4ac49015a90074ad62a27690` (2025-10-24)
- **sha256 del original:** `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`
- **sha256 de `en-us.tsv`:** `a4c36ce6a93d6f482ddb504093d88a0138845d244870a2de82183823b5ed393a`
- **Entradas:** 126052 palabras
- **Licencia:** BSD de dos cláusulas, en `LICENSE` junto a este archivo

## Qué se cambió respecto al original

Solo el formato: se quitaron los comentarios de fin de línea y las variantes de una palabra
(`palabra(2)`) se agruparon en su línea: `palabra<TAB>pronunciación 1|pronunciación 2`. Las
pronunciaciones están en ARPABET, sin modificar. Lo genera `scripts/build-cmudict.mts`; no se edita
a mano.
