import { beforeEach, describe, expect, it } from "vitest";
import type { AnnotationDocument } from "../../domain/annotation";
import type { TextGridCodecPort, TextGridError } from "../../ports/textgrid-codec";
import { isErr, isOk } from "../../result";
import type { AdapterFactory } from "./types";

/**
 * Suite de contrato del codec de TextGrid.
 *
 * POR QUE ESTA SUITE EXISTE AUNQUE EL CODEC SE ESCRIBA EN EL NUCLEO
 *
 * El puerto es la costura: hoy hay una sola implementacion, y precisamente por
 * eso conviene fijar que significa «implementar `TextGridCodecPort`». Cuando
 * llegue el codec de ELAN (segmento 9) y su conversor, la suite dira si lo que
 * se enchufa merece el nombre.
 *
 * La prueba central es la de ida y vuelta, en ese orden: escribir, leer y exigir
 * el mismo documento. Un codec que solo sabe leer pasa cualquier prueba de
 * lectura y pierde anotaciones en el primer guardado.
 */

const document: AnnotationDocument = {
  xmin: 0,
  xmax: 1.25,
  tiers: [
    {
      name: "words",
      kind: "interval",
      items: [
        { start: 0, end: 0.5, text: 'dice "hola"' },
        { start: 0.5, end: 1.25, text: "" },
      ],
    },
    {
      name: "marks",
      kind: "point",
      points: [{ time: 0.75, text: "L+H*" }],
    },
  ],
};

/**
 * Codificador UTF-8 minimo.
 *
 * `packages/core` compila con `lib: ["ES2022"]` y `types: []`, asi que aqui no
 * existe `TextEncoder`: nombrarlo romperia el typecheck del nucleo, que es la
 * garantia de que el dominio no toca APIs del navegador. Escribir el codificador
 * a mano en una utilidad de prueba es mas honesto que aflojar esa garantia.
 */
const utf8 = (text: string): Uint8Array => {
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

/**
 * Un archivo por cada codigo de error propio del codec.
 *
 * Un codigo que ningun consumidor del puerto ve probado es un codigo que nadie
 * sabe que existe: la interfaz traduce lo que `parse` devuelve, y si un codigo
 * solo aparece en las pruebas del nucleo, el primer adaptador que lo devuelva
 * de otra forma rompe la traduccion sin que esta suite diga nada.
 */
const failureFixtures: readonly {
  readonly name: string;
  readonly text: string;
  readonly code: TextGridError["code"];
}[] = [
  {
    name: "un intervalo fuera de los limites de su capa",
    code: "interval-out-of-tier",
    text: `File type = "ooTextFile"
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
"fuera"
`,
  },
  {
    name: "un punto fuera de los limites de su capa",
    code: "point-out-of-tier",
    text: `File type = "ooTextFile"
Object class = "TextGrid"
0
5
<exists>
1
"TextTier"
"marks"
0
3
1
7
"fuera"
`,
  },
  {
    name: "una capa mas larga que el documento",
    code: "tier-out-of-document",
    text: `File type = "ooTextFile"
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
"larga"
`,
  },
  {
    name: "un numero que no es finito",
    code: "non-finite-number",
    text: `File type = "ooTextFile"
Object class = "TextGrid"
0
1e400
<exists>
0
`,
  },
  {
    name: "mas bloques que los que declara",
    code: "unexpected-blocks",
    text: `File type = "ooTextFile"
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
`,
  },
  {
    name: "una capa que no cubre el documento entero",
    code: "gap-detected",
    text: `File type = "ooTextFile"
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
`,
  },
];

export const runTextGridCodecPortContract = (
  createAdapter: AdapterFactory<TextGridCodecPort>,
): void => {
  describe("TextGridCodecPort", () => {
    let adapter: TextGridCodecPort;

    beforeEach(async () => {
      adapter = await createAdapter();
    });

    it("un archivo vacio devuelve el error tipado `empty`", () => {
      const result = adapter.parse(new Uint8Array(0));

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("empty");
      }
    });

    it("serialize produce el formato de texto de Praat", () => {
      const text = adapter.serialize(document);

      expect(text).toContain('File type = "ooTextFile"');
      expect(text).toContain('Object class = "TextGrid"');
    });

    it("un byte corrupto devuelve un error tipado y nunca una excepcion", () => {
      const result = adapter.parse(utf8('File type = "ooTextFile"\nObject class = "PitchTier"\n'));

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(typeof result.error.code).toBe("string");
      }
    });

    it("ida y vuelta: parse(serialize(doc)) devuelve el mismo documento", () => {
      const text = adapter.serialize(document);
      const result = adapter.parse(utf8(text));

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(document);
      }
    });

    it("serialize es determinista", () => {
      expect(adapter.serialize(document)).toBe(adapter.serialize(document));
    });

    for (const fixture of failureFixtures) {
      it(`un archivo con ${fixture.name} devuelve \`${fixture.code}\``, () => {
        const result = adapter.parse(utf8(fixture.text));

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe(fixture.code);
        }
      });
    }
  });
};
