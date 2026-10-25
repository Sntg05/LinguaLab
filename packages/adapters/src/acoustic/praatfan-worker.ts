/**
 * El Web Worker del analisis acustico.
 *
 * ESTE ES EL UNICO ARCHIVO QUE IMPORTA EL MOTOR
 *
 * praatfan compila a WebAssembly y corre analisis de decenas de miles de marcos;
 * en el hilo principal eso congela la pagina. Aqui no se decide que se muestra:
 * se mide lo que llega y se devuelve una pista por respuesta, o el error tipado
 * del puerto para que la interfaz lo redacte.
 *
 * El motor se crea una vez por `baseUrl` y se reutiliza mientras el worker viva:
 * volver a instanciar el wasm por pedido costaria la carga entera otra vez.
 */

import type { AcousticError, AcousticTrack, Result } from "@lingualab/core";
import { createPraatfanEngine, type PraatfanEngine } from "./praatfan-engine";
import type { AcousticReply, AcousticRequest } from "./worker-protocol";

interface Loaded {
  readonly baseUrl: string;
  readonly engine: PraatfanEngine;
}

let loaded: Loaded | null = null;

const engineFor = (baseUrl: string): PraatfanEngine => {
  if (loaded !== null && loaded.baseUrl === baseUrl) {
    return loaded.engine;
  }
  const base = baseUrl.replace(/\/+$/, "");
  const engine = createPraatfanEngine({
    moduleUrl: `${base}/praatfan_gpl.js`,
    wasmUrl: `${base}/praatfan_gpl_bg.wasm`,
  });
  loaded = { baseUrl, engine };
  return engine;
};

/** Un pedido, un analisis, y el resultado con la forma que el puerto declara. */
const analyse = (
  request: AcousticRequest,
): Promise<Result<readonly AcousticTrack[], AcousticError>> => {
  const engine = engineFor(request.baseUrl);
  const { samples, sampleRate } = request;

  if (request.kind === "pitch") {
    return engine
      .pitch(samples, sampleRate, request.params)
      .then((result) => (result.ok ? { ok: true, value: [result.value] } : result));
  }
  if (request.kind === "formants") {
    return engine.formants(samples, sampleRate, request.params);
  }
  return engine
    .intensity(samples, sampleRate, request.params)
    .then((result) => (result.ok ? { ok: true, value: [result.value] } : result));
};

self.onmessage = async (event: MessageEvent<AcousticRequest>) => {
  const request = event.data;

  // El motor no lanza —devuelve `Result`— pero el worker tampoco puede morir por
  // algo que nadie previo: si algo se escapa, la pagina recibe una respuesta
  // tipada en vez de quedarse esperando.
  try {
    const result = await analyse(request);
    const reply: AcousticReply = result.ok
      ? { id: request.id, ok: true, tracks: result.value }
      : { id: request.id, ok: false, error: result.error };
    self.postMessage(reply);
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: {
        code: "analysis-failed",
        detail: error instanceof Error && error.message !== "" ? error.message : String(error),
      },
    } satisfies AcousticReply);
  }
};
