import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  htmlLang,
  hreflang,
  isLocale,
  localePath,
  t,
} from "./index";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects unsupported values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("localePath", () => {
  it("keeps the default locale at the root", () => {
    expect(localePath("es", "/")).toBe("/");
    expect(localePath("es", "/tools")).toBe("/tools");
  });

  it("prefixes non-default locales", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/tools")).toBe("/en/tools");
  });

  it("strips trailing slashes so links stay canonical", () => {
    expect(localePath("en", "/tools/")).toBe("/en/tools");
    expect(localePath("es", "/tools/")).toBe("/tools");
  });

  it("defaults to the home route", () => {
    expect(localePath("es")).toBe("/");
  });
});

describe("hreflang", () => {
  it("marks the default locale as x-default", () => {
    expect(hreflang(DEFAULT_LOCALE)).toBe("x-default");
    expect(hreflang("en")).toBe("en");
  });
});

describe("t", () => {
  it("returns a distinct string per locale", () => {
    expect(t("es", "nav.home")).toBe("Inicio");
    expect(t("en", "nav.home")).toBe("Home");
  });

  it("never returns an empty string for a known key", () => {
    for (const locale of LOCALES) {
      for (const key of ["nav.tools", "nav.ipa", "nav.trees", "skip"] as const) {
        expect(t(locale, key).length).toBeGreaterThan(0);
      }
    }
  });

  it("emits a BCP 47 tag for the html lang attribute", () => {
    expect(htmlLang("es")).toBe("es");
    expect(htmlLang("en")).toBe("en");
  });
});
