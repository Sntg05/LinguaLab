import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXT,
  MAX_TEXT_BYTES,
  byteLength,
  createRateLimiter,
  escapeHTML,
  extensionOf,
  validateFile,
  validateText,
  wipeLocalData,
  type FileLike,
} from "./guardrails";

const file = (name: string, size: number): FileLike => ({ name, size });

describe("extensionOf", () => {
  it("returns the lower-cased extension with its dot", () => {
    expect(extensionOf("notes.TXT")).toBe(".txt");
    expect(extensionOf("a/b/c.conllu")).toBe(".conllu");
  });

  it("returns an empty string when there is no extension", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf("trailing.")).toBe(".");
  });

  it("uses the last dot, not the first", () => {
    expect(extensionOf("my.notes.v2.json")).toBe(".json");
  });
});

describe("validateFile", () => {
  it("accepts every whitelisted extension", () => {
    for (const ext of ALLOWED_EXT) {
      expect(validateFile(file(`data${ext}`, 10)), ext).toEqual({ ok: true });
    }
  });

  it("is case insensitive on the extension", () => {
    expect(validateFile(file("DATA.JSON", 10))).toEqual({ ok: true });
  });

  it("rejects a missing file", () => {
    const result = validateFile(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("null");
  });

  it("rejects a disallowed extension and says which rule failed", () => {
    const result = validateFile(file("payload.exe", 10));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ext");
      expect(result.messageKey).toBe("guardrail.err.ext");
    }
  });

  it("rejects a file with no extension", () => {
    const result = validateFile(file("LICENSE", 10));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ext");
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateFile(file("a.txt", MAX_TEXT_BYTES))).toEqual({ ok: true });
  });

  it("rejects a file one byte over the limit", () => {
    const result = validateFile(file("a.txt", MAX_TEXT_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("size");
  });

  it("checks the extension before the size, so the message is the useful one", () => {
    const result = validateFile(file("payload.exe", MAX_TEXT_BYTES + 1));
    if (!result.ok) expect(result.reason).toBe("ext");
  });
});

describe("validateText", () => {
  it("accepts ordinary text", () => {
    expect(validateText("El gato saltó.")).toEqual({ ok: true });
  });

  it("accepts the empty string", () => {
    expect(validateText("")).toEqual({ ok: true });
  });

  it("rejects non-strings", () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      const result = validateText(value);
      expect(result.ok, String(value)).toBe(false);
      if (!result.ok) expect(result.reason).toBe("type");
    }
  });

  it("accepts text exactly at the byte limit", () => {
    expect(validateText("a".repeat(MAX_TEXT_BYTES))).toEqual({ ok: true });
  });

  it("rejects text one byte over the limit", () => {
    const result = validateText("a".repeat(MAX_TEXT_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("size");
  });

  it("measures bytes, not characters, so multi-byte text is not undercounted", () => {
    // "ñ" is 2 UTF-8 bytes: half the limit in characters must still be too big.
    const halfLimitInCharacters = Math.floor(MAX_TEXT_BYTES / 2);
    const text = "ñ".repeat(halfLimitInCharacters);
    expect(byteLength(text)).toBe(MAX_TEXT_BYTES);
    expect(validateText(text)).toEqual({ ok: true });
    expect(validateText("ñ".repeat(halfLimitInCharacters + 1)).ok).toBe(false);
  });

  it("counts emoji as 4 bytes rather than 2", () => {
    expect(byteLength("🙂")).toBe(4);
  });
});

describe("escapeHTML", () => {
  it("escapes every character that can break out of markup", () => {
    expect(escapeHTML('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("escapes the ampersand first, so entities are not double-decoded", () => {
    expect(escapeHTML("&lt;")).toBe("&amp;lt;");
  });

  it("escapes single quotes, which matter inside attribute values", () => {
    expect(escapeHTML("it's")).toBe("it&#39;s");
  });

  it("treats null and undefined as empty", () => {
    expect(escapeHTML(null)).toBe("");
    expect(escapeHTML(undefined)).toBe("");
  });

  it("neutralises an injected img onerror payload", () => {
    const escaped = escapeHTML('<img src=x onerror="alert(1)">');
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain('"');
  });
});

describe("createRateLimiter", () => {
  it("allows the first call for a key", () => {
    const limit = createRateLimiter(() => 1000);
    expect(limit("a")).toBe(true);
  });

  it("blocks an immediate second call for the same key", () => {
    const limit = createRateLimiter(() => 1000);
    limit("a");
    expect(limit("a")).toBe(false);
  });

  it("allows a different key immediately, so tools do not block each other", () => {
    const limit = createRateLimiter(() => 1000);
    expect(limit("a")).toBe(true);
    expect(limit("b")).toBe(true);
  });

  it("allows again once the interval has elapsed", () => {
    let now = 1000;
    const limit = createRateLimiter(() => now);
    expect(limit("a", 500)).toBe(true);
    now = 1400;
    expect(limit("a", 500)).toBe(false);
    now = 1500;
    expect(limit("a", 500)).toBe(true);
  });

  it("treats an empty key as the default slot", () => {
    const limit = createRateLimiter(() => 1000);
    expect(limit("")).toBe(true);
    expect(limit("")).toBe(false);
  });

  it("uses a 300 ms default interval", () => {
    let now = 0;
    const limit = createRateLimiter(() => now);
    limit("a");
    now = 299;
    expect(limit("a")).toBe(false);
    now = 300;
    expect(limit("a")).toBe(true);
  });
});

describe("wipeLocalData", () => {
  function fakeStorage() {
    const removed: string[] = [];
    return { removed, removeItem: (k: string) => void removed.push(k) };
  }

  it("removes exactly the keys this site owns", () => {
    const local = fakeStorage();
    const session = fakeStorage();
    expect(wipeLocalData(local, session)).toBe(true);
    expect(local.removed).toEqual(["lingualab-theme", "lingualab-lang"]);
    expect(session.removed).toEqual(["lingualab-theme", "lingualab-lang"]);
  });

  it("does not clear storage wholesale", () => {
    const removed: string[] = [];
    wipeLocalData({ removeItem: (k) => void removed.push(k) }, null);
    expect(removed).not.toContain("*");
    expect(removed).toHaveLength(2);
  });

  it("reports failure instead of throwing when storage denies access", () => {
    const hostile = {
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(wipeLocalData(hostile, null)).toBe(false);
  });

  it("tolerates absent storage", () => {
    expect(wipeLocalData(null, null)).toBe(true);
  });
});
