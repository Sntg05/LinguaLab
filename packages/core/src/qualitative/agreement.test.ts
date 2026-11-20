import { describe, expect, it } from "vitest";
import {
  agreementReport,
  agreementToCsv,
  alphaVerdict,
  cohenKappa,
  kappaBand,
  krippendorffAlphaNominal,
  percentAgreement,
} from "./agreement";
import { createCodingSheet, setMark, type CodingSheet } from "./coding";
import { parseCsvRecords } from "./csv";
import { IRR_REFERENCE } from "./irr-reference";

const TOLERANCE = 12;

describe("agreement measures match R's irr package", () => {
  for (const reference of IRR_REFERENCE) {
    it(`${reference.name}: percent agreement equals irr::agree`, () => {
      expect(percentAgreement(reference.ratings)).toBeCloseTo(
        reference.agree ?? Number.NaN,
        TOLERANCE,
      );
    });

    it(`${reference.name}: Cohen's kappa equals irr::kappa2`, () => {
      const kappa = cohenKappa(reference.ratings);
      if (reference.kappa === null) {
        expect(kappa).toBeNull();
      } else {
        expect(kappa).toBeCloseTo(reference.kappa, TOLERANCE);
      }
    });
  }

  for (const reference of IRR_REFERENCE.filter((item) => item.name !== "no_variation")) {
    it(`${reference.name}: nominal alpha equals irr::kripp.alpha`, () => {
      expect(krippendorffAlphaNominal(reference.ratings)).toBeCloseTo(
        reference.alpha ?? Number.NaN,
        TOLERANCE,
      );
    });
  }

  it("Krippendorff's worked example gives the published 0.743", () => {
    const example = IRR_REFERENCE.find((item) => item.name === "krippendorff_example");
    expect(krippendorffAlphaNominal(example?.ratings ?? [])).toBeCloseTo(0.743, 3);
  });

  it("alpha is undefined (null) without variation, where irr returns 1", () => {
    const constant = IRR_REFERENCE.find((item) => item.name === "no_variation");
    expect(constant?.alpha).toBe(1);
    expect(krippendorffAlphaNominal(constant?.ratings ?? [])).toBeNull();
  });
});

describe("edge cases", () => {
  it("kappa needs exactly two coders and some complete units", () => {
    expect(cohenKappa([[1, 0]])).toBeNull();
    expect(
      cohenKappa([
        [1, 0],
        [1, 0],
        [1, 0],
      ]),
    ).toBeNull();
    expect(
      cohenKappa([
        [1, null],
        [null, 0],
      ]),
    ).toBeNull();
  });

  it("percent agreement is null when no unit was coded by everyone", () => {
    expect(
      percentAgreement([
        [1, null],
        [null, 0],
      ]),
    ).toBeNull();
  });

  it("alpha is null with fewer than two pairable values", () => {
    expect(
      krippendorffAlphaNominal([
        [1, null],
        [null, 0],
      ]),
    ).toBeNull();
  });

  it("reads alpha with Krippendorff's thresholds and kappa with Landis and Koch's bands", () => {
    expect([0.8, 0.79, 0.667, 0.66].map(alphaVerdict)).toEqual([
      "reliable",
      "tentative",
      "tentative",
      "unreliable",
    ]);
    expect([-0.1, 0.2, 0.4, 0.6, 0.8, 0.81].map(kappaBand)).toEqual([
      "poor",
      "slight",
      "fair",
      "moderate",
      "substantial",
      "almost-perfect",
    ]);
  });
});

const sheetFrom = (
  codes: readonly string[],
  rows: readonly (readonly (0 | 1)[])[],
): CodingSheet => {
  let sheet = createCodingSheet(
    rows.map((_, index) => `segment ${index + 1}`),
    codes,
  );
  for (const [segment, row] of rows.entries()) {
    for (const [code, value] of row.entries()) {
      sheet = setMark(sheet, segment, code, value === 1);
    }
  }
  return sheet;
};

describe("agreementReport", () => {
  it("computes each code over the segments of both sheets", () => {
    const reference = IRR_REFERENCE.find((item) => item.name === "binary_two_coders");
    const [first = [], second = []] = reference?.ratings ?? [];
    const a = sheetFrom(
      ["Identity"],
      first.map((value) => [value === 1 ? 1 : 0]),
    );
    const b = sheetFrom(
      ["identity "],
      second.map((value) => [value === 1 ? 1 : 0]),
    );

    const report = agreementReport([a, b]);
    if (!report.ok) throw new Error("expected a report");

    expect(report.value.coders).toBe(2);
    expect(report.value.segments).toBe(12);
    expect(report.value.codes).toHaveLength(1);
    const [row] = report.value.codes;
    expect(row?.code).toBe("Identity");
    expect(row?.complete).toBe(12);
    expect(row?.kappa).toBeCloseTo(reference?.kappa ?? 0, TOLERANCE);
    expect(row?.alpha).toBeCloseTo(reference?.alpha ?? 0, TOLERANCE);
    expect(row?.percent).toBeCloseTo(reference?.agree ?? 0, TOLERANCE);
  });

  it("treats a code one sheet lacks as not coded by that person", () => {
    const a = sheetFrom(
      ["A", "B"],
      [
        [1, 1],
        [0, 1],
        [1, 0],
      ],
    );
    const b = sheetFrom(["A"], [[1], [0], [1]]);
    const report = agreementReport([a, b]);
    if (!report.ok) throw new Error("expected a report");

    const codeB = report.value.codes.find((row) => row.code === "B");
    expect(codeB).toEqual({
      code: "B",
      complete: 0,
      pairable: 0,
      percent: null,
      kappa: null,
      alpha: null,
    });
  });

  it("refuses fewer than two sheets", () => {
    expect(agreementReport([sheetFrom(["A"], [[1]])])).toEqual({
      ok: false,
      error: { code: "too-few-sheets" },
    });
  });

  it("refuses sheets whose segments have different text", () => {
    const a = createCodingSheet(["Hola, ¿cómo estás?"], ["A"]);
    const b = createCodingSheet(["Otra cosa"], ["A"]);
    expect(agreementReport([a, b])).toEqual({
      ok: false,
      error: { code: "text-mismatch", segment: "1", sheet: 2 },
    });
  });

  it("ignores whitespace differences in the segment text", () => {
    const a = createCodingSheet(["Hola,  ¿cómo estás?"], ["A"]);
    const b = createCodingSheet([" Hola, ¿cómo estás? "], ["A"]);
    expect(agreementReport([a, b]).ok).toBe(true);
  });

  it("exports one row per code, with empty cells for what cannot be computed", () => {
    const a = sheetFrom(
      ["A", "B, with comma"],
      [
        [1, 1],
        [0, 1],
      ],
    );
    const b = sheetFrom(["A"], [[1], [0]]);
    const report = agreementReport([a, b]);
    if (!report.ok) throw new Error("expected a report");

    const rows = parseCsvRecords(agreementToCsv(report.value));
    expect(rows).toEqual({
      ok: true,
      value: [
        [
          "code",
          "complete_segments",
          "pairable_segments",
          "percent_agreement",
          "cohen_kappa",
          "krippendorff_alpha",
        ],
        ["A", "2", "2", "1.0000", "1.0000", "1.0000"],
        ["B, with comma", "0", "0", "", "", ""],
      ],
    });
  });
});
