import { describe, expect, it } from "vitest";
import { arpabetToIpa, transcribeEnglish, type PronunciationLookup } from "./english";

const DICT: Readonly<Record<string, readonly string[]>> = {
  bird: ["B ER1 D"],
  water: ["W AO1 T ER0"],
  about: ["AH0 B AW1 T"],
  banana: ["B AH0 N AE1 N AH0"],
  the: ["DH AH0", "DH IY0"],
  cat: ["K AE1 T"],
  read: ["R EH1 D", "R IY1 D"],
  church: ["CH ER1 CH"],
};
const lookup: PronunciationLookup = (word) => DICT[word];

describe("ARPABET a AFI (inglés americano general)", () => {
  it.each([
    ["B ER1 D", "bɝd"],
    ["W AO1 T ER0", "ˈwɔtɚ"],
    ["AH0 B AW1 T", "əˈbaʊt"],
    ["B AH0 N AE1 N AH0", "bəˈnænə"],
    ["B IH0 L IY1 V", "bɪˈliv"],
    ["EH1 K S T R AH0", "ˈɛkstɹə"],
    ["K AH0 N S T R AH1 K T", "kənˈstɹʌkt"],
    ["AH2 N D ER0 S T AE1 N D", "ˌʌndɚˈstænd"],
    ["S K EH1 JH UH0 L", "ˈskɛd͡ʒʊl"],
    ["TH IH1 NG", "θɪŋ"],
    ["Y UW0 N AY1 T AH0 D", "juˈnaɪtəd"],
  ])("%s → %s", (arpabet, ipa) => {
    expect(arpabetToIpa(arpabet.split(" "))).toBe(ipa);
  });

  it("devuelve null ante un símbolo que no es ARPABET, en vez de dejarlo pasar", () => {
    expect(arpabetToIpa(["B", "XX1"])).toBeNull();
  });
});

describe("transcriptor de inglés con diccionario", () => {
  it("transcribe la frase con la primera pronunciación del diccionario", () => {
    expect(transcribeEnglish("The cat, about water.", lookup).ipa).toBe("ðə kæt əˈbaʊt ˈwɔtɚ");
  });

  it("avisa de las palabras con más de una pronunciación", () => {
    const result = transcribeEnglish("read", lookup);
    expect(result.ipa).toBe("ɹɛd");
    expect(result.variants).toEqual([{ word: "read", ipa: ["ɹɛd", "ɹid"] }]);
  });

  it("deriva el plural y el posesivo regulares de una palabra conocida", () => {
    expect(transcribeEnglish("cats birds churches cat's", lookup).ipa).toBe(
      "kæts bɝdz ˈt͡ʃɝt͡ʃɪz kæts",
    );
  });

  it("no inventa lo que no está en el diccionario: lo devuelve aparte", () => {
    const result = transcribeEnglish("the zorblat cat", lookup);
    expect(result.ipa).toBe("ðə ⟨zorblat⟩ kæt");
    expect(result.skipped).toEqual(["zorblat"]);
  });
});
