/**
 * La ventana visible del visor: zoom, desplazamiento y conversion de
 * coordenadas entre tiempo y proporcion.
 *
 * Todo aqui es aritmetica sin estado: recibe la ventana y devuelve otra. Por eso
 * el dibujo, el clic en el canvas y el cursor por teclado pueden usar las mismas
 * funciones y no hay tres definiciones de «donde esta el instante 3,2 s».
 */

/** Tramo visible del audio, en segundos. */
export interface ViewWindow {
  readonly start: number;
  readonly end: number;
}

/** Lo mas cerca que se puede hacer zoom: un milisegundo de ventana. */
export const MIN_SPAN = 0.001;

const clampToUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

/**
 * Recorta la ventana al audio.
 *
 * Recorta en vez de desplazar a proposito: al acercar el zoom en el extremo
 * derecho, la ventana que se sale por la derecha debe terminar en el final del
 * audio, no correrse hacia la izquierda y dejar el puntero apuntando a otra cosa.
 */
export const clampWindow = (view: ViewWindow, duration: number): ViewWindow => {
  if (duration <= 0) {
    return { start: 0, end: MIN_SPAN };
  }

  const start = Math.min(Math.max(view.start, 0), duration);
  let end = Math.min(Math.max(view.end, start), duration);
  if (end - start <= 0) {
    end = duration;
  }
  return { start, end };
};

/** Acerca (`factor` > 1) o aleja (`factor` < 1) manteniendo fijo `anchor` (0..1). */
export const zoomWindow = (
  view: ViewWindow,
  duration: number,
  factor: number,
  anchor: number,
): ViewWindow => {
  const ratio = clampToUnit(anchor);
  const span = view.end - view.start;
  const anchorTime = view.start + span * ratio;
  const target = Math.min(Math.max(span / factor, MIN_SPAN), Math.max(duration, MIN_SPAN));
  const start = anchorTime - target * ratio;

  return clampWindow({ start, end: start + target }, duration);
};

/** Desplaza la ventana `deltaSeconds`, conservando su duracion. */
export const panWindow = (
  view: ViewWindow,
  duration: number,
  deltaSeconds: number,
): ViewWindow => {
  const span = Math.min(view.end - view.start, Math.max(duration, MIN_SPAN));
  const lastStart = Math.max(duration - span, 0);
  const start = Math.min(Math.max(view.start + deltaSeconds, 0), lastStart);

  return { start, end: start + span };
};

/** Instante que corresponde a una proporcion 0..1 de la ventana visible. */
export const timeAtRatio = (view: ViewWindow, ratio: number): number =>
  view.start + (view.end - view.start) * ratio;

/** Proporcion 0..1 de la ventana en la que cae un instante. No se recorta sola. */
export const ratioAtTime = (view: ViewWindow, time: number): number => {
  const span = view.end - view.start;
  return span <= 0 ? 0 : (time - view.start) / span;
};
