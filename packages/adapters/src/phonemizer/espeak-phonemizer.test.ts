/**
 * Contract of `PhonemizerPort` against the real adapter.
 *
 * Node has no `Worker`, so what this run can honestly prove is the adapter's
 * unavailable path: typed errors instead of exceptions, and a language check
 * that happens before the engine is ever reached. The path that actually
 * phonemizes needs a browser and is covered by the e2e suite — claiming it here
 * would be a green light that means nothing.
 */
import { isErr } from "@lingualab/core";
import { runPhonemizerPortContract } from "@lingualab/core/testing";
import { describe, expect, it } from "vitest";

import { createEspeakPhonemizer } from "./espeak-phonemizer";

runPhonemizerPortContract(() => createEspeakPhonemizer());

describe("espeak phonemizer outside a browser", () => {
  it("reports a typed engine-unavailable error instead of throwing", async () => {
    const phonemizer = createEspeakPhonemizer();
    const result = await phonemizer.phonemize("hola", "spa");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe("engine-unavailable");

    phonemizer.dispose();
  });

  it("rejects a language this build does not ship before reaching the engine", async () => {
    const phonemizer = createEspeakPhonemizer();
    const result = await phonemizer.phonemize("hola", "fra");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unsupported-language");
      if (result.error.code === "unsupported-language") {
        expect(result.error.languageCode).toBe("fra");
      }
    }

    phonemizer.dispose();
  });

  it("lists exactly the languages it maps and admits no others", () => {
    const phonemizer = createEspeakPhonemizer();

    expect(phonemizer.listLanguages()).toEqual(["spa", "eng"]);

    phonemizer.dispose();
  });

  it("is not available before the module has actually loaded", () => {
    const phonemizer = createEspeakPhonemizer();

    expect(phonemizer.isAvailable()).toBe(false);

    phonemizer.dispose();
  });

  it("refuses every request after dispose, with a typed error", async () => {
    const phonemizer = createEspeakPhonemizer();
    phonemizer.dispose();

    const result = await phonemizer.phonemize("hola", "spa");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe("engine-unavailable");
  });
});
