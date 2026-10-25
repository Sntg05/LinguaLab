import { describe, expect, it } from "vitest";
// Por la entrada pública del paquete y no por una ruta profunda al núcleo: la
// regla `no-reaching-into-core-internals` lo prohíbe, y tiene razón —una ruta
// interna puede cambiar sin que nada avise—.
import { isTextGridTooLarge, MAX_TEXTGRID_BYTES } from "@lingualab/core";
import { formatBytes, isOverLimit, MAX_AUDIO_BYTES } from "./limits";

/**
 * Los topes de tamano del visor, con su borde medido.
 *
 * POR QUE ESTE ARCHIVO EXISTE
 *
 * Los dos topes —audio y TextGrid— se comprobaban dentro del controlador, que
 * necesita DOM y `AudioContext` y por eso no tiene prueba propia. La mitad del
 * TextGrid ya estaba cubierta por el codec; la del audio no, y el verificador
 * lo dejo anotado: si `MAX_AUDIO_BYTES` cambiaba de valor o la comparacion se
 * movia de sitio, ninguna prueba se ponia roja. Ahora la decision vive en este
 * modulo puro y el controlador solo la usa.
 */

describe("el tope del audio", () => {
  it("es de 128 MB, el peor caso de un tramo de 300 s", () => {
    // 300 s de wav sin comprimir a 96 kHz, estereo y 16 bits son 115,2 MB.
    expect(MAX_AUDIO_BYTES).toBe(128 * 1024 * 1024);
  });

  it("acepta el archivo justo en el tope y rechaza uno por encima", () => {
    expect(isOverLimit(MAX_AUDIO_BYTES, MAX_AUDIO_BYTES)).toBe(false);
    expect(isOverLimit(MAX_AUDIO_BYTES + 1, MAX_AUDIO_BYTES)).toBe(true);
  });
});

// El tope del TextGrid vive en el nucleo, junto al formato, y el controlador
// sigue llamando a `isTextGridTooLarge`: se prueba la funcion que el controlador
// usa de verdad, no una copia. El audio usa `isOverLimit`.
describe("el tope del TextGrid, con su propio borde", () => {
  it("acepta el archivo justo en el tope y rechaza uno por encima", () => {
    expect(isTextGridTooLarge(MAX_TEXTGRID_BYTES)).toBe(false);
    expect(isTextGridTooLarge(MAX_TEXTGRID_BYTES + 1)).toBe(true);
  });

  it("un archivo vacio nunca supera el tope", () => {
    expect(isTextGridTooLarge(0)).toBe(false);
  });
});

describe("formatBytes", () => {
  it("dice MB por encima del megabyte y KB por debajo", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(128 * 1024 * 1024)).toBe("128.0 MB");
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("no imprime 0 KB para un archivo de un byte", () => {
    expect(formatBytes(1)).toBe("1 KB");
  });
});
