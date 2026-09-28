import { describe, expect, it } from "vitest";
import { EN_RULES, ES_RULES, transcribe, transcribeEN, transcribeES } from "./phonetics";

/**
 * These tests document what the transcriber actually does, including where it
 * is approximate. The module is advertised as didactic, so a test asserting a
 * perfect transcription would be dishonest; the tests instead pin the
 * behaviour so a change to the rule tables is visible in review.
 */

describe("transcribeES", () => {
  it("returns an empty string for empty input", () => {
    expect(transcribeES("")).toBe("");
    expect(transcribeES("   ")).toBe("");
  });

  it("wraps the result in slashes", () => {
    expect(transcribeES("casa")).toMatch(/^\/.*\/$/);
  });

  it("applies the ce/ci rule", () => {
    expect(transcribeES("cine")).toBe("/θine/");
    expect(transcribeES("cena")).toBe("/θena/");
  });

  it("applies the ca/co/cu rule", () => {
    expect(transcribeES("casa")).toBe("/kasa/");
    expect(transcribeES("copa")).toBe("/kopa/");
  });

  it("transcribes the digraphs ch, ll and the ñ", () => {
    expect(transcribeES("chico")).toContain("tʃ");
    expect(transcribeES("llave")).toContain("ʎ");
    expect(transcribeES("niño")).toContain("ɲ");
  });

  it("gives ge/gi the jota value", () => {
    expect(transcribeES("gente")).toBe("/xente/");
    // Single intervocalic r is a tap, so gira is /xiɾa/.
    expect(transcribeES("gira")).toBe("/xiɾa/");
  });

  it("keeps a hard g before a back vowel", () => {
    expect(transcribeES("gato")).toBe("/ɡato/");
  });

  it("treats qu as k", () => {
    expect(transcribeES("queso")).toBe("/keso/");
  });

  it("drops the silent h", () => {
    expect(transcribeES("hola")).toBe("/ola/");
  });

  it("renders hue as w", () => {
    expect(transcribeES("huevo")).toContain("w");
  });

  it("uses a trill for the rr digraph", () => {
    expect(transcribeES("perro")).toBe("/pero/");
    expect(transcribeES("carro")).toBe("/karo/");
  });

  it("uses a trill for word-initial r and a tap elsewhere", () => {
    expect(transcribeES("rana")).toBe("/rana/");
    expect(transcribeES("pera")).toBe("/peɾa/");
  });

  it("uses a trill for r after n or l", () => {
    expect(transcribeES("enredo")).toContain("r");
    expect(transcribeES("alrededor")).toContain("r");
  });

  it("distinguishes the trill from the tap", () => {
    // "perro" (trill) and "pero" (tap) must not collide.
    expect(transcribeES("perro")).not.toBe(transcribeES("pero"));
    expect(transcribeES("pero")).toBe("/peɾo/");
  });

  it("maps z to theta under distinción", () => {
    expect(transcribeES("zapato")).toContain("θ");
  });

  it("strips punctuation before transcribing", () => {
    expect(transcribeES("casa.")).toBe(transcribeES("casa"));
    expect(transcribeES("¿casa?")).toBe(transcribeES("casa"));
  });

  it("is case insensitive", () => {
    expect(transcribeES("CASA")).toBe(transcribeES("casa"));
  });

  it("leaves no stray private-use markers in the output", () => {
    for (const word of ["perro", "rana", "enredo", "carro", "alrededor"]) {
      const out = transcribeES(word);
      expect(out, word).not.toMatch(/[\uE000\uE001]/);
    }
  });

  it("merges b and v, because Spanish has no /v/", () => {
    expect(transcribeES("vaca")).toBe("/baka/");
    expect(transcribeES("vino")).toBe("/bino/");
    expect(transcribeES("llave")).toBe("/ʎabe/");
  });

  it("does not leak characters outside the Spanish inventory", () => {
    for (const word of ["casa", "gente", "llave", "perro", "zapato", "huevo", "vino"]) {
      const out = transcribeES(word);
      // No /v/ and no /d/ (Spanish d is a stop or approximant, never this).
      expect(out, word).not.toMatch(/[vd]/);
    }
  });
});

describe("transcribeEN", () => {
  it("returns an empty string for empty input", () => {
    expect(transcribeEN("")).toBe("");
  });

  it("transcribes the th digraph", () => {
    expect(transcribeEN("think")).toContain("θ");
  });

  it("gives a soft c before e and i", () => {
    expect(transcribeEN("city")).toMatch(/^\/s/);
  });

  it("gives a hard c elsewhere", () => {
    expect(transcribeEN("cat")).toMatch(/^\/k/);
  });

  it("uses the near-open front vowel for a in a closed syllable", () => {
    // Without the closed-syllable rule this came out as /kat/.
    expect(transcribeEN("cat")).toBe("/kæt/");
    expect(transcribeEN("man")).toBe("/mæn/");
    expect(transcribeEN("hand")).toContain("æ");
  });

  it("silences a final e", () => {
    expect(transcribeEN("make")).not.toMatch(/e\/$/);
  });

  it("handles the ng ending", () => {
    // NOTE: short <i> is not modelled, so this is /siŋ/ rather than /sɪŋ/.
    // Pinned deliberately: see the limitations block below.
    expect(transcribeEN("sing")).toBe("/siŋ/");
  });

  it("keeps the ng + g split inside a word", () => {
    expect(transcribeEN("finger")).toContain("ŋɡ");
  });

  it("transcribes a silent initial k and w", () => {
    expect(transcribeEN("know")).toMatch(/^\/n/);
    expect(transcribeEN("write")).toMatch(/^\/ɹ/);
  });

  it("produces a long vowel for ee and oo", () => {
    expect(transcribeEN("see")).toContain("iː");
    expect(transcribeEN("food")).toContain("uː");
  });

  it("is case insensitive", () => {
    expect(transcribeEN("CITY")).toBe(transcribeEN("city"));
  });

  it("wraps the result in slashes", () => {
    expect(transcribeEN("think")).toMatch(/^\/.*\/$/);
  });
});

describe("transcribe", () => {
  it("defaults to Spanish", () => {
    expect(transcribe("casa")).toBe(transcribeES("casa"));
  });

  it("honours the language argument", () => {
    expect(transcribe("cat", "en")).toBe(transcribeEN("cat"));
  });

  it("transcribes each word separately", () => {
    const out = transcribe("la casa", "es");
    expect(out.split(" ")).toHaveLength(2);
    expect(out).toBe(`${transcribeES("la")} ${transcribeES("casa")}`);
  });

  it("collapses runs of whitespace", () => {
    expect(transcribe("  la    casa  ", "es")).toBe(transcribe("la casa", "es"));
  });

  it("handles an empty string", () => {
    expect(transcribe("", "es")).toBe("");
    expect(transcribe("", "en")).toBe("");
  });

  it("survives input with no letters at all", () => {
    expect(() => transcribe("123 !!!", "es")).not.toThrow();
    expect(() => transcribe("123 !!!", "en")).not.toThrow();
  });

  it("never lets a rule span a word boundary", () => {
    // "l l" must not become the palatal lateral, which needs the "ll" digraph.
    expect(transcribe("l l", "es")).toBe("/l/ /l/");
  });
});

describe("rule tables", () => {
  it("keeps every rule anchored to a global pattern", () => {
    // A non-global rule would only ever replace the first match per word.
    for (const [pattern] of [...ES_RULES, ...EN_RULES]) {
      expect(pattern.flags, pattern.source).toContain("g");
    }
  });

  it("has no duplicate patterns, which would mean a dead rule", () => {
    for (const [name, rules] of [
      ["es", ES_RULES],
      ["en", EN_RULES],
    ] as const) {
      const seen = rules.map(([p]) => p.source);
      expect(new Set(seen).size, `${name} has a duplicate rule`).toBe(seen.length);
    }
  });

  it("produces the same result regardless of call order", () => {
    // Guards against shared /g/ state leaking between calls.
    const first = transcribeES("perro");
    transcribeES("carro");
    transcribeES("rana");
    expect(transcribeES("perro")).toBe(first);
  });
});

/**
 * Known limitations, pinned on purpose.
 *
 * The transcriber is advertised as a didactic approximation. Recording the
 * cases it gets wrong means the UI copy can be honest about them, and a
 * future improvement shows up here as a deliberate change rather than a
 * silent behaviour shift.
 */
describe("documented limitations", () => {
  it("does not model English vowel tenseness (short i)", () => {
    // /sɪŋ/ is correct; the table has no short-i rule.
    expect(transcribeEN("sing")).toBe("/siŋ/");
    expect(transcribeEN("sit")).toBe("/sit/");
  });

  it("does not model English magic-e lengthening", () => {
    // /laɪk/ is correct; this yields the vowel unchanged.
    expect(transcribeEN("like")).not.toBe("/laɪk/");
  });

  it("does not resolve English vowel reduction to schwa everywhere", () => {
    // Only <a> before a vowel reduces; other unstressed vowels do not.
    expect(transcribeEN("sofa")).toBe("/sofa/");
  });

  it("keeps Spanish d as a stop, without the approximant allophone", () => {
    // [ð] in "nada" is an allophone the rule table does not produce.
    expect(transcribeES("nada")).toBe("/nada/");
  });

  it("assumes distinción and does not model seseo", () => {
    expect(transcribeES("casa")).toBe("/kasa/");
    expect(transcribeES("zapato")).toContain("θ");
  });

  it("does not insert Spanish stress marks", () => {
    expect(transcribeES("casa")).not.toContain("ˈ");
    expect(transcribeES("corazón")).not.toContain("ˈ");
  });
});
