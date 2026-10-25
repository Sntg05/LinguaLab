import { describe, expect, it } from "vitest";
import { createElanStrings } from "./strings";
import { describeNote, isReportEmpty, type ElanNoteView, type ElanReportView } from "./notes";

/**
 * El informe de perdida llega del adaptador como DATOS —codigos, nombres de
 * capa, cuentas— y la interfaz lo convierte en frases. Esta prueba fija esa
 * traduccion: cada codigo conocido produce una frase con su capa, y un codigo
 * desconocido no inventa nada.
 */

/** Las plantillas reales, recortadas a lo que esta prueba mira. */
const STRINGS = createElanStrings({
  "elan.note.gapFilled": "«{tier}»: {count} tramo(s) rellenado(s).",
  "elan.note.referenceAnnotations": "«{tier}»: {count} referencia(s).",
  "elan.note.annotationWithoutTime": "«{tier}»: {count} sin tiempo.",
  "elan.note.tierEmpty": "La capa «{tier}» esta vacia.",
  "elan.note.overlapDetected": "«{tier}»: {count} solapamiento(s).",
  "elan.note.pointTierDropped": "«{tier}»: {count} punto(s) fuera.",
  "elan.note.emptyIntervalsDropped": "«{tier}»: {count} vacio(s) fuera.",
  "elan.note.zeroLengthDropped": "«{tier}»: {count} de duracion cero.",
  "elan.note.timeRounded": "«{tier}»: {count} redondeado(s).",
  "elan.note.tierUnwritable": "«{tier}» no se pudo escribir.",
});

const EMPTY_REPORT: ElanReportView = {
  hierarchicalTiers: [],
  annotationReferences: [],
  controlledVocabularies: [],
  notes: [],
};

describe("describeNote", () => {
  it("traduce cada codigo conocido con el nombre de su capa", () => {
    const counted: readonly ElanNoteView[] = [
      { code: "gap-filled", tier: "palabra", count: 2 },
      { code: "reference-annotations", tier: "palabra", count: 3 },
      { code: "annotation-without-time", tier: "palabra", count: 4 },
      { code: "overlap-detected", tier: "palabra", count: 5 },
      { code: "point-tier-dropped", tier: "tono", count: 6 },
      { code: "empty-intervals-dropped", tier: "palabra", count: 7 },
      { code: "zero-length-dropped", tier: "palabra", count: 8 },
      { code: "time-rounded", tier: "palabra", count: 9 },
    ];

    for (const note of counted) {
      const line = describeNote(note, STRINGS);
      expect(line, `el codigo ${note.code} no se tradujo`).not.toBeNull();
      expect(line).toContain(note.tier);
      expect(line).toContain(String(note.count));
    }

    expect(describeNote({ code: "tier-empty", tier: "vacia" }, STRINGS)).toBe(
      "La capa «vacia» esta vacia.",
    );
    expect(describeNote({ code: "tier-unwritable", tier: "sin-nombre" }, STRINGS)).toBe(
      "«sin-nombre» no se pudo escribir.",
    );
  });

  it("no inventa una frase para un codigo que no conoce", () => {
    expect(describeNote({ code: "inventado", tier: "x", count: 1 }, STRINGS)).toBeNull();
  });
});

describe("isReportEmpty", () => {
  it("un informe sin listas ni notas esta vacio", () => {
    expect(isReportEmpty(EMPTY_REPORT)).toBe(true);
  });

  it("basta una capa jerarquica para que no lo este", () => {
    expect(isReportEmpty({ ...EMPTY_REPORT, hierarchicalTiers: ["palabra"] })).toBe(false);
  });

  it("una nota tambien cuenta", () => {
    expect(
      isReportEmpty({ ...EMPTY_REPORT, notes: [{ code: "gap-filled", tier: "x", count: 1 }] }),
    ).toBe(false);
  });
});
