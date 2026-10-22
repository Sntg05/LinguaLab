import { expect, test, type Page } from "@playwright/test";

/**
 * El fonemizador, en un navegador de verdad.
 *
 * POR QUE ESTA PRUEBA NO PUEDE FALTAR
 *
 * El adaptador tiene su suite de contrato, pero corre en Node, donde no hay
 * `Worker`: lo único que puede probar ahí es el camino de motor no disponible.
 * Que eSpeak NG arranque, compile su WebAssembly, monte los datos y devuelva AFI
 * solo se puede demostrar aquí. Sin esta prueba, «fonemizador estable» sería una
 * afirmación sin medición.
 *
 * POR QUE SE ESPERA AL ESTADO Y NO A QUE LA SALIDA NO ESTE VACIA
 *
 * La salida arranca con un marcador (`—`), que no está vacío. Una espera del
 * tipo «no está vacío» se satisface al instante y hace leer el marcador como si
 * fuera la transcripción: una prueba verde que no probó nada. Se espera a que el
 * estado diga «Listo» y a que el marcador haya sido reemplazado.
 *
 * La primera fonemización descarga 5,6 MB desde el propio origen y monta un
 * archivo en el sistema de archivos virtual del wasm, así que las esperas son
 * largas a propósito: un tiempo corto mediría la máquina, no el producto.
 */

const TEXT = "[data-phon-text]";
const LANG = "[data-phon-lang]";
const RUN = "[data-phon-run]";
const IPA = "[data-phon-ipa]";
const STATUS = "[data-phon-status]";

/** The placeholder the output shows before anything has been phonemized. */
const EMPTY = "—";

/** Long enough for a cold engine start; a timeout here means it never started. */
const ENGINE_START = { timeout: 60_000 } as const;

async function fonemizar(page: Page, text: string, lang: string): Promise<void> {
  await page.goto("/fonemizador");
  await page.locator(LANG).selectOption(lang);
  await page.locator(TEXT).fill(text);
  await page.locator(RUN).click();
}

/** Waits for a real transcription, not for the placeholder. */
async function esperarResultado(page: Page): Promise<string> {
  await expect(page.locator(STATUS)).toContainText("Listo", ENGINE_START);
  await expect(page.locator(IPA)).not.toHaveText(EMPTY, ENGINE_START);
  return (await page.locator(IPA).innerText()).trim();
}

test("fonemiza una palabra en español y muestra su AFI", async ({ page }) => {
  await fonemizar(page, "casa", "spa");

  const ipa = await esperarResultado(page);

  expect(ipa.length).toBeGreaterThan(0);
  // "casa" empieza con oclusiva velar sorda en las voces españolas
  expect(ipa).toContain("k");
  // y la vocal final sigue ahí: una salida sin vocales no es una transcripción
  expect(ipa).toContain("a");
});

test("fonemiza en inglés y la salida no es la misma que en español", async ({ page }) => {
  await fonemizar(page, "casa", "spa");
  const enEspanol = await esperarResultado(page);

  await page.locator(LANG).selectOption("eng");
  await page.locator(RUN).click();
  const enIngles = await esperarResultado(page);

  // Dos voces distintas sobre la misma grafía no tienen por qué coincidir; si
  // coincidieran, el selector de lengua no estaría haciendo nada.
  expect(enIngles).not.toBe(enEspanol);
});

test("sin Web Workers lo dice, y no inventa un resultado", async ({ page }) => {
  // El motor vive en un worker. Sin él no hay fonemización posible, y la
  // herramienta tiene que decirlo en vez de mostrar el texto de entrada como si
  // fuera una transcripción.
  //
  // POR QUE SE SIMULA LA AUSENCIA Y NO SE BLOQUEAN LOS DATOS
  //
  // Lo natural sería abortar las descargas con `page.route`, y no funciona:
  // Chromium no pasa por el enrutador de Playwright las peticiones que hace un
  // Web Worker, así que los datos llegaban igual y el motor fonemizaba. Se
  // comprobó con `page.route` y con `context.route`, las dos veces en falso. Un
  // navegador sin `Worker` —restricciones de contexto, versiones viejas— es un
  // caso real y este sí se puede reproducir de forma determinista.
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", { value: undefined, configurable: true });
  });

  await fonemizar(page, "casa", "spa");

  await expect(page.locator(STATUS)).toContainText("no está disponible", ENGINE_START);
  await expect(page.locator(IPA)).toHaveText(EMPTY);
});

test("el aviso de que el AFI es aproximado se ve antes de fonemizar", async ({ page }) => {
  await page.goto("/fonemizador");

  await expect(page.locator("[data-phonemizer]")).toContainText(/aproximad/i);
});
