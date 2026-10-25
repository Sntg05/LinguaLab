import jerarquicoEaf from "../../../../e2e/fixtures/jerarquico.eaf?raw";
import malformadoEaf from "../../../../e2e/fixtures/malformado.eaf?raw";
import simpleEaf from "../../../../e2e/fixtures/simple.eaf?raw";
import simpleTextGrid from "../../../../e2e/fixtures/simple.TextGrid?raw";
import { type AnnotationDocument, parseTextGridBytes, serializeTextGrid } from "@lingualab/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPyodideElanCodec } from "./pyodide-elan-codec";
import type { PyodideElanCodec } from "./pyodide-elan-types";

/**
 * Pruebas del codec ELAN contra Pyodide y pympi de verdad.
 *
 * POR QUE ESTA PRUEBA CARGA EL PYODIDE VENDORIZADO Y NO EL DEL `node_modules`
 *
 * Lo que se sirve en produccion es `public/pyodide/`, con sus hashes en el
 * README de ese directorio. Probar el del `node_modules` comprobaria que Pyodide
 * funciona, no que lo que publicamos funciona. El modulo JS se importa del
 * paquete npm porque es el mismo archivo que se sirve (y Node no puede importar
 * por HTTP), pero el wasm, la stdlib, el lock y los wheels salen todos de
 * `public/pyodide/`.
 *
 * POR QUE EL WHEEL SE INSTALA CON UNA URL `file://`
 *
 * `micropip` exige una URL con esquema y no acepta una ruta suelta. En el
 * navegador ese esquema es `http` (mismo origen del sitio); en Node, Pyodide
 * resuelve `file:` leyendo del disco, asi que la prueba instala el MISMO wheel
 * vendorizado sin levantar un servidor y sin abrir un puerto que otra sesion
 * pueda estar usando.
 *
 * POR QUE EL ARRANQUE SE PAGA UNA VEZ
 *
 * Instanciar Pyodide en Node cuesta unos segundos (9 MB de wasm y 2,4 MB de
 * stdlib) y es el mismo trabajo que paga un navegador la primera vez. Se hace
 * en `beforeAll`, con un tiempo limite propio, y todas las pruebas reutilizan
 * el mismo codec: el costo se paga una sola vez y se informa.
 */

/**
 * El directorio vendorizado, como RUTA.
 *
 * `decodeURIComponent` no es adorno: el repositorio puede vivir bajo una ruta
 * con espacios (`Opencode projects`), y `pathname` los entrega escapados, con lo
 * que Pyodide buscaria un archivo que no existe.
 */
const PYODIDE_DIR = decodeURIComponent(
  new URL("../../../../public/pyodide/", import.meta.url).pathname,
);

/**
 * Los fixtures se importan como TEXTO (`?raw`), no se leen del disco.
 *
 * Asi esta prueba no necesita el sistema de archivos ni los tipos de Node —que
 * este paquete no declara a proposito, porque un adaptador corre en el
 * navegador— y el fixture sigue siendo el mismo archivo que usa el e2e.
 */
const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text);

/** Compara textos exactos y tiempos con tolerancia de un milisegundo. */
const expectSameAnnotations = (actual: AnnotationDocument, expected: AnnotationDocument): void => {
  const annotations = (document: AnnotationDocument) =>
    document.tiers.map((tier) => ({
      name: tier.name,
      kind: tier.kind,
      // Los intervalos vacios son relleno de silencio del TextGrid: no son
      // anotaciones y no deben aparecer en la comparacion de ida y vuelta.
      items:
        tier.kind === "interval"
          ? tier.items
              .filter((item) => item.text !== "")
              .map((item) => ({ text: item.text, start: item.start, end: item.end }))
          : [],
    }));

  const actualTiers = annotations(actual);
  const expectedTiers = annotations(expected);
  expect(actualTiers.map((tier) => tier.name)).toEqual(expectedTiers.map((tier) => tier.name));

  for (const [position, expectedTier] of expectedTiers.entries()) {
    const actualTier = actualTiers[position];
    expect(actualTier?.kind).toBe(expectedTier.kind);
    expect(actualTier?.items.length).toBe(expectedTier.items.length);
    for (const [index, expectedItem] of expectedTier.items.entries()) {
      const actualItem = actualTier?.items[index];
      expect(actualItem?.text).toBe(expectedItem.text);
      expect(Math.abs((actualItem?.start ?? 0) - expectedItem.start)).toBeLessThan(0.001);
      expect(Math.abs((actualItem?.end ?? 0) - expectedItem.end)).toBeLessThan(0.001);
    }
  }
};

let codec: PyodideElanCodec;

beforeAll(async () => {
  // El indice va como URL `file://` porque el codec deriva de ahi la URL del
  // wheel; el cargador que se inyecta lo reescribe a la ruta del disco, que es
  // lo que el Pyodide de Node necesita para leer el wasm y la stdlib.
  const { loadPyodide } = await import("pyodide");

  codec = createPyodideElanCodec({
    indexURL: `file://${PYODIDE_DIR}`,
    runtime: "in-process",
    loadPyodide: (options) =>
      loadPyodide({
        ...options,
        indexURL: PYODIDE_DIR,
        packageBaseUrl: `${PYODIDE_DIR}wheels/`,
      }),
    timeoutMs: 240_000,
  });
}, 300_000);

afterAll(() => {
  codec?.dispose();
});

/**
 * Presupuesto por prueba, y por qué no es el de Vitest.
 *
 * Levantar Pyodide —13 MB de wasm, micropip y el wheel de pympi— tarda entre dos
 * y cinco segundos en una máquina libre, y más cuando la suite entera corre en
 * paralelo sobre los mismos núcleos. Con el límite por defecto de 5 s esto falla
 * de forma intermitente, que es la peor clase de rojo: el del día que a alguien
 * no le da la máquina. El límite grande no esconde un cuelgue, porque el
 * adaptador tiene su propio `timeoutMs` y una prueba que verifica que responde.
 */
// `vi.setConfig` y no el tercer argumento de cada `it`: son diez pruebas y la
// razón es una sola. Vale solo para este archivo.
vi.setConfig({ testTimeout: 60_000 });

describe("el codec ELAN sobre Pyodide y pympi", () => {
  it("lee un .eaf simple y coincide con el TextGrid equivalente", async () => {
    const parsed = await codec.parseWithReport(bytesOf(simpleEaf));
    expect(parsed.ok, parsed.ok ? "" : JSON.stringify(parsed.error)).toBe(true);
    if (!parsed.ok) return;

    const expected = parseTextGridBytes(bytesOf(simpleTextGrid));
    expect(expected.ok).toBe(true);
    if (!expected.ok) return;

    expectSameAnnotations(parsed.value.document, expected.value.document);
    // El .eaf no trae nada que el modelo no pueda representar.
    expect(parsed.value.report.hierarchicalTiers).toEqual([]);
    expect(parsed.value.report.annotationReferences).toEqual([]);
    expect(parsed.value.report.controlledVocabularies).toEqual([]);
    // El hueco 2200-3000 de `palabra` se rellena con un intervalo vacio y se dice.
    expect(parsed.value.report.notes).toEqual([{ code: "gap-filled", tier: "palabra", count: 1 }]);
    expect(codec.isReady()).toBe(true);
  });

  it("el metodo del puerto devuelve solo el documento", async () => {
    const parsed = await codec.parse(bytesOf(simpleEaf));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.xmax).toBe(3);
    expect(parsed.value.tiers.map((tier) => tier.name)).toEqual(["frase", "palabra"]);
  });

  it("una anotacion sobrevive a ELAN -> TextGrid -> ELAN con textos y tiempos", async () => {
    const first = await codec.parseWithReport(bytesOf(simpleEaf));
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const textGrid = serializeTextGrid(first.value.document);
    const reread = parseTextGridBytes(new TextEncoder().encode(textGrid));
    expect(reread.ok, reread.ok ? "" : JSON.stringify(reread.error)).toBe(true);
    if (!reread.ok) return;
    expect(reread.value.gaps).toEqual([]);

    const back = await codec.serializeWithReport(reread.value.document);
    expect(back.ok, back.ok ? "" : JSON.stringify(back.error)).toBe(true);
    if (!back.ok) return;

    // El relleno de silencio no se escribe como anotacion vacia, y se informa.
    expect(back.value.report.notes).toEqual([
      { code: "empty-intervals-dropped", tier: "palabra", count: 1 },
    ]);

    // El .eaf escrito declara las dos capas, sus valores y la unidad de tiempo
    // que ELAN espera; sin ella los tiempos se leen como segundos.
    expect(back.value.text).toContain('TIME_UNITS="milliseconds"');
    expect(back.value.text).toContain('TIER_ID="frase"');
    expect(back.value.text).toContain('TIER_ID="palabra"');
    expect(back.value.text.match(/<TIER /g)?.length).toBe(2);
    expect(back.value.text).toContain("<ANNOTATION_VALUE>hola mundo</ANNOTATION_VALUE>");

    const roundTripped = await codec.parseWithReport(new TextEncoder().encode(back.value.text));
    expect(roundTripped.ok, roundTripped.ok ? "" : JSON.stringify(roundTripped.error)).toBe(true);
    if (!roundTripped.ok) return;

    expectSameAnnotations(roundTripped.value.document, first.value.document);
  });

  it("el informe de perdida nombra la jerarquia, las referencias y el vocabulario", async () => {
    const parsed = await codec.parseWithReport(bytesOf(jerarquicoEaf));
    expect(parsed.ok, parsed.ok ? "" : JSON.stringify(parsed.error)).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.report.hierarchicalTiers).toEqual(["palabra"]);
    expect(parsed.value.report.annotationReferences).toEqual(["palabra"]);
    expect(parsed.value.report.controlledVocabularies).toEqual(["cv-categoria"]);
    expect(parsed.value.report.notes).toEqual([
      { code: "reference-annotations", tier: "palabra", count: 2 },
    ]);
    // La capa de referencias no tiene tiempos, asi que no entra al documento; la
    // que si los tiene se conserva.
    expect(parsed.value.document.tiers.map((tier) => tier.name)).toEqual(["frase", "categoria"]);
  });

  it("una capa de puntos no se puede escribir en ELAN y se informa", async () => {
    const document: AnnotationDocument = {
      xmin: 0,
      xmax: 2,
      tiers: [
        {
          name: "tono",
          kind: "point",
          points: [
            { time: 0.5, text: "H" },
            { time: 1.5, text: "L" },
          ],
        },
      ],
    };

    const serialized = await codec.serializeWithReport(document);
    expect(serialized.ok, serialized.ok ? "" : JSON.stringify(serialized.error)).toBe(true);
    if (!serialized.ok) return;

    expect(serialized.value.report.notes).toEqual([
      { code: "point-tier-dropped", tier: "tono", count: 2 },
    ]);
    expect(serialized.value.text).toContain("<ANNOTATION_DOCUMENT");

    const reread = await codec.parseWithReport(new TextEncoder().encode(serialized.value.text));
    expect(reread.ok).toBe(true);
    if (!reread.ok) return;
    expect(reread.value.document.tiers).toEqual([]);
  });

  it("serializa un documento vacio en un .eaf que se puede volver a leer", async () => {
    const serialized = await codec.serializeWithReport({ tiers: [], xmin: 0, xmax: 0 });
    expect(serialized.ok, serialized.ok ? "" : JSON.stringify(serialized.error)).toBe(true);
    if (!serialized.ok) return;

    const reread = await codec.parseWithReport(new TextEncoder().encode(serialized.value.text));
    expect(reread.ok, reread.ok ? "" : JSON.stringify(reread.error)).toBe(true);
    if (!reread.ok) return;
    expect(reread.value.document).toEqual({ tiers: [], xmin: 0, xmax: 0 });
  });

  it("un archivo vacio devuelve empty sin arrancar el motor", async () => {
    const fresh = createPyodideElanCodec({
      indexURL: "/pyodide/",
      runtime: "in-process",
      loadPyodide: () => {
        throw new Error("no deberia cargarse Pyodide para un archivo vacio");
      },
    });

    const parsed = await fresh.parse(new Uint8Array(0));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("empty");
    expect(fresh.isReady()).toBe(false);
  });

  it("un .eaf truncado devuelve malformed-xml con la linea y no lanza", async () => {
    const parsed = await codec.parseWithReport(bytesOf(malformadoEaf));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("malformed-xml");
    expect(parsed.error.code === "malformed-xml" ? parsed.error.detail : "").toContain("linea");
  });

  it("un XML valido que no es un .eaf devuelve unsupported-structure", async () => {
    const parsed = await codec.parseWithReport(
      new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><OTRA_COSA/>'),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("unsupported-structure");
  });
});

describe("el adaptador en modo worker", () => {
  it("sin Web Worker disponible devuelve runtime-unavailable en vez de lanzar", async () => {
    const workerCodec = createPyodideElanCodec({ indexURL: "/pyodide/" });
    const parsed = await workerCodec.parse(new TextEncoder().encode("<x/>"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("runtime-unavailable");
    expect(workerCodec.isReady()).toBe(false);
    workerCodec.dispose();
  });
});
