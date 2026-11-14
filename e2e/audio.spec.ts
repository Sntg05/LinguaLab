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

/* ==========================================================================
   Lo que el verificador independiente encontro y estas pruebas fijan.

   Van al final y con el defecto en el nombre para que, cuando una falle, se
   sepa que promesa se rompio sin leer el cuerpo entero.
   ========================================================================== */

const SAVE_NOTE = "[data-audio-save-note]";
const PERSISTENCE = "[data-audio-persistence]";
const PROJECTS_COUNT = "[data-audio-projects-count]";
const PROJECTS_CLEAR = "[data-audio-projects-clear]";
const PROJECTS_CONFIRM = "[data-audio-projects-confirm]";
const PROJECTS_CONFIRM_BUTTON = "[data-audio-projects-clear-confirm]";

/** TextGrid de un documento de 5 s cuya unica capa mide 3 s y se queda corta. */
const DOCUMENT_WITH_A_TIER_THAT_DOES_NOT_SPAN_IT = `File type = "ooTextFile"
Object class = "TextGrid"

0
5
<exists>
1
"IntervalTier"
"words"
0
3
1
0
3
"corto"
`;

test("un TextGrid cuya capa no llega al final del documento se avisa como hueco", async ({
  page,
}) => {
  await page.goto("/visualizador");
  await page.locator(TEXTGRID_INPUT).setInputFiles({
    name: "capa-corta.TextGrid",
    mimeType: "text/plain",
    buffer: Buffer.from(DOCUMENT_WITH_A_TIER_THAT_DOES_NOT_SPAN_IT, "utf8"),
  });

  const gaps = page.locator("[data-audio-gaps]");
  await expect(gaps).toBeVisible();
  // El hueco es del documento (3 a 5 s), no de la capa: el mensaje lo nombra.
  await expect(gaps).toContainText(/hueco/i);

  // Y la exportacion queda bloqueada: el archivo saldria invalido.
  await page.locator(EXPORT_TEXTGRID).click();
  await expect(page.locator(STATUS)).toHaveAttribute("data-state", "error");
});

test("un TextGrid de mas de 1 MB se rechaza con un mensaje y no llega al analizador", async ({
  page,
}) => {
  await loadAudio(page);
  const rowsBefore = await page.locator(ROWS).count();

  // Se genera aqui, como el wav: el cuerpo son espacios porque lo que se mide es
  // el tope, y el archivo tiene que ser grande de verdad.
  const oversized = `File type = "ooTextFile"\nObject class = "TextGrid"\n\n0\n1\n<exists>\n0\n${" ".repeat(1024 * 1024)}`;

  await page.locator(TEXTGRID_INPUT).setInputFiles({
    name: "enorme.TextGrid",
    mimeType: "text/plain",
    buffer: Buffer.from(oversized, "utf8"),
  });

  await expect(page.locator(STATUS)).toHaveAttribute("data-state", "error");
  await expect(page.locator(STATUS)).toContainText(/tope/);
  await expect(page.locator(STATUS)).toContainText(/1\.0 MB/);
  // El documento que ya estaba abierto no se toco.
  expect(await page.locator(ROWS).count()).toBe(rowsBefore);
});

test("lo anotado vuelve despues de recargar la pagina", async ({ page }) => {
  await loadAudio(page);
  await moveCursor(page, 0.25);
  await page.locator(SPLIT).click();
  await page.locator(ROWS).nth(0).locator("input[type=text]").fill("to");

  // El autoguardado tiene su retraso: se espera a que diga que guardo, no a un
  // tiempo fijo que haga la prueba lenta y fragil.
  await expect(page.locator(SAVE_NOTE)).toContainText(/Guardado/, { timeout: 15_000 });
  await expect(page.locator(PERSISTENCE)).toContainText(/IndexedDB/);

  await page.reload();

  await expect(page.locator(ROWS)).toHaveCount(2);
  await expect(page.locator(ROWS).nth(0).locator("input[type=text]")).toHaveValue("to");
  await expect(page.locator(SAVE_NOTE)).toContainText(/recuperado/i);
});

test("un registro guardado con otra forma no rompe el visor y dice por que", async ({ page }) => {
  await page.goto("/visualizador");

  // El caso que reprodujo el verificador: `{bounds, layers}` bajo la clave del
  // proyecto. Se escribe a mano en IndexedDB porque es lo que dejaria otra
  // version del sitio.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("lingualab-annotations", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("projects");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("projects", "readwrite");
        transaction
          .objectStore("projects")
          .put({ bounds: { min: 0, max: 2 }, layers: [] }, "visor");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });

  await page.reload();

  await expect(page.locator(SAVE_NOTE)).toContainText(/no se pudo leer/i);
  // El visor sigue usable: la tabla se pinta con el documento vacio y el
  // guardado automatico no pisa lo anterior.
  await expect(page.locator(ROWS)).toHaveCount(1);
  await expect(page.locator(PERSISTENCE)).toContainText(/IndexedDB/);
});

test("borrar los proyectos guardados deja la lista vacia y la persistencia dice la verdad", async ({
  page,
}) => {
  await loadAudio(page);
  await expect(page.locator(SAVE_NOTE)).toContainText(/Guardado/, { timeout: 15_000 });
  await expect(page.locator(PROJECTS_COUNT)).toContainText("1");

  await page.locator(PROJECTS_CLEAR).click();
  await expect(page.locator(PROJECTS_CONFIRM)).toBeVisible();
  await page.locator(PROJECTS_CONFIRM_BUTTON).click();

  await expect(page.locator(PROJECTS_COUNT)).toContainText("0");
  await expect(page.locator(PERSISTENCE)).toContainText(/IndexedDB/);
  await expect(page.locator(STATUS)).toContainText(/borrados/i);

  // Las claves desaparecieron de la base de verdad, no solo del texto.
  const remaining = await page.evaluate(
    async () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("lingualab-annotations", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("projects");
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const keys = database
            .transaction("projects", "readonly")
            .objectStore("projects")
            .getAllKeys();
          keys.onsuccess = () => {
            database.close();
            resolve(keys.result.length);
          };
          keys.onerror = () => reject(keys.error);
        };
      }),
  );
  expect(remaining).toBe(0);
});

/**
 * Cada botón «▶» nombra SU intervalo.
 *
 * El nombre accesible se armaba con el número de la CAPA y no con el del
 * intervalo: en la capa 1, los tres botones de tres intervalos decían
 * «Reproducir el intervalo 1». Un lector de pantalla los anunciaba iguales y no
 * había forma de saber cuál se iba a reproducir. Lo encontró la partición del
 * orquestador del visor, el 2026-11-03.
 */
test("cada boton de reproducir nombra su propio intervalo", async ({ page }) => {
  await loadAudio(page);
  await moveCursor(page, 0.25);
  await page.locator(SPLIT).click();
  await moveCursor(page, 0.5);
  await page.locator(SPLIT).click();
  await expect(page.locator(ROWS)).toHaveCount(3);

  for (const [index, row] of (await page.locator(ROWS).all()).entries()) {
    await expect(
      row.getByRole("button", { name: `Reproducir el intervalo ${index + 1}` }),
    ).toHaveCount(1);
  }
});

test("con audio cargado, transporte, onda, espectrograma y capas caben en una pantalla", async ({
  page,
}) => {
  // Unidad 5.1 del rework v4: en Praat todo cabe en una ventana. Antes la pagina
  // medía unos 8000 px y la onda y el espectrograma eran franjas de 80 px.
  await page.setViewportSize({ width: 1360, height: 900 });
  await loadAudio(page);

  const box = async (selector: string) => {
    const found = await page.locator(selector).boundingBox();
    if (!found) throw new Error(`sin caja: ${selector}`);
    return found;
  };
  const play = await box("[data-audio-play]");
  const wave = await box("[data-audio-wave]");
  const spec = await box("[data-audio-spec]");
  const tiers = await box("[data-audio-tiers]");

  // El transporte va arriba de los lienzos, y del boton de reproducir al pie de
  // las capas no hay mas de una pantalla.
  expect(play.y).toBeLessThan(wave.y);
  expect(tiers.y + tiers.height - play.y).toBeLessThanOrEqual(900);
  // El espectrograma es la pieza mas alta, y ninguna es una franja.
  expect(spec.height).toBeGreaterThan(wave.height);
  expect(wave.height).toBeGreaterThanOrEqual(120);
  expect(tiers.height).toBeGreaterThanOrEqual(120);
});

/* ---------------- 5.8: segmentar como en Praat, con raton o con teclado ---------------- */

const LABEL = "[data-audio-label]";
const EDITOR = "[data-audio-canvas]";

/** Un punto de un lienzo, en fraccion de su ancho y de su alto. */
const pointOn = async (page: Page, selector: string, xRatio: number, yRatio = 0.5) => {
  // La cabecera de la pagina deja el editor debajo del primer pliegue: se lleva
  // a la vista, como haria quien lo usa, antes de medir donde hacer clic.
  await page.locator(EDITOR).scrollIntoViewIfNeeded();
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`sin caja: ${selector}`);
  return { x: box.x + box.width * xRatio, y: box.y + box.height * yRatio };
};

/** Fila de la primera capa en la franja: la regla ocupa los primeros 20 px. */
const firstTierY = async (page: Page): Promise<number> => {
  const box = await page.locator("[data-audio-tiers]").boundingBox();
  if (!box) throw new Error("sin franja de capas");
  return (20 + 20 + 64) / 2 / box.height;
};

const exportTextGrid = async (page: Page): Promise<string> => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(EXPORT_TEXTGRID).click(),
  ]);
  return readFileSync((await download.path()) as string, "utf8");
};

const intervalTexts = (textGrid: string): string[] =>
  [...textGrid.matchAll(/text = "([^"]*)"/g)].map((match) => match[1] ?? "");

test("segmenta solo con el raton: clic e Intro ponen limites, se escribe arriba, se arrastra y se quita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await loadAudio(page);

  // Tres limites con clic en la onda e Intro: cuatro intervalos.
  for (const ratio of [0.2, 0.4, 0.6]) {
    const at = await pointOn(page, "[data-audio-wave]", ratio);
    await page.mouse.click(at.x, at.y);
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(ROWS)).toHaveCount(4);

  // Clic dentro de cada intervalo de la capa y escribir su etiqueta arriba.
  const tierY = await firstTierY(page);
  for (const [ratio, text] of [
    [0.1, "p"],
    [0.3, "a"],
    [0.5, "t"],
  ] as const) {
    const at = await pointOn(page, "[data-audio-tiers]", ratio, tierY);
    await page.mouse.click(at.x, at.y);
    await page.locator(LABEL).fill(text);
  }
  await expect(page.locator(ROWS).nth(1).locator("input[type=text]")).toHaveValue("a");

  // Arrastrar el ultimo limite de 0,6 s a 0,7 s, y despues quitarlo con Supr.
  const from = await pointOn(page, "[data-audio-tiers]", 0.6, tierY);
  const to = await pointOn(page, "[data-audio-tiers]", 0.7, tierY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(ROWS).nth(2).locator("input[type=number]")).toHaveValue(/^0\.7/);

  await page.mouse.click(to.x, to.y);
  await page.keyboard.press("Delete");
  await expect(page.locator(ROWS)).toHaveCount(3);

  // Tab reproduce el intervalo y no saca el foco del editor.
  await page.keyboard.press("Tab");
  await expect(page.locator(EDITOR)).toBeFocused();

  const textGrid = await exportTextGrid(page);
  expect(intervalTexts(textGrid)).toEqual(["p", "a", "t"]);
});

test("segmenta solo con el teclado: cursor, Intro, etiqueta arriba, coma y Supr", async ({
  page,
}) => {
  await loadAudio(page);

  for (const seconds of [0.25, 0.5, 0.75]) {
    await moveCursor(page, seconds);
    await page.locator(EDITOR).focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(ROWS)).toHaveCount(4);

  // El limite recien puesto queda seleccionado: Supr lo quita.
  await page.keyboard.press("Delete");
  await expect(page.locator(ROWS)).toHaveCount(3);

  // El cursor sigue en el ultimo intervalo; con coma se va al anterior. Cada
  // etiqueta se escribe arriba, en la ventana de texto.
  for (const [index, text] of ["t", "a", "p"].entries()) {
    if (index > 0) {
      await page.locator(EDITOR).focus();
      await page.keyboard.press(",");
    }
    await page.locator(LABEL).focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(text);
  }

  // Mayus+Tab sale del editor como en cualquier pagina.
  await page.locator(EDITOR).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(EDITOR)).not.toBeFocused();

  const textGrid = await exportTextGrid(page);
  expect(intervalTexts(textGrid)).toEqual(["p", "a", "t"]);
});
