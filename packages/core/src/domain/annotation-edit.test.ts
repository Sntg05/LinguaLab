import { describe, expect, it } from "vitest";
import {
  addTier,
  canRedoAnnotation,
  canUndoAnnotation,
  createEmptyDocument,
  createIntervalTier,
  fillTierGaps,
  findTierGaps,
  isIntervalTier,
  mergeIntervalWithNext,
  moveTier,
  moveTierBoundary,
  recordAnnotation,
  removeTier,
  renameTier,
  redoAnnotation,
  setIntervalText,
  splitIntervalAt,
  startAnnotationHistory,
  undoAnnotation,
} from "./annotation-edit";
import type { AnnotationDocument, IntervalTier } from "./annotation";

/**
 * Las operaciones de edicion de intervalos, sin DOM y sin puertos.
 *
 * POR QUE ESTAS PRUEBAS IMPORTAN MAS DE LO QUE PARECEN
 *
 * Estas funciones son todo lo que hay entre un clic en «Dividir» y un TextGrid
 * que Praat abre sin quejarse. Una frontera movida dos microsegundos fuera de su
 * intervalo vecino produce un archivo con intervalos solapados que Praat rechaza
 * con un mensaje que no nombra la causa. Cada prueba de aqui fija una invariante
 * que el archivo exportado necesita.
 */

const words: IntervalTier = {
  name: "words",
  kind: "interval",
  items: [
    { start: 0, end: 0.5, text: "hola" },
    { start: 0.5, end: 1, text: "mundo" },
  ],
};

const base: AnnotationDocument = { tiers: [words], xmin: 0, xmax: 1 };

describe("createEmptyDocument", () => {
  it("arranca con una capa de intervalos que cubre el documento", () => {
    const doc = createEmptyDocument(2.5);

    expect(doc.xmin).toBe(0);
    expect(doc.xmax).toBe(2.5);
    expect(doc.tiers).toHaveLength(1);
    const tier = doc.tiers[0];
    expect(tier && isIntervalTier(tier)).toBe(true);
    if (tier && isIntervalTier(tier)) {
      expect(tier.items).toEqual([{ start: 0, end: 2.5, text: "" }]);
    }
  });

  it("acepta un xmin distinto de cero", () => {
    const doc = createEmptyDocument(3, 1);

    expect(doc.xmin).toBe(1);
    expect(doc.tiers[0]?.kind).toBe("interval");
  });
});

describe("findTierGaps / fillTierGaps", () => {
  it("un tier contiguo no tiene huecos", () => {
    expect(findTierGaps(words, 0, 1)).toEqual([]);
  });

  it("informa el hueco que deja un intervalo borrado", () => {
    const withGap: IntervalTier = {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.25, text: "a" },
        { start: 0.5, end: 1, text: "b" },
      ],
    };

    expect(findTierGaps(withGap, 0, 1)).toEqual([{ start: 0.25, end: 0.5 }]);
  });

  it("informa tambien el hueco hasta el final del documento", () => {
    const short: IntervalTier = {
      name: "words",
      kind: "interval",
      items: [{ start: 0, end: 0.5, text: "a" }],
    };

    expect(findTierGaps(short, 0, 1)).toEqual([{ start: 0.5, end: 1 }]);
  });

  it("rellena los huecos con intervalos vacios y conserva el texto existente", () => {
    const withGap: IntervalTier = {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.25, text: "a" },
        { start: 0.5, end: 1, text: "b" },
      ],
    };

    const filled = fillTierGaps(withGap, 0, 1);

    expect(filled.items).toEqual([
      { start: 0, end: 0.25, text: "a" },
      { start: 0.25, end: 0.5, text: "" },
      { start: 0.5, end: 1, text: "b" },
    ]);
    expect(findTierGaps(filled, 0, 1)).toEqual([]);
  });

  it("acepta intervalos de duracion cero sin inventarles un hueco", () => {
    const zero: IntervalTier = {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.5, text: "a" },
        { start: 0.5, end: 0.5, text: "" },
        { start: 0.5, end: 1, text: "b" },
      ],
    };

    expect(findTierGaps(zero, 0, 1)).toEqual([]);
  });

  it("tolera diferencias de punto flotante por debajo del epsilon", () => {
    const almost: IntervalTier = {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.1 + 0.2, text: "a" },
        { start: 0.3, end: 1, text: "b" },
      ],
    };

    expect(findTierGaps(almost, 0, 1)).toEqual([]);
  });
});

describe("capas", () => {
  it("addTier agrega una capa nueva sin tocar las existentes", () => {
    const doc = addTier(base, "notes", "interval");

    expect(doc.tiers).toHaveLength(2);
    expect(doc.tiers[0]).toBe(words);
    expect(doc.tiers[1]?.name).toBe("notes");
  });

  it("renameTier cambia solo el nombre", () => {
    const doc = renameTier(base, 0, "palabras");

    expect(doc.tiers[0]?.name).toBe("palabras");
    expect(base.tiers[0]?.name).toBe("words");
  });

  it("removeTier no deja el documento sin capas", () => {
    expect(removeTier(base, 0)).toBe(base);
  });

  it("moveTier intercambia dos capas", () => {
    const two = addTier(base, "notes", "point");

    const moved = moveTier(two, 1, -1);

    expect(moved.tiers.map((tier) => tier.name)).toEqual(["notes", "words"]);
  });

  it("moveTier fuera de rango devuelve el mismo documento", () => {
    expect(moveTier(base, 0, -1)).toBe(base);
  });
});

describe("splitIntervalAt", () => {
  it("divide el intervalo que contiene el instante en dos", () => {
    const doc = splitIntervalAt(base, 0, 0.25);

    const tier = doc.tiers[0];
    expect(tier && isIntervalTier(tier)).toBe(true);
    if (tier && isIntervalTier(tier)) {
      expect(tier.items).toEqual([
        { start: 0, end: 0.25, text: "hola" },
        { start: 0.25, end: 0.5, text: "" },
        { start: 0.5, end: 1, text: "mundo" },
      ]);
    }
  });

  it("no divide si el instante cae justo en una frontera", () => {
    expect(splitIntervalAt(base, 0, 0.5)).toBe(base);
  });

  it("no divide fuera del documento", () => {
    expect(splitIntervalAt(base, 0, 1.5)).toBe(base);
  });

  it("no divide en una capa de puntos", () => {
    const points = addTier(base, "notes", "point");

    expect(splitIntervalAt(points, 1, 0.5)).toBe(points);
  });
});

describe("mergeIntervalWithNext", () => {
  it("fusiona dos intervalos conservando el texto del primero", () => {
    const doc = mergeIntervalWithNext(base, 0, 0);

    const tier = doc.tiers[0];
    if (tier && isIntervalTier(tier)) {
      expect(tier.items).toEqual([{ start: 0, end: 1, text: "hola" }]);
    }
  });

  it("no fusiona el ultimo intervalo con un siguiente que no existe", () => {
    expect(mergeIntervalWithNext(base, 0, 1)).toBe(base);
  });
});

describe("setIntervalText", () => {
  it("cambia el texto de un intervalo y deja el resto intacto", () => {
    const doc = setIntervalText(base, 0, 1, "mundo!");

    const tier = doc.tiers[0];
    if (tier && isIntervalTier(tier)) {
      expect(tier.items[1]?.text).toBe("mundo!");
      expect(tier.items[0]?.text).toBe("hola");
    }
  });

  it("acepta texto vacio: es como se borra una etiqueta sin borrar el intervalo", () => {
    const doc = setIntervalText(base, 0, 0, "");

    const tier = doc.tiers[0];
    if (tier && isIntervalTier(tier)) {
      expect(tier.items[0]?.text).toBe("");
    }
  });
});

describe("moveTierBoundary", () => {
  it("mueve la frontera entre dos intervalos vecinos", () => {
    const doc = moveTierBoundary(base, 0, 0, 0.75);

    const tier = doc.tiers[0];
    if (tier && isIntervalTier(tier)) {
      expect(tier.items[0]).toEqual({ start: 0, end: 0.75, text: "hola" });
      expect(tier.items[1]).toEqual({ start: 0.75, end: 1, text: "mundo" });
    }
  });

  it("recorta la frontera dentro de los dos intervalos vecinos", () => {
    const narrow: AnnotationDocument = {
      tiers: [
        {
          name: "words",
          kind: "interval",
          items: [
            { start: 0, end: 0.4, text: "a" },
            { start: 0.4, end: 0.6, text: "b" },
          ],
        },
      ],
      xmin: 0,
      xmax: 1,
    };

    const doc = moveTierBoundary(narrow, 0, 0, 5);

    const tier = doc.tiers[0];
    if (tier && isIntervalTier(tier)) {
      expect(tier.items[0]?.end).toBe(0.6);
      expect(tier.items[1]?.start).toBe(0.6);
    }
  });

  it("no hay frontera despues del ultimo intervalo", () => {
    expect(moveTierBoundary(base, 0, 1, 0.8)).toBe(base);
  });
});

describe("historial de deshacer y rehacer", () => {
  it("arranca sin nada que deshacer", () => {
    const history = startAnnotationHistory(base);

    expect(canUndoAnnotation(history)).toBe(false);
    expect(canRedoAnnotation(history)).toBe(false);
  });

  it("deshace y rehace una edicion", () => {
    const edited = setIntervalText(base, 0, 0, "otra cosa");
    const history = recordAnnotation(startAnnotationHistory(base), edited);

    expect(history.present).toBe(edited);

    const undone = undoAnnotation(history);
    expect(undone.present).toBe(base);
    expect(canRedoAnnotation(undone)).toBe(true);

    const redone = redoAnnotation(undone);
    expect(redone.present).toBe(edited);
  });

  it("registrar el mismo documento no agrega un paso", () => {
    const history = startAnnotationHistory(base);

    expect(recordAnnotation(history, base)).toBe(history);
  });

  it("una edicion nueva descarta el futuro que se habia deshecho", () => {
    const first = setIntervalText(base, 0, 0, "uno");
    const second = setIntervalText(base, 0, 0, "dos");
    const undone = undoAnnotation(recordAnnotation(startAnnotationHistory(base), first));

    const history = recordAnnotation(undone, second);

    expect(canRedoAnnotation(history)).toBe(false);
  });

  it("respeta el limite de pasos guardados", () => {
    let history = startAnnotationHistory(base, 2);
    for (const text of ["a", "b", "c", "d"]) {
      history = recordAnnotation(history, setIntervalText(history.present, 0, 0, text));
    }

    expect(history.past).toHaveLength(2);

    const once = undoAnnotation(history);
    const twice = undoAnnotation(once);
    const thrice = undoAnnotation(twice);

    expect(once.present).not.toBe(twice.present);
    // El limite agoto el pasado: el tercer deshacer no inventa un estado.
    expect(thrice).toBe(twice);
  });
});

describe("createIntervalTier", () => {
  it("crea una capa con un unico intervalo vacio", () => {
    expect(createIntervalTier("words", 0, 1.5)).toEqual({
      name: "words",
      kind: "interval",
      items: [{ start: 0, end: 1.5, text: "" }],
    });
  });
});
