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
  | "redo"
  | "add-boundary"
  | "remove-boundary"
  | "play-interval"
  | "zoom-all"
  | "zoom-in"
  | "zoom-out"
  | "zoom-selection"
  | "extend-selection-left"
  | "extend-selection-right"
  | "query-pitch"
  | "query-f1"
  | "query-f2"
  | "query-intensity";

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
 * Atajos del TextGridEditor de Praat (manual, «TextGridEditor»): Intro pone un
 * limite en la capa seleccionada y Tab reproduce el intervalo seleccionado.
 * Quitar un limite es un menu en Praat; aqui es Supr o Retroceso.
 *
 * Solo valen con el foco en el editor: en el resto de la pagina Intro pulsa
 * botones y Tab mueve el foco, y quitarle eso al navegador dejaria a quien usa
 * teclado sin forma de avanzar. Mayus+Tab no se intercepta nunca: es la salida.
 */
const EDITOR_KEYS: Readonly<Record<string, Shortcut>> = {
  Enter: { command: "add-boundary", preventDefault: true },
  Delete: { command: "remove-boundary", preventDefault: true },
  Backspace: { command: "remove-boundary", preventDefault: true },
  Tab: { command: "play-interval", preventDefault: true },
  // Consultas de Praat (manual, «Keyboard shortcuts»): F1 «Get first formant»,
  // F2 «Get second formant», F5 «Get pitch» en Windows y Linux (F10 en Mac) y
  // F8 «Get intensity». Fuera del editor el navegador usa F1 (ayuda), F5
  // (recargar) y F10 (menu): por eso solo aqui, y con `preventDefault`.
  F1: { command: "query-f1", preventDefault: true },
  F2: { command: "query-f2", preventDefault: true },
  F5: { command: "query-pitch", preventDefault: true },
  F10: { command: "query-pitch", preventDefault: true },
  F8: { command: "query-intensity", preventDefault: true },
};

/**
 * Zoom con Ctrl o Cmd, como en Praat (manual, «Keyboard shortcuts»: Command-A
 * «Zoom all», Command-I «Zoom in», Command-O «Zoom out», Command-N «Zoom to
 * selection»). Solo con el foco en el editor: fuera de el, Ctrl+A selecciona el
 * texto de la pagina y Ctrl+O abre un archivo, y eso no se le quita a nadie.
 * Algunos navegadores se reservan Ctrl+N (ventana nueva) y no lo entregan a la
 * pagina: por eso cada uno tiene su boton.
 */
const EDITOR_CTRL_KEYS: Readonly<Record<string, Shortcut>> = {
  a: { command: "zoom-all", preventDefault: true },
  i: { command: "zoom-in", preventDefault: true },
  o: { command: "zoom-out", preventDefault: true },
  n: { command: "zoom-selection", preventDefault: true },
};

/**
 * Mayus+flechas: la via de teclado para seleccionar un tramo, como al
 * seleccionar texto. Praat lo hace con Mayus y Command mas flecha arriba y abajo;
 * aqui se usan las horizontales porque Ctrl+flecha arriba es del sistema en macOS.
 */
const EDITOR_SHIFT_KEYS: Readonly<Record<string, Shortcut>> = {
  ArrowLeft: { command: "extend-selection-left", preventDefault: true },
  ArrowRight: { command: "extend-selection-right", preventDefault: true },
};

/** Donde esta el foco al pulsar. */
export interface ShortcutScope {
  /** El foco esta en el editor (el marco de los lienzos). */
  readonly inEditor: boolean;
}

/**
 * La orden que corresponde a una pulsacion fuera de un campo, o `null`.
 *
 * Con Ctrl o Cmd cuenta la Z (deshacer; con Mayusculas, rehacer) y, dentro del
 * editor, el zoom de Praat: el resto de combinaciones son del navegador.
 */
export const resolveShortcut = (
  press: KeyPress,
  scope: ShortcutScope = { inEditor: false },
): Shortcut | null => {
  if (press.ctrlKey || press.metaKey) {
    const key = press.key.toLowerCase();
    if (key === "z") {
      return { command: press.shiftKey ? "redo" : "undo", preventDefault: true };
    }
    return scope.inEditor && !press.shiftKey ? lookup(EDITOR_CTRL_KEYS, key) : null;
  }
  if (scope.inEditor) {
    const editorShortcut = lookup(press.shiftKey ? EDITOR_SHIFT_KEYS : EDITOR_KEYS, press.key);
    if (editorShortcut !== null) {
      return editorShortcut;
    }
  }
  return lookup(PLAIN_KEYS, press.key);
};

/** Busca la tecla en una tabla sin caer en propiedades heredadas («toString»). */
const lookup = (table: Readonly<Record<string, Shortcut>>, key: string): Shortcut | null =>
  Object.hasOwn(table, key) ? (table[key] ?? null) : null;

/** Si el foco esta en algo donde se escribe. */
const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select") || target.isContentEditable);

/** Escucha el teclado del documento y entrega cada orden reconocida. */
export const listenForShortcuts = (
  run: (command: ShortcutCommand) => void,
  editor: HTMLElement | null = null,
): void => {
  document.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    const inEditor = editor !== null && event.target === editor;
    const shortcut = resolveShortcut(event, { inEditor });
    if (shortcut === null) {
      return;
    }
    if (shortcut.preventDefault) {
      event.preventDefault();
    }
    run(shortcut.command);
  });
};
