import { describe, expect, it } from "vitest";
import {
  isTheme,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  themeAttribute,
  writeStoredTheme,
  THEME_KEY,
  type Theme,
} from "./theme-storage";

/** Minimal in-memory Storage stand-in. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    map,
  };
}

describe("isTheme", () => {
  it("accepts the three supported preferences", () => {
    expect(isTheme("auto")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(1)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("defers to the OS for auto", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });

  it("lets an explicit choice override the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("cycles auto → light → dark → auto", () => {
    expect(nextTheme("auto")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("auto");
  });

  it("returns to the start after a full cycle", () => {
    let theme: Theme = "auto";
    const seen: Theme[] = [];
    for (let i = 0; i < 3; i += 1) {
      theme = nextTheme(theme);
      seen.push(theme);
    }
    expect(seen).toEqual(["light", "dark", "auto"]);
  });
});

describe("themeAttribute", () => {
  it("removes the attribute for auto so the media query governs", () => {
    expect(themeAttribute("auto")).toBeNull();
  });

  it("pins the attribute for an explicit choice", () => {
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });
});

describe("storage round-trip", () => {
  it("persists and reads back a preference", () => {
    const storage = fakeStorage();
    writeStoredTheme(storage, "dark");
    expect(storage.map.get(THEME_KEY)).toBe("dark");
    expect(readStoredTheme(storage)).toBe("dark");
  });

  it("falls back to auto when nothing is stored", () => {
    expect(readStoredTheme(fakeStorage())).toBe("auto");
  });

  it("falls back to auto when the stored value is corrupt", () => {
    expect(readStoredTheme(fakeStorage({ [THEME_KEY]: "neon" }))).toBe("auto");
  });

  it("survives storage that throws (private mode)", () => {
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(readStoredTheme(hostile)).toBe("auto");
    expect(() => writeStoredTheme(hostile, "dark")).not.toThrow();
  });
});
