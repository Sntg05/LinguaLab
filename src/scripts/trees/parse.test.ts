import { describe, expect, it } from "vitest";
import {
  ParseError,
  guessPOS,
  parseBrackets,
  parseDependency,
  parseOutline,
  sentenceToTree,
  type TreeNode,
} from "./parse";

/** Depth-first labels, for compact structural assertions. */
function labels(node: TreeNode): string[] {
  return [node.label, ...node.children.flatMap(labels)];
}

function depth(node: TreeNode): number {
  return node.children.length === 0 ? 1 : 1 + Math.max(...node.children.map(depth));
}

describe("ParseError", () => {
  it("carries a position and formats it into the message", () => {
    const error = new ParseError("boom", 3, 7);
    expect(error.line).toBe(3);
    expect(error.col).toBe(7);
    expect(error.userMessage).toBe("boom (línea 3, columna 7)");
    expect(error).toBeInstanceOf(Error);
  });

  it("defaults to the first position", () => {
    expect(new ParseError("x").userMessage).toBe("x (línea 1, columna 1)");
  });
});

describe("parseBrackets — square brackets", () => {
  it("parses a simple labelled tree", () => {
    const tree = parseBrackets("[S [NP [Det el] [N gato]]]");
    expect(tree.label).toBe("S");
    expect(labels(tree)).toEqual(["S", "NP", "Det", "el", "N", "gato"]);
  });

  it("keeps a bracket with one word as a node with a leaf child", () => {
    // This is what makes `[Det el]` render as a labelled node over its word
    // rather than collapsing the label away.
    const tree = parseBrackets("[N gato]");
    expect(tree.isLeaf).toBe(false);
    expect(tree.label).toBe("N");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]!.label).toBe("gato");
    expect(tree.children[0]!.isLeaf).toBe(true);
  });

  it("collapses a truly empty bracket to a leaf", () => {
    expect(parseBrackets("[S]").isLeaf).toBe(true);
  });

  it("reads loose text up to the next bracket as a single leaf", () => {
    // Text is not split on whitespace: `[S el gato]` is one phrase-like leaf.
    const tree = parseBrackets("[S el gato]");
    expect(labels(tree)).toEqual(["S", "el gato"]);
  });

  it("reads nesting depth correctly", () => {
    // A > B > C > x
    expect(depth(parseBrackets("[A [B [C x]]]"))).toBe(4);
  });

  it("reports a missing closing bracket with its position", () => {
    try {
      parseBrackets("[S [NP el]");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      expect((error as ParseError).message).toMatch(/Falta \]/);
    }
  });

  it("reports a missing label", () => {
    expect(() => parseBrackets("[  ]")).toThrow(ParseError);
  });

  it("rejects trailing text after the tree", () => {
    expect(() => parseBrackets("[S el] oops")).toThrow(/sobrante/);
  });

  it("rejects empty input", () => {
    expect(() => parseBrackets("")).toThrow(/vacía/);
    expect(() => parseBrackets("   ")).toThrow(/vacía/);
  });

  it("tracks line numbers across newlines", () => {
    const tree = parseBrackets("[S\n  [NP\n    [N gato]]]");
    const n = tree.children[0]!.children[0]!;
    expect(n.line).toBe(3);
  });

  it("converts interior underscores in leaves to spaces", () => {
    // Penn Treebank convention for multi-word leaves.
    expect(parseBrackets("[NP New_York]").children[0]!.label).toBe("New York");
  });

  it("keeps a trailing underscore as an index marker", () => {
    // `_i` is the documented index notation, so it must survive parsing for
    // the renderer to draw it as a subscript.
    expect(parseBrackets("[DP el_i]").children[0]!.label).toBe("el_i");
  });

  it("treats a long trailing run as a word separator, not an index", () => {
    // `_city` is four characters, so it is a word separator like the rest.
    expect(parseBrackets("[NP New_York_city]").children[0]!.label).toBe("New York city");
  });

  it("keeps a braced index marker", () => {
    expect(parseBrackets("[DP el_{1,2}]").children[0]!.label).toBe("el_{1,2}");
  });
});

describe("parseBrackets — Penn round brackets", () => {
  it("detects round brackets automatically", () => {
    const tree = parseBrackets("(S (NP (DT el) (NN gato)) (VP (VB duerme)))");
    expect(labels(tree)).toEqual(["S", "NP", "DT", "el", "NN", "gato", "VP", "VB", "duerme"]);
  });

  it("parses a deeply nested Penn tree", () => {
    const tree = parseBrackets("(S (NP (DET the) (N cat)) (VP (V sleeps) (PP (P on) (NP (N mat)))))");
    // S > VP > PP > NP > N > mat
    expect(depth(tree)).toBe(6);
  });

  it("keeps a one-word Penn node as a node", () => {
    const tree = parseBrackets("(NN cat)");
    expect(tree.label).toBe("NN");
    expect(tree.children[0]!.label).toBe("cat");
  });

  it("reports a mismatched bracket instead of hanging", () => {
    // `[` present selects bracket mode, so the stray `)` is a syntax error.
    // The original implementation looped forever here: the loose-text reader
    // stopped on the bracket without consuming it, so nothing advanced.
    expect(() => parseBrackets("[S (x)]")).toThrow(/Carácter inesperado/);
    expect(() => parseBrackets("[S el) ]")).toThrow(ParseError);
  });

  it("does not hang on a stray opening bracket of the other notation", () => {
    expect(() => parseBrackets("[S [NP el] (x) ]")).toThrow(ParseError);
  });
});

describe("parseDependency — compact form", () => {
  const SIMPLE = ["1 El 2 det DET", "2 gato 3 nsubj NN", "3 duerme 0 root VB"].join("\n");

  it("builds a tree from id/word/head/rel/pos", () => {
    const tree = parseDependency(SIMPLE);
    expect(tree.label).toBe("duerme");
    expect(tree.isLeaf).toBe(false);
    // Only `gato` attaches to the root; `El` attaches to `gato`.
    expect(tree.children.map((c) => c.label)).toEqual(["gato"]);
    expect(tree.children[0]!.children.map((c) => c.label)).toEqual(["El"]);
  });

  it("records the dependency metadata", () => {
    const tree = parseDependency(SIMPLE);
    expect(tree.depMeta?.nodes).toHaveLength(3);
    expect(tree.depMeta?.roots).toHaveLength(1);
    expect(Object.keys(tree.depMeta?.byId ?? {})).toHaveLength(3);
  });

  it("keeps word, pos, head and relation on each node", () => {
    const tree = parseDependency(SIMPLE);
    const gato = tree.depMeta?.byId[2];
    expect(gato?.word).toBe("gato");
    expect(gato?.pos).toBe("NN");
    expect(gato?.head).toBe(3);
    expect(gato?.rel).toBe("nsubj");
  });

  it("accepts the 4-column form and defaults pos", () => {
    const tree = parseDependency("1 el 2 det\n2 gato 0 root");
    expect(tree.depMeta?.byId[1]?.pos).toBe("_");
  });

  it("skips comments and blank lines", () => {
    const tree = parseDependency(`# sent_id = 1\n\n${SIMPLE}\n`);
    expect(tree.depMeta?.nodes).toHaveLength(3);
  });
});

describe("parseDependency — CoNLL-U", () => {
  const CONLLU = [
    "# sent_id = 1",
    "1\tEl\tdet\tDET\t_\t_\t2\tdet\t_\t_",
    "2\tgato\tnoun\tNOUN\t_\t_\t3\tnsubj\t_\t_",
    "3\tduerme\tverb\tVERB\t_\t_\t0\troot\t_\t_",
  ].join("\n");

  it("reads the 10-column form", () => {
    const tree = parseDependency(CONLLU);
    expect(tree.depMeta?.byId[1]?.pos).toBe("DET");
    expect(tree.depMeta?.byId[2]?.rel).toBe("nsubj");
    expect(tree.label).toBe("duerme");
  });

  it("skips multiword tokens and empty nodes", () => {
    const withExtras = [
      "1-2\tvámonos\t_\t_\t_\t_\t_\t_\t_\t_",
      "1\tvamos\tverb\tVERB\t_\t_\t0\troot\t_\t_",
      "2\tnos\tpron\tPRON\t_\t_\t1\tobj\t_\t_",
      "2.1\t_\t_\t_\t_\t_\t_\t_\t_\t_",
    ].join("\n");
    const tree = parseDependency(withExtras);
    expect(tree.depMeta?.nodes).toHaveLength(2);
  });

  it("rejects a missing head", () => {
    expect(() => parseDependency("1 el 9 det DET")).toThrow(/no existe/);
  });

  it("rejects a duplicate id", () => {
    expect(() => parseDependency("1 el 0 root DET\n1 la 0 root DET")).toThrow(/duplicado/);
  });

  it("rejects a non-numeric id", () => {
    expect(() => parseDependency("x el 0 root DET")).toThrow(/entero/);
  });

  it("rejects a non-numeric head", () => {
    expect(() => parseDependency("1 el abc root DET")).toThrow(/Cabeza no válida/);
  });

  it("rejects input with no analysis lines", () => {
    expect(() => parseDependency("# only a comment")).toThrow(/No se encontraron/);
  });

  it("rejects a tree with no root", () => {
    expect(() => parseDependency("1 el 2 det DET\n2 gato 1 nsubj NN")).toThrow(/raíz/);
  });

  it("invents a synthetic ROOT when there are several roots", () => {
    const tree = parseDependency("1 a 0 root X\n2 b 0 root Y");
    expect(tree.label).toBe("ROOT");
    expect(tree.synthetic).toBe(true);
    expect(tree.children).toHaveLength(2);
  });

  it("rejects too few columns", () => {
    expect(() => parseDependency("1 el")).toThrow(/4 o 5 columnas/);
  });
});

describe("parseOutline", () => {
  const OUTLINE = ["proyecto", "  src", "    main.py", "  docs"].join("\n");

  it("builds a hierarchy from indentation", () => {
    const tree = parseOutline(OUTLINE);
    expect(tree.label).toBe("proyecto");
    expect(tree.children.map((c) => c.label)).toEqual(["src", "docs"]);
    expect(tree.children[0]!.children.map((c) => c.label)).toEqual(["main.py"]);
  });

  it("treats tabs as four spaces", () => {
    expect(parseOutline("a\n\tb").children[0]!.label).toBe("b");
  });

  it("strips bullets", () => {
    expect(parseOutline("- a").label).toBe("a");
    expect(parseOutline("* a").label).toBe("a");
    expect(parseOutline("• a").label).toBe("a");
    // Two top-level bullets is a forest, not a parent and child.
    expect(parseOutline("- a\n- b").forest).toBe(true);
  });

  it("reads hierarchy from pasted tree output", () => {
    // `tree` puts the hierarchy in box-drawing groups, not in leading spaces.
    const tree = parseOutline("a\n├── b\n└── c");
    expect(tree.label).toBe("a");
    expect(tree.children.map((c) => c.label)).toEqual(["b", "c"]);
  });

  it("reads several levels of tree output", () => {
    const tree = parseOutline("a\n├── b\n│   └── d\n└── c");
    expect(tree.children.map((c) => c.label)).toEqual(["b", "c"]);
    expect(tree.children[0]!.children.map((c) => c.label)).toEqual(["d"]);
  });

  it("still reads plain indentation, not just box characters", () => {
    const tree = parseOutline("a\n    b\n        c");
    expect(tree.children[0]!.label).toBe("b");
    expect(tree.children[0]!.children[0]!.label).toBe("c");
  });

  it("captures a note after a pipe separator", () => {
    const tree = parseOutline("raiz  |  una nota");
    expect(tree.label).toBe("raiz");
    expect(tree.sub).toBe("una nota");
  });

  it("invents a forest root for several top-level items", () => {
    const tree = parseOutline("a\nb");
    expect(tree.forest).toBe(true);
    expect(tree.children.map((c) => c.label)).toEqual(["a", "b"]);
  });

  it("returns a single root when there is one top-level item", () => {
    const tree = parseOutline("a\n  b");
    expect(tree.label).toBe("a");
    expect(tree.forest).toBeUndefined();
  });

  it("ignores blank lines", () => {
    expect(parseOutline("a\n\n  b\n\n").children).toHaveLength(1);
  });

  it("rejects empty input", () => {
    expect(() => parseOutline("")).toThrow(/vacía/);
    expect(() => parseOutline("   \n  \n")).toThrow(/vacía/);
  });

  it("leaves no temporary fields on the tree", () => {
    const tree = parseOutline(OUTLINE);
    expect(JSON.stringify(tree)).not.toContain("_next");
  });

  it("handles a deep single chain", () => {
    const tree = parseOutline("a\n b\n  c\n   d");
    expect(depth(tree)).toBe(4);
  });
});

describe("guessPOS", () => {
  it("recognises closed-class words", () => {
    expect(guessPOS("el")).toBe("det");
    expect(guessPOS("the")).toBe("det");
    expect(guessPOS("de")).toBe("prep");
    expect(guessPOS("y")).toBe("conj");
    expect(guessPOS("muy")).toBe("adv");
  });

  it("recognises common nouns and verbs", () => {
    expect(guessPOS("gato")).toBe("n");
    expect(guessPOS("salta")).toBe("v");
  });

  it("strips punctuation before matching", () => {
    expect(guessPOS("gato.")).toBe("n");
    expect(guessPOS("¡gato!")).toBe("n");
  });

  it("is case insensitive", () => {
    expect(guessPOS("GATO")).toBe("n");
  });

  it("falls back to a vowel-initial verb guess", () => {
    expect(guessPOS("andar")).toBe("v");
  });

  it("falls back to determiner for very short words", () => {
    expect(guessPOS("xyz")).toBe("det");
  });

  it("falls back to noun otherwise", () => {
    expect(guessPOS("biblioteca")).toBe("n");
  });

  it("always returns a known tag", () => {
    const known = ["det", "n", "adj", "v", "prep", "conj", "adv"];
    for (const word of ["", "a", "xyz", "biblioteca", "andar", "¿?", "123"]) {
      expect(known, word).toContain(guessPOS(word));
    }
  });
});

describe("sentenceToTree", () => {
  it("produces an S root with a VP", () => {
    const tree = sentenceToTree("el gato duerme");
    expect(tree.label).toBe("S");
    expect(labels(tree)).toContain("VP");
  });

  it("groups determiner and noun into an NP", () => {
    const tree = sentenceToTree("el gato duerme");
    const np = tree.children.find((c) => c.label === "NP");
    expect(np?.children.map((c) => c.label)).toEqual(["el", "gato"]);
  });

  it("puts the verb inside the VP", () => {
    const tree = sentenceToTree("el gato duerme");
    const vp = tree.children.find((c) => c.label === "VP");
    expect(vp?.children[0]?.label).toBe("duerme");
  });

  it("builds a PP for a prepositional phrase", () => {
    const tree = sentenceToTree("el gato duerme en la casa");
    expect(labels(tree)).toContain("PP");
  });

  it("rejects an empty sentence", () => {
    expect(() => sentenceToTree("")).toThrow(/frase/);
    expect(() => sentenceToTree("   ")).toThrow(/frase/);
  });

  it("handles a single word without crashing", () => {
    expect(() => sentenceToTree("gato")).not.toThrow();
  });

  it("always produces a root labelled S", () => {
    for (const sentence of ["gato", "el gato", "el gato duerme", "y", "muy rápido"]) {
      expect(sentenceToTree(sentence).label, sentence).toBe("S");
    }
  });

  it("never produces an empty VP", () => {
    for (const sentence of ["gato", "el gato duerme", "y el perro come"]) {
      const vp = sentenceToTree(sentence).children.find((c) => c.label === "VP");
      expect(vp?.children.length, sentence).toBeGreaterThan(0);
    }
  });
});
