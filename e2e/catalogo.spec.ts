import { expect, test, type Page } from "@playwright/test";

/**
 * Filtrado del catalogo de herramientas.
 *
 * POR QUE SE AFIRMA SOBRE TARJETAS VISIBLES Y NO SOBRE EL ESTADO INTERNO
 *
 * Lo que hay que demostrar es que una persona que llega al catalogo puede
 * quedarse solo con lo que le interesa y entender por que no ve nada cuando no
 * hay coincidencias. Comprobar el `hidden` de cada tarjeta por su selector
 * comprobaria la implementacion, no el resultado: el script podria estar
 * marcando atributos correctos y la tarjeta seguir viendose. `:visible` mira lo
 * que hay en la pantalla.
 */

const CARD = "[data-tool-card]";
const VISIBLE = `${CARD}:visible`;
const AREA = '[data-catalog-filter="area"]';
const LANGUAGE = '[data-catalog-filter="language"]';
const INTEGRATION = '[data-catalog-filter="integration"]';
const EMPTY = "[data-catalog-empty]";

const cardsFor = (page: Page) => page.locator(VISIBLE);

test("filtrar por area deja solo las herramientas de esa area", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(cardsFor(page)).toHaveCount(10);

  await page.locator(AREA).selectOption("fonetica");

  // FonoLab y el analisis acustico son las dos herramientas de fonetica.
  await expect(cardsFor(page)).toHaveCount(2);
  await expect(page.locator(VISIBLE).filter({ hasText: "FonoLab" })).toBeVisible();
  await expect(
    page.locator(CARD).filter({ hasText: "Mapa de lenguas indígenas de Colombia" }),
  ).toBeHidden();
});

test("filtrar por tipo de integracion aisla lo que necesita servidor", async ({ page }) => {
  await page.goto("/catalogo");

  await page.locator(INTEGRATION).selectOption("needs-backend");

  await expect(cardsFor(page)).toHaveCount(1);
  await expect(page.locator(VISIBLE)).toContainText("Conversor ELAN");
});

test("filtrar por lengua deja fuera las herramientas independientes de la lengua", async ({
  page,
}) => {
  await page.goto("/catalogo");

  await page.locator(LANGUAGE).selectOption("es");

  // FonoLab, ArborLab, la Estacion textual, Ortografia a AFI y el fonemizador.
  await expect(cardsFor(page)).toHaveCount(5);
  await expect(page.locator(CARD).filter({ hasText: "Visor de audio y TextGrid" })).toBeHidden();
});

test("una herramienta planificada se marca como planificada y no es un enlace", async ({
  page,
}) => {
  await page.goto("/catalogo");

  const planned = page.locator(CARD).filter({ hasText: "Conversor ELAN" });

  // La marca es visible y distinta de una insignia de estado corriente.
  await expect(planned.locator("[data-planned-mark]")).toBeVisible();
  await expect(planned).toContainText("Planificada");

  // Y no es un enlace: no se puede abrir algo que todavia no existe.
  await expect(planned.locator("a")).toHaveCount(0);
});

test("el estado vacio explica por que no coincide nada", async ({ page }) => {
  await page.goto("/catalogo");

  // Tipologia y "requiere servidor" no se cruzan: el mapa esta incrustado y el
  // conversor ELAN es de documentacion.
  await page.locator(AREA).selectOption("tipologia");
  await page.locator(INTEGRATION).selectOption("needs-backend");

  await expect(cardsFor(page)).toHaveCount(0);
  const empty = page.locator(EMPTY);
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("Tipología");
  await expect(empty).toContainText("Requiere servidor");
});

test("el catalogo en ingles filtra con sus propias etiquetas", async ({ page }) => {
  await page.goto("/en/catalogo");

  await page.locator(INTEGRATION).selectOption("embedded");
  await expect(cardsFor(page)).toHaveCount(9);

  await page.locator(AREA).selectOption("fonetica");
  await expect(cardsFor(page)).toHaveCount(2);
});
