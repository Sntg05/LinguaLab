import { parseCsvRecords } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { compareEn } from "../../i18n/messages/features/compare.en";
import { compareEs } from "../../i18n/messages/features/compare.es";
import { keywords, prepareDocument } from "../tools/compare";
import {
  admit,
  describeReadError,
  formatP,
  frequencyCsv,
  keywordsCsv,
  profileCsv,
  profileRows,
} from "./rules";
import { COMPARE_STRING_KEYS, createCompareStrings, parseCompareStrings } from "./strings";

const es = createCompareStrings(compareEs);
const en = createCompareStrings(compareEn);

const A = prepareDocument({ name: "a, con coma.docx", text: "La lengua de la casa. La lengua, la lengua." });
const B = prepareDocument({ name: "b.pdf", text: "La escuela y la escuela. La lengua." });

describe("runtime strings", () => {
  it("every runtime key exists in both languages", () => {
    for (const key of COMPARE_STRING_KEYS) {
      expect(compareEs).toHaveProperty(key);
      expect(compareEn).toHaveProperty(key);
    }
  });

  it("keeps only known keys with string values", () => {
    expect(parseCompareStrings(JSON.stringify({ "cmp.none": "Ninguna.", "cmp.remove": 1, x: "y" }))).toEqual({
      "cmp.none": "Ninguna.",
    });
    expect(parseCompareStrings("{")).toEqual({});
  });
});

describe("reading errors and admission", () => {
  it("names the file and says what to do with a scanned PDF", () => {
    expect(describeReadError({ code: "no-text" }, "escaneo.pdf", es)).toContain(
      "«escaneo.pdf» no tiene texto que leer",
    );
    expect(describeReadError({ code: "no-text" }, "scan.pdf", es)).toContain("OCR");
    expect(describeReadError({ code: "encrypted" }, "x.pdf", en)).toBe(
      "“x.pdf” has a password: save it without one and load it again.",
    );
    expect(describeReadError({ code: "too-large", bytes: 1, limit: 1 }, "x.docx", es)).toBe(
      "«x.docx» pasa de 10 MB.",
    );
  });

  it("admits up to three different files", () => {
    expect(admit([], "a")).toBe("ok");
    expect(admit(["a", "b"], "c")).toBe("ok");
    expect(admit(["a", "b", "c"], "d")).toBe("tooMany");
    expect(admit(["a"], "a")).toBe("duplicate");
  });
});

describe("figures", () => {
  it("writes p with three significant digits and a floor", () => {
    expect(formatP(0.04321, "es")).toBe("0,0432");
    expect(formatP(0.04321, "en")).toBe("0.0432");
    expect(formatP(1e-9, "es")).toBe("< 0,0001");
  });

  it("profiles every document, counting stopwords only in the word total", () => {
    const rows = profileRows([A, B], "es", "es", es);
    expect(rows[0]).toEqual(["Palabras", "9", "7"]);
    expect(rows[1]).toEqual(["Formas distintas", "2", "2"]);
    expect(rows[5]).toEqual(["Oraciones", "2", "2"]);
  });
});

describe("downloads", () => {
  it("writes keywords with full precision, a quoted document name and both directions", () => {
    const lists = [0, 1].map((index) => keywords([A, B], index, { stopwords: "es", minCount: 1, limit: 10, alpha: 1 }));
    const parsed = parseCsvRecords(keywordsCsv([A, B], lists));
    if (!parsed.ok) throw new Error("csv");
    const [header, ...rows] = parsed.value;
    expect(header).toEqual(["document", "direction", "word", "here", "rest", "here_per_10k", "rest_per_10k", "g2", "p", "log_ratio"]);
    const lengua = rows.find((row) => row[0] === "a, con coma.docx" && row[2] === "lengua");
    expect(lengua?.slice(1, 5)).toEqual(["positive", "lengua", "3", "1"]);
    expect(Number(lengua?.[7])).toBe(lists[0]?.positive.find((row) => row.word === "lengua")?.g2);
    expect(rows.some((row) => row[1] === "negative")).toBe(true);
  });

  it("writes frequencies and the profile with one column group per document", () => {
    const frequency = parseCsvRecords(frequencyCsv([A, B], "es", 5));
    expect(frequency.ok && frequency.value[0]).toEqual([
      "word",
      "a, con coma.docx_count",
      "a, con coma.docx_per_10k",
      "b.pdf_count",
      "b.pdf_per_10k",
    ]);
    const profile = parseCsvRecords(profileCsv([A, B], "es"));
    expect(profile.ok && profile.value.map((row) => row.slice(0, 3))).toEqual([
      ["document", "words", "types"],
      ["a, con coma.docx", "9", "2"],
      ["b.pdf", "7", "2"],
    ]);
  });
});
