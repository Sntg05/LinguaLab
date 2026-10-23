import { describe, expect, it } from "vitest";
import {
  clampWindow,
  panWindow,
  ratioAtTime,
  timeAtRatio,
  zoomWindow,
  type ViewWindow,
} from "./view";

/**
 * La ventana visible del visor: zoom, desplazamiento y conversion de
 * coordenadas.
 *
 * POR QUE ESTO ES UNA FUNCION PURA Y NO PARTE DEL CONTROLADOR
 *
 * Cada uno de estos calculos aparece tres veces en la interfaz —al dibujar, al
 * hacer clic en el canvas y al mover el cursor con el teclado— y si alguna de
 * las tres redondeara distinto, el cursor caeria en un instante y la marca se
 * dibujaria en otro. Con una sola definicion, las tres coinciden por
 * construccion, y se puede probar sin navegador.
 */

const FULL: ViewWindow = { start: 0, end: 10 };

describe("clampWindow", () => {
  it("deja intacta una ventana dentro del audio", () => {
    expect(clampWindow({ start: 2, end: 8 }, 10)).toEqual({ start: 2, end: 8 });
  });

  it("recorta una ventana que se sale por la derecha", () => {
    expect(clampWindow({ start: 8, end: 14 }, 10)).toEqual({ start: 8, end: 10 });
  });

  it("recorta una ventana que empieza antes de cero", () => {
    expect(clampWindow({ start: -3, end: 4 }, 10)).toEqual({ start: 0, end: 4 });
  });

  it("una ventana mas grande que el audio se convierte en el audio entero", () => {
    expect(clampWindow({ start: -5, end: 40 }, 10)).toEqual({ start: 0, end: 10 });
  });

  it("nunca devuelve una ventana de duracion cero", () => {
    expect(clampWindow({ start: 4, end: 4 }, 10)).toEqual({ start: 4, end: 10 });
  });
});

describe("zoomWindow", () => {
  it("acerca manteniendo el ancla bajo el puntero", () => {
    const zoomed = zoomWindow(FULL, 10, 2, 0.25);

    expect(zoomed.end - zoomed.start).toBeCloseTo(5, 6);
    // El instante 2.5 estaba al 25 % de la ventana y sigue ahi.
    expect(zoomed.start).toBeCloseTo(2.5 - 5 * 0.25, 6);
  });

  it("aleja hasta el audio completo, sin pasarse", () => {
    const zoomed = zoomWindow({ start: 4, end: 6 }, 10, 0.5, 0.5);

    expect(zoomed.start).toBeGreaterThanOrEqual(0);
    expect(zoomed.end).toBeLessThanOrEqual(10);
  });

  it("no deja acercarse mas de un milisegundo por debajo", () => {
    const tiny = zoomWindow({ start: 5, end: 5.002 }, 10, 4, 0.5);

    expect(tiny.end - tiny.start).toBeGreaterThanOrEqual(0.001);
  });
});

describe("panWindow", () => {
  it("desplaza sin salirse del audio", () => {
    expect(panWindow({ start: 0, end: 5 }, 10, -2)).toEqual({ start: 0, end: 5 });
    expect(panWindow({ start: 0, end: 5 }, 10, 2)).toEqual({ start: 2, end: 7 });
  });

  it("conserva la duracion de la ventana", () => {
    const panned = panWindow({ start: 1, end: 4 }, 10, 1.5);

    expect(panned.end - panned.start).toBeCloseTo(3, 6);
  });
});

describe("timeAtRatio / ratioAtTime", () => {
  it("son inversas dentro de la ventana", () => {
    const view: ViewWindow = { start: 2, end: 6 };

    expect(timeAtRatio(view, 0)).toBe(2);
    expect(timeAtRatio(view, 1)).toBe(6);
    expect(ratioAtTime(view, timeAtRatio(view, 0.375))).toBeCloseTo(0.375, 6);
  });

  it("fuera de la ventana la proporcion se sale de 0..1, no se recorta sola", () => {
    const view: ViewWindow = { start: 2, end: 6 };

    expect(ratioAtTime(view, 1)).toBeLessThan(0);
    expect(ratioAtTime(view, 9)).toBeGreaterThan(1);
  });
});
