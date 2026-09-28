import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ANTI_FLASH_SOURCE } from "./anti-flash";
import { THEME_KEY } from "../scripts/core/theme-storage";

/**
 * The anti-flash script is inlined in every page's <head>, so the
 * Content-Security-Policy must carry its exact hash. The build derives that
 * hash from this same constant, so the two cannot drift — unless the emitted
 * markup stops matching the constant. These tests pin the invariants the CSP
 * depends on, and scripts/verify-build.mjs proves the built HTML agrees.
 */
describe("anti-flash source", () => {
  it("is a single self-invoking statement with no leading or trailing space", () => {
    expect(ANTI_FLASH_SOURCE).toBe(ANTI_FLASH_SOURCE.trim());
    expect(ANTI_FLASH_SOURCE.startsWith("(function()")).toBe(true);
    expect(ANTI_FLASH_SOURCE.endsWith("();")).toBe(true);
  });

  it("contains no newline, so the emitted hash matches the emitted bytes", () => {
    expect(ANTI_FLASH_SOURCE).not.toContain("\n");
  });

  it("only sets an attribute, never parses markup", () => {
    expect(ANTI_FLASH_SOURCE).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
  });

  it("reads the documented storage key", () => {
    expect(ANTI_FLASH_SOURCE).toContain(JSON.stringify(THEME_KEY));
  });

  it("wraps storage access in try/catch so private mode cannot break the page", () => {
    expect(ANTI_FLASH_SOURCE).toContain("try{");
    expect(ANTI_FLASH_SOURCE).toContain("}catch(");
  });

  it("applies only an explicit light/dark choice, never an arbitrary value", () => {
    // A stored value must not be able to inject anything via the dataset.
    expect(ANTI_FLASH_SOURCE).toContain('s==="light"||s==="dark"');
  });

  it("produces a stable hash, and a different one for a different body", () => {
    const hash = (s: string) => `sha256-${createHash("sha256").update(s).digest("base64")}`;
    expect(hash(ANTI_FLASH_SOURCE)).toBe(hash(ANTI_FLASH_SOURCE));
    // If these matched, the CSP would be toothless.
    expect(hash(`${ANTI_FLASH_SOURCE} `)).not.toBe(hash(ANTI_FLASH_SOURCE));
  });
});
