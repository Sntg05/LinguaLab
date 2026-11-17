import { describe, expect, it } from "vitest";
import {
  clampWindow,
  MIN_SPAN,
  panWindow,
  popView,
  pushView,
  VIEW_HISTORY_LIMIT,
  zoomToRegion,
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

/* ---------------- 5.4: zoom a la seleccion, todo y atras, como en Praat ---------------- */

describe("zoomToRegion", () => {
  it("la ventana pasa a ser exactamente la seleccion", () => {
    expect(zoomToRegion({ start: 0, end: 4 }, 4, { start: 1.25, end: 2 })).toEqual({
      start: 1.25,
      end: 2,
    });
  });

  it("sin seleccion, la ventana no cambia", () => {
    const view: ViewWindow = { start: 0.5, end: 3 };
    expect(zoomToRegion(view, 4, null)).toBe(view);
  });

  it("una seleccion mas corta que el zoom minimo se abre hasta el minimo", () => {
    const zoomed = zoomToRegion({ start: 0, end: 4 }, 4, { start: 2, end: 2.0001 });
    expect(zoomed.end - zoomed.start).toBeCloseTo(MIN_SPAN, 9);
  });
});

describe("pushView / popView (boton «Atras»)", () => {
  it("atras vuelve a la ventana anterior, en orden inverso", () => {
    let history = pushView([], { start: 0, end: 4 });
    history = pushView(history, { start: 1, end: 2 });
    const first = popView(history);
    expect(first.view).toEqual({ start: 1, end: 2 });
    const second = popView(first.history);
    expect(second.view).toEqual({ start: 0, end: 4 });
    expect(second.history).toEqual([]);
  });

  it("sin historia, atras no devuelve ventana", () => {
    expect(popView([]).view).toBeNull();
  });

  it("la historia no crece sin limite: se olvidan las ventanas mas viejas", () => {
    let history: readonly ViewWindow[] = [];
    for (let index = 0; index < VIEW_HISTORY_LIMIT + 5; index += 1) {
      history = pushView(history, { start: index, end: index + 1 });
    }
    expect(history).toHaveLength(VIEW_HISTORY_LIMIT);
    expect(history[0]).toEqual({ start: 5, end: 6 });
  });
});
