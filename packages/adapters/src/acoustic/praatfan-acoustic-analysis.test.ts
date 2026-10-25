/**
 * El adaptador acustico: contrato del puerto, delegacion y degradacion.
 *
 * ESTA PRUEBA NO MIDE ACUSTICA; MIDE EL CONTRATO DEL PUERTO
 *
 * Que el F0 estimado de un tono este cerca de su frecuencia se prueba en
 * `praatfan-engine.test.ts`, con el WebAssembly real. Lo que se prueba aqui es
 * lo otro, que es donde un adaptador se rompe de verdad: que sin motor devuelva
 * `unavailable` y no lance, que el pedido viaje al worker con sus parametros y
 * sus muestras intactos, que un error del worker llegue como error tipado, y
 * que el calculo NO ocurra en el hilo principal.
 *
 * EL TRABAJADOR ES UN DOBLE, Y ES A PROPOSITO
 *
 * `Worker` no existe en Node. Un doble que registra los mensajes permite
 * afirmar exactamente lo que importa —que el calculo se delega— sin simular un
 * navegador entero.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isErr, isOk, type AcousticTrack, type DecodedAudio } from "@lingualab/core";
import { createPraatfanAcousticAnalysis } from "./praatfan-acoustic-analysis";
import type {
  AcousticReply,
  AcousticRequest,
  AcousticWorker,
  AcousticWorkerListener,
} from "./worker-protocol";

/** Doble del worker: guarda lo que recibe y responde cuando la prueba se lo pide. */
class FakeWorker implements AcousticWorker {
  readonly posted: AcousticRequest[] = [];
  private readonly listeners = new Map<string, AcousticWorkerListener[]>();
  terminated = false;

  postMessage(message: AcousticRequest): void {
    this.posted.push(message);
  }

  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: AcousticWorkerListener,
  ): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Contesta al ultimo pedido como lo haria el worker real. */
  reply(reply: AcousticReply): void {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data: reply });
    }
  }

  fail(): void {
    for (const listener of this.listeners.get("error") ?? []) {
      listener({});
    }
  }
}

const AUDIO: DecodedAudio = {
  sampleRate: 16_000,
  durationSeconds: 1,
  channels: [new Float32Array(16_000).fill(0.1)],
};

const TRACK: AcousticTrack = { kind: "f0", times: [0.02, 0.04], values: [200, 201] };

const BASE_URL = "/praatfan";

const setup = (worker: FakeWorker | null) => {
  const adapter = createPraatfanAcousticAnalysis({
    baseUrl: BASE_URL,
    createWorker: () => worker,
    timeoutMs: 50,
  });
  return adapter;
};

describe("createPraatfanAcousticAnalysis", () => {
  it("no crea el worker hasta que hay algo que analizar", () => {
    let created = 0;
    const adapter = createPraatfanAcousticAnalysis({
      createWorker: () => {
        created += 1;
        return new FakeWorker();
      },
    });

    // Construir el adaptador no descarga el wasm ni arranca nada: la pagina que
    // nunca mide no paga el artefacto.
    expect(created).toBe(0);
    expect(adapter.isAvailable()).toBe(false);
  });

  it("manda el pedido al worker con sus parametros y sus muestras, y devuelve su pista", async () => {
    const worker = new FakeWorker();
    const adapter = setup(worker);

    const pending = adapter.pitch(AUDIO, { floorHz: 100, ceilingHz: 400 });
    expect(worker.posted.length).toBe(1);

    const request = worker.posted[0];
    expect(request?.kind).toBe("pitch");
    expect(request?.baseUrl).toBe(BASE_URL);
    expect(request?.sampleRate).toBe(16_000);
    expect(request?.samples.length).toBe(16_000);
    if (request?.kind === "pitch") {
      expect(request.params).toEqual({ floorHz: 100, ceilingHz: 400 });
    }
    // El adaptador no calculo nada: espera la respuesta.
    expect(adapter.isAvailable()).toBe(false);

    worker.reply({ id: request?.id ?? 0, ok: true, tracks: [TRACK] });
    const result = await pending;

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.values).toEqual([200, 201]);
    }
    // Un analisis exitoso es la prueba de que el modulo cargo.
    expect(adapter.isAvailable()).toBe(true);
  });

  it("devuelve una lista de pistas para los formantes y una sola para la intensidad", async () => {
    const worker = new FakeWorker();
    const adapter = setup(worker);

    const formants = adapter.formants(AUDIO, { maxFormantHz: 5500, count: 3 });
    const formantRequest = worker.posted[0];
    expect(formantRequest?.kind).toBe("formants");
    if (formantRequest?.kind === "formants") {
      expect(formantRequest.params).toEqual({ maxFormantHz: 5500, count: 3 });
    }
    worker.reply({
      id: formantRequest?.id ?? 0,
      ok: true,
      tracks: [
        { kind: "formant", times: [0.1], values: [700] },
        { kind: "formant", times: [0.1], values: [1200] },
      ],
    });
    const formantResult = await formants;
    expect(isOk(formantResult)).toBe(true);
    if (isOk(formantResult)) {
      expect(formantResult.value.length).toBe(2);
    }

    const intensity = adapter.intensity(AUDIO, { minimumPitchHz: 100 });
    const intensityRequest = worker.posted[1];
    expect(intensityRequest?.kind).toBe("intensity");
    if (intensityRequest?.kind === "intensity") {
      expect(intensityRequest.params).toEqual({ minimumPitchHz: 100 });
    }
    worker.reply({
      id: intensityRequest?.id ?? 0,
      ok: true,
      tracks: [{ kind: "intensity", times: [0.1], values: [72] }],
    });
    const intensityResult = await intensity;
    expect(isOk(intensityResult)).toBe(true);
  });

  it("un error del worker llega como error tipado del puerto", async () => {
    const worker = new FakeWorker();
    const adapter = setup(worker);

    const pending = adapter.pitch(AUDIO, { floorHz: 75, ceilingHz: 600 });
    const request = worker.posted[0];
    worker.reply({
      id: request?.id ?? 0,
      ok: false,
      error: { code: "too-short", durationSeconds: 0.01 },
    });
    const result = await pending;

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("too-short");
    }
    // Un fallo de analisis no demuestra que el modulo no este: sigue sin
    // declararse disponible hasta que uno funcione.
    expect(adapter.isAvailable()).toBe(false);
  });

  it("sin Web Workers devuelve unavailable con detalle y no lanza", async () => {
    const adapter = setup(null);

    const unavailableDetail = (error: {
      readonly code: string;
      readonly detail?: string;
    }): string => {
      expect(error.code).toBe("unavailable");
      expect(error.detail ?? "").not.toBe("");
      return error.detail ?? "";
    };

    const pitch = await adapter.pitch(AUDIO, { floorHz: 75, ceilingHz: 600 });
    expect(isErr(pitch)).toBe(true);
    if (isErr(pitch)) {
      unavailableDetail(pitch.error);
    }

    const formants = await adapter.formants(AUDIO, { maxFormantHz: 5500, count: 3 });
    expect(isErr(formants)).toBe(true);
    if (isErr(formants)) {
      unavailableDetail(formants.error);
    }

    const intensity = await adapter.intensity(AUDIO, { minimumPitchHz: 100 });
    expect(isErr(intensity)).toBe(true);
    if (isErr(intensity)) {
      unavailableDetail(intensity.error);
    }

    expect(adapter.isAvailable()).toBe(false);
  });

  it("un worker que muere deja de esperar en vez de colgar la pagina", async () => {
    const worker = new FakeWorker();
    const adapter = setup(worker);

    const pending = adapter.pitch(AUDIO, { floorHz: 75, ceilingHz: 600 });
    worker.fail();
    const result = await pending;

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unavailable");
    }
  });

  it("dispose termina el worker y lo que llega despues responde unavailable", async () => {
    const worker = new FakeWorker();
    const adapter = setup(worker);

    // El worker nace con el primer pedido, no con el adaptador: recien entonces
    // hay algo que terminar.
    const pending = adapter.pitch(AUDIO, { floorHz: 75, ceilingHz: 600 });
    worker.reply({ id: worker.posted[0]?.id ?? 0, ok: true, tracks: [TRACK] });
    await pending;

    adapter.dispose();
    expect(worker.terminated).toBe(true);

    const result = await adapter.pitch(AUDIO, { floorHz: 75, ceilingHz: 600 });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unavailable");
    }
  });

  it("el adaptador no calcula: no importa el motor y crea el worker por URL", () => {
    // Esto NO es una prueba de estilo: es la unica forma de afirmar, en Node y
    // sin navegador, que el hilo principal no ejecuta el analisis. Si el
    // adaptador importara el motor, quedaria en el paquete de la pagina; el
    // motor solo puede entrar por el archivo del worker.
    const source = readFileSync(
      new URL("./praatfan-acoustic-analysis.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("praatfan-engine");
    expect(source).toContain('new Worker(new URL("./praatfan-worker.ts", import.meta.url)');
  });
});
