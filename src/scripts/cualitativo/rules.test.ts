import { describe, expect, it } from "vitest";
import { qualitativeEn } from "../../i18n/messages/features/qualitative.en";
import { qualitativeEs } from "../../i18n/messages/features/qualitative.es";
import {
  alignNames,
  describeAgreementError,
  describeAlpha,
  describeCsvError,
  describeKappa,
  formatPercent,
  mergeCodebook,
} from "./rules";
import { QUALITATIVE_STRING_KEYS, createQualitativeStrings, parseQualitativeStrings } from "./strings";

const es = createQualitativeStrings(qualitativeEs);
const en = createQualitativeStrings(qualitativeEn);

describe("runtime strings", () => {
  it("every runtime key exists in both languages", () => {
    for (const key of QUALITATIVE_STRING_KEYS) {
      expect(qualitativeEs).toHaveProperty(key);
      expect(qualitativeEn).toHaveProperty(key);
    }
  });

  it("keeps only known keys with string values from the attribute", () => {
    expect(
      parseQualitativeStrings(
        JSON.stringify({ "qual.remove": "Quitar", "qual.mine": 3, "other.key": "x" }),
      ),
    ).toEqual({ "qual.remove": "Quitar" });
    expect(parseQualitativeStrings("not json")).toEqual({});
    expect(parseQualitativeStrings(undefined)).toEqual({});
  });
});

describe("error sentences", () => {
  it("name the row, column and value of a bad mark", () => {
    expect(describeCsvError({ code: "bad-mark", row: 4, column: 3, value: "sí" }, es)).toBe(
      "la fila 4, columna 3, dice «sí»: se espera 1, 0 o vacío.",
    );
  });

  it("name the line of an unclosed quote and the repeated code", () => {
    expect(describeCsvError({ code: "unclosed-quote", line: 7 }, en)).toBe(
      "there is an unclosed quote on line 7.",
    );
    expect(describeCsvError({ code: "duplicate-name", row: 3, name: "Identity" }, en)).toBe(
      "row 3 repeats the code “Identity”.",
    );
  });

  it("explain why sheets cannot be compared", () => {
    expect(describeAgreementError({ code: "too-few-sheets" }, es)).toBe(
      "Hacen falta al menos dos hojas para comparar.",
    );
    expect(describeAgreementError({ code: "text-mismatch", segment: "5", sheet: 2 }, es)).toContain(
      "El segmento 5 de la hoja 2",
    );
  });
});

describe("figures", () => {
  it("use the decimal comma in Spanish and the point in English", () => {
    expect(formatPercent(0.8333, "es")).toBe("83,3 %");
    expect(formatPercent(0.8333, "en")).toBe("83.3 %");
  });

  it("read kappa with its Landis and Koch band and alpha with Krippendorff's verdict", () => {
    expect(describeKappa(0.6667, "es", es)).toBe("0,667 (considerable)");
    expect(describeAlpha(0.743, "en", en)).toBe("0.743 (tentative)");
    expect(describeAlpha(0.85, "es", es)).toBe("0,850 (fiable)");
  });

  it("show a dash when a figure cannot be computed", () => {
    expect(describeKappa(null, "es", es)).toBe("—");
    expect(describeAlpha(null, "en", en)).toBe("—");
  });
});

describe("restoring a saved coding", () => {
  const codebook = [
    { name: "Identidad", definition: "def", include: "", exclude: "", example: "" },
  ];

  it("adds the sheet's missing codes without touching the existing ones", () => {
    expect(mergeCodebook(codebook, ["identidad", "Escuela"])).toEqual([
      codebook[0],
      { name: "Escuela", definition: "", include: "", exclude: "", example: "" },
    ]);
  });

  it("writes the sheet's codes the way the codebook writes them", () => {
    expect(alignNames(codebook, ["IDENTIDAD", "Escuela"])).toEqual(["Identidad", "Escuela"]);
  });
});
