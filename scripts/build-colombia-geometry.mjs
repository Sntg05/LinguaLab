#!/usr/bin/env node
/**
 * Extrae y simplifica el contorno de Colombia y escribe `public/mapa/colombia.json`.
 *
 * POR QUE UN CONTORNO PROPIO Y NO UN MAPA DE TESELAS
 *
 * El sitio afirma dos cosas que un mapa de terceros rompe: que funciona sin
 * conexion y que una pagina no hace una sola peticion a otro origen. Leaflet con
 * teselas de OpenStreetMap pide imagenes a otro dominio en cada desplazamiento,
 * y la verificacion de la compilacion (`scripts/verify-build.mjs`) falla si una
 * pagina referencia un origen externo. La decision y lo que se pierde estan en
 * `docs/adr/0008-mapa-de-lenguas-sin-teselas.md`.
 *
 * POR QUE NATURAL EARTH
 *
 * Es la unica fuente de contornos del mundo que es de dominio publico sin
 * condiciones, y a escala 1:10m tiene la silueta de Colombia con las islas
 * (San Andres, Providencia, Malpelo). El archivo de origen pesa 13 MB; lo que se
 * publica es este contorno simplificado, de decenas de KB, que se commitea para
 * que el build no dependa de la red.
 *
 * POR QUE SIMPLIFICA
 *
 * El presupuesto de peso por pagina es de 60 KB comprimidos y el contorno viaja
 * dentro del HTML. Douglas-Peucker con una tolerancia en pixeles de la vista elimina
 * los puntos que no cambian el dibujo a ese tamano: la silueta sigue siendo la
 * misma y el archivo baja a una fraccion.
 *
 * Uso:
 *   node scripts/build-colombia-geometry.mjs
 *   node scripts/build-colombia-geometry.mjs --out <archivo> --tolerance 0.4
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Version fijada de Natural Earth: la misma entrada produce la misma salida. */
const SOURCE_VERSION = "v5.1.2";
const SOURCE_DATASET = "ne_10m_admin_0_countries";
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${SOURCE_VERSION}/geojson/${SOURCE_DATASET}.geojson`;
const SOURCE_LICENSE = "Dominio publico (Natural Earth, naturalearthdata.com/about/terms-of-use)";

/** El contorno se dibuja a este ancho; la tolerancia se mide en esos pixeles. */
const VIEW_WIDTH = 600;
const DEFAULT_TOLERANCE = 0.35;
const DEFAULT_OUT = join(ROOT, "public", "mapa", "colombia.json");

/** Identificador estable de Natural Earth. `ISO_A3` falla en territorios discutidos. */
const COUNTRY = "COL";

const USAGE = `Extrae el contorno de Colombia de Natural Earth y lo simplifica.

Opciones:
  --out <archivo>       Archivo de salida. Por defecto: public/mapa/colombia.json
  --tolerance <px>      Tolerancia de simplificacion en pixeles. Por defecto: ${DEFAULT_TOLERANCE}
  --source <archivo>    GeoJSON local en vez de descargarlo (para pruebas).
  --help                Muestra esta ayuda.`;

const fail = (message) => {
  process.stderr.write(`build-colombia-geometry: ${message}\n`);
  process.exit(1);
};

/** Opciones que reciben un valor literal, con el nombre del campo que llenan. */
const TEXT_FLAGS = { "--out": "out", "--source": "source" };

/** Lee un valor numerico mayor que cero, o falla nombrando la bandera. */
const positiveNumber = (flag, value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(`${flag} necesita un numero mayor que cero, no ${String(value)}`);
  }
  return parsed;
};

const parseArgs = (argv) => {
  const options = { out: DEFAULT_OUT, tolerance: DEFAULT_TOLERANCE, source: SOURCE_URL, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (flag === "--help" || flag === "-h") {
      options.help = true;
      continue;
    }

    const key = TEXT_FLAGS[flag];

    if (key === undefined && flag !== "--tolerance") {
      fail(`opcion desconocida: ${flag}. Ver --help.`);
    }

    const value = argv[index + 1];
    if (value === undefined) {
      fail(`falta el valor de ${flag}`);
    }

    if (flag === "--tolerance") {
      options.tolerance = positiveNumber(flag, value);
    } else {
      options[key] = value;
    }
    index += 1;
  }

  return options;
};

/** Trae el GeoJSON del disco o de la red, sin que el llamador sepa cual. */
const retrieve = async (source) => {
  if (!/^https?:\/\//.test(source)) {
    try {
      return await readFile(source, "utf8");
    } catch (error) {
      fail(`no se pudo leer ${source} (${error.code ?? error.message})`);
    }
  }

  let response;
  try {
    response = await fetch(source);
  } catch (error) {
    fail(`no se pudo descargar ${source} (${error.message})`);
  }
  if (!response.ok) {
    fail(`no se pudo descargar ${source} (HTTP ${response.status})`);
  }
  return await response.text();
};

/** La geometria de Colombia como lista de poligonos, o falla si no esta. */
const colombiaPolygons = (collection) => {
  const feature = collection.features?.find(
    (candidate) => candidate.properties?.ADM0_A3 === COUNTRY,
  );
  if (feature === undefined) {
    fail(`la fuente no trae la geometria de Colombia (ADM0_A3 = ${COUNTRY})`);
  }
  return feature.geometry.type === "MultiPolygon"
    ? feature.geometry.coordinates
    : [feature.geometry.coordinates];
};

/** Extension real del pais, tomada de su propio contorno: no se escribe a mano. */
const extentOf = (polygons) => {
  const extent = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity };
  let sourcePoints = 0;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        sourcePoints += 1;
        extent.west = Math.min(extent.west, longitude);
        extent.east = Math.max(extent.east, longitude);
        extent.south = Math.min(extent.south, latitude);
        extent.north = Math.max(extent.north, latitude);
      }
    }
  }

  if (!Number.isFinite(extent.west) || !Number.isFinite(extent.north)) {
    fail("el contorno de Colombia no tiene coordenadas");
  }

  return { ...extent, sourcePoints };
};

/** Distancia de un punto a la recta que une `from` y `to`, en unidades de la vista. */
const distanceToSegment = (point, from, to) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];

  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - from[0], point[1] - from[1]);
  }

  const t = ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(point[0] - (from[0] + clamped * dx), point[1] - (from[1] + clamped * dy));
};

/**
 * Douglas-Peucker iterativo.
 *
 * Se mantienen los extremos de cada anillo. En un anillo cerrado coinciden, asi
 * que la simplificacion se aplica al anillo abierto y se vuelve a cerrar despues:
 * si se pasara el anillo cerrado tal cual, la recta inicial tendria longitud cero
 * y el algoritmo no descartaria nada.
 */
const simplify = (points, tolerance) => {
  if (points.length <= 2) {
    return points;
  }

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let farthest = -1;
    let maxDistance = 0;

    for (let index = first + 1; index < last; index += 1) {
      const distance = distanceToSegment(points[index], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = index;
      }
    }

    if (maxDistance > tolerance && farthest !== -1) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  return points.filter((_, index) => keep[index] === 1);
};

/** Redondeo a un decimal: por debajo de eso no se ve, y ahorra dos digitos por punto. */
const round = (value) => Math.round(value * 10) / 10;

/** Convierte un anillo de coordenadas en un tramo de `path` de SVG. */
const ringToPath = (ring) => {
  const commands = ring.map((point, index) => {
    const x = round(point[0]);
    const y = round(point[1]);
    return index === 0 ? `M${x} ${y}` : `L${x} ${y}`;
  });
  return `${commands.join("")}Z`;
};

/** Los anillos del contorno ya proyectados y simplificados. */
const simplifiedRings = (polygons, project, tolerance) => {
  const rings = [];
  let keptPoints = 0;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      // El ultimo punto repite el primero; se quita para simplificar y se vuelve
      // a cerrar al escribir el path.
      const open = ring.slice(0, ring.length - 1);
      if (open.length < 3) {
        continue;
      }
      const simplified = simplify(open.map(project), tolerance);
      if (simplified.length < 3) {
        continue;
      }
      keptPoints += simplified.length;
      rings.push(simplified);
    }
  }

  if (rings.length === 0) {
    fail("la simplificacion se quedo sin ningun anillo; proba con --tolerance mas chica");
  }

  return { rings, keptPoints };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  let collection;
  try {
    collection = JSON.parse(await retrieve(options.source));
  } catch (error) {
    fail(`la fuente no es GeoJSON valido (${error.message})`);
  }

  const polygons = colombiaPolygons(collection);
  const { west, east, south, north, sourcePoints } = extentOf(polygons);

  /**
   * Equirectangular con correccion de latitud.
   *
   * Colombia ocupa 18 grados de latitud cerca del ecuador, donde el error de esta
   * proyeccion frente a Mercator es de menos de un pixel. Se paga con un coseno
   * del centro del pais y una multiplicacion, tanto aca como en la pagina, en vez
   * de una tangente y un logaritmo por cada punto.
   */
  const cosLat0 = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const scale = VIEW_WIDTH / ((east - west) * cosLat0);
  const viewHeight = Math.ceil((north - south) * scale);

  const project = ([longitude, latitude]) => [
    (longitude - west) * cosLat0 * scale,
    (north - latitude) * scale,
  ];

  const { rings, keptPoints } = simplifiedRings(polygons, project, options.tolerance);
  const outline = rings.map(ringToPath).join("");

  const geometry = {
    source: {
      name: "Natural Earth",
      dataset: SOURCE_DATASET,
      version: SOURCE_VERSION,
      url: SOURCE_URL,
      license: SOURCE_LICENSE,
      citation:
        "Natural Earth. Free vector and raster map data. naturalearthdata.com (dominio publico).",
    },
    retrievedAt: new Date().toISOString(),
    extent: { west, east, south, north },
    projection: {
      name: "equirectangular",
      // La pagina aplica estas dos lineas para ubicar cada lengua; estan aca para
      // que el contorno y los puntos no puedan usar proyecciones distintas.
      formula:
        "x = (longitude - extent.west) * cosLat0 * scale; y = (extent.north - latitude) * scale",
      cosLat0,
      scale,
    },
    viewBox: [VIEW_WIDTH, viewHeight],
    simplification: {
      algorithm: "douglas-peucker",
      toleranceViewPixels: options.tolerance,
      sourcePoints,
      keptPoints,
    },
    outline,
  };

  mkdirSync(dirname(options.out), { recursive: true });
  const json = `${JSON.stringify(geometry, null, 2)}\n`;
  writeFileSync(options.out, json, "utf8");

  process.stdout.write(
    `build-colombia-geometry: Colombia ${west.toFixed(2)}..${east.toFixed(2)} lon, ` +
      `${south.toFixed(2)}..${north.toFixed(2)} lat -> viewBox ${VIEW_WIDTH}x${viewHeight}; ` +
      `${sourcePoints} puntos de origen, ${keptPoints} conservados en ${rings.length} anillos; ` +
      `${(Buffer.byteLength(json) / 1024).toFixed(1)} KB crudos, ` +
      `${(gzipSync(json).length / 1024).toFixed(1)} KB gzip -> ${options.out}\n`,
  );
};

await main();
