/**
 * The adapter's only piece of logic that can be tested without a browser.
 *
 * Our language codes are ISO 639-3 (`spa`, `eng`), the codes the domain and the
 * in-memory fake already use. espeak-ng names voices with its own tags (`es`,
 * `en-us`). Getting this mapping wrong would silently produce a transcription
 * in the wrong language, so it is pinned here rather than buried in the worker.
 */
import { describe, expect, it } from "vitest";

import { isSupportedLanguage, supportedLanguages, toEspeakVoice } from "./espeak-voices";

describe("espeak voice mapping", () => {
  it("maps each ISO 639-3 code to the espeak-ng voice tag that was verified", () => {
    // `es-419` and not `es`: the Latin American voice with seseo, which is the
    // variant the rest of the site declares.
    expect(toEspeakVoice("spa")).toBe("es-419");
    expect(toEspeakVoice("eng")).toBe("en-us");
  });

  it("returns null for a language this build does not ship", () => {
    // The package ships 114 dictionaries; we publish two. A code outside that
    // pair must be reported as unsupported, never passed to espeak-ng.
    for (const code of ["fra", "deu", "por", "", "es", "en", "spa-MX"]) {
      expect(toEspeakVoice(code)).toBeNull();
    }
  });

  it("is case sensitive, because ISO 639-3 codes are lowercase", () => {
    expect(toEspeakVoice("SPA")).toBeNull();
    expect(isSupportedLanguage("SPA")).toBe(false);
    expect(isSupportedLanguage("spa")).toBe(true);
  });

  it("lists exactly the languages it admits, in a stable order", () => {
    expect(supportedLanguages()).toEqual(["spa", "eng"]);
    for (const code of supportedLanguages()) {
      expect(isSupportedLanguage(code)).toBe(true);
      expect(toEspeakVoice(code)).not.toBeNull();
    }
  });

  it("agrees with itself: every admitted code maps, every mapped code is admitted", () => {
    for (const code of ["spa", "eng", "fra", "xyz"]) {
      expect(isSupportedLanguage(code)).toBe(toEspeakVoice(code) !== null);
    }
  });
});
