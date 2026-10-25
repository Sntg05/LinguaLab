import { expect, test, type Page } from "@playwright/test";

/**
 * Filtrado y detalle del mapa de lenguas.
 *
 * POR QUE SE AFIRMA SOBRE FILAS VISIBLES Y NO SOBRE ATRIBUTOS
 *
 * Lo que hay que demostrar es que una persona puede quedarse con las lenguas de
 * una familia y abrir la ficha de una lengua concreta. Comprobar el `hidden` de
 * cada fila comprobaria la implementacion: el script podria estar marcando los
 * atributos correctos y la tabla seguir mostrando lo mismo. `:visible` mira lo
 * que hay en la pantalla, que es lo que la persona ve.
 *
 * El mapa es decorativo (`aria-hidden`) y su contenido vive en la tabla; por eso
 * ninguna prueba de aqui mira el SVG. Lo que se prueba es el camino accesible.
 */

const ROW = "[data-language-row]";
const VISIBLE = `${ROW}:visible`;
const FAMILY = '[data-language-filter="family"]';
const SEARCH = "[data-language-search]";
const COUNT = "[data-language-count]";

const rows = (page: Page) => page.locator(VISIBLE);

test("filtrar por familia deja solo las lenguas de esa familia", async ({ page }) => {
  await page.goto("/lenguas");

  // 136 lenguas de Colombia: 127 con coordenadas y 9 sin ubicacion.
  await expect(rows(page)).toHaveCount(136);

  await page.locator(FAMILY).selectOption("Tucanoan");

  await expect(rows(page)).toHaveCount(23);
  await expect(page.locator(ROW).filter({ hasText: "Cubeo" })).toBeVisible();
  await expect(page.locator(ROW).filter({ hasText: "Wayuu" })).toBeHidden();
  await expect(page.locator(COUNT)).toContainText("Mostrando 23 de 136 lenguas");
});

test("la busqueda por nombre encuentra una lengua y descarta el resto", async ({ page }) => {
  await page.goto("/lenguas");

  await page.locator(SEARCH).fill("wayuu");

  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator(VISIBLE)).toContainText("Wayuu");
  await expect(page.locator(COUNT)).toContainText("Mostrando 1 de 136 lenguas");
});

test("buscar sin tildes encuentra el nombre que la fuente escribe con tilde", async ({ page }) => {
  await page.goto("/lenguas");

  await page.locator(SEARCH).fill("paez");

  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator(VISIBLE)).toContainText("Páez");
});

test("abrir el detalle de una lengua muestra su ficha y su fuente", async ({ page }) => {
  await page.goto("/lenguas");

  await page.locator('[data-language-open="wayu1243"]').click();

  const detail = page.locator(".language-detail");

  await expect(detail.locator("[data-detail-name]")).toHaveText("Wayuu");
  await expect(detail.locator("[data-detail-family]")).toHaveText("Arawakan");
  await expect(detail.locator("[data-detail-glottocode]")).toHaveText("wayu1243");
  await expect(detail.locator("[data-detail-iso]")).toHaveText("guc");

  // La ficha de origen es el enlace que sostiene el dato, y apunta a la lengua
  // elegida: un enlace generico a glottolog.org no permitiria comprobar nada.
  await expect(detail.locator("[data-detail-link]")).toHaveAttribute(
    "href",
    "https://glottolog.org/resource/languoid/id/wayu1243",
  );
});

test("una lengua sin coordenadas tambien abre su detalle, listada aparte", async ({ page }) => {
  await page.goto("/lenguas");

  const withoutLocation = page.locator(".language-map__unlocated");
  await expect(withoutLocation.locator("[data-language-row]")).toHaveCount(9);

  await withoutLocation.locator('[data-language-open="mali1242"]').click();

  const detail = page.locator(".language-detail");
  await expect(detail.locator("[data-detail-name]")).toHaveText("Malibu");
  await expect(detail.locator("[data-detail-iso]")).toHaveText("Sin código publicado");
  // Tambien desde la lista aparte, el enlace tiene que ser el de esa lengua.
  await expect(detail.locator("[data-detail-link]")).toHaveAttribute(
    "href",
    "https://glottolog.org/resource/languoid/id/mali1242",
  );
});

test("la version en ingles filtra con sus propias etiquetas", async ({ page }) => {
  await page.goto("/en/lenguas");

  await page.locator(FAMILY).selectOption("Arawakan");

  await expect(page.locator(COUNT)).toContainText("Showing 12 of 136 languages");
  await expect(page.locator(ROW).filter({ hasText: "Wayuu" })).toBeVisible();
});
