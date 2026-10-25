/**
 * Pruebas de la proyeccion del mapa.
 *
 * El contorno de Colombia y los puntos de las lenguas tienen que salir de las
 * MISMAS dos lineas de matematicas. Si se separan, los puntos se dibujan en un
 * lugar y el pais en otro, y el error se ve como un mapa "aproximado" en vez de
 * como lo que es: dos proyecciones distintas. Estas pruebas fijan el contrato.
 */
import { describe, expect, it } from "vitest";
import { fitsInViewBox, project, type MapGeometry } from "./projection";

/** Proyeccion real, leida del archivo que genera el script de geometria. */
const geometry: MapGeometry = {
  extent: { west: -81.723704, east: -66.875061, south: -4.236484, north: 13.578355 },
  projection: { cosLat0: 0.9966788236341262, scale: 40.54238128024275 },
  viewBox: [600, 723],
  outline: "",
};

describe("project", () => {
  it("pone la esquina noroeste de Colombia en el origen de la vista", () => {
    const corner = project(geometry, {
      latitude: geometry.extent.north,
      longitude: geometry.extent.west,
    });

    expect(corner).not.toBeNull();
    expect(corner?.x).toBeCloseTo(0, 6);
    expect(corner?.y).toBeCloseTo(0, 6);
  });

  it("pone la esquina sudeste en el ancho y el alto de la vista", () => {
    const corner = project(geometry, {
      latitude: geometry.extent.south,
      longitude: geometry.extent.east,
    });

    expect(corner?.x).toBeCloseTo(geometry.viewBox[0], 6);
    // El alto se redondea hacia arriba al generar la geometria, asi que la
    // esquina puede quedar hasta un pixel por encima del borde inferior.
    expect(corner?.y).toBeGreaterThan(geometry.viewBox[1] - 1);
    expect(corner?.y).toBeLessThanOrEqual(geometry.viewBox[1]);
  });

  it("ubica una lengua del Caribe colombiano dentro del encuadre", () => {
    // Coordenadas de Wayuu segun Glottolog.
    const wayuu = project(geometry, { latitude: 11.395566, longitude: -72.199791 });

    expect(wayuu).not.toBeNull();
    expect(fitsInViewBox(geometry, wayuu)).toBe(true);
  });

  it("no ubica dentro del encuadre una coordenada de otro continente", () => {
    // El español que Glottolog registra para Colombia tiene su punto en Espana.
    const spanish = project(geometry, { latitude: 40.4414, longitude: -1.11788 });

    expect(spanish).not.toBeNull();
    expect(fitsInViewBox(geometry, spanish)).toBe(false);
  });

  it("rechaza una coordenada imposible en vez de dibujarla en otro lugar", () => {
    expect(project(geometry, { latitude: 95, longitude: 0 })).toBeNull();
    expect(project(geometry, { latitude: 0, longitude: 190 })).toBeNull();
    expect(project(geometry, { latitude: Number.NaN, longitude: 0 })).toBeNull();
  });
});
