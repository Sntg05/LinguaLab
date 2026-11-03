import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_HZ,
  DEFAULT_WINDOW_SECONDS,
  isDurationMismatch,
  playLabel,
  spectrogramSettings,
} from "./viewer-rules";

describe("playLabel", () => {
  it("dice lo que va a pasar al pulsar, en el idioma de la pagina", () => {
    expect(playLabel(false, true)).toBe("Reproducir");
    expect(playLabel(true, true)).toBe("Pausar");
    expect(playLabel(false, false)).toBe("Play");
    expect(playLabel(true, false)).toBe("Pause");
  });
});

describe("spectrogramSettings", () => {
  it("sin controles usa los valores por defecto", () => {
    expect(
      spectrogramSettings({ window: undefined, minHz: undefined, maxHz: undefined }),
    ).toEqual({
      windowSeconds: DEFAULT_WINDOW_SECONDS,
      hopSeconds: DEFAULT_WINDOW_SECONDS / 4,
      minHz: 0,
      maxHz: DEFAULT_MAX_HZ,
    });
  });

  it("el salto es un cuarto de la ventana", () => {
    expect(spectrogramSettings({ window: "0.005", minHz: "0", maxHz: "5000" }).hopSeconds).toBe(
      0.00125,
    );
  });

  it("acota el techo entre 500 Hz y 22 050 Hz", () => {
    expect(spectrogramSettings({ window: "0.025", minHz: "0", maxHz: "100" }).maxHz).toBe(500);
    expect(spectrogramSettings({ window: "0.025", minHz: "0", maxHz: "90000" }).maxHz).toBe(
      22050,
    );
  });

  it("el piso queda al menos 100 Hz por debajo del techo y nunca negativo", () => {
    expect(spectrogramSettings({ window: "0.025", minHz: "4990", maxHz: "5000" }).minHz).toBe(
      4900,
    );
    expect(spectrogramSettings({ window: "0.025", minHz: "-50", maxHz: "5000" }).minHz).toBe(0);
  });
});

describe("isDurationMismatch", () => {
  it("un documento vacio no discrepa de ningun audio", () => {
    expect(isDurationMismatch(0, 12)).toBe(false);
  });

  it("tolera 50 ms de diferencia", () => {
    expect(isDurationMismatch(3, 3.04)).toBe(false);
    expect(isDurationMismatch(3, 3.06)).toBe(true);
  });
});
