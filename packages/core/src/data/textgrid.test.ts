import { describe, expect, it } from "vitest";
import type { AnnotationDocument } from "../domain/annotation";
import { fillTierGaps, findTierGaps, isIntervalTier } from "../domain/annotation-edit";
import type { TextGridError } from "../ports/textgrid-codec";
import { isErr, isOk, type Result } from "../result";
import { runTextGridCodecPortContract } from "../testing/contracts/textgrid-codec";
import {
  ANNOTATION_CSV_HEADER,
  createTextGridCodec,
  decodeTextGridBytes,
  exportAnnotationCsv,
  isTextGridTooLarge,
  MAX_TEXTGRID_BYTES,
  parseTextGridBytes,
  parseTextGridText,
  serializeTextGrid,
} from "./textgrid";

/**
 * El codec de TextGrid, con archivos de referencia y casos limite.
 *
 * POR QUE ESTOS GOLDEN FILES ESTAN EN EL TEST Y NO EN e2e/fixtures
 *
 * Lo que se comprueba aqui es el texto: el formato de Praat. Un archivo binario
 * en `e2e/fixtures` habria que abrirlo, y quien lee la prueba no veria que
 * contiene. Los dos archivos de referencia —formato largo y formato corto del
 * MISMO TextGrid— estan escritos enteros, uno debajo del otro, para que la
 * equivalencia entre los dos formatos se pueda leer de un vistazo.
 */

/** Lo que Praat escribe con «Save as text file» para el mismo TextGrid. */
const LONG_FORMAT = `File type = "ooTextFile"
Object class = "TextGrid"

xmin = 0 
xmax = 1.5 
tiers? <exists> 
size = 2 
item []: 
    item [1]:
        class = "IntervalTier" 
        name = "words" 
        xmin = 0 
        xmax = 1.5 
        intervals: size = 2 
        intervals [1]:
            xmin = 0 
            xmax = 0.5 
            text = "hola" 
        intervals [2]:
            xmin = 0.5 
            xmax = 1.5 
            text = "a ""b"" c" 
    item [2]:
        class = "TextTier" 
        name = "notes" 
        xmin = 0 
        xmax = 1.5 
        points: size = 1 
        points [1]:
            number = 0.75 
            mark = "x" 
`;

/** El mismo TextGrid en formato corto: valores posicionales, sin claves. */
const SHORT_FORMAT = `File type = "ooTextFile"
Object class = "TextGrid"

0 
1.5 
<exists> 
2 
"IntervalTier" 
"words" 
0 
1.5 
2 
0 
0.5 
"hola" 
0.5 
1.5 
"a ""b"" c" 
"TextTier" 
"notes" 
0 
1.5 
1 
0.75 
"x" 
`;

const GOLDEN_DOCUMENT: AnnotationDocument = {
  xmin: 0,
  xmax: 1.5,
  tiers: [
    {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.5, text: "hola" },
        { start: 0.5, end: 1.5, text: 'a "b" c' },
      ],
    },
    {
      name: "notes",
      kind: "point",
      points: [{ time: 0.75, text: "x" }],
    },
  ],
};

/* --- Codificadores de prueba ---------------------------------------------
   Se escriben a mano, y no con `TextEncoder`, porque `packages/core` compila
   sin `lib.DOM` ni tipos de Node: el nucleo no puede nombrar esas APIs ni en
   sus pruebas, que es justo la garantia que se quiere conservar. */

const encodeUtf8 = (text: string): Uint8Array => {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
};

const encodeUtf16 = (text: string, littleEndian: boolean): Uint8Array => {
  const body = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    body[index * 2 + (littleEndian ? 0 : 1)] = code & 0xff;
    body[index * 2 + (littleEndian ? 1 : 0)] = (code >> 8) & 0xff;
  }
  return body;
};

const withBom = (bom: readonly number[], body: Uint8Array): Uint8Array => {
  const bytes = new Uint8Array(bom.length + body.length);
  bytes.set(bom, 0);
  bytes.set(body, bom.length);
  return bytes;
};

const expectError = <T>(result: Result<T, TextGridError>, code: TextGridError["code"]): void => {
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.code).toBe(code);
  }
};

describe("parseTextGridText: los dos formatos de Praat", () => {
  it("lee el formato largo", () => {
    const parsed = parseTextGridText(LONG_FORMAT);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value.document).toEqual(GOLDEN_DOCUMENT);
      expect(parsed.value.gaps).toEqual([]);
    }
  });

  it("lee el formato corto y produce el mismo documento", () => {
    const parsed = parseTextGridText(SHORT_FORMAT);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value.document).toEqual(GOLDEN_DOCUMENT);
    }
  });

  it("desescapa las comillas dobles duplicadas", () => {
    const parsed = parseTextGridText(LONG_FORMAT);

    if (isOk(parsed)) {
      const tier = parsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        expect(tier.items[1]?.text).toBe('a "b" c');
      }
    }
  });
});

describe("serializeTextGrid", () => {
  it("escribe la cabecera que Praat exige", () => {
    const text = serializeTextGrid(GOLDEN_DOCUMENT);

    expect(text.startsWith('File type = "ooTextFile"\nObject class = "TextGrid"')).toBe(true);
    expect(text).toContain("tiers? <exists>");
    expect(text).toContain('class = "IntervalTier"');
    expect(text).toContain('class = "TextTier"');
  });

  it("duplica las comillas dobles dentro del texto", () => {
    const text = serializeTextGrid(GOLDEN_DOCUMENT);

    expect(text).toContain('text = "a ""b"" c"');
  });

  it("es determinista: dos serializaciones del mismo documento coinciden", () => {
    expect(serializeTextGrid(GOLDEN_DOCUMENT)).toBe(serializeTextGrid(GOLDEN_DOCUMENT));
  });

  it("serializa un documento sin capas", () => {
    const text = serializeTextGrid({ xmin: 0, xmax: 1, tiers: [] });

    expect(text).toContain("size = 0");
    const reparsed = parseTextGridText(text);
    expect(isOk(reparsed)).toBe(true);
    if (isOk(reparsed)) {
      expect(reparsed.value.document.tiers).toEqual([]);
    }
  });
});

describe("propiedad: parse(serialize(doc)) equivale a doc", () => {
  const documents: readonly AnnotationDocument[] = [
    GOLDEN_DOCUMENT,
    { xmin: 0, xmax: 1, tiers: [] },
    {
      xmin: 0,
      xmax: 2,
      tiers: [
        {
          name: "palabras",
          kind: "interval",
          items: [
            { start: 0, end: 0.25, text: "" },
            { start: 0.25, end: 1.75, text: 'dice "sí" y ""no""' },
            { start: 1.75, end: 2, text: "línea\npartida\ty tabulada" },
          ],
        },
      ],
    },
    {
      xmin: 0.5,
      xmax: 3.5,
      tiers: [
        {
          name: "tono",
          kind: "point",
          points: [
            { time: 0.5, text: "H" },
            { time: 3.5, text: "L" },
          ],
        },
        {
          name: "sílabas",
          kind: "interval",
          items: [{ start: 0.5, end: 3.5, text: "kasa" }],
        },
      ],
    },
    {
      xmin: 0,
      xmax: 1,
      tiers: [
        {
          name: "fronteras",
          kind: "interval",
          items: [
            { start: 0, end: 0, text: "" },
            { start: 0, end: 1, text: "todo" },
            { start: 1, end: 1, text: "" },
          ],
        },
      ],
    },
  ];

  for (const [index, document] of documents.entries()) {
    it(`documento ${index + 1}: ida y vuelta exacta`, () => {
      const text = serializeTextGrid(document);
      const parsed = parseTextGridText(text);

      expect(isOk(parsed)).toBe(true);
      if (isOk(parsed)) {
        expect(parsed.value.document).toEqual(document);
      }
    });
  }

  it("preserva los tiempos con la precision del doble, no redondeados", () => {
    const precise: AnnotationDocument = {
      xmin: 0,
      xmax: 1,
      tiers: [
        {
          name: "preciso",
          kind: "interval",
          items: [{ start: 0, end: 0.1 + 0.2, text: "" }],
        },
      ],
    };

    const parsed = parseTextGridText(serializeTextGrid(precise));

    if (isOk(parsed)) {
      const tier = parsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        expect(tier.items[0]?.end).toBe(0.1 + 0.2);
      }
    }
  });
});

describe("casos limite de lectura", () => {
  it("un archivo vacio devuelve el error `empty`", () => {
    expectError(parseTextGridText("   \n\t\n"), "empty");
    expectError(decodeTextGridBytes(new Uint8Array(0)), "empty");
  });

  it("un archivo corrupto devuelve un error tipado y no una excepcion", () => {
    expectError(parseTextGridText("esto no es un TextGrid"), "malformed-header");
  });

  it("rechaza un objeto de Praat que no es un TextGrid", () => {
    const pitchTier = `File type = "ooTextFile"\nObject class = "PitchTier"\n`;

    expectError(parseTextGridText(pitchTier), "unsupported-object-class");
  });

  it("rechaza una capa con la clase equivocada", () => {
    const wrongTier = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTierr"
"words"
0
1
1
0
1
"hola"
`;

    expectError(parseTextGridText(wrongTier), "malformed-tier");
  });

  it("rechaza un intervalo que termina antes de empezar", () => {
    const inverted = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"words"
0
1
1
0.8
0.2
"al reves"
`;

    expectError(parseTextGridText(inverted), "malformed-tier");
  });

  it("rechaza un archivo truncado a la mitad de una capa", () => {
    const truncated = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"words"
0
1
2
0
0.5
"hola"
`;

    expectError(parseTextGridText(truncated), "malformed-tier");
  });

  it("informa los huecos y ofrece rellenarlos", () => {
    const withGap = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"words"
0
1
2
0
0.4
"a"
0.6
1
"b"
`;

    const parsed = parseTextGridText(withGap);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      // El hueco viaja con la capa a la que pertenece: con dos capas, un
      // `start`/`end` suelto no dice cual de las dos hay que rellenar.
      expect(parsed.value.gaps).toEqual([{ start: 0.4, end: 0.6, tier: "words", tierIndex: 0 }]);
      const tier = parsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        const filled = fillTierGaps(tier, 0, 1);
        expect(findTierGaps(filled, 0, 1)).toEqual([]);
        expect(filled.items).toHaveLength(3);
      }
    }
  });
});

describe("decodeTextGridBytes: codificaciones", () => {
  it("lee UTF-8 sin BOM", () => {
    const result = decodeTextGridBytes(encodeUtf8(LONG_FORMAT));

    expect(isOk(result)).toBe(true);
  });

  it("lee UTF-8 con BOM", () => {
    const result = decodeTextGridBytes(withBom([0xef, 0xbb, 0xbf], encodeUtf8(LONG_FORMAT)));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.startsWith("File type")).toBe(true);
    }
  });

  it("lee UTF-16 little endian, que es como Praat guarda Unicode", () => {
    const result = decodeTextGridBytes(withBom([0xff, 0xfe], encodeUtf16(LONG_FORMAT, true)));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("Object class");
      expect(parseTextGridText(result.value)).toEqual(parseTextGridText(LONG_FORMAT));
    }
  });

  it("lee UTF-16 big endian", () => {
    const result = decodeTextGridBytes(withBom([0xfe, 0xff], encodeUtf16(LONG_FORMAT, false)));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("Object class");
    }
  });

  it("rechaza bytes que no son UTF-8 valido ni UTF-16", () => {
    // 0xff no abre ninguna secuencia UTF-8 y, sin BOM, tampoco hay razon para
    // adivinar UTF-16 si el resto del archivo es de un solo byte.
    const broken = new Uint8Array([0x46, 0x69, 0x6c, 0x65, 0xff, 0xfe, 0x01]);

    expectError(decodeTextGridBytes(broken), "unreadable-encoding");
  });

  it("parseTextGridBytes encadena la decodificacion y el analisis", () => {
    const parsed = parseTextGridBytes(encodeUtf8(LONG_FORMAT));

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value.document).toEqual(GOLDEN_DOCUMENT);
    }
  });
});

describe("exportAnnotationCsv", () => {
  it("escribe la cabecera documentada y una fila por intervalo", () => {
    const csv = exportAnnotationCsv(GOLDEN_DOCUMENT).split("\n");

    expect(csv[0]).toBe(ANNOTATION_CSV_HEADER);
    expect(csv[1]).toBe("words,0,0.5,hola");
    // El texto con comillas dobles se escapa duplicandolas.
    expect(csv[2]).toBe('words,0.5,1.5,"a ""b"" c"');
  });

  it("incluye las capas de puntos con inicio igual a fin", () => {
    expect(exportAnnotationCsv(GOLDEN_DOCUMENT)).toContain("notes,0.75,0.75,x");
  });

  it("entrecomilla el texto que trae comas, comillas o saltos de linea", () => {
    const csv = exportAnnotationCsv({
      xmin: 0,
      xmax: 1,
      tiers: [
        {
          name: "a,b",
          kind: "interval",
          items: [{ start: 0, end: 1, text: "uno, dos" }],
        },
      ],
    });

    expect(csv).toContain('"a,b",0,1,"uno, dos"');
  });
});

describe("createTextGridCodec (implementacion del puerto)", () => {
  const codec = createTextGridCodec();

  it("parse devuelve el documento cuando el archivo esta bien formado", () => {
    const result = codec.parse(encodeUtf8(LONG_FORMAT));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(GOLDEN_DOCUMENT);
    }
  });

  it("parse rechaza con `gap-detected` un archivo con huecos, en vez de mentir", () => {
    const withGap = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"words"
0
1
2
0
0.4
"a"
0.6
1
"b"
`;

    expectError(codec.parse(encodeUtf8(withGap)), "gap-detected");
  });

  it("serialize devuelve texto que parse acepta de vuelta", () => {
    const text = codec.serialize(GOLDEN_DOCUMENT);
    const result = codec.parse(encodeUtf8(text));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(GOLDEN_DOCUMENT);
    }
  });

  runTextGridCodecPortContract(() => createTextGridCodec());
});

/* ==========================================================================
   Defectos que encontro un verificador independiente.

   Cada prueba de este bloque reproduce un archivo concreto que hoy se acepta
   —o se escribe mal— sin que nadie se entere. Van juntas y con el numero del
   defecto en el nombre porque no comparten causa: la unica forma de leerlas es
   una por una.
   ========================================================================== */

describe("D1 — un intervalo fuera de los limites de su capa", () => {
  it("parse lo rechaza con `interval-out-of-tier` en vez de aceptarlo", () => {
    // El documento mide 0..5 y la capa declara 0..3, pero el intervalo llega a 5.
    const outOfTier = `File type = "ooTextFile"
Object class = "TextGrid"

0
5
<exists>
1
"IntervalTier"
"words"
0
3
1
0
5
"fuera de su capa"
`;

    expectError(parseTextGridText(outOfTier), "interval-out-of-tier");
    expectError(createTextGridCodec().parse(encodeUtf8(outOfTier)), "interval-out-of-tier");
  });

  it("serializa cada capa con los limites que se leyeron, no con los del documento", () => {
    // El caso valido del mismo desajuste: la capa mide 0..3 y cubre 0..3.
    const narrowTier = `File type = "ooTextFile"
Object class = "TextGrid"

0
5
<exists>
1
"IntervalTier"
"words"
0
3
1
0
3
"corto"
`;

    const parsed = parseTextGridText(narrowTier);

    expect(isOk(parsed)).toBe(true);
    if (!isOk(parsed)) {
      return;
    }
    const text = serializeTextGrid(parsed.value.document, parsed.value.tierBounds);

    // La cabecera del documento sigue diciendo 5; la capa dice lo que decia el archivo.
    expect(text).toContain("xmax = 5");
    // Se mira el bloque de la capa y no el archivo entero: el intervalo tambien
    // escribe `xmax = 3`, y una prueba que busca el texto en cualquier sitio
    // pasa sin que la capa haya cambiado.
    const tierSection = text.slice(text.indexOf('name = "words"'), text.indexOf("intervals: size"));
    expect(tierSection).toContain("xmin = 0");
    expect(tierSection).toContain("xmax = 3");

    const reparsed = parseTextGridText(text);
    if (isOk(reparsed)) {
      expect(reparsed.value.tierBounds).toEqual(parsed.value.tierBounds);
    }
  });

  it("rechaza una capa cuyos limites se salen del documento", () => {
    const tierBeyondDocument = `File type = "ooTextFile"
Object class = "TextGrid"

0
5
<exists>
1
"IntervalTier"
"words"
0
9
1
0
5
"capa mas larga que el documento"
`;

    expectError(parseTextGridText(tierBeyondDocument), "tier-out-of-document");
  });
});

describe("D2 — un hueco a nivel documento no se reportaba", () => {
  // La capa mide 0..3 y cubre 0..3: no tiene huecos propios, pero el documento
  // declara 5 s. Praat rechaza esa capa por no llegar al final del archivo.
  const documentHole = `File type = "ooTextFile"
Object class = "TextGrid"

0
5
<exists>
1
"IntervalTier"
"words"
0
3
1
0
3
"corto"
`;

  it("el hueco del documento viaja en `gaps`", () => {
    const parsed = parseTextGridText(documentHole);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value.gaps).toEqual([{ start: 3, end: 5, tier: "words", tierIndex: 0 }]);
    }
  });

  it("`parse` del puerto no devuelve el documento: hay un hueco", () => {
    expectError(createTextGridCodec().parse(encodeUtf8(documentHole)), "gap-detected");
  });
});

describe("D3 — un numero no finito entraba como Infinity", () => {
  it("`xmax = 1e400` se rechaza con `non-finite-number`", () => {
    const infinite = `File type = "ooTextFile"
Object class = "TextGrid"

0
1e400
<exists>
0
`;

    expectError(parseTextGridText(infinite), "non-finite-number");
  });

  it("un tiempo de intervalo no finito tambien se rechaza", () => {
    const infiniteInterval = `File type = "ooTextFile"
Object class = "TextGrid"

0
2
<exists>
1
"IntervalTier"
"words"
0
2
1
0
1e400
"hasta el infinito"
`;

    expectError(parseTextGridText(infiniteInterval), "non-finite-number");
  });
});

describe("D4 — `-.5` perdia el signo", () => {
  it("acepta signo seguido de punto decimal y devuelve el valor correcto", () => {
    const signed = `File type = "ooTextFile"
Object class = "TextGrid"

-.5
+.5
<exists>
1
"IntervalTier"
"words"
-.5
+.5
1
-.5
+.5
"signo"
`;

    const parsed = parseTextGridText(signed);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value.document.xmin).toBe(-0.5);
      expect(parsed.value.document.xmax).toBe(0.5);
      const tier = parsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        expect(tier.items[0]).toEqual({ start: -0.5, end: 0.5, text: "signo" });
      }
    }
  });

  it("acepta las tres formas con signo: `-.5`, `+.5` y `-0.5`", () => {
    const forms = `File type = "ooTextFile"
Object class = "TextGrid"

-0.5
0.5
<exists>
1
"IntervalTier"
"words"
-0.5
0.5
1
-0.5
+.5
"tres formas"
`;

    const parsed = parseTextGridText(forms);

    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      const tier = parsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        expect(tier.items[0]?.start).toBe(-0.5);
        expect(tier.items[0]?.end).toBe(0.5);
      }
    }
  });
});

describe("D5 — los bloques que sobran se descartaban en silencio", () => {
  it("un `size` de capas menor que los bloques que trae el archivo es un error", () => {
    const extraTier = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"palabras"
0
1
1
0
1
"hola"
"IntervalTier"
"sobrante"
0
1
1
0
1
"extra"
`;

    expectError(parseTextGridText(extraTier), "unexpected-blocks");
  });

  it("un `intervals: size` menor que los bloques de intervalos es un error", () => {
    const extraInterval = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"palabras"
0
1
1
0
1
"hola"
0
1
"sobrante"
`;

    expectError(parseTextGridText(extraInterval), "unexpected-blocks");
  });
});

describe("D6 — `formatNumber` no cumplia su propio comentario", () => {
  const documentWith = (xmax: number, start: number): AnnotationDocument => ({
    xmin: 0,
    xmax,
    tiers: [{ name: "t", kind: "interval", items: [{ start, end: xmax, text: "" }] }],
  });

  it("una magnitud grande se escribe en decimal, sin exponente", () => {
    const text = serializeTextGrid(documentWith(1e21, 0));

    expect(text).toContain("xmax = 1000000000000000000000");
    expect(text).not.toMatch(/e\+/);
  });

  it("un valor diminuto se escribe con su valor, no como cero", () => {
    const text = serializeTextGrid(documentWith(1, 1e-13));

    expect(text).toContain("xmin = 0.0000000000001");
    // El valor se conserva: lo que se escribe se puede volver a leer.
    const reparsed = parseTextGridText(text);
    if (isOk(reparsed)) {
      const tier = reparsed.value.document.tiers[0];
      if (tier && isIntervalTier(tier)) {
        expect(tier.items[0]?.start).toBe(1e-13);
      }
    }
  });

  it("el valor escrito vuelve exacto, sin exponente, en las cuatro magnitudes", () => {
    for (const value of [1e21, 1e-13, 5e-324, 1.2345678901234568e21]) {
      const written = /xmax = ([^\n]+)/.exec(serializeTextGrid(documentWith(value, 0)))?.[1] ?? "";

      expect(written).not.toMatch(/e/i);
      expect(Number(written)).toBe(value);
    }
  });
});

describe("D9 — UTF-16 sin BOM y UTF-8 sobrelargo entraban como basura", () => {
  /** TextGrid minimo con un nombre acentuado, para codificarlo en UTF-16 sin BOM. */
  const named = (name: string): string => `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"${name}"
0
1
1
0
1
"hola"
`;

  it("un UTF-16LE sin BOM con `Āguila` se rechaza diciendo la verdad", () => {
    const result = decodeTextGridBytes(encodeUtf16(named("Āguila"), true));

    expectError(result, "unreadable-encoding");
    if (isErr(result) && result.error.code === "unreadable-encoding") {
      // El mensaje dice lo que se esperaba, no que el archivo sea ilegible sin mas.
      expect(result.error.detail ?? "").toMatch(/UTF-8/);
      expect(result.error.detail ?? "").toMatch(/BOM/);
    }
  });

  it("un UTF-16BE sin BOM con `一n語` se rechaza igual", () => {
    expectError(decodeTextGridBytes(encodeUtf16(named("一n語"), false)), "unreadable-encoding");
  });

  it("un UTF-8 sobrelargo `C0 80` no entra como NUL", () => {
    const overlong = new Uint8Array([0x46, 0x69, 0x6c, 0x65, 0xc0, 0x80, 0x0a]);

    expectError(decodeTextGridBytes(overlong), "unreadable-encoding");
  });
});

describe("el tope de tamano de un TextGrid", () => {
  it("declara 1 MB, que es holgado para un TextGrid real", () => {
    expect(MAX_TEXTGRID_BYTES).toBe(1024 * 1024);
  });

  it("acepta el archivo justo en el tope y rechaza uno por encima", () => {
    expect(isTextGridTooLarge(MAX_TEXTGRID_BYTES)).toBe(false);
    expect(isTextGridTooLarge(MAX_TEXTGRID_BYTES + 1)).toBe(true);
  });
});
