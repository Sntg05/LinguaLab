import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Un experimento de aceptabilidad de punta a punta, en un navegador de verdad.
 *
 * POR QUE ESTA PRUEBA NO PUEDE SER UN TEST UNITARIO
 *
 * El generador de ensayos, el CSV y el adaptador se prueban en Node, y ahi esta
 * su contrato. Lo que solo se puede demostrar aqui es lo que depende del
 * navegador: que jsPsych dibuje las pantallas dentro de la pagina, que la escala
 * responda a un clic real, que la sesion termine y que el CSV de resultados salga
 * como archivo descargado. Sin esta prueba, «un docente monta un experimento y
 * descarga los resultados» seria una afirmacion sin medicion.
 *
 * LOS TRES ESTIMULOS SE ESCRIBEN AQUI
 *
 * Son tres frases inventadas: no se guarda un CSV de ejemplo en el repositorio
 * porque un archivo de estimulos parece un dato y no lo es.
 *
 * LAS CADENAS SE ESPERAN EN ESPANOL porque la ruta que se prueba es `/experimentos`,
 * la del idioma por defecto, y se buscan fragmentos estables, no la redaccion
 * exacta.
 */

const STIMULI = [
  "id,condition,text,audio",
  "e1,control,El gato duerme.,",
  "e2,isla,¿Quién dijo qué?,",
  "e3,control,La niña canta.,",
].join("\n");

const STIMULI_INPUT = "[data-explab-stimuli]";
const SEED_INPUT = "[data-explab-seed]";
const PREVIEW = "[data-explab-preview]";
const PREVIEW_ROWS = "[data-explab-preview-body] tr";
const RUN = "[data-explab-run]";
const DOWNLOAD = "[data-explab-download]";
const STATUS = "[data-explab-status]";
const NEXT_INSTRUCTIONS = "#jspsych-instructions-next";
const LIKERT_SUBMIT = "#jspsych-survey-likert-next";
const LIKERT_OPTIONS = ".jspsych-survey-likert-opt-label input[type=radio]";

/** Responde un ensayo de la escala con un valor de 1 a 7 y avanza. */
const answerLikert = async (page: Page, value: number): Promise<void> => {
  await page
    .locator(LIKERT_OPTIONS)
    .nth(value - 1)
    .check();
  await page.locator(LIKERT_SUBMIT).click();
};

test("un experimento de aceptabilidad con tres estimulos descarga su CSV", async ({ page }) => {
  await page.goto("/experimentos");

  // El aviso de precision tiene que estar visible: es parte de la promesa.
  await expect(page.locator(".callout--warn")).toContainText("precisión limitada");

  await page.locator(STIMULI_INPUT).fill(STIMULI);
  await page.locator(SEED_INPUT).fill("2024");
  await page.locator("[data-explab-scale-left]").fill("nada natural");
  await page.locator("[data-explab-scale-right]").fill("muy natural");
  await page.locator(PREVIEW).click();

  // La vista previa es el orden exacto que va a ver el participante.
  await expect(page.locator(PREVIEW_ROWS)).toHaveCount(3);
  await expect(page.locator("[data-explab-preview-count]")).toContainText("3 ensayo");

  await page.locator(RUN).click();

  // Pantalla de instrucciones (el texto por defecto de la plantilla).
  await expect(page.locator(NEXT_INSTRUCTIONS)).toBeVisible();
  await page.locator(NEXT_INSTRUCTIONS).click();

  // Tres juicios, en el orden en que los presenta la semilla 2024.
  for (const value of [7, 3, 5]) {
    await expect(page.locator(LIKERT_SUBMIT)).toBeVisible();
    await answerLikert(page, value);
  }

  // Al terminar, el CSV se habilita y la pagina lo dice.
  await expect(page.locator(STATUS)).toContainText("Terminado");
  await expect(page.locator(DOWNLOAD)).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(DOWNLOAD).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^experimentos-.*\.csv$/);
  const path = await download.path();
  expect(path).not.toBeNull();

  const csv = readFileSync(path as string, "utf8");
  const rows = csv.trimEnd().split("\n");

  expect(rows[0]).toBe("participant,trial,condition,response,rt_ms,tool_version,seed");
  expect(rows).toHaveLength(4);

  const cells = rows.slice(1).map((row) => row.split(","));

  // Un ensayo por estimulo, con la condicion y la semilla que se eligio.
  expect(cells.map((cell) => cell[1]).sort()).toEqual(["e1", "e2", "e3"]);
  expect(cells.map((cell) => cell[2]).sort()).toEqual(["control", "control", "isla"]);
  expect(cells.map((cell) => cell[3]).sort()).toEqual(["3", "5", "7"]);

  for (const cell of cells) {
    // Participante anonimo generado en el navegador, sin nombre ni correo.
    expect(cell[0]).toMatch(/^p-[a-z0-9]+$/);
    expect(Number(cell[4])).toBeGreaterThanOrEqual(0);
    expect(cell[5]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cell[6]).toBe("2024");
  }
});
