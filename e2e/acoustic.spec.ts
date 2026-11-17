import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DEFAULT_TOLERANCES } from "../packages/adapters/src/acoustic/validation/acoustic-validation";

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
 * LAS ASERCIONES SOBRE LA SINUSOIDE SON DELIBERADAMENTE FLOJAS
 *
 * Para la sinusoide generada no hay referencia de Praat. Afirmar aquí
 * «F0 = 440 Hz ± 1» sería presentar como validación lo que es una expectativa;
 * lo que se comprueba es que hay una medición numérica, que corresponde al
 * intervalo elegido y que se puede exportar. Las comparaciones con Praat van al
 * final, sobre los WAV de `e2e/fixtures/reference/` (unidad 5.5).
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
  // La tabla de intervalos va plegada en «Ver como tabla» (unidad 5.8).
  await page.locator("[data-audio-table] summary").click();
};

/**
 * Mueve el cursor con el control de teclado, que es la vía accesible. El control
 * avanza de a milisegundo y rechaza un valor fuera de ese paso: se redondea.
 */
const moveCursor = async (page: Page, seconds: number): Promise<void> => {
  await page.locator(CURSOR).fill(String(Number(seconds.toFixed(3))));
  await page.locator(CURSOR).dispatchEvent("input");
};

test("lo que se validó contra Praat y lo que no se ve antes de analizar nada", async ({ page }) => {
  await page.goto("/visualizador");

  const panel = page.locator("[data-acoustic]");
  await expect(panel).toContainText(/contrastados con Praat/i);
  // Desde la unidad 5.6 la intensidad tambien esta validada (Praat 7.0.03); lo
  // que sigue sin contrastar se dice igual de visible.
  await expect(panel).toContainText(/e intensidad \(Praat 7\.0\.03\)/i);
  await expect(panel).toContainText(/Todavía sin contrastar/i);
});

const SPEC = "[data-audio-spec]";
const OVERLAY_STATUS = "[data-audio-overlay-status]";
const SHOW = {
  pitch: "[data-audio-overlay-pitch]",
  formants: "[data-audio-overlay-formants]",
  intensity: "[data-audio-overlay-intensity]",
} as const;

type Curve = keyof typeof SHOW;

/**
 * Pixeles de cada color de curva en el espectrograma.
 *
 * El espectrograma es gris (rojo, verde y azul iguales): un pixel claramente
 * azul, rojo o amarillo solo puede venir de una curva dibujada encima. Contar
 * pixeles prueba que se dibujo algo, no que el valor sea correcto: eso lo
 * prueban las referencias de Praat.
 */
const curvePixels = (page: Page): Promise<Record<Curve, number>> =>
  page.locator(SPEC).evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    const counts = { pitch: 0, formants: 0, intensity: 0 };
    if (ctx === null) {
      return counts;
    }
    const classify = (red: number, green: number, blue: number): keyof typeof counts | null => {
      if (blue > 200 && red < 90 && green < 120) {
        return "pitch";
      }
      if (red > 200 && green < 70 && blue < 70) {
        return "formants";
      }
      return red > 200 && green > 170 && blue < 70 ? "intensity" : null;
    };
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 0; index < data.length; index += 4) {
      const curve = classify(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0);
      if (curve !== null) {
        counts[curve] += 1;
      }
    }
    return counts;
  });

test("al cargar un audio corto, tono, formantes e intensidad se dibujan solos sobre el espectrograma", async ({
  page,
}) => {
  await loadAudio(page);

  // Sin pulsar nada: el tramo visible se analiza al cargar.
  await expect(page.locator(SPEC)).toHaveAttribute("data-overlay", "drawn", { timeout: 30_000 });
  const drawn = await curvePixels(page);
  expect(drawn.pitch).toBeGreaterThan(0);
  expect(drawn.formants).toBeGreaterThan(0);
  expect(drawn.intensity).toBeGreaterThan(0);

  // Cada casilla «mostrar» oculta su curva y deja las otras.
  const curves = ["pitch", "formants", "intensity"] as const;
  for (const curve of curves) {
    await page.locator(SHOW[curve]).uncheck();
    await expect.poll(async () => (await curvePixels(page))[curve]).toBe(0);
    const others = await curvePixels(page);
    const otherCounts = curves.filter((other) => other !== curve).map((other) => others[other]);
    expect(Math.min(...otherCounts)).toBeGreaterThan(0);
    await page.locator(SHOW[curve]).check();
    await expect.poll(async () => (await curvePixels(page))[curve]).toBeGreaterThan(0);
  }
});

test("con más de 10 s a la vista no analiza el tramo y lo dice", async ({ page }) => {
  await page.goto("/visualizador");
  await page
    .locator(AUDIO_INPUT)
    .setInputFiles({ name: "largo.wav", mimeType: "audio/wav", buffer: wavBuffer(12) });
  await expect(page.locator(STATUS)).toContainText("listo para anotar", { timeout: 15_000 });

  await expect(page.locator(SPEC)).toHaveAttribute("data-overlay", "skipped");
  await expect(page.locator(OVERLAY_STATUS)).toContainText("10 s");
  // Ninguna curva inventada: no hay un solo pixel de color.
  expect(await curvePixels(page)).toEqual({ pitch: 0, formants: 0, intensity: 0 });

  // Al acercarse a 10 s o menos, las curvas aparecen sin pulsar nada mas.
  await page.locator("[data-audio-zoom-in]").click();
  await expect(page.locator(SPEC)).toHaveAttribute("data-overlay", "drawn", { timeout: 30_000 });
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

/* ------------------------------------------------------------------------
   Consultas y tabla contra Praat (unidad 5.5)

   Validar el motor no valida la pagina: con 3 formantes en vez de 5 la misma
   [a] daba F1 ≈ 1141 Hz en la pagina mientras el arnes, que pedia 5, pasaba
   (defecto corregido en `praatfan-engine.ts`). Aqui los numeros se leen de lo
   que la persona ve —la tabla de medidas y la linea de la consulta— sobre los
   WAV de referencia, con las mismas tolerancias que el arnes de Node.
   ------------------------------------------------------------------------ */

interface ReferenceFixture {
  readonly formant: { readonly maxFormantHz: number };
  readonly points: readonly { time: number; f0: number; f1: number; f2: number }[];
  readonly intensity: { readonly points: readonly { time: number; db: number }[] };
}

const REFERENCE_DIR = "e2e/fixtures/reference";
const VOWELS = ["vocal-a", "vocal-e", "vocal-i"] as const;
const QUERY = "[data-audio-query-result]";
const EDITOR = "[data-audio-canvas]";

const readReference = (name: string): ReferenceFixture =>
  JSON.parse(readFileSync(`${REFERENCE_DIR}/${name}.json`, "utf8")) as ReferenceFixture;

/** Error relativo en por ciento, como `acoustic-validation.ts`. */
const percentError = (measured: number, reference: number): number =>
  (Math.abs(measured - reference) / reference) * 100;

/** Carga un WAV de referencia con los ajustes de formantes con que lo midio Praat. */
const loadReference = async (page: Page, name: string): Promise<ReferenceFixture> => {
  const reference = readReference(name);
  await page.goto("/visualizador");
  await page.locator(AUDIO_INPUT).setInputFiles(`${REFERENCE_DIR}/${name}.wav`);
  await expect(page.locator(STATUS)).toContainText("listo para anotar", { timeout: 15_000 });
  // El piso (75 Hz) y el techo (600 Hz) de tono de la pagina ya son los de la
  // referencia; la frecuencia maxima de formantes no (5500 Hz por defecto).
  const formantMax = page.locator("[data-acoustic-formant-max]");
  await formantMax.fill(String(reference.formant.maxFormantHz));
  await formantMax.dispatchEvent("change");
  return reference;
};

/** Pulsa una tecla de consulta con el foco en el editor y devuelve la respuesta. */
const queryWith = async (page: Page, key: string): Promise<string> => {
  await page.locator(EDITOR).focus();
  await page.keyboard.press(key);
  const result = page.locator(QUERY);
  await expect(result).not.toHaveAttribute("data-state", "busy", { timeout: 30_000 });
  return (await result.textContent()) ?? "";
};

/** El instante y el valor de una respuesta en el cursor: «F1 en 0.152 s: 918.8 Hz». */
const parseAtCursor = (text: string): { time: number; value: number } => {
  const match = /(\d+\.\d+) s: (\d+\.\d+) (?:Hz|dB)$/.exec(text);
  expect(match, text).not.toBeNull();
  return { time: Number(match?.[1]), value: Number(match?.[2]) };
};

for (const name of VOWELS) {
  test(`la tabla de medidas da F1 y F2 de Praat en ${name}.wav`, async ({ page }) => {
    test.setTimeout(60_000);
    const reference = await loadReference(page, name);
    await page.locator("[data-audio-table] summary").click();

    // Un intervalo de 40 ms centrado en cada instante de la referencia: el
    // centro de la fila («F1 centro», «F2 centro») cae justo en ese instante.
    const half = 0.02;
    for (const point of reference.points) {
      await moveCursor(page, point.time - half);
      await page.locator(SPLIT).click();
      await moveCursor(page, point.time + half);
      await page.locator(SPLIT).click();
    }

    for (const [index, point] of reference.points.entries()) {
      await moveCursor(page, point.time);
      await page.locator(MEASURE).click();
      await expect(page.locator(ACOUSTIC_STATUS)).toHaveAttribute("data-state", "ok", {
        timeout: 30_000,
      });
      await expect(page.locator(MEASURE_ROWS)).toHaveCount(index + 1);
    }

    for (const [index, point] of reference.points.entries()) {
      const cells = page.locator(MEASURE_ROWS).nth(index).locator("td");
      // Columnas: tramo, F0 (media, mediana, min, max), intensidad, F1 (25, 50,
      // 75, centro), F2 (25, 50, 75, centro). El encabezado de fila es un `th`.
      const f1 = Number(await cells.nth(9).textContent());
      const f2 = Number(await cells.nth(13).textContent());
      expect(
        percentError(f1, point.f1),
        `F1 en ${point.time}: ${f1} frente a ${point.f1}`,
      ).toBeLessThanOrEqual(DEFAULT_TOLERANCES.formantPercent);
      expect(
        percentError(f2, point.f2),
        `F2 en ${point.time}: ${f2} frente a ${point.f2}`,
      ).toBeLessThanOrEqual(DEFAULT_TOLERANCES.formantPercent);
    }
  });
}

test("F5, F1, F2 y F8 en el editor consultan el cursor y dan los valores de Praat", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const reference = await loadReference(page, "vocal-a");

  for (const point of reference.points) {
    await moveCursor(page, point.time);

    const f0 = parseAtCursor(await queryWith(page, "F5"));
    expect(percentError(f0.value, point.f0), `F0 en ${point.time}`).toBeLessThanOrEqual(
      DEFAULT_TOLERANCES.f0Percent,
    );
    // El instante informado es el del marco del que sale el numero.
    expect(Math.abs(f0.time - point.time)).toBeLessThan(0.01);

    const f1 = parseAtCursor(await queryWith(page, "F1"));
    expect(percentError(f1.value, point.f1), `F1 en ${point.time}`).toBeLessThanOrEqual(
      DEFAULT_TOLERANCES.formantPercent,
    );
    const f2 = parseAtCursor(await queryWith(page, "F2"));
    expect(percentError(f2.value, point.f2), `F2 en ${point.time}`).toBeLessThanOrEqual(
      DEFAULT_TOLERANCES.formantPercent,
    );
  }

  for (const point of reference.intensity.points) {
    await moveCursor(page, point.time);
    const db = parseAtCursor(await queryWith(page, "F8"));
    expect(Math.abs(db.value - point.db), `intensidad en ${point.time}`).toBeLessThanOrEqual(
      DEFAULT_TOLERANCES.intensityDb,
    );
  }

  // El boton hace lo mismo que la tecla.
  await page.locator("[data-audio-query=f1]").click();
  await expect(page.locator(QUERY)).toContainText(/^F1 en \d+\.\d+ s: \d+\.\d Hz$/, {
    timeout: 30_000,
  });
});

test("con un tramo arrastrado la consulta da la media, y en el silencio no inventa tono", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const reference = await loadReference(page, "vocal-a");
  const first = reference.points[0];
  const last = reference.points.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("referencia sin puntos");
  }

  // Seleccion por teclado: el cursor en el primer punto y Mayus+→ hasta pasar el
  // ultimo (cada pulsacion mueve una centesima de la ventana visible).
  await moveCursor(page, first.time);
  await page.locator(EDITOR).focus();
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Shift+ArrowRight");
  }
  const text = await queryWith(page, "F5");
  const match = /media de (\d+\.\d+)–(\d+\.\d+) s \((\d+) marcos\): (\d+\.\d) Hz$/.exec(text);
  expect(match, text).not.toBeNull();
  const start = Number(match?.[1]);
  const end = Number(match?.[2]);
  expect(start).toBeCloseTo(first.time, 2);
  expect(end).toBeGreaterThan(last.time);
  // La media de un tramo con voz cae entre el minimo y el maximo de la referencia.
  const mean = Number(match?.[4]);
  const values = reference.points.map((point) => point.f0);
  expect(mean).toBeGreaterThan(Math.min(...values) * 0.9);
  expect(mean).toBeLessThan(Math.max(...values) * 1.1);

  // La intensidad de un tramo dice que es la media de energia.
  await expect.poll(() => queryWith(page, "F8")).toMatch(/media de energía de .* dB$/);

  // En el silencio del principio no hay tono: lo dice, sin 0 Hz.
  await moveCursor(page, 0.01);
  expect(await queryWith(page, "F5")).toBe("Sin tono en 0.010 s: tramo sordo");
});

test("fuera del editor F5 no se intercepta: la tecla sigue siendo del navegador", async ({
  page,
}) => {
  await loadReference(page, "vocal-a");
  await page.locator("[data-acoustic-measure-run]").focus();
  const prevented = await page.evaluate(() => {
    const event = new KeyboardEvent("keydown", { key: "F5", bubbles: true, cancelable: true });
    document.activeElement?.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await expect(page.locator(QUERY)).toHaveText("");
});
