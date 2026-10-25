# Mapa de lenguas de Colombia — geometría y procedencia

Esta carpeta contiene el contorno del país que dibuja `/lenguas`. No es un mapa de teselas: es un
solo `path` de SVG con la silueta de Colombia, incrustado en el HTML durante la compilación. La
página no pide nada a ningún servidor, ni siquiera a este.

- **`colombia.json`** — contorno, extensión, proyección y procedencia. Lo genera
  `scripts/build-colombia-geometry.mjs` y **se commitea**: es una entrada del build, así que el sitio
  compila sin red. El script es la forma de regenerarlo, a mano y a propósito.

## Fuente y licencia

| Dato | Valor |
| --- | --- |
| Fuente | Natural Earth, escala 1:10m |
| Conjunto | `ne_10m_admin_0_countries` |
| Versión | `v5.1.2` (etiqueta del repositorio `nvkelso/natural-earth-vector`) |
| URL del archivo | `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson` |
| Licencia | Dominio público — <https://www.naturalearthdata.com/about/terms-of-use/> |
| Fecha de recuperación | 2026-10-25 (campo `retrievedAt` del JSON) |
| Atribución | «Natural Earth. Free vector and raster map data.» |

Natural Earth no exige atribución, pero el sitio la incluye en la página y en el propio archivo: un
mapa sin procedencia no se puede verificar.

## Proyección

Equirectangular con corrección de latitud, con el centro de la extensión del país como origen de la
escala (`lat₀ = 4,6709° N`, `cos lat₀ = 0,996679`):

```
x = (longitud − extent.west) * cosLat0 * scale
y = (extent.north − latitud) * scale
```

Colombia ocupa 17,8° de latitud pegados al ecuador, donde la diferencia con Mercator es de menos de
un píxel; a cambio, la página no necesita una tangente ni un logaritmo por punto. La razón completa,
y lo que el mapa deja de mostrar por no usar teselas, está en
`docs/adr/0008-mapa-de-lenguas-sin-teselas.md`.

## Qué se guarda

- `extent`: los cuatro bordes geográficos, tomados del propio contorno (no escritos a mano).
- `projection`: `cosLat0` y `scale`, los dos números que la página aplica también a cada lengua. Si
  se regenera la geometría, los puntos usan automáticamente la proyección nueva.
- `viewBox`: `600 × 723`, el tamaño de la vista.
- `simplification`: algoritmo, tolerancia (0,35 px de la vista), puntos de origen (3286) y puntos
  conservados (1084) en 10 anillos (el continente y las islas).
- `outline`: un `path` de SVG con todos los anillos.
- `source` y `retrievedAt`: la procedencia de arriba.

El archivo pesa **13,2 KB crudos y 5,6 KB comprimidos**, muy por debajo del límite de ~150 KB que se
fijó para esta carpeta. La simplificación existe por el presupuesto de 60 KB por página: sin ella el
mismo contorno pesaría alrededor de 40 KB crudos, y el dibujo a 600 px de ancho no cambiaría.

## Cómo se regenera

```sh
node scripts/build-colombia-geometry.mjs
node scripts/build-colombia-geometry.mjs --tolerance 0.6   # más agresiva, archivo más chico
```

El script descarga el GeoJSON fijado por versión, busca la geometría de Colombia por `ADM0_A3 =
COL`, proyecta, simplifica con Douglas-Peucker y escribe el archivo. No corre durante `astro build`:
la red no forma parte del build del sitio.
