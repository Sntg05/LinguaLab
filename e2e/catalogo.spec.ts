import { readFileSync } from "node:fs";
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

/**
 * Las tarjetas que el catalogo DEBE mostrar salen del propio catalogo de datos.
 *
 * POR QUE NO VAN LOS NUMEROS ESCRITOS A MANO
 *
 * Estaban escritos —diez fichas, dos de fonetica, cinco integradas— y cada
 * herramienta nueva los volvia falsos en un archivo que no tiene nada que ver
 * con la herramienta nueva. Peor: un numero desactualizado se «arregla» mirando
 * lo que la pagina muestra, que es justo lo que la prueba tiene que juzgar. Con
 * la expectativa derivada de `tools.json`, lo que se afirma es el invariante que
 * importa: el catalogo enseña exactamente las fichas que declara y ninguna mas.
 */
interface CatalogTool {
  readonly id: string;
  readonly area: string;
  readonly integration: string;
  readonly status: string;
}

const CATALOG: readonly CatalogTool[] = JSON.parse(
  readFileSync(new URL("../src/data/tools.json", import.meta.url), "utf8"),
).tools;

const countWhere = (predicate: (tool: CatalogTool) => boolean): number =>
  CATALOG.filter(predicate).length;

const cardsFor = (page: Page) => page.locator(VISIBLE);

test("filtrar por area deja solo las herramientas de esa area", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(cardsFor(page)).toHaveCount(CATALOG.length);

  await page.locator(AREA).selectOption("fonetica");

  await expect(cardsFor(page)).toHaveCount(countWhere((tool) => tool.area === "fonetica"));
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

test("una herramienta alojada fuera se abre en otra pestaña, con su aviso", async ({ page }) => {
  await page.goto("/catalogo");

  const hosted = page.locator(CARD).filter({ hasText: "Praat" }).first();
  const link = hosted.locator("[data-external]");

  // El enlace existe, apunta fuera y no deja la ventana abierta sin `noopener`:
  // `rel` es lo unico que impide que el sitio de destino toque `window.opener`.
  await expect(link).toHaveAttribute("href", /^https:\/\//);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("rel", /noreferrer/);

  // Y dice que se abre en otra pestaña, dentro del nombre accesible.
  await expect(link).toContainText("se abre en otra pestaña");

  // Una ficha prevista no publica un enlace que nadie abrio.
  const planned = page.locator(CARD).filter({ hasText: "Universidad de los Andes" });
  await expect(planned.locator("[data-external]")).toHaveCount(0);
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
