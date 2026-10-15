import { describe, expect, it } from "vitest";
import { COMMUNITY_VALIDATION_NOTICE, INDIGENOUS_TEMPLATES } from "./indigenous-templates";

describe("INDIGENOUS_TEMPLATES", () => {
  it("cubre las cuatro lenguas con sus codigos ISO 639-3 verificados", () => {
    expect(INDIGENOUS_TEMPLATES.map((table) => table.languageId)).toEqual([
      "inb",
      "guc",
      "pbb",
      "arh",
    ]);
  });

  it("no inventa ni una sola correspondencia", () => {
    for (const table of INDIGENOUS_TEMPLATES) {
      expect(table.rules).toHaveLength(0);
      expect(table.classes).toEqual({});
      expect(table.status).toBe("draft");
    }
  });

  it("todas llevan el aviso exacto sobre hablantes y fuentes de la comunidad", () => {
    for (const table of INDIGENOUS_TEMPLATES) {
      expect(table.notes ?? "").toContain(COMMUNITY_VALIDATION_NOTICE);
      expect(COMMUNITY_VALIDATION_NOTICE).toBe(
        "Esta tabla debe construirse y validarse con hablantes y fuentes ling\u00fc\u00edsticas de la comunidad",
      );
    }
  });

  it("cita el Glottocode como fuente", () => {
    const glottocodes = ["inga1252", "wayu1243", "paez1247", "arhu1242"];
    for (let index = 0; index < glottocodes.length; index += 1) {
      const glottocode = glottocodes[index];
      const table = INDIGENOUS_TEMPLATES[index];
      if (glottocode === undefined || table === undefined) {
        continue;
      }
      expect(table.notes ?? "").toContain(glottocode);
    }
  });
});
