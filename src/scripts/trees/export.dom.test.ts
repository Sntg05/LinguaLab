/* ============================================================
   LinguaLab — el SVG exportado de ArborLab es XML válido

   T11 (Log L37): el SVG descargado no abría en ningún programa. La familia
   tipográfica del sitio (`"Noto IPA", …`) se sustituía con sus comillas dobles
   dentro de un atributo delimitado por comillas dobles. Esta prueba fija el
   escape; la conversión de colores a sRGB necesita un lienzo de verdad y la
   comprueba `e2e/arbor.spec.ts`.
   ============================================================ */

import { afterEach, describe, expect, it } from "vitest";
import { resolveCustomProperties } from "./export";

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("resolveCustomProperties", () => {
  it("una familia tipográfica con comillas dobles no rompe el atributo", () => {
    document.documentElement.style.setProperty("--font-ipa", '"Noto IPA", serif');
    const markup = '<text font-family="var(--font-ipa)">ʃ</text>';
    const resolved = resolveCustomProperties(markup, document.documentElement);
    expect(resolved).toBe(`<text font-family="'Noto IPA', serif">ʃ</text>`);
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${resolved}</svg>`,
      "image/svg+xml",
    );
    expect(doc.querySelector("parsererror")).toBeNull();
  });

  it("escapa lo que el XML reserva dentro de un atributo", () => {
    document.documentElement.style.setProperty("--font-sans", "A&B <x>");
    expect(resolveCustomProperties('<g font-family="var(--font-sans)"/>', document.documentElement)).toBe(
      '<g font-family="A&amp;B &lt;x&gt;"/>',
    );
  });

  it("sin valor, usa el respaldo escrito en var() o currentColor", () => {
    expect(resolveCustomProperties('<g fill="var(--ok, #0a0)"/>', document.documentElement)).toBe(
      '<g fill="#0a0"/>',
    );
    expect(resolveCustomProperties('<g fill="var(--warn)"/>', document.documentElement)).toBe(
      '<g fill="currentColor"/>',
    );
  });
});
