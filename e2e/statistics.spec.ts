import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { parseDataset } from "@lingualab/core";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { runAnalysis } from "../src/scripts/estadistica/analyses";
import { EXAMPLE_CSV } from "../src/scripts/estadistica/example";

/**
 * La estadística de punta a punta (T6): el ejemplo inventado, la descripción,
 * el asistente con cada pregunta y la descarga del gráfico. Lo que muestra la
 * página se compara con lo que da el motor para los mismos datos, y el motor
 * está contrastado con R en sus propias pruebas. Cadenas en español: `/estadistica`.
 */

const parsed = parseDataset(EXAMPLE_CSV);
if (!parsed.ok) throw new Error("the example must parse");
const DATA = parsed.value;

const status = (page: Page): Locator => page.locator("[data-stats-status]");

const loadExample = async (page: Page): Promise<void> => {
  await page.goto("/estadistica");
  await page.locator("[data-stats-example]").click();
  await expect(status(page)).toContainText("datos inventados");
};

const ask = async (page: Page, question: string, fields: Record<string, string>): Promise<void> => {
  await page.locator(`input[name="stats-question"][value="${question}"]`).check();
  for (const [field, value] of Object.entries(fields)) {
    const control = page.locator(`[data-stats-field="${field}"]`);
    if (field === "mu") await control.fill(value);
    else await control.selectOption(value.split("|"));
  }
  await page.locator("[data-stats-run]").click();
};

test("the example is described and every variable gets its type", async ({ page }) => {
  await loadExample(page);
  await expect(page.locator("[data-stats-variables] tbody tr")).toHaveCount(10);
  await expect(page.locator('[data-stats-kind="grupo"]')).toHaveValue("nominal");
  await expect(page.locator('[data-stats-kind="lectura_ms"]')).toHaveValue("numeric");
  await page.locator("[data-stats-describe]").selectOption("comprension");
  const rows = page.locator("[data-stats-description] tbody tr");
  await expect(rows.nth(0)).toContainText("39");
  await expect(rows.nth(1)).toContainText("1");
  await expect(page.locator("[data-stats-description] svg")).toHaveCount(1);
});

test("two groups: the page shows the engine's Welch t and Mann–Whitney, with effect sizes", async ({
  page,
}) => {
  await loadExample(page);
  await ask(page, "two-groups", { outcome: "lectura_ms", group: "grupo" });
  await expect(status(page)).toContainText("Resultado listo");
  const expected = runAnalysis(DATA, {
    question: "two-groups",
    outcome: "lectura_ms",
    group: "grupo",
  });
  if (!expected.ok) throw new Error(expected.error.code);
  const report = page.locator("[data-stats-report]");
  for (const line of expected.value.tests) await expect(report).toContainText(line.apa);
  await expect(report).toContainText("d de Cohen");
  await expect(page.locator("[data-stats-chart] svg rect.stats-bar")).toHaveCount(2);
});

test("every question of the assistant answers on the example", async ({ page }) => {
  await loadExample(page);
  const cases: [string, Record<string, string>][] = [
    ["paired", { outcome: "antes", second: "despues" }],
    ["many-groups", { outcome: "lectura_ms", group: "condicion" }],
    ["correlation", { outcome: "lectura_ms", second: "comprension" }],
    ["association", { categoryA: "grupo", categoryB: "respuesta" }],
    ["one-mean", { outcome: "comprension", mu: "60" }],
    ["regression", { outcome: "comprension", predictors: "edad|lectura_ms" }],
  ];
  for (const [question, fields] of cases) {
    await ask(page, question, fields);
    await expect(status(page), question).toContainText("Resultado listo");
    await expect(page.locator("[data-stats-chart] svg")).toHaveCount(1);
  }
  await expect(page.locator("[data-stats-report] table")).toHaveCount(3);
});

test("a question that does not fit the variables says why", async ({ page }) => {
  await loadExample(page);
  await ask(page, "many-groups", { outcome: "lectura_ms", group: "grupo" });
  await expect(status(page)).toContainText("«grupo» tiene que tener tres grupos o más");
  await expect(page.locator("[data-stats-report] table")).toHaveCount(0);
});

test("Excel's Spanish CSV is read with its decimal commas", async ({ page }) => {
  await page.goto("/estadistica");
  await page.locator("[data-stats-input]").fill("tiempo;grupo\n3,25;a\n4,5;b\n5,75;a\n");
  await page.locator("[data-stats-read]").click();
  await expect(status(page)).toContainText("Datos leídos: 3 filas y 2 variables");
  await expect(page.locator('[data-stats-kind="tiempo"]')).toHaveValue("numeric");
});

test("the chart downloads as a well-formed SVG and axe finds no violations with results", async ({
  page,
}) => {
  await loadExample(page);
  await ask(page, "correlation", { outcome: "lectura_ms", second: "comprension" });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("[data-stats-svg]").click(),
  ]);
  const svg = readFileSync(await download.path(), "utf8");
  expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect((svg.match(/<circle /g) ?? []).length).toBe(39);
  const results = await new AxeBuilder({ page })
    .include("[data-stats]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
