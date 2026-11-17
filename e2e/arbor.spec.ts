import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

/**
 * ArborLab, en un navegador de verdad.
 *
 * POR QUÉ EXISTE
 *
 * Hasta T9 la página solo tenía la prueba de accesibilidad: nada comprobaba
 * que el banco de árboles dibujara. Se escribió contra el código anterior a la
 * migración de T9 (pasaba igual) para que mover el cableado del componente a
 * `src/scripts/trees/` no pudiera cambiar lo que la persona ve sin que se note.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/arboles");
});

test("arranca en constituyentes con el primer ejemplo listo para dibujar", async ({ page }) => {
  await expect(page.locator('[data-tree-type="constituency"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-tree-input]")).toHaveValue(/^\[S \[SN/);
  await expect(page.locator("[data-bench-modes]")).toBeVisible();
  await expect(page.locator('[data-export="svg"]')).toBeDisabled();
});

test("dibujar crea el SVG, corre las comprobaciones y habilita la exportación", async ({
  page,
}) => {
  await page.locator("[data-tree-draw]").click();

  await expect(page.locator("[data-canvas-inner] svg")).toHaveCount(1);
  await expect(page.locator("[data-checks-list] li").first()).toBeVisible();
  await expect(page.locator('[data-export="svg"]')).toBeEnabled();
  await expect(page.locator("[data-tree-error]")).toHaveText("");
});

test("Ctrl+Intro también dibuja", async ({ page }) => {
  await page.locator("[data-tree-input]").press("Control+Enter");
  await expect(page.locator("[data-canvas-inner] svg")).toHaveCount(1);
});

test("sin texto, avisa en vez de dibujar", async ({ page }) => {
  await page.locator("[data-tree-clear]").click();
  await page.locator("[data-tree-draw]").click();
  await expect(page.locator("[data-tree-error]")).toHaveText("Escribe algo primero.");
  await expect(page.locator("[data-canvas-inner] svg")).toHaveCount(0);
});

test("una notación mal cerrada muestra el error con su posición", async ({ page }) => {
  await page.locator("[data-tree-input]").fill("[S [SN el");
  await page.locator("[data-tree-draw]").click();
  await expect(page.locator("[data-tree-error]")).toContainText(/línea \d+, columna \d+/);
});

test("cambiar a dependencias esconde el modo frase y vacía el lienzo", async ({ page }) => {
  await page.locator("[data-tree-draw]").click();
  await page.locator('[data-tree-type="dependency"]').click();

  await expect(page.locator('[data-tree-type="dependency"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-bench-modes]")).toBeHidden();
  await expect(page.locator("[data-canvas-inner] svg")).toHaveCount(0);
  await expect(page.locator('[data-export="svg"]')).toBeDisabled();
  await expect(page.locator("[data-tree-input]")).toHaveValue("");
});

test("el zoom tiene tope y se puede volver al tamaño real", async ({ page }) => {
  await page.locator("[data-tree-draw]").click();
  const value = page.locator("[data-zoom-value]");
  const zoomIn = page.locator('[data-zoom="in"]');

  await zoomIn.click();
  await expect(value).toHaveText("120 %");
  for (let i = 0; i < 12; i += 1) await zoomIn.click();
  await expect(value).toHaveText("300 %");

  await page.locator('[data-zoom="actual"]').click();
  await expect(value).toHaveText("100 %");
});

/* ---------------- T11: cada formato de exportación, validado ---------------- */

const downloadOf = async (page: Page, selector: string) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(selector).click(),
  ]);
  const path = await download.path();
  return { name: download.suggestedFilename(), bytes: readFileSync(path) };
};

test("el SVG descargado es XML válido y no depende de la hoja de estilos", async ({ page }) => {
  await page.locator("[data-tree-draw]").click();
  const { name, bytes } = await downloadOf(page, '[data-export="svg"]');
  expect(name).toMatch(/\.svg$/);
  const text = bytes.toString("utf8");
  expect(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  expect(text).not.toContain("var(");
  // Colores en sRGB: `lab()` u `oklch()` no los leen Inkscape, Illustrator ni rsvg.
  expect(text).not.toMatch(/\b(?:lab|lch|oklab|oklch|color)\(/);
  const parsed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    return {
      error: doc.querySelector("parsererror") !== null,
      root: doc.documentElement.localName,
      texts: doc.querySelectorAll("text").length,
    };
  }, text);
  expect(parsed).toEqual({ error: false, root: "svg", texts: expect.any(Number) });
  expect(parsed.texts).toBeGreaterThan(5);
});

test("el PNG descargado es una imagen PNG de verdad", async ({ page }) => {
  await page.locator("[data-tree-draw]").click();
  const { name, bytes } = await downloadOf(page, '[data-export="png"]');
  expect(name).toMatch(/\.png$/);
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(bytes.length).toBeGreaterThan(1000);
});

test("copiar el SVG lo deja en el portapapeles y lo dice", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("[data-tree-draw]").click();
  await page.locator('[data-export="copy"]').click();
  await expect(page.locator("[data-live-region]")).toHaveText("SVG copiado.");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("<svg");
});

test("el JSON descargado se puede leer y guarda las flechas de movimiento", async ({ page }) => {
  await page.locator('[data-tree-type="movement"]').click();
  await page.locator("[data-tree-example]").selectOption("0");
  await page.locator("[data-tree-draw]").click();
  const { name, bytes } = await downloadOf(page, '[data-script="json"]');
  expect(name).toMatch(/\.json$/);
  const doc = JSON.parse(bytes.toString("utf8"));
  expect(doc).toMatchObject({ format: "LinguaLab ArborLab v1", kind: "movement" });
  expect(doc.tree.label).toBe("CP");
  expect(doc.directives).toEqual([{ from: "tr", to: "wh", label: "wh-movement" }]);
});

test("el Newick descargado es una sola instrucción con paréntesis equilibrados", async ({
  page,
}) => {
  await page.locator("[data-tree-draw]").click();
  const { name, bytes } = await downloadOf(page, '[data-script="newick"]');
  expect(name).toMatch(/\.nwk$/);
  const text = bytes.toString("utf8");
  expect(text.trim().endsWith(";")).toBe(true);
  expect((text.match(/\(/g) ?? []).length).toBe((text.match(/\)/g) ?? []).length);
  expect(text).toContain("viejo");
});

test("CoNLL-U solo se ofrece con un árbol de dependencias, y conserva sus núcleos", async ({
  page,
}) => {
  await page.locator("[data-tree-draw]").click();
  await expect(page.locator('[data-script="conllu"]')).toBeDisabled();
  await expect(page.locator('[data-script="brat"]')).toHaveCount(0);

  await page.locator('[data-tree-type="dependency"]').click();
  await page.locator("[data-tree-example]").selectOption("0");
  await page.locator("[data-tree-draw]").click();
  const { name, bytes } = await downloadOf(page, '[data-script="conllu"]');
  expect(name).toMatch(/\.conllu$/);
  const text = bytes.toString("utf8");
  expect(text.startsWith("# sent_id = 1\n# text = ")).toBe(true);
  const rows = text.split("\n").filter((line) => line && !line.startsWith("#"));
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(row.split("\t")).toHaveLength(10);
  expect(rows.filter((row) => row.split("\t")[6] === "0")).toHaveLength(1);
});

test("un ejemplo de movimiento dibuja su flecha y comprueba el mando-c", async ({ page }) => {
  await page.locator('[data-tree-type="movement"]').click();
  for (const index of ["0", "1", "2"]) {
    await page.locator("[data-tree-example]").selectOption(index);
    await page.locator("[data-tree-draw]").click();
    await expect(page.locator("[data-tree-error]")).toHaveText("");
    await expect(page.locator("[data-checks-list]")).toContainText("c-comanda su huella");
  }
});
