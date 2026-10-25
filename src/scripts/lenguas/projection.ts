/**
 * Proyeccion de coordenadas a la vista del mapa.
 *
 * POR QUE EQUIRRECTANGULAR CON CORRECCION DE LATITUD
 *
 * Colombia ocupa unos dieciseis grados de latitud pegados al ecuador. Ahi el
 * error de una equirectangular escalada por el coseno del centro del pais es de
 * menos de un pixel frente a Mercator, y a cambio la pagina no necesita una
 * tangente ni un logaritmo por punto: dos multiplicaciones. El porque completo,
 * con lo que se pierde, esta en `docs/adr/0008-mapa-de-lenguas-sin-teselas.md`.
 *
 * Los parametros no se escriben aca: llegan en el JSON que genera
 * `scripts/build-colombia-geometry.mjs`, junto con el contorno que dibujan. Esa
 * es la garantia de que el pais y sus lenguas no puedan usar proyecciones
 * distintas — es el error que hace que un mapa parezca "aproximado" cuando en
 * realidad esta mal.
 */
import type { LanguageEntry } from "./language-map";

/** Lo que la pagina necesita del archivo de geometria. */
export interface MapGeometry {
  readonly extent: {
    readonly west: number;
    readonly east: number;
    readonly south: number;
    readonly north: number;
  };
  readonly projection: {
    readonly cosLat0: number;
    readonly scale: number;
  };
  readonly viewBox: readonly [number, number];
  readonly outline: string;
}

/** Un par de coordenadas geograficas, en grados decimales. */
export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

/** Un punto en unidades de la vista del SVG. */
export interface ViewPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Coordenadas de una lengua, o `null` si no las tiene.
 *
 * Existe para no repetir en cada llamador la comprobacion de los dos campos
 * opcionales, que es donde se cuela un punto en (0, 0) —el golfo de Guinea—
 * cuando falta uno de los dos.
 */
export const geoPointOf = (language: LanguageEntry): GeoPoint | null =>
  language.latitude === undefined || language.longitude === undefined
    ? null
    : { latitude: language.latitude, longitude: language.longitude };

/**
 * Proyecta un punto geografico a la vista.
 *
 * Devuelve `null` para una coordenada imposible (fuera de rango, o `NaN`): una
 * lengua mal medida no se dibuja en otro lugar del mapa, se deja fuera.
 */
export const project = (geometry: MapGeometry, point: GeoPoint): ViewPoint | null => {
  const { latitude, longitude } = point;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return {
    x: (longitude - geometry.extent.west) * geometry.projection.cosLat0 * geometry.projection.scale,
    y: (geometry.extent.north - latitude) * geometry.projection.scale,
  };
};

/** True cuando el punto se ve dentro del encuadre de la vista. */
export const fitsInViewBox = (geometry: MapGeometry, point: ViewPoint | null): boolean => {
  if (point === null) {
    return false;
  }
  const [width, height] = geometry.viewBox;
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
};
