/* ============================================================
   LinguaLab — atajos de teclado del visor de audio

   Se ignoran mientras el foco esta en un campo: ahi el teclado pertenece al
   texto, y robarle la barra espaciadora a quien escribe una etiqueta seria un
   defecto, no una funcion. Todos los atajos tienen su boton equivalente.

   La tabla tecla → orden es pura y se prueba en Node; el oyente que la aplica
   al documento es lo unico que toca el DOM.
   ============================================================ */

/** Lo que puede pedir un atajo. */
export type ShortcutCommand =
  | "toggle-play"
  | "stop"
  | "split"
  | "previous"
  | "next"
  | "undo"
  | "redo";

/** Lo que importa de una pulsacion para decidir el atajo. */
export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

/** Orden decidida y si hay que impedir lo que el navegador haria con esa tecla. */
export interface Shortcut {
  readonly command: ShortcutCommand;
  readonly preventDefault: boolean;
}

const PLAIN_KEYS: Readonly<Record<string, Shortcut>> = {
  " ": { command: "toggle-play", preventDefault: true },
  Escape: { command: "stop", preventDefault: false },
  s: { command: "split", preventDefault: false },
  S: { command: "split", preventDefault: false },
  ",": { command: "previous", preventDefault: false },
  ".": { command: "next", preventDefault: false },
};

/**
 * La orden que corresponde a una pulsacion fuera de un campo, o `null`.
 *
 * Con Ctrl o Cmd solo cuenta la Z (deshacer; con Mayusculas, rehacer): el resto
 * de combinaciones son del navegador y no se tocan.
 */
export const resolveShortcut = (press: KeyPress): Shortcut | null => {
  if (press.ctrlKey || press.metaKey) {
    if (press.key.toLowerCase() === "z") {
      return { command: press.shiftKey ? "redo" : "undo", preventDefault: true };
    }
    return null;
  }
  return Object.hasOwn(PLAIN_KEYS, press.key) ? (PLAIN_KEYS[press.key] ?? null) : null;
};

/** Si el foco esta en algo donde se escribe. */
const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select") || target.isContentEditable);

/** Escucha el teclado del documento y entrega cada orden reconocida. */
export const listenForShortcuts = (run: (command: ShortcutCommand) => void): void => {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    const shortcut = resolveShortcut(event);
    if (shortcut === null) {
      return;
    }
    if (shortcut.preventDefault) {
      event.preventDefault();
    }
    run(shortcut.command);
  });
};
