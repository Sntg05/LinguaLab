import { describe, expect, it } from "vitest";
import { createConvertOrthographyToIpa } from "../application/convert-orthography-to-ipa";
import { SPANISH_DEMO_YEISMO } from "../data/demo-tables";
import { InMemoryOrthographyRepository } from "../testing/fakes/in-memory-orthography-repository";
import { normalizeInput } from "./normalize";

const convert = createConvertOrthographyToIpa({
  tables: new InMemoryOrthographyRepository([SPANISH_DEMO_YEISMO]),
});

const ipaOf = async (text: string): Promise<string> => {
  const result = await convert({ text, tableId: SPANISH_DEMO_YEISMO.id });
  if (!result.ok) {
    throw new Error(`la conversion fallo: ${JSON.stringify(result.error)}`);
  }
  return result.value.ipa;
};

describe("tabla demo de espanol: los ocho casos exactos", () => {
  it("chico -> tʃiko", async () => {
    expect(await ipaOf("chico")).toBe("tʃiko");
  });

  it("queso -> keso", async () => {
    expect(await ipaOf("queso")).toBe("keso");
  });

  it("guerra -> ɡera", async () => {
    expect(await ipaOf("guerra")).toBe("ɡera");
  });

  it("hijo -> ixo", async () => {
    expect(await ipaOf("hijo")).toBe("ixo");
  });

  it("ñandú -> ɲandu", async () => {
    expect(await ipaOf("ñandú")).toBe("ɲandu");
  });

  it("perro -> pero con vibrante multiple U+0072", async () => {
    // "perro" y "pero" solo se distinguen por el simbolo rotico; esta prueba
    // es la que una implementacion apresurada colapsa a un unico resultado.
    expect(await ipaOf("perro")).toBe("pero");
  });

  it("pero -> peɾo con vibrante simple U+027E", async () => {
    expect(await ipaOf("pero")).toBe("pe\u027eo");
  });

  it("casa -> kasa", async () => {
    expect(await ipaOf("casa")).toBe("kasa");
  });
});

const convertTwice = async (text: string): Promise<string> => {
  const once = await ipaOf(text);
  const second = await convert({ text: once, tableId: SPANISH_DEMO_YEISMO.id });
  if (!second.ok) {
    throw new Error(`la segunda conversion fallo: ${JSON.stringify(second.error)}`);
  }
  return second.value.ipa;
};

describe("idempotencia, y sus dos excepciones documentadas", () => {
  // Convertir la salida otra vez la devuelve igual en estas palabras porque la
  // tabla mapea ORTOGRAFIA, no AFI: los simbolos que produce (k, s, t, i, o,
  // ʃ, ɲ, x, n, d) o no son grafemas de ninguna regla o se mapean a si mismos.
  it.each(["chico", "queso", "casa", "hijo", "ñandú"])(
    "%s se re-convierte en si misma",
    async (word) => {
      const once = await ipaOf(word);
      expect(await convertTwice(word)).toBe(once);
    },
  );

  // EXCEPCION, no defecto: la `r` ortografica mapea a la vibrante simple, asi
  // que la vibrante multiple `r` (U+0072) que produjo `perro` vuelve a caer en
  // la regla `r` y se convierte en `ɾ`. Nadie "arregle" esto anadiendo el
  // simbolo AFI como grafema: la tabla describe como se escribe, no como se
  // transcribe.
  it("perro NO es idempotente: la vibrante multiple se re-convierte en simple", async () => {
    const once = await ipaOf("perro");
    expect(once).toBe("pero");
    expect(await convertTwice("perro")).toBe("pe\u027eo");
  });

  it("guerra NO es idempotente: la r ortografica se re-convierte en vibrante simple", async () => {
    const once = await ipaOf("guerra");
    expect(once).toBe("\u0261era");
    expect(await convertTwice("guerra")).toBe("\u0261e\u027ea");
  });
});

describe("propiedades sobre la tabla demo", () => {
  const words = ["chico", "queso", "guerra", "hijo", "ñandú", "perro", "pero", "casa"];

  it("la cobertura particiona la entrada: nada se pierde ni se cuenta dos veces", async () => {
    for (const word of words) {
      const result = await convert({ text: word, tableId: SPANISH_DEMO_YEISMO.id });
      if (!result.ok) {
        throw new Error(`la conversion de ${word} fallo`);
      }

      const consumed = result.value.trace.reduce(
        (total, entry) => total + Array.from(entry.grapheme).length,
        0,
      );

      expect(consumed + result.value.uncovered.length).toBe(
        Array.from(normalizeInput(word)).length,
      );
    }
  });

  it("dos corridas producen el mismo rastro", async () => {
    const first = await convert({ text: "guerra", tableId: SPANISH_DEMO_YEISMO.id });
    const second = await convert({ text: "guerra", tableId: SPANISH_DEMO_YEISMO.id });

    if (!first.ok || !second.ok) {
      throw new Error("la conversion fallo");
    }
    expect(second.value.ipa).toBe(first.value.ipa);
    expect(second.value.trace).toEqual(first.value.trace);
    expect(second.value.uncovered).toEqual(first.value.uncovered);
  });
});
