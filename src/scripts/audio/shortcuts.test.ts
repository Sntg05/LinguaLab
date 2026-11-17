import { describe, expect, it } from "vitest";
import { type KeyPress, resolveShortcut } from "./shortcuts";

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
});

describe("resolveShortcut", () => {
  it("la barra espaciadora reproduce o pausa e impide el desplazamiento de la pagina", () => {
    expect(resolveShortcut(press(" "))).toEqual({
      command: "toggle-play",
      preventDefault: true,
    });
  });

  it("Escape detiene sin tocar lo que el navegador haga con la tecla", () => {
    expect(resolveShortcut(press("Escape"))).toEqual({ command: "stop", preventDefault: false });
  });

  it("s y S dividen en el cursor", () => {
    expect(resolveShortcut(press("s"))?.command).toBe("split");
    expect(resolveShortcut(press("S"))?.command).toBe("split");
  });

  it("coma y punto van al intervalo anterior y al siguiente", () => {
    expect(resolveShortcut(press(","))?.command).toBe("previous");
    expect(resolveShortcut(press("."))?.command).toBe("next");
  });

  it("Ctrl+Z y Cmd+Z deshacen; con Mayusculas, rehacen", () => {
    expect(resolveShortcut(press("z", { ctrlKey: true }))).toEqual({
      command: "undo",
      preventDefault: true,
    });
    expect(resolveShortcut(press("z", { metaKey: true }))?.command).toBe("undo");
    expect(resolveShortcut(press("Z", { ctrlKey: true, shiftKey: true }))?.command).toBe("redo");
  });

  it("con Ctrl o Cmd, el resto de teclas son del navegador", () => {
    expect(resolveShortcut(press("s", { ctrlKey: true }))).toBeNull();
    expect(resolveShortcut(press(" ", { metaKey: true }))).toBeNull();
  });

  it("una tecla sin atajo no hace nada", () => {
    expect(resolveShortcut(press("x"))).toBeNull();
    expect(resolveShortcut(press("toString"))).toBeNull();
  });
});

describe("resolveShortcut con el foco en el editor (atajos de Praat)", () => {
  const editor = { inEditor: true } as const;

  it("Intro pone un limite en la capa seleccionada, como en el TextGridEditor", () => {
    expect(resolveShortcut(press("Enter"), editor)).toEqual({
      command: "add-boundary",
      preventDefault: true,
    });
  });

  it("Supr y Retroceso quitan el limite seleccionado", () => {
    expect(resolveShortcut(press("Delete"), editor)?.command).toBe("remove-boundary");
    expect(resolveShortcut(press("Backspace"), editor)?.command).toBe("remove-boundary");
  });

  it("Tab reproduce el intervalo seleccionado y no mueve el foco", () => {
    expect(resolveShortcut(press("Tab"), editor)).toEqual({
      command: "play-interval",
      preventDefault: true,
    });
  });

  it("Mayus+Tab no se intercepta: es la salida del editor con el teclado", () => {
    expect(resolveShortcut(press("Tab", { shiftKey: true }), editor)).toBeNull();
  });

  it("fuera del editor, Intro, Supr y Tab siguen siendo del navegador", () => {
    expect(resolveShortcut(press("Enter"))).toBeNull();
    expect(resolveShortcut(press("Delete"))).toBeNull();
    expect(resolveShortcut(press("Tab"))).toBeNull();
  });

  it("los atajos de siempre siguen valiendo dentro del editor", () => {
    expect(resolveShortcut(press(" "), editor)?.command).toBe("toggle-play");
    expect(resolveShortcut(press("z", { ctrlKey: true }), editor)?.command).toBe("undo");
  });
});

describe("atajos de zoom y de seleccion con el foco en el editor (5.4)", () => {
  const editor = { inEditor: true } as const;

  it("Ctrl o Cmd con A, I, O y N hacen zoom como en Praat («Keyboard shortcuts»)", () => {
    expect(resolveShortcut(press("a", { ctrlKey: true }), editor)).toEqual({
      command: "zoom-all",
      preventDefault: true,
    });
    expect(resolveShortcut(press("i", { metaKey: true }), editor)?.command).toBe("zoom-in");
    expect(resolveShortcut(press("o", { ctrlKey: true }), editor)?.command).toBe("zoom-out");
    expect(resolveShortcut(press("N", { ctrlKey: true }), editor)?.command).toBe(
      "zoom-selection",
    );
  });

  it("fuera del editor, Ctrl+A, Ctrl+I, Ctrl+O y Ctrl+N siguen siendo del navegador", () => {
    for (const key of ["a", "i", "o", "n"]) {
      expect(resolveShortcut(press(key, { ctrlKey: true }))).toBeNull();
    }
  });

  it("Mayus+flechas mueven el extremo de la seleccion; sin el editor, no", () => {
    expect(resolveShortcut(press("ArrowRight", { shiftKey: true }), editor)).toEqual({
      command: "extend-selection-right",
      preventDefault: true,
    });
    expect(resolveShortcut(press("ArrowLeft", { shiftKey: true }), editor)?.command).toBe(
      "extend-selection-left",
    );
    expect(resolveShortcut(press("ArrowRight", { shiftKey: true }))).toBeNull();
  });
});

describe("consultas de Praat con el foco en el editor (5.5)", () => {
  // Manual de Praat, «Keyboard shortcuts»: F1 «Get first formant», F2 «Get
  // second formant», F5 (Windows y Linux) o F10 (Mac) «Get pitch», F8 «Get intensity».
  it.each([
    ["F1", "query-f1"],
    ["F2", "query-f2"],
    ["F5", "query-pitch"],
    ["F10", "query-pitch"],
    ["F8", "query-intensity"],
  ] as const)("%s pide %s e impide lo que el navegador haria con la tecla", (key, command) => {
    expect(resolveShortcut(press(key), { inEditor: true })).toEqual({
      command,
      preventDefault: true,
    });
  });

  it("fuera del editor F1, F5 y F10 siguen siendo del navegador (ayuda, recargar, menu)", () => {
    for (const key of ["F1", "F2", "F5", "F8", "F10"]) {
      expect(resolveShortcut(press(key))).toBeNull();
    }
  });

  it("con Mayus o Ctrl no es la consulta simple (en Praat son el maximo y el listado)", () => {
    expect(resolveShortcut(press("F5", { shiftKey: true }), { inEditor: true })).toBeNull();
    expect(resolveShortcut(press("F5", { ctrlKey: true }), { inEditor: true })).toBeNull();
  });
});
