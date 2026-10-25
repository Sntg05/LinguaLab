import { describe, expect, it } from "vitest";
import type { DecodedAudio } from "../../ports/index";
import { isErr, isOk } from "../../result";
import { InMemoryPhoneRecognition } from "./in-memory-phone-recognition";

/**
 * El contrato del puerto de reconocimiento de fonos, ejercitado por su fake.
 *
 * POR QUE ESTA PRUEBA EXISTE SI NO HAY ADAPTADOR
 *
 * Porque un puerto que nadie implementa ni se prueba es prosa. El servicio de
 * la fase 2 no está desplegado, así que lo único verificable hoy es que el
 * contrato se puede cumplir sin inventar datos: que el estado por defecto sea
 * «no disponible» —la verdad del sitio—, que la duración se rechace con su
 * número, y que un resultado lleve tiempos de inicio y fin en vez de una lista
 * de símbolos sueltos. Cuando llegue el adaptador, esta prueba sigue valiendo
 * como definición de lo que tiene que hacer.
 */
const audio = (durationSeconds: number): DecodedAudio => ({
  sampleRate: 16_000,
  channels: [new Float32Array(Math.round(16_000 * durationSeconds))],
  durationSeconds,
});

describe("PhoneRecognitionPort en memoria", () => {
  it("por defecto no está disponible, y lo dice con un error tipado", async () => {
    const port = new InMemoryPhoneRecognition();

    expect(port.isAvailable()).toBe(false);
    const result = await port.recognize(audio(1));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unavailable");
    }
  });

  it("disponible, devuelve los fonos con sus tiempos", async () => {
    const port = new InMemoryPhoneRecognition({
      available: true,
      phones: [{ phone: "a", startSeconds: 0, endSeconds: 0.12, probability: 0.81 }],
    });

    const result = await port.recognize(audio(1));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual([
        { phone: "a", startSeconds: 0, endSeconds: 0.12, probability: 0.81 },
      ]);
    }
  });

  it("rechaza un audio más largo que su límite, con la duración real", async () => {
    const port = new InMemoryPhoneRecognition({ available: true, maxDurationSeconds: 30 });

    const result = await port.recognize(audio(31));

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.code === "too-long") {
      expect(result.error.durationSeconds).toBe(31);
    }
  });

  it("un audio justo en el límite se acepta", async () => {
    const port = new InMemoryPhoneRecognition({ available: true, maxDurationSeconds: 30 });

    const result = await port.recognize(audio(30));

    expect(isOk(result)).toBe(true);
  });
});
