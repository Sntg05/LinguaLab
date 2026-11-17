import { Buffer } from "node:buffer";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * El laboratorio de análisis cualitativo, de punta a punta (T7).
 *
 * Cada archivo que la página descarga se lee de vuelta: la hoja de codificación
 * se vuelve a cargar y recupera las marcas, el libro de códigos se reimporta
 * igual y el informe de acuerdo trae la kappa que se calcula a mano abajo.
 * Las cadenas se esperan en español porque la ruta es `/cualitativo`.
 */

const downloadOf = async (
  page: Page,
  trigger: Locator,
): Promise<{ readonly name: string; readonly text: string }> => {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), "utf8") };
};

/** Las filas del CSV que escribe la página: sin comillas en estos datos, salvo el texto. */
const rowsOf = (csv: string): string[][] =>
  csv
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .map((line) => line.split(","));

const csvFile = (name: string, text: string) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(text, "utf8"),
});

const mark = (page: Page, segment: number, code: number): Locator =>
  page.locator(`[data-qual-mark="${segment}:${code}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/cualitativo");
  await page.locator("[data-qual-example]").click();
  await expect(page.locator("[data-qual-status]")).toContainText("Ejemplo cargado");
});

test("el ejemplo se codifica, las frecuencias cuentan y la hoja descargada se recupera", async ({
  page,
}) => {
  await expect(page.locator("[data-qual-coding] tbody tr")).toHaveCount(10);
  // Identidad (código 0) en los segmentos 6 y 10; Escuela (2) en el 4.
  await mark(page, 5, 0).check();
  await mark(page, 9, 0).check();
  await mark(page, 3, 2).check();

  const identity = page.locator("[data-qual-frequencies] tbody tr").first();
  await expect(identity).toContainText("Identidad");
  await expect(identity).toContainText("20,0 %");

  const { name, text } = await downloadOf(page, page.locator('[data-qual-export="coding"]'));
  expect(name).toBe("coding.csv");
  expect(text.startsWith("﻿")).toBe(true);
  const [header, ...rows] = rowsOf(text);
  expect(header).toEqual([
    "segment",
    "text",
    "Identidad",
    "Transmisión familiar",
    "Escuela",
    "Actitud",
  ]);
  expect(rows).toHaveLength(10);
  expect(rows[5]?.slice(-4)).toEqual(["1", "0", "0", "0"]);
  expect(rows[3]?.slice(-4)).toEqual(["0", "0", "1", "0"]);

  // Otra visita, sin nada: la hoja descargada recupera segmentos, códigos y marcas.
  await page.goto("/cualitativo");
  await page.locator("[data-qual-resume]").setInputFiles(csvFile("coding.csv", text));
  await expect(page.locator("[data-qual-status]")).toContainText(
    "Codificación recuperada: 10 segmentos y 4 códigos",
  );
  await expect(mark(page, 5, 0)).toBeChecked();
  await expect(mark(page, 9, 0)).toBeChecked();
  await expect(mark(page, 3, 2)).toBeChecked();
  await expect(mark(page, 0, 0)).not.toBeChecked();
});

test("el libro de códigos descargado se reimporta igual", async ({ page }) => {
  const { name, text } = await downloadOf(page, page.locator('[data-qual-export="codebook"]'));
  expect(name).toBe("codebook.csv");
  expect(text).toContain("code,definition,include,exclude,example");

  await page.goto("/cualitativo");
  await page.locator("[data-qual-codebook-file]").setInputFiles(csvFile("codebook.csv", text));
  await expect(page.locator("[data-qual-status]")).toContainText(
    "Libro de códigos cargado: 4 códigos",
  );
  await expect(page.locator("[data-qual-codebook] th")).toHaveText([
    "Identidad",
    "Transmisión familiar",
    "Escuela",
    "Actitud",
  ]);
});

test("el acuerdo con otra hoja da la kappa calculada a mano, y el informe la descarga", async ({
  page,
}) => {
  await mark(page, 5, 0).check();
  await mark(page, 9, 0).check();
  const { text } = await downloadOf(page, page.locator('[data-qual-export="coding"]'));

  // La otra persona aplicó «Identidad» solo en el segmento 6. Coinciden en 9 de
  // 10; p_e = 0,2·0,1 + 0,8·0,9 = 0,74; κ = (0,9 − 0,74) / 0,26 = 0,615.
  const [header = [], ...rows] = rowsOf(text);
  const other = [
    header,
    ...rows.map((row) => (row[0] === "10" ? [...row.slice(0, -4), "0", "0", "0", "0"] : row)),
  ]
    .map((row) => row.join(","))
    .join("\n");
  await page.locator("[data-qual-others]").setInputFiles(csvFile("persona-b.csv", other));
  await expect(page.locator("[data-qual-others-list]")).toContainText("persona-b.csv");
  await page.locator("[data-qual-agree]").click();

  await expect(page.locator("[data-qual-status]")).toContainText(
    "Acuerdo calculado entre 2 hojas, sobre 10 segmentos",
  );
  const identity = page.locator('[data-qual-agreement-code="Identidad"]');
  await expect(identity).toContainText("90,0 %");
  await expect(identity).toContainText("0,615 (considerable)");

  const report = await downloadOf(page, page.locator('[data-qual-export="agreement"]'));
  expect(report.name).toBe("agreement.csv");
  const [reportHeader, ...reportRows] = rowsOf(report.text);
  expect(reportHeader).toEqual([
    "code",
    "complete_segments",
    "pairable_segments",
    "percent_agreement",
    "cohen_kappa",
    "krippendorff_alpha",
  ]);
  expect(reportRows[0]?.slice(0, 5)).toEqual(["Identidad", "10", "10", "0.9000", "0.6154"]);
});

test("una hoja mal escrita se rechaza con su fila y su columna", async ({ page }) => {
  await page
    .locator("[data-qual-others]")
    .setInputFiles(csvFile("mala.csv", "segment,text,Identidad\n1,hola,sí\n"));
  await expect(page.locator("[data-qual-status]")).toContainText(
    "No se pudo leer la hoja «mala.csv»: la fila 2, columna 3, dice «sí»",
  );
  await expect(page.locator("[data-qual-others-list] li")).toHaveCount(0);
});

test("un código se añade con su definición y se quita con sus marcas", async ({ page }) => {
  const form = page.locator("[data-qual-code-form]");
  await form.locator('input[name="name"]').fill("Humor");
  await form.locator('textarea[name="definition"]').fill("Bromas o ironía sobre la lengua.");
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("[data-qual-status]")).toContainText("Código «Humor» añadido");
  await expect(page.locator("[data-qual-coding] thead th").last()).toHaveText("Humor");

  await form.locator('input[name="name"]').fill("humor ");
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("[data-qual-status]")).toContainText("Ya hay un código con ese nombre");

  await page.getByRole("button", { name: "Quitar el código Humor" }).click();
  await expect(page.locator("[data-qual-coding] thead th").last()).toHaveText("Actitud");
});

test("con el ejemplo codificado y el acuerdo calculado, axe no encuentra violaciones", async ({
  page,
}) => {
  await mark(page, 5, 0).check();
  const { text } = await downloadOf(page, page.locator('[data-qual-export="coding"]'));
  await page.locator("[data-qual-others]").setInputFiles(csvFile("persona-b.csv", text));
  await page.locator("[data-qual-agree]").click();
  await expect(page.locator("[data-qual-agreement] tbody tr")).toHaveCount(4);

  // Las tablas que construye el navegador (casillas, matrices, informe) no
  // existen cuando `accessibility.spec.ts` mide la página vacía.
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
