import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * El etiquetado de categorías (S14), en un navegador de verdad: que el modelo
 * se sirve desde el propio sitio bajo la CSP, que se pide solo al etiquetar y
 * que el CSV descargado trae lo mismo que la tabla.
 */

test("etiqueta el ejemplo en español, explica la contracción y descarga el CSV", async ({
  page,
}) => {
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/pos/")) models.push(request.url());
  });
  await page.goto("/tools");
  expect(models).toEqual([]);

  await page.locator("[data-pos-example]").click();
  await expect(page.locator("[data-pos-status]")).toContainText("palabras etiquetadas");
  expect(models.length).toBe(1);
  expect(models[0]).toMatch(/\/pos\/[\d.]+\/es\.tsv$/);

  const rows = page.locator("[data-pos-tagged] tr");
  await expect(rows.filter({ hasText: "explicó" })).toContainText("VERB · verbo");
  await expect(rows.filter({ hasText: "profesora" })).toContainText("NOUN · sustantivo");
  // «del» se separó en «de» + «el», y la fila lo explica.
  await expect(page.locator('[data-pos-tagged] th[title*="del"]')).toHaveCount(2);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("[data-pos-export]").click(),
  ]);
  const csv = readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
  expect(csv.split("\n")[0]).toBe("word,upos");
  expect(csv).toContain("explicó,VERB");

  const axe = await new AxeBuilder({ page })
    .include("[data-pos]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("si el modelo no llega, lo dice y no muestra etiquetas", async ({ page }) => {
  await page.route("**/pos/**", (route) => route.abort());
  await page.goto("/tools");
  await page.locator("[data-pos-text]").fill("El gato duerme.");
  await page.locator("[data-pos-run]").click();
  await expect(page.locator("[data-pos-status]")).toContainText("No se pudo descargar");
  await expect(page.locator("[data-pos-results]")).toBeHidden();
});
