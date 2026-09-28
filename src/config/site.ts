/* ============================================================
   LinguaLab — site configuration

   Navigation, and the two values that differ per deployment.
   Both come from the environment so no placeholder has to be hand-edited:

     SITE_URL   the canonical origin, used for canonical and hreflang links
     SITE_REPO  the public repository URL, shown in the footer and about page

   Resolved at build time. When SITE_REPO is unset the repository links are
   omitted rather than rendered pointing at a placeholder.
   ============================================================ */

import type { MessageKey } from "../i18n";

export interface NavItem {
  /** Route in the default locale, e.g. "/tools". */
  path: string;
  labelKey: MessageKey;
  /** Shown in the masthead on wide viewports. */
  primary: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", labelKey: "nav.home", primary: true },
  { path: "/tools", labelKey: "nav.tools", primary: true },
  { path: "/fono", labelKey: "nav.ipa", primary: true },
  { path: "/arboles", labelKey: "nav.trees", primary: true },
  { path: "/glosario", labelKey: "nav.glossary", primary: false },
  { path: "/bibliografia", labelKey: "nav.resources", primary: false },
  { path: "/seguridad", labelKey: "nav.security", primary: false },
  { path: "/acerca", labelKey: "nav.about", primary: false },
];

/** Read a build-time environment variable without assuming Node types. */
function env(name: string): string {
  const fromProcess =
    typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  return (fromProcess ?? "").trim();
}

const DEFAULT_URL = "https://lingualab.pages.dev";

const rawRepo = env("SITE_REPO");

/** Only accept an absolute http(s) URL; anything else is treated as unset. */
const repository = /^https?:\/\/\S+$/.test(rawRepo) ? rawRepo.replace(/\/+$/, "") : null;

export const SITE = {
  name: "LinguaLab",
  /** Canonical origin, without a trailing slash. */
  url: (env("SITE_URL") || DEFAULT_URL).replace(/\/+$/, ""),
  /** Public repository, or null when not configured. */
  repository,
  /** Owner/name for the GitHub link label, or null. */
  repositoryLabel: repository ? repository.replace(/^https?:\/\/github\.com\//, "") : null,
} as const;
