import { expect, test } from "@playwright/test";

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
