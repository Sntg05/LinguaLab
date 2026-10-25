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
 * El tema oscuro no es un extra: `tokens.css` define la paleta clara en `:root` y, cuando el sistema
 * pide oscuro, el bloque `@media (prefers-color-scheme: dark)` la reemplaza entera. Son dos juegos de
 * colores distintos, así que un contraste aprobado en uno no dice nada del otro. La puerta probaba un
 * solo tema, y un token que fallaba en LOS DOS —`--line-strong` como color de texto: 2.0:1 en claro y
 * 2.4:1 en oscuro— pasó desapercibido porque nadie miraba.
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
  { path: "/fonemizador", name: "fonemizador (espanol)" },
  { path: "/en/fonemizador", name: "fonemizador (ingles)" },
  { path: "/catalogo", name: "catalogo (espanol)" },
  { path: "/en/catalogo", name: "catalogo (ingles)" },
  { path: "/elan", name: "conversor ELAN (espanol)" },
  { path: "/experimentos", name: "experimentos (espanol)" },
  { path: "/en/experimentos", name: "experimentos (ingles)" },
  { path: "/en/elan", name: "conversor ELAN (ingles)" },
  { path: "/lenguas", name: "mapa de lenguas (espanol)" },
  { path: "/en/lenguas", name: "mapa de lenguas (ingles)" },
  { path: "/visualizador", name: "visor de audio (espanol)" },
  { path: "/en/visualizador", name: "visor de audio (ingles)" },
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
 * - `imgNode`:     "Element's background color could not be determined because
 *                  element contains an image node"
 * - `bgOverlap`:   "Element's background color could not be determined because it
 *                  is overlapped by another element"
 * - `nonBmp`:      axe saltea la medición cuando el contenido está compuesto solo
 *                  de caracteres que su regex trata como símbolos. Ojo: esa regex
 *                  cubre flechas (`\u2190-\u21FF`), operadores y dingbats **dentro**
 *                  del plano básico, así que la flecha `→` (U+2192) entra por ahí y
 *                  el motivo no tiene nada que ver con el plano básico. Y una
 *                  versión anterior de este comentario decía eso último: era falso.
 *
 * `shortTextContent`: la rama está guardada por `!isValid`, así que este motivo NO garantiza
 *                  que axe haya medido algo. Medido en el sitio, las **28** apariciones traen
 *                  `contrastRatio: 0`, o sea que axe **no calculó** ninguna. Pero la mutación de
 *                  un verificador probó que la rama también puede traer un ratio medido y
 *                  insuficiente (2,63:1 sobre un umbral de 3:1). Por eso no alcanza con mirar el
 *                  motivo: está en la lista **solo porque el dato se comprueba antes**, y si trae
 *                  un contraste medido por debajo del exigido falla igual. Un comentario anterior
 *                  decía que axe «ya midió un ratio que no alcanza» en todos los casos, y los datos
 *                  del propio sitio no lo sostienen: es `!isValid`, que también es cierto cuando no
 *                  pudo calcular.
 *
 * POR ESO LA AFIRMACIÓN NO ES «ESTE MOTIVO ESTÁ PERMITIDO» sino «este motivo no trae
 * un contraste medido por debajo del exigido». Un `incomplete` falla si su motivo no
 * está en la lista, y falla también si el motivo está pero axe trae un `contrastRatio`
 * positivo menor que el `expectedContrastRatio`. Un `contrastRatio` de 0 significa que
 * axe no calculó nada —lo vio un verificador en los botones de marcas combinantes— y
 * ese caso sí es «no midió».
 *
 * AGUJERO DECLARADO, no tapado: algunos `incomplete` no traen motivo textual porque axe
 * pone `data` como array. En `/arboles` pasa con un `aria-required-children` de impacto
 * **crítico** sobre `.checks__list`. No se descartan en silencio: pasan solo si su
 * **regla** está exceptuada por nombre en `AXE_INCOMPLETE_WITHOUT_MOTIVE`, y hoy hay una
 * sola, con la decisión pendiente en P12 de `docs/PENDING.md`.
 *
 * Y el punto ciego sigue siendo un punto ciego, no una afirmación de que los nodos
 * estén bien: en lo que axe no midió, la puerta no sabe nada del contraste y no lo
 * finge. Ver P11, con el aviso de que medirlo por estilos computados da resultados
 * falsos. Medición del sitio completo **cuando la puerta cubría 21 páginas**: los **186**
 * `incomplete` (21 páginas × 2 temas) traen `contrastRatio` 0 o ausente, o sea que **axe no calculó
 * nada** en ninguno. Los 40 eran solo las tres rutas más pesadas en UN tema, no el sitio entero. El
 * único caso medido por debajo del umbral fue la mutación de un verificador. La puerta cubre hoy 23
 * páginas, así que ese total es un piso: sumar las dos rutas nuevas lo sube y hay que volver a
 * medirlo.
 */
const AXE_COULD_NOT_MEASURE: readonly string[] = [
  "imgNode",
  "bgOverlap",
  // `elmPartiallyObscured`: axe no puede medir el contraste de una celda que
  // queda fuera de la parte visible de una tabla que se desplaza en horizontal
  // —la tabla de mediciones acústicas, con doce columnas, no entra en 1280 px—.
  // Es «no pude medir», no «está bien»: el contraste de esas celdas no está
  // verificado, y la tabla puede recorrerse con el teclado porque su contenedor
  // es enfocable. Queda anotado como P22 en `docs/PENDING.md`.
  "elmPartiallyObscured",
  "nonBmp",
  // Permitido SOLO porque la comprobación del contraste medido corre antes. Ver arriba.
  "shortTextContent",
];

/**
 * Reglas cuya falta de motivo textual está exceptuada **por nombre**, nunca en general.
 *
 * `aria-required-children` sobre `.checks__list` en `/arboles`: axe avisa que espera un
 * hijo con rol `listitem` en una `<ul role="list">` que **en el HTML inicial está vacía**.
 * Era una pregunta abierta —¿esa lista se puebla o no?— y se midió antes de decidir:
 * con la página recién cargada hay **0** `<li>` y axe devuelve este `incomplete` con
 * `data: [["listitem"]]`; después de pulsar «Dibujar» hay **1** `<li>` y axe **deja de
 * reportarlo**. O sea: la lista se puebla por JavaScript en la primera acción, y lo que
 * axe mide es el estado vacío del marcado. El `role="list"` se queda porque es lo que
 * conserva el rol de lista en Safari cuando se quita el `list-style`, así que el arreglo
 * no es borrarlo. La excepción queda **por nombre y con esta razón medida**, nunca en
 * general: cualquier otra regla sin motivo textual sigue fallando. Ver **P12** de
 * `docs/PENDING.md`.
 *
 * `label-content-name-mismatch` sobre los botones de acción de la tabla de intervalos de
 * `/visualizador`: el botón muestra «▶» o «∪» y se llama «Reproducir el intervalo 1» /
 * «Fusionar el intervalo 1 con el siguiente». Se probó la corrección obvia —meter el glifo
 * en el nombre accesible— y axe lo sigue marcando: con un texto visible de un solo símbolo
 * no puede decidir. O sea que no dice «incumplís», dice «no sé», y con un nombre completo
 * para el lector de pantalla el requisito de 2.5.3 está cubierto. El razonamiento largo
 * vive en `src/scripts/audio/index.ts`, junto al botón. Si alguien reemplaza los glifos por
 * texto visible, esta excepción se borra sola: la regla deja de aparecer.
 *
 * Cualquier otra regla sin motivo textual falla.
 */
const AXE_INCOMPLETE_WITHOUT_MOTIVE: readonly string[] = [
  "aria-required-children",
  "label-content-name-mismatch",
];

/**
 * Las páginas no se arrastran de lado en un teléfono.
 *
 * POR QUE ESTA PRUEBA ESTA AQUI Y NO EN UNA DE FLUJO
 *
 * Un desborde horizontal es un defecto de diseño que axe no ve: la página sigue
 * siendo accesible y se puede usar, pero en un teléfono se mueve sola al
 * arrastrar y el contenido de la derecha queda fuera. Apareció dos veces durante
 * este cierre —el campo de búsqueda de `/fono`, que empujaba todo a 428 px en
 * una pantalla de 360— y las dos se arreglaron a mano. Con 360 px, que es el
 * ancho de un teléfono común, y todas las páginas públicas, no vuelve sin que
 * alguien lo vea.
 */
test("ninguna página pública se desborda a 360 px de ancho", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });

  for (const { path, name } of PUBLIC_PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scroll: doc.scrollWidth, client: doc.clientWidth };
    });

    expect(overflow.scroll, `${name} (${path}) se desborda a 360 px`).toBeLessThanOrEqual(
      overflow.client + 1,
    );
  }
});

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
          [...node.any, ...node.all, ...node.none].flatMap((check) => {
            const data = check.data as
              | { messageKey?: unknown; contrastRatio?: unknown; expectedContrastRatio?: unknown }
              | undefined;
            const key = typeof data?.messageKey === "string" ? data.messageKey : "(sin motivo)";
            const entry = { rule: result.id, target: node.target.join(" "), reason: key };

            // EL DATO ANTES QUE EL MOTIVO, y el orden es lo que sostiene todo: la lista
            // blanca es segura solo porque esto corre primero. Ver `AXE_COULD_NOT_MEASURE`,
            // que explica por que `shortTextContent` lo exige.
            const measured = typeof data?.contrastRatio === "number" ? data.contrastRatio : null;
            const expected =
              typeof data?.expectedContrastRatio === "string"
                ? Number.parseFloat(data.expectedContrastRatio)
                : null;
            if (measured !== null && measured > 0 && expected !== null && measured < expected) {
              return [
                { ...entry, reason: `${key} con contraste medido ${measured} < ${expected}` },
              ];
            }

            // Sin motivo textual no se descarta en silencio: pasa solo si su REGLA esta
            // exceptuada por nombre. Ver AXE_INCOMPLETE_WITHOUT_MOTIVE y P12.
            if (key === "(sin motivo)") {
              return AXE_INCOMPLETE_WITHOUT_MOTIVE.includes(result.id) ? [] : [entry];
            }

            return AXE_COULD_NOT_MEASURE.includes(key) ? [] : [entry];
          }),
        ),
      );

      expect(unexplained).toEqual([]);
    });
  }
}
