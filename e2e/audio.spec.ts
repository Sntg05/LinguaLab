import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * El visor de audio en un navegador de verdad.
 *
 * POR QUE ESTA PRUEBA NO PUEDE SER UN TEST UNITARIO
 *
 * El codec de TextGrid, el motor de edicion, la FFT y los picos se prueban en
 * Node y ahi esta su contrato. Lo que solo se puede demostrar aqui es lo que
 * depende del navegador: que `decodeAudioData` lea un wav real, que el canvas se
 * pinte, que la descarga del TextGrid salga como archivo y que ese mismo archivo
 * se pueda volver a importar. Sin esta prueba, «importa y exporta TextGrid» seria
 * una afirmacion sin medicion.
 *
 * EL WAV SE GENERA AQUI, NO SE GUARDA UN FICHERO
 *
 * Un binario de prueba en el repositorio no se puede leer en el diff y ademas
 * obliga a confiar en su licencia. Un wav PCM de un segundo son cuarenta y cuatro
 * bytes de cabecera y una sinusoide: se construye en la prueba y se ve lo que
 * contiene.
 *
 * LAS CADENAS SE ESPERAN EN ESPANOL
 *
 * La ruta que se prueba es `/visualizador`, la del idioma por defecto. Se buscan
 * fragmentos estables («listo para anotar», «importado»), no la frase entera: una
 * prueba atada a la redaccion exacta se rompe con cada correccion de estilo y
 * nadie sabe si el roto es el codigo o el texto.
 */

const AUDIO_INPUT = "[data-audio-file]";
const TEXTGRID_INPUT = "[data-audio-textgrid-file]";
const STATUS = "[data-audio-status]";
const CURSOR = "[data-audio-cursor]";
const SPLIT = "[data-audio-interval-split]";
const ROWS = "[data-audio-intervals] tr";
const EXPORT_TEXTGRID = "[data-audio-export-textgrid]";

/** Wav PCM mono de 16 bits con una sinusoide de 440 Hz. */
const wavBuffer = (seconds = 1, sampleRate = 8000): Buffer => {
  const samples = Math.floor(seconds * sampleRate);
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    const value = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 12000);
    data.writeInt16LE(value, index * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
};

const audioFile = { name: "tono.wav", mimeType: "audio/wav", buffer: wavBuffer() };

const loadAudio = async (page: Page): Promise<void> => {
  await page.goto("/visualizador");
  await page.locator(AUDIO_INPUT).setInputFiles(audioFile);
  await expect(page.locator(STATUS)).toContainText("listo para anotar", { timeout: 15_000 });
};

/** Mueve el cursor con el control de teclado, que es la via accesible. */
const moveCursor = async (page: Page, seconds: number): Promise<void> => {
  await page.locator(CURSOR).fill(String(seconds));
  await page.locator(CURSOR).dispatchEvent("input");
};

test("el aviso de que el audio no sale del equipo se ve antes de cargar nada", async ({ page }) => {
  await page.goto("/visualizador");

  await expect(page.locator("[data-audiolab]")).toContainText(/no sale de tu equipo/i);
  await expect(page.locator("[data-audiolab]")).toContainText(/Experimental/i);
});

test("carga un wav corto y deja el visor listo para anotar", async ({ page }) => {
  await loadAudio(page);

  await expect(page.locator(CURSOR)).toBeEnabled();
  // El canvas se dimensiona al dibujar: si el ancho sigue en cero, no se pinto.
  const width = await page
    .locator("[data-audio-wave]")
    .evaluate((element: HTMLCanvasElement) => element.width);
  expect(width).toBeGreaterThan(0);
});

test("un archivo que no es audio se rechaza con un mensaje y sin inventar waveform", async ({
  page,
}) => {
  await page.goto("/visualizador");
  await page.locator(AUDIO_INPUT).setInputFiles({
    name: "no-es-audio.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("esto no es audio", "utf8"),
  });

  await expect(page.locator(STATUS)).toHaveAttribute("data-state", "error", { timeout: 15_000 });
  await expect(page.locator(CURSOR)).toBeDisabled();
});

test("crea dos intervalos, exporta el TextGrid y lo reimporta", async ({ page }) => {
  await loadAudio(page);

  // Un solo intervalo cubre el audio: dos divisiones producen tres.
  await moveCursor(page, 0.25);
  await page.locator(SPLIT).click();
  await moveCursor(page, 0.5);
  await page.locator(SPLIT).click();
  await expect(page.locator(ROWS)).toHaveCount(3);

  const firstText = page.locator(ROWS).nth(0).locator("input[type=text]");
  await firstText.fill("to");
  await page.locator(ROWS).nth(1).locator("input[type=text]").fill("ni");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(EXPORT_TEXTGRID).click(),
  ]);
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = readFileSync(path as string, "utf8");

  expect(exported).toContain('File type = "ooTextFile"');
  expect(exported).toContain('Object class = "TextGrid"');
  expect(exported).toContain('text = "to"');
  expect(exported).toContain('text = "ni"');

  // El archivo exportado se vuelve a importar: lo que se prueba es el viaje
  // completo, no que las dos funciones se llamen.
  await page.locator(TEXTGRID_INPUT).setInputFiles({
    name: "anotacion.TextGrid",
    mimeType: "text/plain",
    buffer: Buffer.from(exported, "utf8"),
  });

  await expect(page.locator(STATUS)).toContainText("importado", { timeout: 15_000 });
  await expect(page.locator(ROWS)).toHaveCount(3);
  await expect(page.locator(ROWS).nth(0).locator("input[type=text]")).toHaveValue("to");
});

test("el teclado IPA inserta el simbolo en el campo del intervalo", async ({ page }) => {
  await loadAudio(page);
  await moveCursor(page, 0.5);
  await page.locator(SPLIT).click();

  const firstText = page.locator(ROWS).nth(0).locator("input[type=text]");
  await firstText.click();
  await firstText.fill("kasa");

  await page.locator("summary", { hasText: /Teclado IPA/i }).click();
  await firstText.evaluate((element: HTMLInputElement) => {
    element.setSelectionRange(4, 4);
  });
  await page.locator('[data-audio-ipa-symbol="ˈ"]').click();

  await expect(firstText).toHaveValue("kasaˈ");
});

test("un TextGrid con huecos avisa y ofrece rellenarlos antes de exportar", async ({ page }) => {
  await loadAudio(page);

  const withGap = `File type = "ooTextFile"
Object class = "TextGrid"

0
1
<exists>
1
"IntervalTier"
"words"
0
1
2
0
0.4
"a"
0.6
1
"b"
`;

  await page.locator(TEXTGRID_INPUT).setInputFiles({
    name: "con-huecos.TextGrid",
    mimeType: "text/plain",
    buffer: Buffer.from(withGap, "utf8"),
  });

  const gaps = page.locator("[data-audio-gaps]");
  await expect(gaps).toBeVisible();
  await expect(gaps).toContainText(/hueco/i);

  await page.locator("[data-audio-gaps-fill]").click();
  await expect(gaps).toBeHidden();
  await expect(page.locator(ROWS)).toHaveCount(3);
});

test("el visualizador no tiene violaciones de accesibilidad en tema claro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/visualizador");

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

test("el visualizador no tiene violaciones de accesibilidad en tema oscuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/visualizador");

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

test("la version en ingles de la pagina existe y avisa en ingles", async ({ page }) => {
  await page.goto("/en/visualizador");

  await expect(page.locator("h1")).toContainText(/TextGrid/i);
  await expect(page.locator("[data-audiolab]")).toContainText(/never leaves your device/i);
});
