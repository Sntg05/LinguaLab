import { SPANISH_DEMO_YEISMO } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import { SHARE_HASH_PREFIX, decodeTable, encodeTable, readShareCode, shareUrl } from "./share";

/**
 * Compartir por URL vive en el hash porque el hash no viaja al servidor. Lo que
 * se prueba aquí es que el enlace basta por sí solo y que el respaldo sin
 * compresión también funciona: un navegador sin `CompressionStream` tiene que
 * poder compartir igual, aunque el enlace salga más largo.
 */

describe("encodeTable / decodeTable", () => {
  it("ida y vuelta conserva la tabla entera", async () => {
    const code = await encodeTable(SPANISH_DEMO_YEISMO);
    const decoded = await decodeTable(code);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      return;
    }
    expect(decoded.value).toEqual(SPANISH_DEMO_YEISMO);
  });

  it("comprime cuando el navegador ofrece deflate-raw", async () => {
    const code = await encodeTable(SPANISH_DEMO_YEISMO);

    // El dígito inicial dice qué camino se tomó, así que decodificar nunca
    // tiene que adivinar.
    expect(code.startsWith("1.")).toBe(true);
  });

  it("cae a base64url sin comprimir cuando no hay CompressionStream", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "CompressionStream");
    Reflect.deleteProperty(globalThis, "CompressionStream");
    try {
      const code = await encodeTable(SPANISH_DEMO_YEISMO);
      expect(code.startsWith("0.")).toBe(true);

      const decoded = await decodeTable(code);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.value).toEqual(SPANISH_DEMO_YEISMO);
      }
    } finally {
      if (descriptor !== undefined) {
        Object.defineProperty(globalThis, "CompressionStream", descriptor);
      }
    }
  });

  it("rechaza una carga mal formada", async () => {
    const decoded = await decodeTable("no-es-una-carga");

    expect(decoded.ok).toBe(false);
  });

  it("rechaza una versión que no conoce", async () => {
    const decoded = await decodeTable("9.ejemplo");

    expect(decoded.ok).toBe(false);
    if (decoded.ok) {
      return;
    }
    expect(decoded.error).toEqual({ code: "unsupported", detail: "9" });
  });
});

describe("readShareCode", () => {
  it("lee la carga del hash", () => {
    expect(readShareCode(`${SHARE_HASH_PREFIX}0.abc`)).toBe("0.abc");
  });

  it("ignora un hash sin tabla y un hash vacío", () => {
    expect(readShareCode("#otra-cosa")).toBeNull();
    expect(readShareCode(SHARE_HASH_PREFIX)).toBeNull();
    expect(readShareCode("")).toBeNull();
  });
});

describe("shareUrl", () => {
  it("apunta a la página actual, no a una ruta inventada", () => {
    const url = shareUrl({ origin: "https://lingualab.pages.dev", pathname: "/en/ortografia/" }, "1.abc");

    expect(url).toBe(`https://lingualab.pages.dev/en/ortografia/${SHARE_HASH_PREFIX}1.abc`);
  });
});
