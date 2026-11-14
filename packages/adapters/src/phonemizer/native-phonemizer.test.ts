/**
 * Contrato de `PhonemizerPort` contra el transcriptor propio, y sus reglas:
 * el español no toca la red, el inglés descarga el diccionario una sola vez y
 * solo cuando se pide, y lo que el diccionario no sabe se dice.
 */
import { isErr, isOk } from "@lingualab/core";
import { runPhonemizerPortContract } from "@lingualab/core/testing";
import { describe, expect, it } from "vitest";

import { createNativePhonemizer } from "./native-phonemizer";

const DICTIONARY = "bird\tB ER1 D\nread\tR EH1 D|R IY1 D\nthe\tDH AH0|DH IY0\n";

/** Un `fetch` de mentira que cuenta las peticiones y sirve un diccionario mínimo. */
const fakeFetch = (body = DICTIONARY, status = 200) => {
  const calls: string[] = [];
  const fetchFn = async (url: string): Promise<Response> => {
    calls.push(url);
    return new Response(body, { status });
  };
  return { calls, fetchFn };
};

const create = (fetchFn: (url: string) => Promise<Response>) =>
  createNativePhonemizer({ dictionaryUrl: "/cmudict/x/en-us.tsv", fetch: fetchFn });

runPhonemizerPortContract(() => create(fakeFetch().fetchFn));

describe("transcriptor propio", () => {
  it("transcribe español sin pedir nada a la red", async () => {
    const { calls, fetchFn } = fakeFetch();
    const result = await create(fetchFn).phonemize("casa", "spa");

    expect(isOk(result) && result.value.ipa).toBe("ˈka.sa");
    expect(isOk(result) && result.value.phones).toEqual(["k", "a", "s", "a"]);
    expect(calls).toEqual([]);
  });

  it("respeta la variedad y el nivel pedidos para el español", async () => {
    const phonemizer = create(fakeFetch().fetchFn);
    const castilian = await phonemizer.phonemize("zapato", "spa", { variety: "castilian" });
    const phonetic = await phonemizer.phonemize("lobo", "spa", { level: "phonetic" });

    expect(isOk(castilian) && castilian.value.ipa).toBe("θa.ˈpa.to");
    expect(isOk(phonetic) && phonetic.value.ipa).toBe("ˈlo.βo");
  });

  it("descarga el diccionario del inglés una sola vez, al primer uso", async () => {
    const { calls, fetchFn } = fakeFetch();
    const phonemizer = create(fetchFn);
    expect(calls).toEqual([]);

    const first = await phonemizer.phonemize("the bird", "eng");
    await phonemizer.phonemize("bird", "eng");

    expect(isOk(first) && first.value.ipa).toBe("ðə bɝd");
    expect(calls).toEqual(["/cmudict/x/en-us.tsv"]);
  });

  it("declara las palabras que no conoce y las que tienen variantes", async () => {
    const result = await create(fakeFetch().fetchFn).phonemize("read zzyzx", "eng");

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.ipa).toBe("ɹɛd ⟨zzyzx⟩");
    expect(result.value.skipped).toEqual(["zzyzx"]);
    expect(result.value.variants).toEqual([{ word: "read", ipa: ["ɹɛd", "ɹid"] }]);
    // Una palabra sin transcribir no aporta fonos inventados.
    expect(result.value.phones).toEqual(["ɹ", "ɛ", "d"]);
  });

  it("si el diccionario no llega, devuelve un error tipado y reintenta después", async () => {
    let status = 503;
    const calls: string[] = [];
    const phonemizer = create(async (url) => {
      calls.push(url);
      return new Response(status === 200 ? DICTIONARY : "", { status });
    });

    const failed = await phonemizer.phonemize("bird", "eng");
    expect(isErr(failed) && failed.error.code).toBe("engine-unavailable");

    status = 200;
    const retried = await phonemizer.phonemize("bird", "eng");
    expect(isOk(retried) && retried.value.ipa).toBe("bɝd");
    expect(calls).toHaveLength(2);
  });

  it("un diccionario vacío o que no es el esperado es un fallo, no cero palabras", async () => {
    const result = await create(fakeFetch("<!doctype html><html></html>").fetchFn).phonemize(
      "bird",
      "eng",
    );
    expect(isErr(result) && result.error.code).toBe("engine-failed");
  });
});
