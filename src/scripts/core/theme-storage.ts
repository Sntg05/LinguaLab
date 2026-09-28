/* ============================================================
   LinguaLab — theme storage (pure)
   Kept free of DOM access so the resolution rules can be unit tested.
   ============================================================ */

export const THEME_KEY = "lingualab-theme";
export const LANG_KEY = "lingualab-lang";

export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * The concrete palette to paint with, given a preference and the OS setting.
 * "auto" defers to the OS; anything else is an explicit user choice.
 */
export function resolveTheme(preference: Theme, prefersDark: boolean): "light" | "dark" {
  if (preference === "auto") return prefersDark ? "dark" : "light";
  return preference;
}

/** The next preference in the auto → light → dark cycle. */
export function nextTheme(current: Theme): Theme {
  switch (current) {
    case "auto":
      return "light";
    case "light":
      return "dark";
    case "dark":
      return "auto";
  }
}

/**
 * Only an explicit choice is written to the document element. "auto" removes
 * the attribute so the `prefers-color-scheme` media query in tokens.css wins.
 */
export function themeAttribute(preference: Theme): "light" | "dark" | null {
  return preference === "auto" ? null : preference;
}

export function readStoredTheme(storage: Pick<Storage, "getItem">): Theme {
  try {
    const raw = storage.getItem(THEME_KEY);
    return isTheme(raw) ? raw : "auto";
  } catch {
    return "auto";
  }
}

export function writeStoredTheme(storage: Pick<Storage, "setItem">, preference: Theme): void {
  try {
    storage.setItem(THEME_KEY, preference);
  } catch {
    /* Storage unavailable (private mode / disabled): the theme still applies
       for this page view, it just will not persist. */
  }
}
