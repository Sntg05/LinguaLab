import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * El análisis acústico del visor, en un navegador de verdad.
 *
 * QUE SOLO SE PUEDE DEMOSTRAR AQUI
 *
 * El contrato del puerto y la estimación de F0 se prueban en Node con el
 * WebAssembly real (`packages/adapters/src/acoustic/`). Lo que no se puede
 * probar ahí es lo que depende del navegador: que el módulo vendoreado se cargue
 * desde este mismo origen, que el cálculo ocurra en un worker sin congelar la
 * página, que la medición aparezca en la tabla y que el CSV salga como archivo.
 *
 * EL WAV SE GENERA EN LA PRUEBA
 *
 * Un binario en el repositorio no se puede leer en el diff y obliga a confiar en
 * su licencia. Un wav PCM de un segundo son 44 bytes de cabecera y una
 * sinusoide: se construye aquí y se ve qué contiene.
 *
 * LAS ASERCIONES SOBRE NÚMEROS SON DELIBERADAMENTE FLOJAS
 *
 * Este segmento está marcado como experimental y no hay referencias de Praat
 * contra las que comparar. Afirmar aquí «F0 = 440 Hz ± 1» sería presentar como
 * validación lo que es una expectativa; lo que se comprueba es que hay una
 * medición numérica, que corresponde al intervalo elegido y que se puede
 * exportar.
 */

const AUDIO_INPUT = "[data-audio-file]";
const STATUS = "[data-audio-status]";
const CURSOR = "[data-audio-cursor]";
const SPLIT = "[data-audio-interval-split]";
const ROWS = "[data-audio-intervals] tr";
const ACOUSTIC_STATUS = "[data-acoustic-status]";
const MEASURE = "[data-acoustic-measure-run]";
const MEASURE_ROWS = "[data-acoustic-measure-body] tr";
const MEASURE_EXPORT = "[data-acoustic-measure-export]";
const F0_RUN = "[data-acoustic-pitch-run]";
const F0_CANVAS = "[data-acoustic-f0-canvas]";

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

/** Mueve el cursor con el control de teclado, que es la vía accesible. */
const moveCursor = async (page: Page, seconds: number): Promise<void> => {
  await page.locator(CURSOR).fill(String(seconds));
  await page.locator(CURSOR).dispatchEvent("input");
};

test("el aviso de experimental se ve antes de analizar nada", async ({ page }) => {
  await page.goto("/visualizador");

  const panel = page.locator("[data-acoustic]");
  await expect(panel).toContainText(/Experimental/i);
  await expect(panel).toContainText(/contrasta tus resultados con Praat/i);
});

test("calcula el contorno de F0 de un wav y lo dibuja", async ({ page }) => {
  await loadAudio(page);

  await page.locator(F0_RUN).click();
  await expect(page.locator(ACOUSTIC_STATUS)).toHaveAttribute("data-state", "ok", {
    timeout: 30_000,
  });

  // El canvas se dimensiona y se pinta al dibujar: si el ancho sigue en cero o
  // el atributo de vacío sigue puesto, no hubo trazo.
  const canvas = page.locator(F0_CANVAS);
  const width = await canvas.evaluate((element: HTMLCanvasElement) => element.width);
  expect(width).toBeGreaterThan(0);
  await expect(canvas).not.toHaveAttribute("data-empty", "true");
});

test("mide un intervalo seleccionado y exporta el CSV", async ({ page }) => {
  await loadAudio(page);

  // Un solo intervalo cubre el audio: dos divisiones producen tres y la medición
  // se hace sobre el primero, que es el que queda bajo el cursor.
  await moveCursor(page, 0.25);
  await page.locator(SPLIT).click();
  await moveCursor(page, 0.5);
  await page.locator(SPLIT).click();
  await expect(page.locator(ROWS)).toHaveCount(3);

  // El intervalo activo —el que se mide— lo decide el cursor del visor, no la
  // fila que se esté mirando: tras dividir en 0.5 el cursor quedó ahí y lo que
  // se mediría sería el tercer intervalo. Se lo lleva al primero a propósito.
  await moveCursor(page, 0.1);

  // La etiqueta de la medición sale del texto del intervalo: sin texto, la fila
  // se rotula con su rango de tiempo y no se sabría qué vocal se midió.
  await page.locator(ROWS).nth(0).locator("input[type=text]").fill("a");

  await page.locator(MEASURE).click();
  await expect(page.locator(ACOUSTIC_STATUS)).toHaveAttribute("data-state", "ok", {
    timeout: 30_000,
  });

  await expect(page.locator(MEASURE_ROWS)).toHaveCount(1);
  const row = page.locator(MEASURE_ROWS).nth(0);
  await expect(row).toContainText("a");

  // El intervalo medido es el que va de 0 a 0,25 s.
  await expect(row).toContainText("0.000–0.250");

  // Hay una F0 media numérica: el tono de la prueba la tiene, y un 0 sería «sin
  // voz», que es exactamente lo que un fallo del analizador produciría.
  const f0Mean = await row.locator("td").nth(2).textContent();
  expect(Number(f0Mean)).toBeGreaterThan(0);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(MEASURE_EXPORT).click(),
  ]);
  const path = await download.path();
  expect(path).not.toBeNull();

  const csv = readFileSync(path as string, "utf8");
  const lines = csv.trim().split("\n");
  expect(lines.length).toBe(2);
  expect(lines[0]).toContain("etiqueta");
  expect(lines[0]).toContain("f0_mediana_hz");
  expect(lines[1]).toContain("a");
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
