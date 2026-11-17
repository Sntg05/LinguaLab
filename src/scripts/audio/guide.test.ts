import { describe, expect, it } from "vitest";
import { advanceGuide, GUIDE_STEPS, guideMessageKey } from "./guide";

describe("modo guiado de la primera segmentacion", () => {
  it("tiene tres pasos y un final: escuchar, poner un limite, escribir la etiqueta", () => {
    expect(GUIDE_STEPS).toEqual(["listen", "boundary", "label", "done"]);
  });

  it("avanza un paso con el gesto que pide cada paso", () => {
    expect(advanceGuide("listen", "played")).toBe("boundary");
    expect(advanceGuide("boundary", "boundary-added")).toBe("label");
    expect(advanceGuide("label", "label-written")).toBe("done");
  });

  it("no retrocede: escuchar otra vez despues de poner un limite no vuelve al paso 1", () => {
    expect(advanceGuide("label", "played")).toBe("label");
  });

  it("deja saltar hacia delante: quien pone un limite sin escuchar pasa a escribir", () => {
    expect(advanceGuide("listen", "boundary-added")).toBe("label");
  });

  it("el final no cambia con nada", () => {
    expect(advanceGuide("done", "played")).toBe("done");
  });

  it("cada paso tiene su mensaje", () => {
    expect(GUIDE_STEPS.map(guideMessageKey)).toEqual([
      "audio.guide.listen",
      "audio.guide.boundary",
      "audio.guide.label",
      "audio.guide.done",
    ]);
  });
});
