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
 * Los dos temas que el sitio declara soportar.
 *
 * POR QUE SE PRUEBAN LOS DOS
 *
 * El tema oscuro no es un extra: `base.css` define la paleta clara y, cuando el
 * sistema pide oscuro, el bloque `@media (prefers-color-scheme: dark)` la
 * reemplaza entera. Son dos juegos de colores distintos, así que un contraste
 * aprobado en uno no dice nada del otro. La puerta probaba un solo tema, y un
 * token que fallaba en LOS DOS —`--line-strong` como color de texto: 2.0:1 en
 * claro y 2.4:1 en oscuro— pasó desapercibido porque nadie miraba.
 *
 * El tema se emula con `emulateMedia` ANTES de `goto`, que es lo que evita el
 * parpadeo con la paleta del sistema en el primer pintado. El orden **no** cambia
 * lo que se mide: una verificación independiente comprobó que emular después de
 * navegar también repinta la página. Se deja antes igual, porque fija el tema
 * desde el primer pintado en lugar de corregirlo después.
 */
const THEMES: readonly { readonly scheme: "light" | "dark"; readonly name: string }[] = [
  { scheme: "light", name: "claro" },
  { scheme: "dark", name: "oscuro" },
];

/**
 * Las páginas que hoy existen. El catálogo de herramientas y el editor de tablas
 * entran aquí en cuanto tengan ruta, con el mismo criterio: si una página es
 * pública, declara su accesibilidad por escrito y la prueba la sostiene.
 */
/**
 * **Todas** las páginas públicas construidas. Si se añade una ruta, entra aquí.
 *
 * No es una lista de conveniencia: la única violación real que encontró esta
 * puerta estaba en el `Masthead` compartido que usan todas las páginas, así que
 * una página sin cubrir es una incógnita y no una certeza. Al principio la lista
 * tenía seis entradas y llamarlas «las páginas públicas» era falso: existían
 * catorce más sin cubrir.
 */
const PUBLIC_PAGES: readonly { readonly path: string; readonly name: string }[] = [
  { path: "/", name: "inicio (espanol)" },
  { path: "/en/", name: "inicio (ingles)" },
  { path: "/fono", name: "FonoLab (espanol)" },
  { path: "/en/fono", name: "FonoLab (ingles)" },
  { path: "/arboles", name: "ArborLab (espanol)" },
  { path: "/en/arboles", name: "ArborLab (ingles)" },
  { path: "/tools", name: "estacion textual (espanol)" },
  { path: "/en/tools", name: "estacion textual (ingles)" },
  { path: "/ortografia", name: "editor de tablas (espanol)" },
  { path: "/en/ortografia", name: "editor de tablas (ingles)" },
  { path: "/catalogo", name: "catalogo (espanol)" },
  { path: "/en/catalogo", name: "catalogo (ingles)" },
  { path: "/glosario", name: "glosario (espanol)" },
  { path: "/en/glosario", name: "glosario (ingles)" },
  { path: "/bibliografia", name: "bibliografia (espanol)" },
  { path: "/en/bibliografia", name: "bibliografia (ingles)" },
  { path: "/seguridad", name: "salvaguardas (espanol)" },
  { path: "/en/seguridad", name: "salvaguardas (ingles)" },
  { path: "/acerca", name: "acerca (espanol)" },
  { path: "/en/acerca", name: "acerca (ingles)" },
  // Una ruta inexistente sirve la pagina 404, que tambien es publica.
  { path: "/no-existe", name: "pagina 404" },
];

/**
 * Los motivos con los que axe declara que **no pudo medir** el contraste. El texto
 * entre comillas es la definición de axe-core 4.13.0, copiada de su código fuente,
 * no mi interpretación:
 *
 * - `imgNode`:          "Element's background color could not be determined because
 *                       element contains an image node"
 * - `bgOverlap`:        "Element's background color could not be determined because
 *                       it is overlapped by another element"
 * - `shortTextContent`: axe no decide si el texto es «grande» porque tiene UN solo
 *                       carácter (`visibleText.length === 1`), y el umbral depende
 *                       de eso. El teclado de símbolos AFI cae acá.
 * - `nonBmp`:           axe no evalúa el contraste de caracteres fuera del plano
 *                       básico (la flecha de `.btn__arrow`).
 *
 * Los cuatro dicen lo mismo: **axe no midió**. Es una categoría distinta de
 * `equalRatio`, donde `truncatedResult === 1` significa que axe SÍ midió y el
 * resultado fue 1:1 —un texto del mismo color que su fondo—; ese es un defecto y
 * por eso no está en esta lista, y sigue haciendo fallar la prueba.
 *
 * PUNTO CIEGO DECLARADO, no una afirmación de que estos nodos estén bien. La
 * puerta no sabe nada del contraste acá y no lo finge; ver P11 en
 * `docs/PENDING.md`. Se intentó medirlos por su cuenta y **la medición fue
 * falsa**: subir por los ancestros buscando el primer `fill` opaco toma el valor
 * heredado de un `<g>` de SVG que no pinta nada, e inventa un fondo. Con ese
 * método «gato» en la portada daba 1,67:1, y mirando los píxeles es texto oscuro
 * sobre fondo claro. El método producía defectos donde no había ninguno.
 */
const AXE_COULD_NOT_MEASURE: readonly string[] = [
  "imgNode",
  "bgOverlap",
  "shortTextContent",
  "nonBmp",
];

for (const { scheme, name: themeName } of THEMES) {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} no tiene violaciones de accesibilidad en tema ${themeName}`, async ({ page }) => {
      // La emulación va antes de navegar para que el tema quede fijado desde el
      // primer pintado. Ver el comentario de THEMES: el orden no cambia lo que se
      // mide, pero sí evita el parpadeo con la paleta del sistema.
      await page.emulateMedia({ colorScheme: scheme });
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

      // Motivos que axe declaró y no pudo juzgar. Se recogen de las tres listas del
      // nodo —`any`, `all`, `none`— porque axe pone el motivo en la que corresponde
      // al criterio que no pudo evaluar, y el detalle viaja en `data.messageKey`.
      const unexplained = results.incomplete.flatMap((result) =>
        result.nodes.flatMap((node) =>
          [...node.any, ...node.all, ...node.none]
            .map((check) => (check.data as { messageKey?: string } | undefined)?.messageKey)
            .filter((key): key is string => typeof key === "string")
            .filter((key) => !AXE_COULD_NOT_MEASURE.includes(key))
            .map((key) => ({ rule: result.id, target: node.target.join(" "), reason: key })),
        ),
      );

      expect(unexplained).toEqual([]);
    });
  }
}
