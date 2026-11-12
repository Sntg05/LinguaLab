import { expect, test, type Page } from "@playwright/test";

/**
 * El transcriptor, en un navegador de verdad.
 *
 * POR QUE ESTA PRUEBA NO PUEDE FALTAR
 *
 * El adaptador tiene su suite de contrato en Node, con un `fetch` de mentira.
 * Que la pagina lo conecte bien, que el diccionario del ingles se sirva desde
 * el propio sitio bajo la CSP y que los selectores lleguen hasta el motor solo
 * se puede demostrar aqui.
 *
 * POR QUE SE ESPERA AL ESTADO Y NO A QUE LA SALIDA NO ESTE VACIA
 *
 * La salida arranca con un marcador (`—`), que no está vacío. Una espera del
 * tipo «no está vacío» se satisface al instante y hace leer el marcador como si
 * fuera la transcripción: una prueba verde que no probó nada. Se espera a que el
 * estado diga «Listo» y a que el marcador haya sido reemplazado.
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

test("transcribe español con sílabas y acento, sin pedir el diccionario", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await fonemizar(page, "casa pingüino", "spa");

  expect(await esperarResultado(page)).toBe("ˈka.sa pin.ˈɡwi.no");
  expect(requests.filter((url) => url.includes("/cmudict/"))).toEqual([]);
});

test("la variedad y el nivel del español llegan hasta el motor", async ({ page }) => {
  await page.goto("/fonemizador");
  await page.locator(TEXT).fill("zapato lobo");
  await page.locator("[data-phon-variety]").selectOption("castilian");
  await page.locator("[data-phon-level]").selectOption("phonetic");
  await page.locator(RUN).click();

  expect(await esperarResultado(page)).toBe("θa.ˈpa.to ˈlo.βo");
});

test("transcribe inglés con el diccionario y declara lo que no sabe", async ({ page }) => {
  await fonemizar(page, "the bird read zzyzxq", "eng");

  expect(await esperarResultado(page)).toBe("ðə bɝd ɹɛd ⟨zzyzxq⟩");
  await expect(page.locator("[data-phon-skipped]")).toHaveText("zzyzxq");
  await expect(page.locator("[data-phon-variants]")).toContainText("read: ɹɛd ~ ɹid");
  // La variedad y el nivel son del español: en inglés no se ofrecen.
  await expect(page.locator("[data-phon-variety]")).toBeHidden();
});

test("si el diccionario no llega lo dice, y no inventa un resultado", async ({ page }) => {
  await page.route("**/cmudict/**", (route) => route.abort());

  await fonemizar(page, "bird", "eng");

  await expect(page.locator(STATUS)).toContainText("no está disponible", ENGINE_START);
  await expect(page.locator(IPA)).toHaveText(EMPTY);
});

test("el aviso de que es una transcripción de referencia se ve antes de transcribir", async ({
  page,
}) => {
  await page.goto("/fonemizador");

  await expect(page.locator("[data-phonemizer]")).toContainText(/no sustituye/i);
});

test("FonoLab transcribe con el mismo motor que esta página", async ({ page }) => {
  // FonoLab tenía reglas propias con distinción: «zapato» daba /θ/ allá y /s/
  // aquí. Un solo motor significa una sola respuesta.
  await page.goto("/fono");
  await page.locator("[data-tx-input]").fill("zapato");
  await page.locator("[data-tx-run]").click();

  await expect(page.locator("[data-tx-out]")).toHaveText("sa.ˈpa.to");
});
