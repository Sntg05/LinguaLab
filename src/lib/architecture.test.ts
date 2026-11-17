import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * La regla del hexágono, comprobada también donde `dependency-cruiser` no mira.
 *
 * POR QUÉ ESTA PRUEBA EXISTE
 *
 * `npm run deps:check` implementa ADR 0001: solo `src/composition-root.ts` puede
 * importar `@lingualab/adapters`. Pero dependency-cruiser analiza `.ts`, `.tsx`,
 * `.mjs`, `.js` y `.json`: **no mira dentro de un `.astro`**, y el `<script>` de
 * un componente Astro es justo donde vive el código de interfaz que corre en el
 * navegador. Un `import ... from "@lingualab/adapters/..."` ahí pasaba las
 * puertas sin que ninguna regla lo viera, y el adaptador quedaba cableado desde
 * un componente: exactamente lo que el ADR prohíbe.
 *
 * Lo encontró un worker al implementar el segmento 7, que lo declaró en su
 * informe en vez de esconderlo. Esta prueba cierra el hueco: recorre los
 * `.astro` (y cualquier `.ts` de `src/`) y falla si alguien importa un adaptador
 * fuera del composition root.
 */
// `fileURLToPath` y no `pathname`: la ruta del repositorio tiene un espacio y
// `pathname` lo devuelve percent-encoded. Es la misma trampa que ya documenta
// `scripts/verify-build.mjs`.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const walk = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(path, found);
    } else if (/\.(astro|ts)$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
};

/**
 * Cualquier forma de pedir un adaptador: estático (`from`), de efecto
 * secundario (`import "…"`, sin `from`), dinámico (`import("…")`) o reexportado.
 * La primera versión de esta expresión solo miraba `from` e `import(`, y una
 * mutación con `import "@lingualab/adapters";` pasó sin que la prueba se
 * enterara: la prueba tenía que poder fallar, y no podía.
 */
const ADAPTER_IMPORT =
  /(?:from|import|require)\s*\(?\s*["']@lingualab\/adapters[^"']*["']/;

describe("la regla de dependencias del hexágono", () => {
  it("solo el composition root importa adaptadores", () => {
    const offenders = walk(join(ROOT, "src"))
      .filter((path) => !path.endsWith("src/composition-root.ts"))
      // Esta prueba se menciona a sí misma en un comentario, no en un import.
      .filter((path) => !path.endsWith("src/lib/architecture.test.ts"))
      .filter((path) => ADAPTER_IMPORT.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(ROOT.length));

    // Una página o un componente que conoce un adaptador no se puede cambiar de
    // backend sin tocar la interfaz, que es lo que el hexágono evita.
    expect(offenders).toEqual([]);
  });

  it("el composition root sí los importa, y de eso depende el resto", () => {
    const root = readFileSync(join(ROOT, "src/composition-root.ts"), "utf8");

    // Si esta aserción falla, la prueba de arriba pasaría por vacío.
    expect(ADAPTER_IMPORT.test(root)).toBe(true);
  });
});

/**
 * T9 (S1, «quiero que hagas las cosas más modulares»): el `<script>` de un
 * componente solo conecta elementos con funciones. Toda regla vive en
 * `src/scripts/<área>/`, con prueba, o en `packages/core`.
 *
 * El tope sale del inventario del 2026-11-17: los componentes que ya siguen el
 * patrón del visor (`safeInit("x", initX)`) tienen de 1 a 7 líneas de script y el
 * más largo de los demás, `SecurityPage`, 26. Treinta deja margen para un
 * segundo `safeInit` sin dejar pasar un archivo de reglas.
 */
const MAX_COMPONENT_SCRIPT_LINES = 30;

/**
 * Líneas de código dentro de los bloques `<script>` del cliente.
 *
 * Se quita antes el frontmatter (`---` … `---`): es código del servidor, y un
 * comentario suyo que nombre la etiqueta `<script>` hacía contar desde ahí hasta
 * el cierre del script real. Las etiquetas que se cierran solas (`<script … />`,
 * los datos JSON) no abren un bloque. El cierre admite mayúsculas, espacios y
 * atributos (`</SCRIPT >`), como lo admite el navegador.
 */
const SCRIPT_BLOCK = /<script\b(?![^>]*\/>)[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi;

const scriptLines = (source: string): number => {
  const markup = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  let count = 0;
  for (const match of markup.matchAll(SCRIPT_BLOCK)) {
    count += (match[1] ?? "").split("\n").filter((line) => line.trim() !== "").length;
  }
  return count;
};

describe("los componentes solo conectan (T9)", () => {
  const components = walk(join(ROOT, "src/components"))
    .filter((path) => path.endsWith(".astro"))
    .map((path) => ({
      path: path.slice(ROOT.length),
      lines: scriptLines(readFileSync(path, "utf8")),
    }));

  it("ningún componente pasa del tope de líneas de script", () => {
    // T9 vació la lista de pendientes con que empezó: desde aquí no hay excepciones.
    const offenders = components
      .filter(({ lines }) => lines > MAX_COMPONENT_SCRIPT_LINES)
      .map(({ path, lines }) => `${path}: ${lines}`);

    expect(offenders).toEqual([]);
  });

  it("cuenta las líneas del script y no las del marcado", () => {
    // Sin esto, un contador roto que siempre diera 0 haría pasar la de arriba.
    const sample = "---\nconst a = 1;\n---\n<p>x</p>\n<script>\n  one();\n\n  two();\n</script>";
    expect(scriptLines(sample)).toBe(2);
  });

  it("no cuenta el frontmatter ni las etiquetas de datos que se cierran solas", () => {
    const sample = [
      "---",
      "// Este import vive en el `<script>` del componente.",
      "---",
      '<script is:inline type="application/json" data-x set:html={x} />',
      "<p>x</p>",
      "<script>",
      "  one();",
      "</script>",
    ].join("\n");
    expect(scriptLines(sample)).toBe(1);
  });

  it("reconoce el cierre con mayúsculas o con espacio, como el navegador", () => {
    expect(scriptLines("<SCRIPT>\n  one();\n</SCRIPT >")).toBe(1);
    expect(scriptLines('<script type="module">\n  one();\n  two();\n</script\n>')).toBe(2);
  });
});
