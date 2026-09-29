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
   * Primary items make up the masthead. Everything else is reachable from the
   * footer only, which is what keeps the header short enough to read at a
   * glance.
   */
  primary: boolean;
}

/**
 * The masthead carries only the tools themselves: this is a toolbox, and the
 * header should say so before it says anything else. Reference material
 * (glossary, bibliography) and context (about, security) live in the footer.
 *
 * There is no "home" entry on purpose — the brand link already goes to the
 * root, and two links to the same place waste the most valuable row on the
 * page.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/fono", labelKey: "nav.ipa", primary: true },
  { path: "/arboles", labelKey: "nav.trees", primary: true },
  { path: "/tools", labelKey: "nav.tools", primary: true },
  { path: "/bibliografia", labelKey: "nav.resources", primary: true },
  { path: "/glosario", labelKey: "nav.glossary", primary: false },
  { path: "/acerca", labelKey: "nav.about", primary: false },
];

/** The subset the masthead renders, in order. */
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.primary,
);

/** Read a build-time environment variable without assuming Node types. */
function env(name: string): string {
  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  return (fromProcess ?? "").trim();
}

const DEFAULT_URL = "https://lingualab.pages.dev";

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
