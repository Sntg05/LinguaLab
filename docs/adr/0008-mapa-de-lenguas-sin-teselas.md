# 0008 — Mapa de lenguas sin teselas: contorno propio y puntos propios

- **Estado:** aceptada
- **Fecha:** 2026-10-25
- **Contexto del que surge:** el segmento 10 del prompt pide un mapa de lenguas de Colombia con Leaflet y teselas de terceros

## Contexto

El segmento 10 pedía un mapa con Leaflet «[VERIFICAR] versión y atribución de las teselas». Un mapa
de teselas significa una cosa muy concreta: cada desplazamiento, cada nivel de zoom y cada visita
piden imágenes PNG o vectoriales a un servidor que no es este. Eso choca con tres decisiones que ya
estaban tomadas en este repositorio y que no son negociables:

1. **Un solo origen.** La CSP se emite como metaetiqueta (`astro.config.mjs`) con `default-src
   'self'`, y `scripts/verify-build.mjs` falla si una página referencia un origen externo en un
   subrecurso. Una tesela es exactamente eso: un `img` con `src` en otro dominio.
2. **La promesa sin conexión.** ADR 0002 fija que el sitio funciona sin red una vez cargado. Un mapa
   de teselas es la parte que no: sin conexión queda un rectángulo gris debajo de los puntos.
3. **Un presupuesto de peso por página de 60 KB comprimidos.** Las teselas no lo gastan en la página
   —se piden en tiempo de ejecución— pero sí lo gastan en la primera visita, y además son la clase de
   dependencia que crece sin que nadie del proyecto la mida.

La alternativa —alojar las teselas en este repositorio— se descartó rápido: un juego de teselas de
Colombia a los zooms útiles pesa cientos de megabytes, y mantenerlo actualizado es un trabajo de
cartografía que nadie aquí va a hacer.

## Decisión

1. **El mapa es propio: un contorno de Colombia en SVG y un punto por lengua.** El contorno se extrae
   de Natural Earth 1:10m (`ne_10m_admin_0_countries`, etiqueta `v5.1.2`, dominio público) con
   `scripts/build-colombia-geometry.mjs`, que lo recorta a Colombia, lo proyecta y lo simplifica con
   Douglas-Peucker a 0,35 px de la vista. El resultado —3286 puntos de origen, 1084 después,
   13,2 KB crudos y 5,6 KB comprimidos— se commitea en `public/mapa/colombia.json` junto con la
   atribución, la versión y la fecha. El componente lo lee en la compilación y lo incrusta en el
   HTML: la página no hace una sola petición, ni siquiera a sí misma.
2. **Los puntos salen de la latitud y la longitud que publica Glottolog**, no de un dibujo a mano.
   Cada lengua con coordenadas se proyecta con las MISMAS dos líneas que el contorno, y esas dos
   líneas viajan en el JSON de la geometría (`extent`, `cosLat0`, `scale`). Esa es la garantía
   estructural de que el país y sus lenguas no puedan usar proyecciones distintas: si alguien cambia
   una, cambian las dos.
3. **La proyección es equirectangular con corrección de latitud.** `x = (lon − oeste) · cos(lat₀) ·
   escala`, `y = (norte − lat) · escala`, con `lat₀` en el centro de la extensión del país (4,67° N).
   A lo largo de los 17,8° de latitud que ocupa Colombia, pegados al ecuador, la diferencia con
   Mercator es de menos de un píxel, y a cambio la página no necesita una tangente ni un logaritmo
   por punto. Mercator se justifica cuando el mapa cruza latitudes altas; acá solo agregaría
   matemáticas que hay que probar en los dos lados.
4. **El SVG es decorativo y la tabla es el contenido.** El `<svg>` lleva `aria-hidden="true"`,
   `focusable="false"`, y no es un control: no hay zoom, no hay arrastre y no hay `tabindex`. Todo lo
   que el mapa muestra —nombre, familia, Glottocode, ISO 639-3 y ficha de origen— está en la tabla,
   que se renderiza en el servidor, y el panel de detalle se llena **leyendo esa fila**, así que no
   puede afirmar algo distinto de lo que la tabla dice. El filtro por familia y la búsqueda por
   nombre reutilizan `filterCatalogue`, el mismo módulo que el catálogo, el glosario y la
   bibliografía: un solo modelo de filtrado en el sitio.
5. **Lo que no se dibuja se lista aparte, con su razón.** Las nueve lenguas para las que Glottolog no
   publica coordenadas aparecen en una sección «Sin ubicación». No se les inventa un punto ni se
   rellena con el centroide del país: un punto inventado se ve igual que uno medido y nadie podría
   desmentirlo después. Por la misma razón, una lengua cuyas coordenadas caen fuera del contorno —el
   español, cuyo punto de Glottolog está en España— no se dibuja: el mapa enmarca Colombia, y la
   ficha y la tabla la siguen mostrando.
6. **La fuente se cita en la página, no solo en este documento.** El JSON generado guarda la versión
   de Glottolog (5.2.1), la fecha de recuperación, la URL del dataset y el `sha256` del CSV leído; la
   página muestra la versión y la fecha, enlaza el dataset de origen y cita la geometría de Natural
   Earth. El dato de entrada se commitea y el script solo lo regenera: el build no sale a la red.

## Qué se pierde

- **Calles, ríos, relieve y topónimos.** El contorno no dice dónde está un municipio, ni cómo se
  llega, ni qué hay entre dos lenguas vecinas. El mapa ubica; no orienta.
- **Zoom y desplazamiento.** No hay niveles de detalle: la vista es una sola y el encuadre del país
  es fijo. Con 136 puntos, ampliar además no resuelve nada, porque los puntos se superponen sin
  importar el zoom.
- **Precisión cartográfica.** Las coordenadas de Glottolog son estimaciones de punto único: el punto
  de una lengua no es «el lugar donde se habla», es el lugar donde la fuente la ubica. Con un
  contorno simplificado a 0,35 px, la exactitud posicional del dibujo está en el orden de las
  decenas de kilómetros. El mapa no sirve para medir distancias.
- **Las lenguas sin punto y las de punto fuera del país** se ven en la tabla y no en el mapa. Es una
  ausencia visible y explicada, no un hueco silencioso.

Lo que se gana es que el mapa cumple la misma promesa que el resto del sitio: un solo origen, cero
peticiones externas, y una página que se puede leer sin JavaScript porque el contenido nunca dependió
del dibujo.

## Consecuencias

- `/lenguas` pesa **26,7 KB comprimidos** (HTML + scripts + hojas de estilo), muy por debajo del
  presupuesto de 60 KB. El contorno aporta unos 5,6 KB comprimidos; sin él la página bajaría a unos
  21 KB. El weight del mapa está medido y no se acerca al límite, que es lo que permite que el
  contorno no se simplifique más de lo que la silueta admite.
- La página tiene 109 KB de HTML crudo, casi todo la tabla de 136 lenguas y el `path` del contorno.
  Es el precio de que el contenido esté en el HTML y no en un JSON que se descargue para pintarlo.
- Agregar un mapa base de verdad exigiría teselas propias en el repositorio, un presupuesto de peso
  distinto y una excepción explícita a `verify-build.mjs`. No es un cambio de frontend: es cambiar la
  promesa del sitio, y por eso no se hace sin una ADR que la reemplace.
- La lista incluye lenguas que no son indígenas: las cuatro de familia indoeuropea (español,
  portugués, palenquero y criollo de San Andrés) y las dos lenguas de señas. Se decidió no filtrarlas
  con una lista escrita a mano —sería una clasificación propia publicada como si fuera de la fuente—
  y en cambio mostrarlas con su familia, para que el filtro permita dejarlas fuera y la página diga
  cuál es la lista. La fecha y la versión de los datos están a la vista por la misma razón: lo que la
  página afirma sobre el mundo tiene que poder rastrearse.
- El contorno se regenera con `node scripts/build-colombia-geometry.mjs` y los datos con
  `npm run data:languages`; ninguno de los dos corre durante el build. Ver `public/mapa/README.md`
  para la procedencia de la geometría.
