import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * El conversor ELAN ↔ TextGrid en un navegador de verdad.
 *
 * POR QUE ESTA PRUEBA NO PUEDE SER UN TEST UNITARIO
 *
 * El codec tiene su prueba en Node contra Pyodide de verdad
 * (`packages/adapters/src/elan/`), y ahi se comprueba la ida y vuelta y el
 * informe de perdida. Lo que solo se puede demostrar aqui es el recorrido
 * completo en el navegador: que el worker arranque bajo la CSP del sitio, que
 * Pyodide se cargue del propio origen, que la tabla de capas se pinte y que el
 * boton de exportar produzca una DESCARGA con el formato del otro programa.
 *
 * LAS CADENAS SE ESPERAN EN ESPANOL
 *
 * La ruta que se prueba es `/elan`, la del idioma por defecto, y se buscan
 * fragmentos estables («listo para exportar», «mal formado»), no la frase
 * entera: una prueba atada a la redaccion exacta se rompe con cada correccion de
 * estilo y nadie sabe si el roto es el codigo o el texto.
 *
 * LA PRIMERA CARGA TARDA
 *
 * La primera conversion descarga unos 13 MB de Pyodide y compila el wasm, asi
 * que las esperas de esta suite son largas a proposito. Es el mismo costo que
 * paga una persona la primera vez, y el motivo de que la pagina muestre una
 * barra de progreso.
 */

const FIXTURES = new URL("./fixtures/", import.meta.url);

const FILE_INPUT = "[data-elan-file]";
const STATUS = "[data-elan-status]";
const TIERS = "[data-elan-tiers]";
const ROWS = "[data-elan-tier-rows] tr";
const EXPORT = "[data-elan-export]";
const LOSS = "[data-elan-loss]";
const LOSS_NONE = "[data-elan-loss-none]";
const LOSS_HIERARCHICAL = "[data-elan-loss-hierarchical]";
const LOSS_REFERENCES = "[data-elan-loss-references]";
const LOSS_VOCABULARIES = "[data-elan-loss-vocabularies]";

/** Lo que tarda la primera conversion: motor, wheel y archivo. */
const FIRST_CONVERSION_MS = 120_000;

const fixturePath = (name: string): string => fileURLToPath(new URL(name, FIXTURES));

const loadFixture = async (page: Page, name: string): Promise<void> => {
  await page.goto("/elan");
  await page.setInputFiles(FILE_INPUT, fixturePath(name));
};

test("carga un .eaf, muestra sus capas y exporta un TextGrid", async ({ page }) => {
  test.setTimeout(FIRST_CONVERSION_MS * 2);

  await loadFixture(page, "simple.eaf");

  await expect(page.locator(STATUS)).toContainText("listo para exportar", {
    timeout: FIRST_CONVERSION_MS,
  });

  // Dos capas, en el orden del archivo y con su primer texto.
  await expect(page.locator(TIERS)).toBeVisible();
  await expect(page.locator(ROWS)).toHaveCount(2);
  await expect(page.locator(ROWS).first()).toContainText("frase");
  await expect(page.locator(ROWS).first()).toContainText("hola mundo");

  // El .eaf simple no trae jerarquias, referencias ni vocabularios, asi que las
  // tres listas dicen que por esa causa no se perdio nada. Lo que SI cambia es
  // el silencio de `palabra`, que se rellena para que Praat abra el archivo: el
  // informe lo dice en vez de callarlo.
  await expect(page.locator(LOSS)).toBeVisible();
  await expect(page.locator(LOSS_NONE)).toBeHidden();
  await expect(page.locator(LOSS)).toContainText("Nada perdido por esta causa");
  await expect(page.locator(LOSS)).toContainText("se rellenaron con intervalos vacíos");

  const downloadPromise = page.waitForEvent("download");
  await page.locator(EXPORT).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("simple.TextGrid");
  const path = await download.path();
  const text = readFileSync(path, "utf8");
  expect(text).toContain('Object class = "TextGrid"');
  expect(text).toContain("hola mundo");
  expect(text).toContain("adios");

  await expect(page.locator(STATUS)).toContainText("Descargado");
});

test("el informe de perdida nombra la capa jerarquica y el vocabulario", async ({ page }) => {
  test.setTimeout(FIRST_CONVERSION_MS * 2);

  await loadFixture(page, "jerarquico.eaf");
  await expect(page.locator(STATUS)).toContainText("listo para exportar", {
    timeout: FIRST_CONVERSION_MS,
  });

  const report = page.locator(LOSS);
  await expect(report).toBeVisible();
  // La capa jerarquica aparece en las dos listas: tiene padre y sus anotaciones
  // apuntan a otra anotacion. El vocabulario controlado, en la suya.
  await expect(page.locator(LOSS_HIERARCHICAL)).toContainText("palabra");
  await expect(page.locator(LOSS_REFERENCES)).toContainText("palabra");
  await expect(page.locator(LOSS_VOCABULARIES)).toContainText("cv-categoria");
  // Nada se perdio "en general": el aviso de que no se perdio nada no aplica.
  await expect(page.locator(LOSS_NONE)).toBeHidden();
});

test("un .eaf truncado se rechaza diciendo que esta mal formado", async ({ page }) => {
  test.setTimeout(FIRST_CONVERSION_MS * 2);

  await loadFixture(page, "malformado.eaf");

  await expect(page.locator(STATUS)).toContainText("mal formado", {
    timeout: FIRST_CONVERSION_MS,
  });
  await expect(page.locator(STATUS)).toHaveAttribute("data-state", "error");
  // Sin capas y sin boton: no hay nada que exportar.
  await expect(page.locator(EXPORT)).toBeHidden();
});

test("un archivo que no es de ninguno de los dos formatos se rechaza sin cargar el motor", async ({
  page,
}) => {
  await loadFixture(page, "no-es-anotacion.txt");

  await expect(page.locator(STATUS)).toContainText("no parece un .eaf ni un .TextGrid");
  await expect(page.locator(STATUS)).toHaveAttribute("data-state", "error");
});

test("el conversor no tiene violaciones de accesibilidad", async ({ page }) => {
  await page.goto("/elan");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => ({
      target: node.target.join(" "),
      failure: node.failureSummary,
    })),
  }));

  expect(summary).toEqual([]);
});

test("la version en ingles existe y avisa en ingles", async ({ page }) => {
  await page.goto("/en/elan");

  await expect(page.locator("h1")).toContainText(/ELAN/i);
  await expect(page.locator("[data-elanlab]")).toContainText(/Always keep the original file/i);
});
