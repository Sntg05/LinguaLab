import { SPANISH_DEMO_YEISMO } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  EMPTY_HISTORY,
  asTable,
  draftOf,
  record,
  redo,
  toSaveDraft,
  toTable,
  undo,
} from "./state";

/**
 * El editor trabaja sobre un borrador, no sobre la entidad del dominio. La
 * única diferencia real es el identificador, y probarla es probar que un
 * borrador nunca se confunde con una tabla guardada.
 */

describe("asTable", () => {
  it("omite la capa alofónica y las notas cuando están vacías", () => {
    // La ausencia de `allophonic` significa «esta lengua no declara alófonos».
    // Escribir `allophonic: []` sería una afirmación distinta.
    const table = asTable({ ...EMPTY_DRAFT, name: "x" }, "id-1");

    expect(table).toEqual({
      id: "id-1",
      languageId: "",
      name: "x",
      version: 1,
      classes: {},
      rules: [],
      status: "draft",
    });
  });

  it("conserva la capa alofónica cuando tiene reglas", () => {
    const draft = { ...EMPTY_DRAFT, allophonic: [{ grapheme: "b", ipa: "β" }] };

    expect(asTable(draft, "id-1").allophonic).toEqual([{ grapheme: "b", ipa: "β" }]);
  });
});

describe("toTable / toSaveDraft", () => {
  it("no hay tabla guardada mientras el borrador no tenga identificador", () => {
    expect(toTable(EMPTY_DRAFT)).toBeNull();
    expect(toTable({ ...EMPTY_DRAFT, id: "id-1" })?.id).toBe("id-1");
  });

  it("no manda identificador al guardar una tabla nueva", () => {
    // El caso de uso genera el identificador; mandar una cadena vacía haría
    // que la tabla pareciera una actualización.
    expect(toSaveDraft(EMPTY_DRAFT)).not.toHaveProperty("id");
    expect(toSaveDraft({ ...EMPTY_DRAFT, id: "id-1" })).toHaveProperty("id", "id-1");
  });
});

describe("draftOf", () => {
  it("recupera una demo entera", () => {
    const draft = draftOf(SPANISH_DEMO_YEISMO);

    expect(draft.id).toBe("es-demo-yeismo");
    expect(draft.rules).toHaveLength(SPANISH_DEMO_YEISMO.rules.length);
    expect(draft.allophonic).toHaveLength(SPANISH_DEMO_YEISMO.allophonic?.length ?? 0);
    expect(draft.notes).toBe(SPANISH_DEMO_YEISMO.notes);
  });
});

describe("undo / redo", () => {
  it("vuelve al estado anterior y lo puede rehacer", () => {
    const first = { ...EMPTY_DRAFT, name: "primero" };
    const second = { ...EMPTY_DRAFT, name: "segundo" };

    const history = record(EMPTY_HISTORY, first);
    const stepBack = undo(history, second);

    expect(stepBack?.draft.name).toBe("primero");
    if (stepBack === null) {
      return;
    }

    const stepForward = redo(stepBack.history, stepBack.draft);
    expect(stepForward?.draft.name).toBe("segundo");
  });

  it("no hay nada que deshacer en una historia vacía", () => {
    expect(undo(EMPTY_HISTORY, EMPTY_DRAFT)).toBeNull();
    expect(redo(EMPTY_HISTORY, EMPTY_DRAFT)).toBeNull();
  });

  it("una edición nueva invalida el futuro", () => {
    const history = record(record(EMPTY_HISTORY, { ...EMPTY_DRAFT, name: "uno" }), {
      ...EMPTY_DRAFT,
      name: "dos",
    });

    // Registrar es editar: el futuro que describía el redo ya no existe.
    expect(history.future).toEqual([]);
  });
});
