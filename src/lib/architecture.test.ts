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
