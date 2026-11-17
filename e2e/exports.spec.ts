import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * Cada formato que exporta cada laboratorio, leído de vuelta.
 *
 * POR QUÉ EXISTE (T11, S12: «las exportaciones de cada herramienta que sean
 * correctas en todos los formatos»)
 *
 * Varias pruebas ya descargaban un archivo, pero algunas solo miraban el nombre.
 * Aquí cada archivo se lee: se parsea, se compara con lo que la página tenía o
 * se vuelve a importar en la misma herramienta. Los árboles tienen las suyas en
 * `arbor.spec.ts`; los formatos que ya se validaban por contenido en su propia
 * prueba (TextGrid del visor contra Praat, CSV de mediciones, CSV de resultados,
 * JSON de la estación de texto y de la tabla ortográfica) no se repiten.
 */

const FIXTURES = new URL("./fixtures/", import.meta.url);
const fixturePath = (name: string): string => fileURLToPath(new URL(name, FIXTURES));
const PATO_TEXTGRID = fileURLToPath(
  new URL("../public/audio/ejemplos/pato.TextGrid", import.meta.url),
);

const downloadOf = async (
  page: Page,
  trigger: Locator,
): Promise<{ readonly name: string; readonly text: string }> => {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger.click()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), "utf8") };
};

/** Las etiquetas de los intervalos de un TextGrid largo, en orden. */
const textGridLabels = (source: string): string[] =>
  [...source.matchAll(/^\s*text = "((?:[^"]|"")*)"\s*$/gm)].map((match) =>
    (match[1] ?? "").replace(/""/g, '"'),
  );

/** Lector RFC 4180 mínimo: comillas dobladas y campos entre comillas. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

/* ---------------------------- visor de audio ---------------------------- */

test.describe("visor de audio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visualizador");
    await page.locator("[data-audio-example-solved]").click();
    await expect(page.locator("[data-audio-status]")).toContainText("importado", {
      timeout: 15_000,
    });
  });

  test("el TextGrid exportado tiene las mismas etiquetas que el que se cargó", async ({ page }) => {
    const { name, text } = await downloadOf(page, page.locator("[data-audio-export-textgrid]"));
    expect(name).toMatch(/\.TextGrid$/);
    expect(text).toContain('Object class = "TextGrid"');
    expect(textGridLabels(text)).toEqual(textGridLabels(readFileSync(PATO_TEXTGRID, "utf8")));
  });

  test("el CSV de intervalos tiene una fila por intervalo, en orden y sin huecos", async ({
    page,
  }) => {
    const { name, text } = await downloadOf(page, page.locator("[data-audio-export-csv]"));
    expect(name).toMatch(/\.csv$/);
    const [header, ...rows] = parseCsv(text);
    expect(header).toEqual(["tier", "start", "end", "text"]);
    expect(rows.map((row) => row[3])).toEqual(["", "p", "a", "t", "o", ""]);
    for (const row of rows) expect(row).toHaveLength(4);
    // Cada intervalo empieza donde termina el anterior.
    for (let i = 1; i < rows.length; i += 1) {
      expect(Number(rows[i]?.[1])).toBeCloseTo(Number(rows[i - 1]?.[2]), 6);
    }
  });
});

/* ------------------------------ conversor ELAN ------------------------------ */

test("ELAN: un TextGrid pasa a un .eaf válido y vuelve con las mismas etiquetas", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const status = page.locator("[data-elan-status]");
  const ready = async (): Promise<void> =>
    expect(status).toContainText("Listo para exportar", { timeout: 120_000 });

  await page.goto("/elan");
  await page.setInputFiles("[data-elan-file]", fixturePath("simple.TextGrid"));
  await ready();

  const eaf = await downloadOf(page, page.locator("[data-elan-export]"));
  expect(eaf.name).toMatch(/\.eaf$/);
  const parsed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    return {
      error: doc.querySelector("parsererror") !== null,
      root: doc.documentElement.localName,
      tiers: doc.querySelectorAll("TIER").length,
      values: [...doc.querySelectorAll("ANNOTATION_VALUE")].map((node) => node.textContent ?? ""),
    };
  }, eaf.text);
  expect(parsed.error).toBe(false);
  expect(parsed.root).toBe("ANNOTATION_DOCUMENT");
  expect(parsed.tiers).toBeGreaterThan(0);

  // De vuelta: el .eaf exportado se carga y se exporta otra vez a TextGrid.
  await page.setInputFiles("[data-elan-file]", {
    name: "ida.eaf",
    mimeType: "application/xml",
    buffer: Buffer.from(eaf.text, "utf8"),
  });
  await ready();
  const back = await downloadOf(page, page.locator("[data-elan-export]"));
  expect(back.name).toMatch(/\.TextGrid$/);
  const original = textGridLabels(readFileSync(fixturePath("simple.TextGrid"), "utf8"));
  expect(textGridLabels(back.text).filter((label) => label !== "")).toEqual(
    original.filter((label) => label !== ""),
  );
});

/* ------------------------------ experimentos ------------------------------ */

test("experimentos: la especificación descargada es JSON y guarda estímulos y semilla", async ({
  page,
}) => {
  await page.goto("/experimentos");
  await page
    .locator("[data-explab-stimuli]")
    .fill(
      [
        "id,condition,text,audio",
        "e1,control,El gato duerme.,",
        'e2,isla,"¿Quién dijo ""qué""?",',
      ].join("\n"),
    );
  await page.locator("[data-explab-seed]").fill("2024");
  const { name, text } = await downloadOf(page, page.locator("[data-explab-spec]"));
  expect(name).toMatch(/\.json$/);
  const spec = JSON.parse(text);
  expect(spec.parameters.seed).toBe(2024);
  expect(JSON.stringify(spec)).toContain('¿Quién dijo \\"qué\\"?');
  await expect(page.locator("[data-explab-status]")).toContainText("Especificación descargada");
});

/* ------------------------------- ortografía ------------------------------- */

test("ortografía: el CSV de reglas exportado se vuelve a importar igual", async ({ page }) => {
  await page.goto("/ortografia");
  await page.locator('[data-template-id="es-demo-yeismo"]').click();
  const rules = page.locator("[data-rules-body] [data-rule-row]");
  const graphemes = async (): Promise<string[]> =>
    rules
      .locator('[data-rule-field="grapheme"]')
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  const before = await graphemes();
  expect(before.length).toBeGreaterThan(5);

  const { name, text } = await downloadOf(page, page.locator("[data-export-csv]"));
  expect(name).toMatch(/\.csv$/);
  const [header, ...rows] = parseCsv(text);
  expect(header).toEqual(["grapheme", "ipa", "before", "after", "priority", "note"]);
  expect(rows.map((row) => row[0])).toEqual(before);

  // Otra tabla en pantalla, y el CSV de vuelta.
  await page.locator('[data-template-id="en-demo"]').click();
  await page.locator("[data-import-csv-file]").setInputFiles({
    name: "reglas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf8"),
  });
  await expect.poll(graphemes).toEqual(before);
});
