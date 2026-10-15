import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../result";
import { InMemoryPhonemizer } from "../testing/fakes/in-memory-phonemizer";
import { createPhonemizeText } from "./phonemize-text";

describe("createPhonemizeText", () => {
  it("devuelve la secuencia de fonos del puerto", async () => {
    const phonemizer = new InMemoryPhonemizer({
      languages: ["spa"],
      transcriptions: { casa: "kasa" },
    });
    const phonemize = createPhonemizeText({ phonemizer });

    const result = await phonemize({ text: "casa", languageCode: "spa" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ipa).toBe("kasa");
      expect(result.value.phones).toEqual(["k", "a", "s", "a"]);
    }
  });

  it("translada el error del puerto sin inventar codigos", async () => {
    const phonemizer = new InMemoryPhonemizer({ languages: ["spa"] });
    const phonemize = createPhonemizeText({ phonemizer });

    const result = await phonemize({ text: "hello", languageCode: "eng" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual({ code: "unsupported-language", languageCode: "eng" });
    }
  });
});
