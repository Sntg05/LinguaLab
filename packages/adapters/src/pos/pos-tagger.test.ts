import { isErr, isOk, serializePosModel, trainPosModel } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { createPosTagger } from "./pos-tagger";

const MODEL = serializePosModel(
  trainPosModel(
    [
      [
        ["el", "DET"],
        ["gato", "NOUN"],
        ["come", "VERB"],
      ],
      [
        ["la", "DET"],
        ["gata", "NOUN"],
        ["duerme", "VERB"],
      ],
    ],
    { iterations: 5, seed: 1 },
  ),
);

const fakeFetch = (status = 200, body = MODEL) => {
  const calls: string[] = [];
  return {
    calls,
    fetchFn: async (url: string) => {
      calls.push(url);
      return new Response(body, { status });
    },
  };
};

describe("etiquetador POS en el navegador", () => {
  it("descarga el modelo de la lengua la primera vez, y solo esa", async () => {
    const { calls, fetchFn } = fakeFetch();
    const tagger = createPosTagger({ baseUrl: "/pos/v", fetch: fetchFn });
    expect(calls).toEqual([]);
    const first = await tagger.tag(["el", "gato", "come"], "es");
    await tagger.tag(["la", "gata"], "es");
    expect(isOk(first) && first.value).toEqual(["DET", "NOUN", "VERB"]);
    expect(calls).toEqual(["/pos/v/es.tsv"]);
  });

  it("una lengua sin modelo es un error tipado, sin pedir nada", async () => {
    const { calls, fetchFn } = fakeFetch();
    const result = await createPosTagger({ baseUrl: "/pos/v", fetch: fetchFn }).tag(["ciao"], "it");
    expect(isErr(result) && result.error.code).toBe("unsupported-language");
    expect(calls).toEqual([]);
  });

  it("si el modelo no llega, lo dice y reintenta la próxima vez", async () => {
    let status = 503;
    const calls: string[] = [];
    const tagger = createPosTagger({
      baseUrl: "/pos/v",
      fetch: async (url) => {
        calls.push(url);
        return new Response(status === 200 ? MODEL : "", { status });
      },
    });
    expect(isErr(await tagger.tag(["el"], "es"))).toBe(true);
    status = 200;
    expect(isOk(await tagger.tag(["el"], "es"))).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("un archivo que no es un modelo es un error, no etiquetas inventadas", async () => {
    const result = await createPosTagger({
      baseUrl: "/pos/v",
      fetch: fakeFetch(200, "<html>").fetchFn,
    }).tag(["el"], "es");
    expect(isErr(result) && result.error.code).toBe("model-unavailable");
  });
});
