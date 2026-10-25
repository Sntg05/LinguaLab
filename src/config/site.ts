/* ============================================================
   LinguaLab — site configuration

   Navigation, and the two values that differ per deployment.
   Both come from the environment so no placeholder has to be hand-edited:

     SITE_URL   the canonical origin, used for canonical and hreflang links
     SITE_REPO  the public repository URL, shown in the footer and about page

   Resolved at build time. SITE_REPO overrides the built-in default, which is
   the project's own public repository; a set-but-invalid value falls back to
   that default rather than emitting a broken link.
   ============================================================ */

import type { MessageKey } from "../i18n";

export interface NavItem {
  /** Route in the default locale, e.g. "/tools". */
  path: string;
  labelKey: MessageKey;
  /**
   * Which column of the footer the item belongs to, and whether it is a tool.
   *
   * POR QUE ESTO ES UN DATO Y NO TRES LISTAS ESCRITAS A MANO
   *
   * El pie tenía su propia lista de herramientas y se quedó vieja: cuando llegaron
   * la ortografía y el fonemizador, el pie siguió ofreciendo tres. Con el tipo
   * aquí, el pie se deriva de esta tabla y no puede desincronizarse.
   */
  kind: "tool" | "reference" | "about";
  /**
   * Primary items make up the masthead. Everything else is reachable from the
   * footer, which is what keeps the header short enough to read at a glance.
   */
  primary: boolean;
}

/**
 * The masthead holds the entrance to the tools, not the tools.
 *
 * POR QUE LAS HERRAMIENTAS YA NO ESTAN ARRIBA
 *
 * Con cuatro herramientas cabían; con siete la barra se volvió una lista que
 * crecía con cada entrega, y cada herramienta nueva la empujaba un poco más
 * hacia el desbordamiento. La entrada al catálogo resuelve lo mismo para siete y
 * para veinte: dentro del catálogo están todas, agrupadas por nivel de análisis.
 *
 * There is no "home" entry on purpose — the brand link already goes to the
 * root, and two links to the same place waste the most valuable row on the
 * page.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  // Herramientas, en el orden de ANALYSIS_LEVELS: del sonido a los flujos de trabajo.
  { path: "/fono", labelKey: "nav.ipa", kind: "tool", primary: false },
  { path: "/ortografia", labelKey: "nav.ortho", kind: "tool", primary: false },
  { path: "/fonemizador", labelKey: "nav.phonemizer", kind: "tool", primary: false },
  { path: "/arboles", labelKey: "nav.trees", kind: "tool", primary: false },
  { path: "/tools", labelKey: "nav.tools", kind: "tool", primary: false },
  { path: "/lenguas", labelKey: "nav.languages", kind: "tool", primary: false },
  // La entrada: una sola puerta a todas las herramientas.
  { path: "/catalogo", labelKey: "nav.catalogTools", kind: "tool", primary: true },
  { path: "/bibliografia", labelKey: "nav.resources", kind: "reference", primary: true },
  { path: "/glosario", labelKey: "nav.glossary", kind: "reference", primary: false },
  { path: "/acerca", labelKey: "nav.about", kind: "about", primary: true },
];

/** The subset the masthead renders, in order. */
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.primary,
);

/** The tools themselves, in the order the catalog uses. */
export const TOOL_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.kind === "tool",
);

/** Reference material: the second column of the footer. */
export const REFERENCE_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.kind === "reference",
);

/** Context pages: the third column of the footer. */
export const ABOUT_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.kind === "about",
);

/**
 * Rutas internas de las herramientas que existen en este sitio.
 *
 * Vive en `src/config` y no dentro del componente porque una prueba tiene que
 * poder cruzarla con `src/data/tools.json`: una ficha que se declara existente y
 * no tiene página promete algo que no está. Es justo lo que pasaba con «Análisis
 * acústico», anunciada como experimental sin existir. Ver `src/config/site.test.ts`.
 *
 * Solo ids con página real: en el momento en que una ruta se adivina, el catálogo
 * enlaza a un 404. No hay URLs externas porque ninguna está verificada.
 */
export const SITE_ROUTES: Readonly<Record<string, string>> = {
  fono: "/fono",
  ortografia: "/ortografia",
  phonemizer: "/fonemizador",
  arboles: "/arboles",
  tools: "/tools",
  "textgrid-viewer": "/visualizador",
  "mapa-lenguas-colombia": "/lenguas",
};

/** Read a build-time environment variable without assuming Node types. */
function env(name: string): string {
  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  return (fromProcess ?? "").trim();
}

/**
 * La URL canonica del sitio.
 *
 * Estaba en `lingualab.pages.dev`, que **no es este sitio**: ese dominio
 * pertenece a otra persona y hoy sirve otra pagina. Los enlaces canonicos y los
 * `hreflang` le estaban diciendo a los buscadores que esta pagina era aquella.
 * Se corrige a la direccion real, que es la que el repositorio declara como
 * homepage y la que responde con este contenido.
 */
const DEFAULT_URL = "https://lingualab-beta.vercel.app";

/**
 * The repository is public and its URL is stable, so it serves as the default.
 * SITE_REPO still wins when set, which is what a fork or a mirror needs.
 */
const DEFAULT_REPO = "https://github.com/Sntg05/LinguaLab";

const rawRepo = env("SITE_REPO") || DEFAULT_REPO;

/** Only accept an absolute http(s) URL; anything else falls back to the default. */
const repository = /^https?:\/\/\S+$/.test(rawRepo)
  ? rawRepo.replace(/\/+$/, "")
  : DEFAULT_REPO;

export const SITE = {
  name: "LinguaLab",
  /** Canonical origin, without a trailing slash. */
  url: (env("SITE_URL") || DEFAULT_URL).replace(/\/+$/, ""),
  /** Public repository, or null when not configured. */
  repository,
  /** Owner/name for the GitHub link label, or null. */
  repositoryLabel: repository ? repository.replace(/^https?:\/\/github\.com\//, "") : null,
} as const;
