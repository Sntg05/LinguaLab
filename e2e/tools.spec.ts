import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

/**
 * El constructor de n-gramas de la estacion textual.
 *
 * POR QUE SE AFIRMA SOBRE LA TABLA Y SOBRE LA DESCARGA, Y NO SOBRE EL MOTOR
 *
 * El motor (`ngrams`) ya tiene sus pruebas unitarias: aca no se vuelve a probar
 * que cuente bien. Lo que estas pruebas tienen que demostrar es lo que solo se
 * ve en la pagina compilada: que el constructor aparece donde debe, que cambiar
 * `n` cambia el resultado que la persona lee, que lo que escribe el formulario
 * se acota antes de llegar al motor, y que el archivo exportado declara los
 * ajustes que lo produjeron en vez de valores fijos.
 *
 * Se usa el texto de ejemplo porque es el unico corpus del sitio que se sabe con
 * bigramas repetidos: sin repeticiones el panel muestra su aviso y la tabla no
 * existe, que es un caso legitimo pero no el que se quiere medir.
 */

const PANEL = "[data-panel]";
const BUILDER = "[data-ngram-builder]";
const HEADING = `${PANEL} h3.eyebrow`;

async function analizarEjemplo(page: Page): Promise<void> {
  await page.goto("/tools");
  await page.locator("[data-sample]").click();
  await expect(page.locator(PANEL)).not.toContainText("Pega un texto");
}

/**
 * A corpus of our own, for the sizes the sample text cannot provide.
 *
 * Stopwords are turned off: the default mode is Spanish, and words like `el` and
 * `de` are exactly what makes a trigram repeat. With the default on, the panel
 * correctly reports that nothing repeats, which is not what this test needs.
 */
async function analizarTexto(page: Page, text: string): Promise<void> {
  await page.goto("/tools");
  await page.locator("[data-stopwords]").selectOption("none");
  await page.locator("[data-corpus]").fill(text);
  await page.locator("[data-analyse]").click();
  await expect(page.locator(PANEL)).not.toContainText("Pega un texto");
}

async function abrirColocaciones(page: Page): Promise<void> {
  await page.locator('[data-tab="colloc"]').click();
  await expect(page.locator(BUILDER)).toBeVisible();
}

test("el constructor solo aparece en su pestana, y no en las demas", async ({ page }) => {
  await analizarEjemplo(page);

  // La pestana inicial es Frecuencia: ahi `n` no significa nada.
  await expect(page.locator(BUILDER)).toBeHidden();

  await abrirColocaciones(page);
  await expect(page.locator(BUILDER)).toBeVisible();

  // Y vuelve a esconderse al cambiar de pestana.
  await page.locator('[data-tab="stats"]').click();
  await expect(page.locator(BUILDER)).toBeHidden();
});

test("por defecto reproduce la tabla de bigramas y la fila de trigramas que ya existian", async ({
  page,
}) => {
  await analizarEjemplo(page);
  await abrirColocaciones(page);

  // El encabezado de la tabla decia "Bigrama" antes de que existiera el
  // constructor; el constructor es una adicion, no un cambio de salida.
  await expect(page.locator(`${PANEL} table thead th`).first()).toHaveText("Bigrama");
  await expect(page.locator(HEADING).first()).toContainText("bigramas");

  // Y los trigramas siguen estando, ahora como la fila de chips del tamano
  // siguiente en vez de una seccion con valores propios. El texto de ejemplo no
  // tiene trigramas repetidos, asi que esa fila es el encabezado y su aviso; lo
  // que se afirma es que la seccion existe, no que tenga contenido.
  await expect(page.locator(HEADING).nth(1)).toContainText("trigramas");
});

test("cambiar n cambia el tamano de los n-gramas que se muestran", async ({ page }) => {
  // El texto de ejemplo no repite trigramas: con el, el panel mostraria su aviso
  // y la tabla no existiria. Se usa un corpus construido para repetirlos, con
  // las stopwords desactivadas para que las repeticiones sobrevivan.
  await analizarTexto(
    page,
    "el analisis de corpus mide el analisis de corpus y el analisis de corpus otra vez",
  );
  await abrirColocaciones(page);

  await page.locator("[data-ngram-n]").fill("3");

  await expect(page.locator(HEADING).first()).toContainText("trigramas");
  await expect(page.locator(`${PANEL} table thead th`).first()).toHaveText("Trigrama");

  // Cada fila tiene que ser de verdad un trigrama: tres palabras separadas por
  // un espacio. Mirar solo el encabezado dejaria pasar una tabla mal armada.
  const primero = await page.locator(`${PANEL} table tbody tr td`).first().innerText();
  expect(primero.trim().split(/\s+/)).toHaveLength(3);
});

test("lo que se escribe fuera de rango se acota antes de llegar al motor", async ({ page }) => {
  await analizarEjemplo(page);
  await abrirColocaciones(page);

  // Con la frecuencia minima en 1 hay al menos un 5-grama en cualquier texto de
  // cinco palabras o mas, asi que el acotado se puede medir sin depender de que
  // el corpus repita esa longitud.
  await page.locator("[data-ngram-min]").fill("1");

  // El formulario acepta cualquier numero; el motor solo de 2 a 5.
  await page.locator("[data-ngram-n]").fill("9");
  await expect(page.locator(HEADING).first()).toContainText("5-gramas");

  await page.locator("[data-ngram-n]").fill("1");
  await expect(page.locator(HEADING).first()).toContainText("bigramas");
});

test("el export declara los ajustes que produjeron el resultado", async ({ page }) => {
  await analizarEjemplo(page);
  await abrirColocaciones(page);

  await page.locator("[data-ngram-n]").fill("3");
  await page.locator("[data-ngram-sort]").selectOption("count");

  const descarga = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  const archivo = await descarga;
  const ruta = await archivo.path();
  expect(ruta).not.toBeNull();

  const exportado = JSON.parse(await readFile(ruta as string, "utf8")) as {
    ngrams: { n: number; sortBy: string; results: unknown[] };
    bigrams: unknown[];
    trigrams: unknown[];
  };

  expect(exportado.ngrams.n).toBe(3);
  expect(exportado.ngrams.sortBy).toBe("count");
  expect(Array.isArray(exportado.ngrams.results)).toBe(true);

  // Las claves anteriores se conservan para que un archivo exportado ayer se
  // siga pudiendo leer con el mismo programa.
  expect(Array.isArray(exportado.bigrams)).toBe(true);
  expect(Array.isArray(exportado.trigrams)).toBe(true);
});
