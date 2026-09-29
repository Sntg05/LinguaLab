/* ============================================================
   LinguaLab — theme toggle (DOM)
   ============================================================ */

import {
  nextTheme,
  readStoredTheme,
  resolveTheme,
  themeAttribute,
  writeStoredTheme,
  type Theme,
} from "./theme-storage";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const ICON_PATHS: Record<"light" | "dark", string> = {
  light: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  dark: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z",
};

/**
 * The label describes the action, not the current state, so it has to be
 * translated. The strings arrive as data attributes rendered by the masthead,
 * because this module runs in the browser where the build-time dictionaries
 * are gone. When they are missing the server-rendered label is left alone
 * rather than replaced with a hard-coded language.
 */
const LABEL_KEYS: Record<Theme, "themeLabelAuto" | "themeLabelLight" | "themeLabelDark"> = {
  auto: "themeLabelAuto",
  light: "themeLabelLight",
  dark: "themeLabelDark",
};

function paint(preference: Theme): void {
  const root = document.documentElement;
  const attribute = themeAttribute(preference);
  if (attribute) {
    root.dataset["theme"] = attribute;
  } else {
    delete root.dataset["theme"];
  }
}

function renderIcon(button: HTMLButtonElement, preference: Theme): void {
  const prefersDark = window.matchMedia(DARK_QUERY).matches;
  const effective = resolveTheme(preference, prefersDark);
  const icon = button.querySelector<SVGPathElement>("[data-theme-icon]");

  if (icon) {
    icon.setAttribute("d", ICON_PATHS[effective]);
  }

  // The label describes the action, not the current state.
  const next = nextTheme(preference);
  const label = button.dataset[LABEL_KEYS[next]];
  if (label) {
    button.setAttribute("aria-label", label);
  }
  button.dataset["themeState"] = preference;
}

export function initThemeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  if (!button) return;

  let preference = readStoredTheme(localStorage);

  renderIcon(button, preference);
  paint(preference);

  button.addEventListener("click", () => {
    preference = nextTheme(preference);
    writeStoredTheme(localStorage, preference);
    paint(preference);
    renderIcon(button, preference);
  });

  // While on "auto", follow the OS if it changes mid-session.
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", () => {
    if (preference === "auto") {
      paint(preference);
      renderIcon(button, preference);
    }
  });
}
