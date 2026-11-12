import { describe, expect, it } from "vitest";
import { spectrogramColor } from "./render";
import { DEFAULT_MAX_HZ, DEFAULT_WINDOW_SECONDS, spectrogramSettings } from "./viewer-rules";

/**
 * El espectrograma se ve, por defecto, como el de Praat.
 *
 * Un estudiante compara lo que ve aquí con su manual y con Praat. Praat dibuja
 * en escala de grises —blanco el silencio, negro la energía— con una ventana de
 * 5 ms y de 0 a 5000 Hz (manual de Praat, «Spectrogram settings»). Con otra
 * paleta y otra ventana, la misma vocal parece otra cosa.
 */
describe("el espectrograma por defecto sigue a Praat", () => {
  it("en grises, el silencio es blanco y la energía máxima es negra", () => {
    expect(spectrogramColor(0, "gray")).toEqual([255, 255, 255]);
    expect(spectrogramColor(1, "gray")).toEqual([0, 0, 0]);
    const [red, green, blue] = spectrogramColor(0.5, "gray");
    expect(red).toBe(green);
    expect(green).toBe(blue);
  });

  it("los valores fuera de rango se recortan en vez de dar un color inválido", () => {
    expect(spectrogramColor(-3, "gray")).toEqual([255, 255, 255]);
    expect(spectrogramColor(7, "gray")).toEqual([0, 0, 0]);
  });

  it("la paleta de color sigue disponible y no es gris", () => {
    const [red, , blue] = spectrogramColor(0.9, "color");
    expect(red).not.toBe(blue);
  });

  it("ventana de 5 ms y techo de 5000 Hz cuando nadie eligió otra cosa", () => {
    expect(DEFAULT_WINDOW_SECONDS).toBe(0.005);
    expect(DEFAULT_MAX_HZ).toBe(5000);
    const settings = spectrogramSettings({ window: undefined, minHz: undefined, maxHz: undefined });
    expect(settings.windowSeconds).toBe(0.005);
    expect(settings.maxHz).toBe(5000);
  });
});
