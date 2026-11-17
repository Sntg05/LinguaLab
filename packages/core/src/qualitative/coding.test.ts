import { describe, expect, it } from "vitest";
import { codebookToCsv, parseCodebookCsv, type QualitativeCode } from "./codebook";
import {
  codingToCsv,
  createCodingSheet,
  parseCodingCsv,
  segmentText,
  setMark,
  withCodes,
} from "./coding";
import {
  codeFrequencies,
  cooccurrenceMatrix,
  cooccurrenceToCsv,
  frequenciesToCsv,
} from "./cooccurrence";
import { parseCsvRecords } from "./csv";

describe("parseCsvRecords", () => {
  it("reads quoted commas, doubled quotes, line breaks inside fields and CRLF", () => {
    expect(parseCsvRecords('a,"b, c"\r\n"say ""hi""","two\nlines"\r\n')).toEqual({
      ok: true,
      value: [
        ["a", "b, c"],
        ['say "hi"', "two\nlines"],
      ],
    });
  });

  it("drops a byte-order mark and blank lines", () => {
    expect(parseCsvRecords("﻿a,b\n\n1,2\n")).toEqual({
      ok: true,
      value: [
        ["a", "b"],
        ["1", "2"],
      ],
    });
  });

  it("names the line of an unclosed quote", () => {
    expect(parseCsvRecords('a,b\n1,"open\n')).toEqual({
      ok: false,
      error: { code: "unclosed-quote", line: 2 },
    });
  });
});

describe("segmentText", () => {
  const text =
    "Entrevistadora: ¿Dónde aprendiste?\r\nParticipante: En casa,\n  con mi abuela.\n\n\nOtra parte";

  it("splits by line, dropping empty lines and extra spaces", () => {
    expect(segmentText(text, "line")).toEqual([
      "Entrevistadora: ¿Dónde aprendiste?",
      "Participante: En casa,",
      "con mi abuela.",
      "Otra parte",
    ]);
  });

  it("splits by paragraph at blank lines", () => {
    expect(segmentText(text, "paragraph")).toEqual([
      "Entrevistadora: ¿Dónde aprendiste? Participante: En casa, con mi abuela.",
      "Otra parte",
    ]);
  });
});

const CODES: readonly QualitativeCode[] = [
  {
    name: "Identidad",
    definition: "La persona se nombra como hablante de una lengua",
    include: "«soy hablante», «mi lengua»",
    exclude: "Opiniones sobre otras personas",
    example: "Yo soy wayuu, hablo wayuunaiki",
  },
  { name: "Escuela, uso", definition: 'Uso "en el aula"', include: "", exclude: "", example: "" },
];

describe("codebook CSV", () => {
  it("round-trips every field, including commas and quotes", () => {
    expect(parseCodebookCsv(codebookToCsv(CODES))).toEqual({ ok: true, value: CODES });
  });

  it("only requires the code column, in any position", () => {
    expect(parseCodebookCsv("definition,code\nPor qué,Motivo\n")).toEqual({
      ok: true,
      value: [{ name: "Motivo", definition: "Por qué", include: "", exclude: "", example: "" }],
    });
  });

  it("names the row of an empty or repeated code", () => {
    expect(parseCodebookCsv("code,definition\nA,x\n ,sin nombre\n")).toEqual({
      ok: false,
      error: { code: "empty-name", row: 3 },
    });
    expect(parseCodebookCsv("code\nA\n a \n")).toEqual({
      ok: false,
      error: { code: "duplicate-name", row: 3, name: "a" },
    });
  });

  it("refuses a file without a code column or without codes", () => {
    expect(parseCodebookCsv("name\nA\n")).toEqual({
      ok: false,
      error: { code: "missing-code-column" },
    });
    expect(parseCodebookCsv("code\n")).toEqual({ ok: false, error: { code: "empty" } });
    expect(parseCodebookCsv("")).toEqual({ ok: false, error: { code: "empty" } });
  });
});

describe("coding sheet", () => {
  const base = createCodingSheet(["uno, con coma", 'dos "citado"', "tres"], ["A", "B"]);
  const coded = setMark(setMark(setMark(base, 0, 0, true), 0, 1, true), 2, 1, true);

  it("starts with nothing applied and changes one mark without touching the original", () => {
    expect(base.segments.map((segment) => segment.marks)).toEqual([
      [false, false],
      [false, false],
      [false, false],
    ]);
    expect(coded.segments.map((segment) => segment.marks)).toEqual([
      [true, true],
      [false, false],
      [false, true],
    ]);
  });

  it("keeps the marks of codes that stay when the codebook changes", () => {
    const next = withCodes(coded, ["B", "C"]);
    expect(next.codes).toEqual(["B", "C"]);
    expect(next.segments.map((segment) => segment.marks)).toEqual([
      [true, false],
      [false, false],
      [true, false],
    ]);
  });

  it("round-trips through CSV, including a missing mark", () => {
    const withMissing = setMark(coded, 1, 0, null);
    const csv = codingToCsv(withMissing);
    expect(csv.split("\n")[0]).toBe("segment,text,A,B");
    expect(csv.split("\n")[2]).toBe('2,"dos ""citado""",,0');
    expect(parseCodingCsv(csv)).toEqual({ ok: true, value: withMissing });
  });

  it("names the row and column of a mark that is not 0, 1 or empty", () => {
    expect(parseCodingCsv("segment,text,A\n1,hola,sí\n")).toEqual({
      ok: false,
      error: { code: "bad-mark", row: 2, column: 3, value: "sí" },
    });
  });

  it("refuses a wrong header, no codes, repeated codes or repeated segments", () => {
    expect(parseCodingCsv("id,text,A\n1,hola,1\n")).toEqual({
      ok: false,
      error: { code: "bad-header" },
    });
    expect(parseCodingCsv("segment,text\n1,hola\n")).toEqual({
      ok: false,
      error: { code: "no-codes" },
    });
    expect(parseCodingCsv("segment,text,A,a\n1,hola,1,0\n")).toEqual({
      ok: false,
      error: { code: "bad-code-name", column: 4 },
    });
    expect(parseCodingCsv("segment,text,A\n1,hola,1\n1,chao,0\n")).toEqual({
      ok: false,
      error: { code: "duplicate-segment", row: 3, segment: "1" },
    });
    expect(parseCodingCsv("segment,text,A\n")).toEqual({ ok: false, error: { code: "empty" } });
  });

  it("numbers segments without an id by their position", () => {
    const parsed = parseCodingCsv("segment,text,A\n,hola,1\n,chao,0\n");
    expect(parsed.ok && parsed.value.segments.map((segment) => segment.id)).toEqual(["1", "2"]);
  });
});

describe("frequencies and co-occurrences", () => {
  const sheet = setMark(
    setMark(
      setMark(createCodingSheet(["a", "b", "c", "d"], ["A", "B", "C"]), 0, 0, true),
      0,
      1,
      true,
    ),
    2,
    1,
    true,
  );

  it("counts segments per code and their share of the material", () => {
    expect(codeFrequencies(sheet)).toEqual([
      { code: "A", segments: 1, share: 0.25 },
      { code: "B", segments: 2, share: 0.5 },
      { code: "C", segments: 0, share: 0 },
    ]);
  });

  it("counts segments where both codes apply, with frequencies on the diagonal", () => {
    expect(cooccurrenceMatrix(sheet)).toEqual([
      [1, 1, 0],
      [1, 2, 0],
      [0, 0, 0],
    ]);
  });

  it("exports both tables as CSV", () => {
    expect(frequenciesToCsv(sheet)).toBe(
      "code,segments,share\nA,1,0.2500\nB,2,0.5000\nC,0,0.0000\n",
    );
    expect(cooccurrenceToCsv(sheet)).toBe("code,A,B,C\nA,1,1,0\nB,1,2,0\nC,0,0,0\n");
  });
});
