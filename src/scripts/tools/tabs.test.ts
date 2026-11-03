import { describe, expect, it } from "vitest";
import { nextTabIndex } from "./tabs";

/**
 * El teclado de las pestañas sigue el patrón de pestañas de WAI-ARIA (APG):
 * flechas para moverse con vuelta al principio, Inicio y Fin para los extremos.
 * Cualquier otra tecla no mueve nada y deja que el navegador haga lo suyo.
 */
describe("nextTabIndex", () => {
  it("avanza con la flecha derecha y vuelve al principio después de la última", () => {
    expect(nextTabIndex(0, 4, "ArrowRight")).toBe(1);
    expect(nextTabIndex(3, 4, "ArrowRight")).toBe(0);
  });

  it("retrocede con la flecha izquierda y salta a la última desde la primera", () => {
    expect(nextTabIndex(2, 4, "ArrowLeft")).toBe(1);
    expect(nextTabIndex(0, 4, "ArrowLeft")).toBe(3);
  });

  it("va a los extremos con Inicio y Fin", () => {
    expect(nextTabIndex(2, 4, "Home")).toBe(0);
    expect(nextTabIndex(1, 4, "End")).toBe(3);
  });

  it("no mueve nada con otra tecla, para no robarle Tab ni Enter al navegador", () => {
    expect(nextTabIndex(1, 4, "Tab")).toBeNull();
    expect(nextTabIndex(1, 4, "Enter")).toBeNull();
    expect(nextTabIndex(1, 4, "ArrowDown")).toBeNull();
  });

  it("no inventa una posición si no hay pestañas", () => {
    expect(nextTabIndex(0, 0, "ArrowRight")).toBeNull();
  });
});
