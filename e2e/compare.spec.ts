import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { logLikelihood } from "../src/scripts/tools/keyness";

/**
 * La comparación de documentos de punta a punta (S13): un .docx y un PDF reales
 * (hechos con pandoc y xelatex, ver `scripts/build-document-fixtures.sh`) y un
 * .txt, leídos en el navegador —pdf.js con su worker, bajo la CSP del sitio—,
 * comparados y descargados. Las cadenas se esperan en español: la ruta es `/tools`.
 */

const FIXTURES = new URL("../packages/adapters/src/document/fixtures/", import.meta.url);
const fixture = (name: string) => ({
  name,
  mimeType: name.endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: readFileSync(fileURLToPath(new URL(name, FIXTURES))),
});
const text = (name: string, body: string) => ({
  name,
  mimeType: "text/plain",
  buffer: Buffer.from(body, "utf8"),
});

/** «radio» 20 veces en 50 palabras: una palabra clave con cifras conocidas. */
const RADIO = text("radio.txt", "La radio y la radio. ".repeat(10));

const downloadOf = async (
  page: Page,
  trigger: Locator,
): Promise<{ name: string; text: string }> => {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), "utf8") };
};

/** CSV sin comas dentro de los campos en estos datos. */
const rowsOf = (csv: string): string[][] =>
  csv
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .map((line) => line.split(","));

const status = (page: Page): Locator => page.locator("[data-cmp-status]");

const loadThree = async (page: Page): Promise<void> => {
  await page.goto("/tools");
  const input = page.locator("[data-cmp-files]");
  await input.setInputFiles([fixture("sample.docx"), fixture("sample.pdf"), RADIO]);
  await expect(page.locator("[data-cmp-list] li")).toHaveCount(3, { timeout: 30_000 });
  await expect(status(page)).toContainText("«radio.txt» cargado: 50 palabras");
};

test("un .docx, un PDF y un .txt se leen, se comparan y sus descargas traen las cifras del motor", async ({
  page,
}) => {
  await loadThree(page);
  await page.locator("[data-cmp-alpha]").selectOption("0.05");
  await page.locator("[data-cmp-min]").fill("1");
  await page.locator("[data-cmp-run]").click();
  await expect(status(page)).toContainText("Comparación lista: 3 documentos");

  // 30 palabras en el .docx (3 + 10 + 11 + 6 por párrafo); el PDF trae las mismas
  // más el número de página que pone LaTeX.
  const words = page.locator("[data-cmp-profile] tbody tr").first().locator("td");
  await expect(words).toHaveText(["30", "31", "50"]);

  const radio = page.locator('[data-cmp-keywords="radio.txt"] table').first();
  await expect(radio).toContainText("radio");

  const profile = await downloadOf(page, page.locator('[data-cmp-export="profile"]'));
  expect(profile.name).toBe("profile.csv");
  expect(rowsOf(profile.text).map((row) => row.slice(0, 2))).toEqual([
    ["document", "words"],
    ["sample.docx", "30"],
    ["sample.pdf", "31"],
    ["radio.txt", "50"],
  ]);

  const keywords = await downloadOf(page, page.locator('[data-cmp-export="keywords"]'));
  const row = rowsOf(keywords.text).find(
    (cells) => cells[0] === "radio.txt" && cells[2] === "radio",
  );
  expect(row?.slice(1, 5)).toEqual(["positive", "radio", "20", "0"]);
  expect(Number(row?.[7])).toBeCloseTo(logLikelihood(20, 0, 50, 30 + 31), 12);

  const frequency = await downloadOf(page, page.locator('[data-cmp-export="frequency"]'));
  expect(rowsOf(frequency.text)[0]).toEqual([
    "word",
    "sample.docx_count",
    "sample.docx_per_10k",
    "sample.pdf_count",
    "sample.pdf_per_10k",
    "radio.txt_count",
    "radio.txt_per_10k",
  ]);

  await page.locator("[data-cmp-kwic-word]").fill("lengua");
  await page.locator("[data-cmp-kwic] button").click();
  await expect(status(page)).toContainText("2 apariciones de «lengua»");
});

test("un cuarto documento, uno repetido y un PDF escaneado se rechazan diciendo por qué", async ({
  page,
}) => {
  await loadThree(page);
  await page.locator("[data-cmp-files]").setInputFiles([text("cuarto.txt", "otra cosa")]);
  await expect(status(page)).toContainText("Como máximo tres documentos: «cuarto.txt» no se cargó");

  await page.getByRole("button", { name: "Quitar radio.txt" }).click();
  await expect(page.locator("[data-cmp-list] li")).toHaveCount(2);

  await page.locator("[data-cmp-files]").setInputFiles([fixture("sample.docx")]);
  await expect(status(page)).toContainText("«sample.docx» ya está cargado");

  await page.locator("[data-cmp-files]").setInputFiles([fixture("image-only.pdf")]);
  await expect(status(page)).toContainText("«image-only.pdf» no tiene texto que leer", {
    timeout: 30_000,
  });
  await expect(page.locator("[data-cmp-list] li")).toHaveCount(2);
});

test("con un solo documento no se puede comparar", async ({ page }) => {
  await page.goto("/tools");
  await page.locator("[data-cmp-files]").setInputFiles([RADIO]);
  await expect(page.locator("[data-cmp-list] li")).toHaveCount(1);
  await expect(page.locator("[data-cmp-run]")).toBeDisabled();
});

test("con los resultados a la vista, axe no encuentra violaciones", async ({ page }) => {
  await loadThree(page);
  await page.locator("[data-cmp-run]").click();
  await page.locator("[data-cmp-kwic-word]").fill("radio");
  await page.locator("[data-cmp-kwic] button").click();
  await expect(page.locator("[data-cmp-kwic-results] table")).toHaveCount(1);
  const results = await new AxeBuilder({ page })
    .include("[data-cmp]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
