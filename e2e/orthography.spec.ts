import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

/**
 * Flujo completo del editor de tablas de ortografia.
 *
 * POR QUE SE AFIRMA SOBRE TEXTO VISIBLE
 *
 * Lo que hay que demostrar es que una persona puede hacer el trabajo: cargar
 * una tabla, escribir una palabra, ver la transcripcion, entender por que esa
 * transcripcion y no otra, anadir una regla, exportar y volver a importar. Una
 * asercion sobre IndexedDB comprobaria que los bytes se guardaron, que no es lo
 * mismo: el editor podria estar guardando bien y sin embargo no mostrar nada.
 * La unica excepcion es el valor de un campo de formulario, que es texto que la
 * persona ve y edita.
 */

const EDITOR = "[data-ortholab]";
const RULES = "[data-rules-body]";
const OUTPUT = "[data-output]";

/** Carga la demo de espanol y escribe una palabra en el panel de prueba. */
async function loadSpanishDemoAndType(page: Page, word: string): Promise<void> {
  await page.goto("/ortografia");
  await expect(page.locator(EDITOR)).toBeVisible();
  await page.locator('[data-template-id="es-demo-yeismo"]').click();
  await page.locator("[data-test-input]").fill(word);
}

test("un estudiante recorre el flujo completo: demo, prueba, explicacion, regla nueva, exportar, persistir e importar", async ({
  page,
}) => {
  // --- 1: abrir y cargar la demo en espanol -----------------------------
  await loadSpanishDemoAndType(page, "chico");

  // --- 2: la transcripcion en vivo --------------------------------------
  await expect(page.locator(OUTPUT)).toHaveText("tʃiko");

  // --- 3: "explicar" dice QUE regla gano --------------------------------
  await page.locator("[data-explain]").check();
  const trace = page.locator("[data-trace]");
  await expect(trace).toContainText("regla: ch");
  await expect(trace).toContainText("Posición 0");

  // --- 4: anadir una regla y ver que entra en efecto --------------------
  await page.locator("[data-rule-add]").click();
  const newRow = page.locator("[data-rule-row]").last();
  await newRow.locator('[data-rule-field="grapheme"]').fill("w");
  await newRow.locator('[data-rule-field="ipa"]').fill("w");
  await newRow.locator('[data-rule-field="grapheme"]').blur();

  // "w" no existe en la tabla de espanol, asi que antes salia sin cobertura.
  await page.locator("[data-test-input]").fill("wawa");
  await expect(page.locator(OUTPUT)).toHaveText("wawa");

  // --- 5: exportar JSON -------------------------------------------------
  const download = await Promise.all([
    page.waitForEvent("download"),
    page.locator("[data-export-json]").click(),
  ]).then(([event]) => event);

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = downloadPath === null ? "" : readFileSync(downloadPath, "utf8");
  expect(exported).toContain('"grapheme": "w"');

  // --- 6: recargar y comprobar que la tabla sobrevivio ------------------
  await page.goto("/ortografia");
  await expect(page.locator(EDITOR)).toBeVisible();

  const storedList = page.locator("[data-saved-list]");
  await expect(storedList).toContainText("Espanol (demo, yeismo)");
  await storedList.locator("[data-load-id]").first().click();

  const storedLast = page.locator(RULES).locator("[data-rule-row]").last();
  await expect(storedLast.locator('[data-rule-field="grapheme"]')).toHaveValue("w");

  // --- 7: importar el JSON exportado en una tabla nueva ------------------
  // Primero se cambia a otra tabla, para que lo importado no pueda confundirse
  // con lo que ya estaba en pantalla.
  await page.locator('[data-template-id="en-demo"]').click();
  await expect(page.locator("[data-meta-name]")).toHaveValue("English (demo, American)");

  await page.locator("[data-import-json-file]").setInputFiles({
    name: "tabla.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported, "utf8"),
  });

  await expect(page.locator("[data-meta-name]")).toHaveValue("Espanol (demo, yeismo)");
  await expect(
    page.locator(RULES).locator("[data-rule-row]").last().locator('[data-rule-field="grapheme"]'),
  ).toHaveValue("w");
  await expect(page.locator("[data-status]")).toContainText("Espanol (demo, yeismo)");
});

test("tras la primera carga la herramienta funciona sin red", async ({ page, context }) => {
  await page.goto("/ortografia");
  await expect(page.locator(EDITOR)).toBeVisible();

  // Nada se pide a la red a partir de aqui: el motor, las plantillas y el
  // almacenamiento son locales.
  await context.setOffline(true);
  await page.locator('[data-template-id="es-demo-yeismo"]').click();
  await page.locator("[data-test-input]").fill("queso");

  await expect(page.locator(OUTPUT)).toHaveText("keso");
});

test("una tabla con errores se rechaza con un mensaje, no con una salida vacia", async ({
  page,
}) => {
  await page.goto("/ortografia");
  await page.locator('[data-template-id="es-demo-yeismo"]').click();

  await page.locator("[data-rule-add]").click();
  const newRow = page.locator("[data-rule-row]").last();
  // Un grafema vacio es un error de la tabla: coincide en cualquier posicion.
  await newRow.locator('[data-rule-field="ipa"]').fill("x");
  await newRow.locator('[data-rule-field="ipa"]').blur();

  await expect(page.locator("[data-issues]")).toContainText("error");
  await page.locator("[data-test-input]").fill("casa");
  await expect(page.locator(OUTPUT)).toContainText("no se convierte");
});

test("la cobertura nombra los caracteres que la tabla no cubre", async ({ page }) => {
  await page.goto("/ortografia");
  await page.locator('[data-template-id="es-demo-yeismo"]').click();
  await page.locator("[data-test-input]").fill("wawa");

  await expect(page.locator("[data-coverage]")).toContainText("Sin cobertura: w");
});

test("un CSV con un encabezado distinto se rechaza y explica por que", async ({ page }) => {
  await page.goto("/ortografia");
  await expect(page.locator(EDITOR)).toBeVisible();

  await page.locator("[data-import-csv-file]").setInputFiles({
    name: "malo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("letra,sonido\nx,ks\n", "utf8"),
  });

  await expect(page.locator("[data-status]")).toContainText(
    "grapheme,ipa,before,after,priority,note",
  );
});

test("avisa visiblemente cuando el almacenamiento se degrada a memoria", async ({ page }) => {
  // Con IndexedDB ausente, el adaptador declara que respalda en memoria. Lo que
  // se comprueba es que el editor LO DICE: fingir que guardó es el defecto que
  // este aviso existe para impedir.
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { configurable: true, get: () => undefined });
  });
  await page.goto("/ortografia");

  const warning = page.locator("[data-persistence]");
  await expect(warning).toContainText("NO sobrevivirán a una recarga");
  await expect(warning).toContainText("IndexedDB");
});

test("avisa cuando el enlace es tan largo que un cliente de mensajería lo trunca", async ({
  page,
}) => {
  await page.goto("/ortografia");

  // Notas aleatorias a propósito: un contenido comprimible produciría un enlace
  // corto y la advertencia no llegaría a mostrarse.
  const noise = (): string =>
    Array.from({ length: 60 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
  const rules = Array.from({ length: 200 }, (_, index) => ({
    grapheme: `q${index}`,
    ipa: `k${index}`,
    note: noise(),
  }));

  await page.locator("[data-import-json-file]").setInputFiles({
    name: "larga.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        id: "prueba-larga",
        languageId: "spa",
        name: "Tabla larga",
        version: 1,
        classes: {},
        rules,
        status: "reviewed",
      }),
      "utf8",
    ),
  });

  await page.locator("[data-share]").click();
  await expect(page.locator("[data-status]")).toContainText("2000");
});

test("compartir por URL pone la tabla en el hash y el enlace la vuelve a cargar", async ({
  page,
}) => {
  await page.goto("/ortografia");
  await page.locator('[data-template-id="es-demo-yeismo"]').click();
  await page.locator("[data-share]").click();

  const shared = page.locator("[data-share-url]");
  await expect(shared).toHaveValue(/#t=/);
  const url = await shared.inputValue();

  // El hash nunca viaja al servidor y el enlace tiene que bastar por si solo.
  // `goto` a la misma ruta con otro hash es una navegacion dentro del mismo
  // documento: no vuelve a ejecutar los scripts, asi que se recarga a proposito
  // para probar lo que ve alguien que abre el enlace desde cero.
  await page.goto(new URL(url).pathname + new URL(url).hash);
  await page.reload();
  await expect(page.locator("[data-meta-name]")).toHaveValue("Espanol (demo, yeismo)");
  await expect(page.locator("[data-status]")).toContainText("enlace");
});

/**
 * La misma tabla rota en las dos rutas del editor.
 *
 * Tiene un problema de cada uno de los seis codigos, porque el defecto que esta
 * prueba vigila es que la frase salga en el idioma equivocado: si solo se
 * mirara un codigo, los otros cinco podrian seguir cruzando el puerto
 * redactados sin que nadie lo note. Los numeros de fila son datos, no prosa, y
 * por eso la frase esperada los nombra.
 */
const BROKEN_TABLE = {
  id: "tabla-rota-idioma",
  languageId: "spa",
  name: "Tabla rota",
  version: 1,
  classes: {},
  rules: [
    { grapheme: "a", ipa: "a" },
    { grapheme: "", ipa: "x" },
    { grapheme: "c", ipa: "s", after: "[aeiou]" },
    { grapheme: "c", ipa: "s", after: "a" },
    { grapheme: "g", ipa: "x", before: "{V}" },
    { grapheme: "h", ipa: "\u6c49" },
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "ch", ipa: "t\u0283" },
    { grapheme: "ch", ipa: "x" },
  ],
  status: "draft",
};

const ISSUE_SENTENCES: Readonly<Record<"es" | "en", readonly string[]>> = {
  es: [
    "La regla 2 tiene un grafema vacío y coincidiría en cualquier posición.",
    "La regla 4 nunca puede ganar: una regla anterior con el mismo grafema cubre un contexto igual o más amplio.",
    "La regla 5 referencia la clase {V}, que no está definida en la tabla.",
    "La regla 6 contiene «\u6c49», que no forma parte del conjunto AFI esperado.",
    "La regla 8 repite el grafema «ch» con el mismo contexto y la misma transcripción que una regla anterior.",
    "La regla 9 contradice una regla anterior para «ch»: mismo contexto, transcripción distinta.",
  ],
  en: [
    "Rule 2 has an empty grapheme, so it would match at any position.",
    "Rule 4 can never win: an earlier rule with the same grapheme covers an equally broad or broader context.",
    "Rule 5 references the class {V}, which the table does not define.",
    "Rule 6 contains “\u6c49”, which is not part of the expected IPA set.",
    "Rule 8 repeats the grapheme “ch” with the same context and the same transcription as an earlier rule.",
    "Rule 9 contradicts an earlier rule for “ch”: same context, different transcription.",
  ],
};

test("la misma tabla rota se explica en el idioma de su ruta, y nunca en el otro", async ({
  page,
}) => {
  for (const [route, locale] of [
    ["/ortografia", "es"],
    ["/en/ortografia", "en"],
  ] as const) {
    await page.goto(route);
    await expect(page.locator(EDITOR)).toBeVisible();

    await page.locator("[data-import-json-file]").setInputFiles({
      name: "rota.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(BROKEN_TABLE), "utf8"),
    });

    const issues = page.locator("[data-issues]");
    await expect(issues.locator("li")).toHaveCount(6);

    // Lo que se afirma es la ORACION, no la insignia: la insignia ya estaba
    // traducida cuando el defecto existia.
    for (const sentence of ISSUE_SENTENCES[locale]) {
      await expect(issues).toContainText(sentence);
    }

    // Y ninguna de las dos salidas puede contener el texto del otro idioma.
    const other = locale === "es" ? "en" : "es";
    for (const sentence of ISSUE_SENTENCES[other]) {
      await expect(issues).not.toContainText(sentence);
    }

    // Los marcadores bastan para descubrir una frase que se colara sin ser
    // exactamente la esperada, que es como llegaria una traduccion a medias.
    if (locale === "es") {
      await expect(page.locator(EDITOR)).not.toContainText(/Rule \d/);
      await expect(page.locator(EDITOR)).not.toContainText("can never win");
    } else {
      await expect(page.locator(EDITOR)).not.toContainText(/La regla \d/);
      await expect(page.locator(EDITOR)).not.toContainText("nunca puede ganar");
    }
  }
});
