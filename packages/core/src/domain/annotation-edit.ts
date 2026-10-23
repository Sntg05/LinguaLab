import type { AnnotationDocument, Interval, IntervalTier, Tier, TierKind } from "./annotation";

/**
 * Operaciones puras de edicion de anotaciones: capas, intervalos e historial.
 *
 * POR QUE EN EL DOMINIO Y NO EN LA PANTALLA
 *
 * Cada una de estas funciones produce un `AnnotationDocument` nuevo, sin tocar
 * el anterior, y sin saber que existe un canvas, un boton ni un teclado. Eso es
 * lo que permite probar «dividir en el cursor» en Node, sin navegador, y lo que
 * hace posible deshacer: si la edicion mutara el documento, el estado anterior
 * ya no existiria y no habria a que volver.
 *
 * Las fronteras se comparan con un epsilon porque los tiempos vienen de un
 * puntero sobre un canvas y de un archivo de Praat, no de una aritmetica exacta:
 * `0.1 + 0.2` no es `0.3`, y una comparacion estricta inventaria huecos de
 * 5.5e-17 segundos que ni Praat ni una persona pueden ver.
 */

/** Debajo de esto, dos tiempos son el mismo instante. */
export const TIME_EPSILON = 1e-6;

/** Compara dos tiempos con la tolerancia del dominio. */
export const sameTime = (a: number, b: number): boolean => Math.abs(a - b) <= TIME_EPSILON;

/** Un tramo sin intervalos dentro de una capa. */
export interface TierGap {
  readonly start: number;
  readonly end: number;
}

/** Estrecha `Tier` a `IntervalTier` sin mirar `items`. */
export const isIntervalTier = (tier: Tier): tier is IntervalTier => tier.kind === "interval";

const withTier = (doc: AnnotationDocument, index: number, tier: Tier): AnnotationDocument => {
  if (index < 0 || index >= doc.tiers.length) {
    return doc;
  }
  const tiers = doc.tiers.map((current, position) => (position === index ? tier : current));
  return { ...doc, tiers };
};

const withItems = (
  doc: AnnotationDocument,
  tierIndex: number,
  items: readonly Interval[],
): AnnotationDocument => {
  const tier = doc.tiers[tierIndex];
  if (tier === undefined || !isIntervalTier(tier)) {
    return doc;
  }
  return withTier(doc, tierIndex, { ...tier, items });
};

/** Documento vacio con una sola capa de intervalos que cubre todo el audio. */
export const createEmptyDocument = (xmax: number, xmin = 0): AnnotationDocument => ({
  xmin,
  xmax,
  tiers: [createIntervalTier("intervalos", xmin, xmax)],
});

/** Capa de intervalos con un unico intervalo vacio: el estado inicial util. */
export const createIntervalTier = (name: string, xmin: number, xmax: number): IntervalTier => ({
  name,
  kind: "interval",
  items: [{ start: xmin, end: xmax, text: "" }],
});

/**
 * Huecos de una capa dentro de `[xmin, xmax]`.
 *
 * Los intervalos de duracion cero no son huecos: ocupan un instante, no un
 * tramo, y Praat los conserva tal cual.
 */
export const findTierGaps = (
  tier: IntervalTier,
  xmin: number,
  xmax: number,
): readonly TierGap[] => {
  const gaps: TierGap[] = [];
  let cursor = xmin;

  for (const interval of tier.items) {
    if (interval.start - cursor > TIME_EPSILON) {
      gaps.push({ start: Math.max(cursor, xmin), end: interval.start });
    }
    if (interval.end - cursor > TIME_EPSILON) {
      cursor = interval.end;
    }
  }

  if (xmax - cursor > TIME_EPSILON) {
    gaps.push({ start: cursor, end: xmax });
  }

  return gaps;
};

/** Rellena los huecos con intervalos vacios, sin reordenar ni tocar el texto. */
export const fillTierGaps = (tier: IntervalTier, xmin: number, xmax: number): IntervalTier => {
  const gaps = findTierGaps(tier, xmin, xmax);
  if (gaps.length === 0) {
    return tier;
  }

  const items = [...tier.items];
  for (const gap of gaps) {
    const at = items.findIndex((interval) => interval.start - gap.end >= -TIME_EPSILON);
    const filler: Interval = { start: gap.start, end: gap.end, text: "" };
    if (at === -1) {
      items.push(filler);
    } else {
      items.splice(at, 0, filler);
    }
  }

  return { ...tier, items };
};

/** Agrega una capa al final. El nombre lo decide quien llama; no se inventa. */
export const addTier = (
  doc: AnnotationDocument,
  name: string,
  kind: TierKind,
): AnnotationDocument => {
  const tier: Tier =
    kind === "interval"
      ? createIntervalTier(name, doc.xmin, doc.xmax)
      : { name, kind: "point", points: [] };
  return { ...doc, tiers: [...doc.tiers, tier] };
};

/** Borra una capa. Un documento sin capas no se puede anotar, asi que no se permite. */
export const removeTier = (doc: AnnotationDocument, index: number): AnnotationDocument => {
  if (doc.tiers.length <= 1 || index < 0 || index >= doc.tiers.length) {
    return doc;
  }
  return { ...doc, tiers: doc.tiers.filter((_, position) => position !== index) };
};

export const renameTier = (
  doc: AnnotationDocument,
  index: number,
  name: string,
): AnnotationDocument => {
  const tier = doc.tiers[index];
  if (tier === undefined || tier.name === name) {
    return doc;
  }
  return withTier(doc, index, { ...tier, name });
};

/** Mueve una capa `delta` posiciones; fuera de los limites devuelve el documento. */
export const moveTier = (
  doc: AnnotationDocument,
  index: number,
  delta: number,
): AnnotationDocument => {
  const target = index + delta;
  if (index < 0 || index >= doc.tiers.length || target < 0 || target >= doc.tiers.length) {
    return doc;
  }

  const tiers = [...doc.tiers];
  const [moved] = tiers.splice(index, 1);
  if (moved === undefined) {
    return doc;
  }
  tiers.splice(target, 0, moved);
  return { ...doc, tiers };
};

/**
 * Divide en `time` el intervalo que lo contiene estrictamente.
 *
 * El texto se queda en la mitad izquierda y la derecha nace vacia: dividir es
 * separar dos tramos que antes se etiquetaban juntos, no duplicar la etiqueta.
 * Sobre una frontera existente no hay nada que dividir.
 */
export const splitIntervalAt = (
  doc: AnnotationDocument,
  tierIndex: number,
  time: number,
): AnnotationDocument => {
  const tier = doc.tiers[tierIndex];
  if (tier === undefined || !isIntervalTier(tier)) {
    return doc;
  }

  const at = tier.items.findIndex(
    (interval) => time - interval.start > TIME_EPSILON && interval.end - time > TIME_EPSILON,
  );
  const interval = at === -1 ? undefined : tier.items[at];
  if (interval === undefined) {
    return doc;
  }

  const items: Interval[] = [
    ...tier.items.slice(0, at),
    { start: interval.start, end: time, text: interval.text },
    { start: time, end: interval.end, text: "" },
    ...tier.items.slice(at + 1),
  ];

  return withItems(doc, tierIndex, items);
};

/** Fusiona un intervalo con el siguiente: el tramo se alarga y el texto del primero gana. */
export const mergeIntervalWithNext = (
  doc: AnnotationDocument,
  tierIndex: number,
  intervalIndex: number,
): AnnotationDocument => {
  const tier = doc.tiers[tierIndex];
  if (tier === undefined || !isIntervalTier(tier)) {
    return doc;
  }

  const current = tier.items[intervalIndex];
  const next = tier.items[intervalIndex + 1];
  if (current === undefined || next === undefined) {
    return doc;
  }

  const items: Interval[] = [
    ...tier.items.slice(0, intervalIndex),
    { start: current.start, end: next.end, text: current.text },
    ...tier.items.slice(intervalIndex + 2),
  ];

  return withItems(doc, tierIndex, items);
};

export const setIntervalText = (
  doc: AnnotationDocument,
  tierIndex: number,
  intervalIndex: number,
  text: string,
): AnnotationDocument => {
  const tier = doc.tiers[tierIndex];
  if (tier === undefined || !isIntervalTier(tier)) {
    return doc;
  }
  const current = tier.items[intervalIndex];
  if (current === undefined || current.text === text) {
    return doc;
  }

  const items = tier.items.map((interval, position) =>
    position === intervalIndex ? { ...interval, text } : interval,
  );
  return withItems(doc, tierIndex, items);
};

/**
 * Mueve la frontera que hay entre dos intervalos vecinos.
 *
 * El destino se recorta al tramo que los dos intervalos cubren juntos: arrastrar
 * una frontera mas alla del vecino dejaria intervalos solapados o de duracion
 * negativa, y Praat rechaza ese archivo. Recortar es preferible a fallar porque
 * quien arrastra ya esta viendo el resultado.
 */
export const moveTierBoundary = (
  doc: AnnotationDocument,
  tierIndex: number,
  intervalIndex: number,
  time: number,
): AnnotationDocument => {
  const tier = doc.tiers[tierIndex];
  if (tier === undefined || !isIntervalTier(tier)) {
    return doc;
  }

  const current = tier.items[intervalIndex];
  const next = tier.items[intervalIndex + 1];
  if (current === undefined || next === undefined) {
    return doc;
  }

  const clamped = Math.min(Math.max(time, current.start), next.end);
  if (sameTime(clamped, current.end) && sameTime(clamped, next.start)) {
    return doc;
  }

  const items = tier.items.map((interval, position) => {
    if (position === intervalIndex) {
      return { ...interval, end: clamped };
    }
    if (position === intervalIndex + 1) {
      return { ...interval, start: clamped };
    }
    return interval;
  });

  return withItems(doc, tierIndex, items);
};

/**
 * Estado del historial.
 *
 * Es un valor y no una clase mutable por la misma razon que el resto del
 * dominio: deshacer tiene que producir un estado nuevo, no reescribir el actual,
 * y asi el historial se puede probar comparando objetos.
 */
export interface AnnotationHistoryState {
  readonly present: AnnotationDocument;
  readonly past: readonly AnnotationDocument[];
  readonly future: readonly AnnotationDocument[];
  /** Cuantos pasos se conservan. Sin limite, un audio largo se come la memoria. */
  readonly limit: number;
}

export const startAnnotationHistory = (
  doc: AnnotationDocument,
  limit = 100,
): AnnotationHistoryState => ({ present: doc, past: [], future: [], limit });

/** Registra una edicion. Registrar el mismo documento no agrega un paso. */
export const recordAnnotation = (
  state: AnnotationHistoryState,
  next: AnnotationDocument,
): AnnotationHistoryState => {
  if (next === state.present) {
    return state;
  }
  const past = [...state.past, state.present].slice(-state.limit);
  return { present: next, past, future: [], limit: state.limit };
};

export const canUndoAnnotation = (state: AnnotationHistoryState): boolean => state.past.length > 0;

export const canRedoAnnotation = (state: AnnotationHistoryState): boolean =>
  state.future.length > 0;

export const undoAnnotation = (state: AnnotationHistoryState): AnnotationHistoryState => {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) {
    return state;
  }
  return {
    present: previous,
    past: state.past.slice(0, -1),
    future: [state.present, ...state.future],
    limit: state.limit,
  };
};

export const redoAnnotation = (state: AnnotationHistoryState): AnnotationHistoryState => {
  const next = state.future[0];
  if (next === undefined) {
    return state;
  }
  return {
    present: next,
    past: [...state.past, state.present].slice(-state.limit),
    future: state.future.slice(1),
    limit: state.limit,
  };
};

/** Capas con intervalos del documento, con su indice real. */
export const intervalTiers = (
  doc: AnnotationDocument,
): readonly { readonly index: number; readonly tier: IntervalTier }[] =>
  doc.tiers.flatMap((tier, index) => (isIntervalTier(tier) ? [{ index, tier }] : []));
