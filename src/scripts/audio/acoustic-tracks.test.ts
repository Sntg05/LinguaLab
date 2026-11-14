/**
 * Reglas del analisis del tramo visible (unidad 5.3).
 *
 * QUE SE PRUEBA AQUI
 *
 * - Cuando se analiza y cuando no: Praat no analiza si se ven mas de 10 s
 *   («longest analysis»), y aqui tampoco. Lo que no se analiza no se dibuja ni
 *   se inventa: el plan dice `skip` con la duracion visible.
 * - Que tramo se analiza: el visible con un margen, para que las curvas no se
 *   corten en los bordes de la ventana, y nunca fuera del audio.
 * - Que los instantes vuelven al eje del audio completo: el tramo se analiza
 *   como un audio corto que empieza en 0, y una curva sin desplazar quedaria
 *   dibujada al principio de la vista.
 * - Que el mismo pedido no se calcula dos veces y que los pedidos al worker van
 *   de a uno.
 */

import { describe, expect, it } from "vitest";
import { ok, type AcousticAnalysisPort, type AcousticTrack } from "@lingualab/core";
import {
  createAcousticTracks,
  LONGEST_ANALYSIS_SECONDS,
  planVisibleAnalysis,
  shiftTrack,
  sliceAudio,
} from "./acoustic-tracks";

describe("planVisibleAnalysis", () => {
  it("no analiza si se ven mas de 10 s, como Praat", () => {
    expect(LONGEST_ANALYSIS_SECONDS).toBe(10);
    expect(planVisibleAnalysis({ start: 0, end: 12 }, 30)).toEqual({ kind: "skip", span: 12 });
  });

  it("analiza un audio corto entero cuando se ve entero", () => {
    expect(planVisibleAnalysis({ start: 0, end: 1 }, 1)).toEqual({
      kind: "analyse",
      range: { start: 0, end: 1 },
    });
  });

  it("analiza exactamente 10 s visibles: el limite es «mas de 10»", () => {
    expect(planVisibleAnalysis({ start: 0, end: 10 }, 10).kind).toBe("analyse");
  });

  it("agrega un margen a cada lado sin salirse del audio", () => {
    const plan = planVisibleAnalysis({ start: 4, end: 6 }, 20);

    expect(plan.kind).toBe("analyse");
    if (plan.kind !== "analyse") {
      return;
    }
    expect(plan.range.start).toBeLessThan(4);
    expect(plan.range.end).toBeGreaterThan(6);
    expect(plan.range.start).toBeGreaterThanOrEqual(0);
    expect(plan.range.end).toBeLessThanOrEqual(20);
  });

  it("reutiliza lo analizado si ya cubre la vista", () => {
    expect(
      planVisibleAnalysis({ start: 4.2, end: 5.8 }, 20, { start: 3.5, end: 6.5 }),
    ).toEqual({ kind: "reuse" });
  });

  it("vuelve a analizar si la vista se sale de lo analizado", () => {
    expect(planVisibleAnalysis({ start: 6, end: 8 }, 20, { start: 3.5, end: 6.5 }).kind).toBe(
      "analyse",
    );
  });
});

describe("sliceAudio", () => {
  it("corta las muestras del tramo y conserva la frecuencia de muestreo", () => {
    const samples = Float32Array.from({ length: 100 }, (_, index) => index);
    const slice = sliceAudio({ samples, sampleRate: 10, duration: 10 }, { start: 2, end: 3 });

    expect(slice.sampleRate).toBe(10);
    expect(Array.from(slice.samples)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    expect(slice.duration).toBeCloseTo(1);
  });
});

describe("shiftTrack", () => {
  it("devuelve los instantes al eje del audio completo", () => {
    const track: AcousticTrack = { kind: "f0", times: [0, 0.5], values: [100, 0] };

    expect(shiftTrack(track, 2)).toEqual({ kind: "f0", times: [2, 2.5], values: [100, 0] });
  });
});

/** Puerto falso que registra los pedidos y deja resolverlos a mano. */
const fakePort = () => {
  const calls: { kind: string; duration: number }[] = [];
  const pending: (() => void)[] = [];
  let active = 0;
  let maxActive = 0;
  const track = (kind: AcousticTrack["kind"]): AcousticTrack => ({
    kind,
    times: [0.1],
    values: [100],
  });
  const answer = <T>(kind: string, duration: number, value: T) => {
    calls.push({ kind, duration });
    active += 1;
    maxActive = Math.max(maxActive, active);
    return new Promise<ReturnType<typeof ok<T>>>((resolve) => {
      pending.push(() => {
        active -= 1;
        resolve(ok(value));
      });
    });
  };
  const port: AcousticAnalysisPort = {
    isAvailable: () => true,
    pitch: (audio) => answer("pitch", audio.durationSeconds, track("f0")),
    formants: (audio) => answer("formants", audio.durationSeconds, [track("formant")]),
    intensity: (audio) => answer("intensity", audio.durationSeconds, track("intensity")),
  };
  const flush = async (): Promise<void> => {
    for (let round = 0; round < 20; round += 1) {
      await Promise.resolve();
      const next = pending.shift();
      if (next !== undefined) {
        next();
      }
    }
  };
  return { port, calls, flush, maxActive: () => maxActive };
};

const audio = { samples: new Float32Array(200), sampleRate: 10, duration: 20 };
const params = { floor: 75, ceiling: 600, maxFormantHz: 5500 };

describe("createAcousticTracks", () => {
  it("analiza solo el tramo y desplaza los instantes al eje del audio", async () => {
    const fake = fakePort();
    const tracks = createAcousticTracks(fake.port);

    const result = tracks.pitch(audio, { start: 5, end: 7 }, params);
    await fake.flush();
    const value = await result;

    expect(fake.calls).toEqual([{ kind: "pitch", duration: 2 }]);
    expect(value.ok && value.value.times).toEqual([5.1]);
  });

  it("no repite un pedido igual, ni mientras el primero sigue en curso", async () => {
    const fake = fakePort();
    const tracks = createAcousticTracks(fake.port);
    const range = { start: 0, end: 20 };

    const first = tracks.intensity(audio, range, params);
    const second = tracks.intensity(audio, range, params);
    await fake.flush();
    await Promise.all([first, second]);
    await tracks.intensity(audio, range, params);

    expect(fake.calls.length).toBe(1);
  });

  it("recalcula si cambian los parametros", async () => {
    const fake = fakePort();
    const tracks = createAcousticTracks(fake.port);
    const range = { start: 0, end: 20 };

    const first = tracks.pitch(audio, range, params);
    await fake.flush();
    await first;
    const second = tracks.pitch(audio, range, { ...params, ceiling: 500 });
    await fake.flush();
    await second;

    expect(fake.calls.length).toBe(2);
  });

  it("manda los pedidos al worker de a uno", async () => {
    const fake = fakePort();
    const tracks = createAcousticTracks(fake.port);
    const range = { start: 0, end: 20 };

    const all = Promise.all([
      tracks.pitch(audio, range, params),
      tracks.formants(audio, range, params),
      tracks.intensity(audio, range, params),
    ]);
    await fake.flush();
    await all;

    expect(fake.calls.map((call) => call.kind)).toEqual(["pitch", "formants", "intensity"]);
    expect(fake.maxActive()).toBe(1);
  });

  it("olvida todo al cambiar de audio", async () => {
    const fake = fakePort();
    const tracks = createAcousticTracks(fake.port);
    const range = { start: 0, end: 20 };

    const first = tracks.pitch(audio, range, params);
    await fake.flush();
    await first;
    tracks.reset();
    const second = tracks.pitch(audio, range, params);
    await fake.flush();
    await second;

    expect(fake.calls.length).toBe(2);
  });
});
