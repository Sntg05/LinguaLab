/* ============================================================
   LinguaLab — i18n
   Translations are resolved at BUILD time, per locale. There is no
   runtime dictionary shipped to the browser: each locale is its own
   statically rendered route (/ and /en/...), which removes the legacy
   data-i18n DOM engine, its innerHTML path, and the duplicated
   translation payload.
   ============================================================ */

import { es } from "./messages/es";
import { en } from "./messages/en";
import { withBase } from "../lib/paths";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Every message key, derived from the default locale so it stays authoritative. */
export type MessageKey = keyof typeof es;

const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  es,
  en,
};

export const LOCALE_NAMES: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

/** BCP 47 tags for the <html lang> attribute. */
const HTML_LANG: Record<Locale, string> = {
  es: "es",
  en: "en",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

/** Look up a message. Falls back to Spanish, then to the key itself. */
export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}

/**
 * Build a locale-aware href, already carrying the deployment base.
 *
 * The default locale lives at the root, so Spanish URLs stay clean and
 * English is prefixed:
 *
 *   localePath("es", "/tools") === "/tools"
 *   localePath("en", "/tools") === "/en/tools"
 *
 * Under a subpath base the result is prefixed too, because GitHub Pages
 * serves a project repository from `/LinguaLab/`:
 *
 *   localePath("es", "/tools") === "/LinguaLab/tools"
 */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.replace(/\/+$/, "");
  const localised = locale === DEFAULT_LOCALE ? clean || "/" : `/${locale}${clean}`;
  return withBase(localised);
}

/** The hreflang value for a locale: "es" at the root, "en" under /en. */
export function hreflang(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "x-default" : locale;
}
