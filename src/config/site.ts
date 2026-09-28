/* ============================================================
   LinguaLab — site configuration
   Single source of truth for navigation, shared by the masthead,
   the footer and the sitemap.
   ============================================================ */

import type { MessageKey } from "../i18n";

export interface NavItem {
  /** Route in the default locale, e.g. "/tools". */
  path: string;
  labelKey: MessageKey;
  /** Shown in the masthead on wide viewports. */
  primary: boolean;
  descriptionKey?: MessageKey;
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

export const SITE = {
  name: "LinguaLab",
  /** Overridden at build time from the SITE_URL env var. */
  url: "https://lingualab.pages.dev",
  repository: "https://github.com/OWNER/LinguaLab",
} as const;
