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
