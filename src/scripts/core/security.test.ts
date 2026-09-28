import { describe, expect, it } from "vitest";
import { evaluate, score, type Probe } from "./security";

/** A probe representing a clean, fully-configured production page. */
function cleanProbe(overrides: Partial<Probe> = {}): Probe {
  return {
    protocol: "https:",
    hostname: "lingualab.pages.dev",
    hasCspMeta: true,
    externalScriptCount: 0,
    externalScriptWithIntegrity: 0,
    externalStyleCount: 0,
    externalStyleWithIntegrity: 0,
    thirdPartyScriptCount: 0,
    cookieLength: 0,
    localStorageKeyCount: 2,
    unsafeAttributeCount: 0,
    ...overrides,
  };
}

const byId = (probe: Probe, id: string) => {
  const result = evaluate(probe).find((c) => c.id === id);
  if (!result) throw new Error(`check ${id} missing`);
  return result;
};

describe("evaluate", () => {
  it("returns all eight checks, in the declared order", () => {
    expect(evaluate(cleanProbe()).map((c) => c.id)).toEqual([
      "https",
      "csp",
      "sri",
      "thirdparty",
      "cookies",
      "storage",
      "xss",
      "sandbox",
    ]);
  });

  it("passes everything on a clean page", () => {
    expect(evaluate(cleanProbe()).every((c) => c.ok)).toBe(true);
  });
});

describe("https check", () => {
  it("passes over https", () => {
    expect(byId(cleanProbe(), "https").ok).toBe(true);
  });

  it("passes on localhost over plain http", () => {
    expect(byId(cleanProbe({ protocol: "http:", hostname: "localhost" }), "https").ok).toBe(true);
    expect(byId(cleanProbe({ protocol: "http:", hostname: "127.0.0.1" }), "https").ok).toBe(true);
  });

  it("passes over file:// so the docs can claim it works without a server", () => {
    expect(byId(cleanProbe({ protocol: "file:", hostname: "" }), "https").ok).toBe(true);
  });

  it("fails over plain http on a real host", () => {
    const check = byId(cleanProbe({ protocol: "http:", hostname: "example.com" }), "https");
    expect(check.ok).toBe(false);
    expect(check.detailValues?.["protocol"]).toBe("http:");
  });
});

describe("csp check", () => {
  it("fails when no CSP meta is present", () => {
    expect(byId(cleanProbe({ hasCspMeta: false }), "csp").ok).toBe(false);
  });
});

describe("sri check", () => {
  it("passes when there are no external dependencies at all", () => {
    const check = byId(cleanProbe(), "sri");
    expect(check.ok).toBe(true);
    expect(check.detailValues).toEqual({ withSri: 0, total: 0 });
  });

  it("passes when every external dependency carries integrity", () => {
    const probe = cleanProbe({
      externalScriptCount: 1,
      externalScriptWithIntegrity: 1,
      externalStyleCount: 1,
      externalStyleWithIntegrity: 1,
    });
    expect(byId(probe, "sri").ok).toBe(true);
  });

  it("fails when even one external dependency lacks integrity", () => {
    const probe = cleanProbe({
      externalScriptCount: 1,
      externalScriptWithIntegrity: 1,
      externalStyleCount: 1,
      externalStyleWithIntegrity: 0,
    });
    expect(byId(probe, "sri").ok).toBe(false);
  });
});

describe("third-party tracker check", () => {
  it("fails and reports the count when a tracker is found", () => {
    const check = byId(cleanProbe({ thirdPartyScriptCount: 2 }), "thirdparty");
    expect(check.ok).toBe(false);
    expect(check.detailValues?.["count"]).toBe(2);
  });
});

describe("cookies check", () => {
  it("fails when any cookie is set", () => {
    expect(byId(cleanProbe({ cookieLength: 12 }), "cookies").ok).toBe(false);
  });
});

describe("storage check", () => {
  it("passes and reports the key count when storage works", () => {
    const check = byId(cleanProbe({ localStorageKeyCount: 3 }), "storage");
    expect(check.ok).toBe(true);
    expect(check.detailValues?.["count"]).toBe(3);
  });

  it("passes when storage is unavailable, without reporting a fake count", () => {
    const check = byId(cleanProbe({ localStorageKeyCount: -1 }), "storage");
    expect(check.ok).toBe(true);
    expect(check.detailValues?.["count"]).toBe(0);
    expect(check.detailKey).toBe("check.detail.storageUnavailable");
  });
});

describe("xss check", () => {
  it("fails when inline handlers are present", () => {
    const check = byId(cleanProbe({ unsafeAttributeCount: 1 }), "xss");
    expect(check.ok).toBe(false);
    expect(check.detailValues?.["count"]).toBe(1);
  });
});

describe("score", () => {
  it("counts only the passing checks", () => {
    const result = score(cleanProbe({ hasCspMeta: false, cookieLength: 4 }));
    expect(result.total).toBe(8);
    expect(result.passed).toBe(6);
  });

  it("reports 8/8 for a clean page", () => {
    expect(score(cleanProbe())).toMatchObject({ passed: 8, total: 8 });
  });
});

describe("every check has a detail message key", () => {
  it("returns a known key for each result, so the UI can localise it", () => {
    const known = new Set([
      "check.detail.protocol",
      "check.detail.cspOn",
      "check.detail.cspOff",
      "check.detail.sri",
      "check.detail.noTrackers",
      "check.detail.trackers",
      "check.detail.noCookies",
      "check.detail.cookies",
      "check.detail.storage",
      "check.detail.storageUnavailable",
      "check.detail.noUnsafe",
      "check.detail.unsafe",
      "check.detail.local",
    ]);

    for (const c of evaluate(cleanProbe({ cookieLength: 1, hasCspMeta: false }))) {
      expect(known.has(c.detailKey), c.detailKey).toBe(true);
    }
  });
});
