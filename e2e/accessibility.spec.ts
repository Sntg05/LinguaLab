import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accesibilidad de las paginas publicas, comprobada con axe.
 *
 * POR QUE UNA PRUEBA Y NO UNA REVISION A OJO
 *
 * El proyecto declara WCAG 2.2 AA como requisito, no como aspiración. Una
 * declaración que nadie comprueba se degrada sola: basta con que alguien añada
 * un control sin etiqueta para que deje de ser cierta, y nadie lo nota porque el
 * sitio sigue funcionando para quien ve y usa ratón.
 *
 * Se etiquetan las reglas de WCAG 2.2 AA explícitamente en vez de usar el
 * conjunto por defecto de axe, que incluye lo mejor de varios niveles y cambia
 * entre versiones. Una etiqueta fija hace que un cambio en las reglas se note
 * como un cambio, y no como un verde que sigue verde sin que nadie sepa por qué.
 */

const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Las páginas que hoy existen. El catálogo de herramientas y el editor de tablas
 * entran aquí en cuanto tengan ruta, con el mismo criterio: si una página es
 * pública, declara su accesibilidad por escrito y la prueba la sostiene.
 */
const PUBLIC_PAGES: readonly { readonly path: string; readonly name: string }[] = [
  { path: "/", name: "inicio (espanol)" },
  { path: "/en/", name: "inicio (ingles)" },
  { path: "/ortografia", name: "editor de tablas (espanol)" },
  { path: "/en/ortografia", name: "editor de tablas (ingles)" },
];

for (const { path, name } of PUBLIC_PAGES) {
  test(`${name} no tiene violaciones de accesibilidad`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS).analyze();

    // El resumen nombra cada regla, cada nodo que la rompe y —esto es lo que
    // permite arreglarlo sin volver a correr la prueba— el `failureSummary` de
    // axe, que explica en una frase qué atributo o etiqueta falta. Sin esa frase
    // una violación obliga a reproducirla a mano con navegador y todo.
    const summary = results.violations.map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(" "),
        failure: node.failureSummary,
      })),
    }));

    expect(summary).toEqual([]);
  });
}
