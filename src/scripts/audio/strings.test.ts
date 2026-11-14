import { describe, expect, it } from "vitest";
import { en } from "../../i18n/messages/en";
import { es } from "../../i18n/messages/es";
import { format, formatSeconds } from "./strings";

describe("mensaje de anotacion que no coincide con el audio", () => {
  // `formatSeconds` ya trae su «s»: si la plantilla agrega otra, sale «1.000 s s».
  for (const [locale, messages] of [
    ["es", es],
    ["en", en],
  ] as const) {
    it(`no repite la unidad de los segundos (${locale})`, () => {
      const text = format(messages["audio.status.mismatch"], {
        xmax: formatSeconds(1),
        duration: formatSeconds(2),
      });
      expect(text).not.toMatch(/ s s\b/);
      expect(text).toContain("1.000 s");
    });
  }
});
