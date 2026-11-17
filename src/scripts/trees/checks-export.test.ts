import { describe, expect, it } from "vitest";
import {
  allBinary,
  badProjections,
  checkDependency,
  checkMovement,
  crossingArcs,
  runChecks,
} from "./checks";
import { parseBrackets, parseDependency } from "./parse";
import { parseLabel, labelWidth, parseMovementDirectives } from "./render";
import { fromJSON, leavesOf, suggestName, toCoNLLU, toJSON, toNewick } from "./export";

/* ============================================================
   Label notation
   ============================================================ */

describe("parseLabel", () => {
  it("returns an empty shape for empty input", () => {
    const parsed = parseLabel("");
    expect(parsed.base).toBe("");
    expect(parsed.highlight).toBe(false);
  });

  it("extracts a subscript index", () => {
    expect(parseLabel("DP_i").sub).toBe("i");
    expect(parseLabel("DP_{1,2}").sub).toBe("1,2");
  });

  it("extracts a superscript", () => {
    expect(parseLabel("X^{max}").sup).toBe("max");
    expect(parseLabel("X^max").sup).toBe("max");
  });

  it("extracts features", () => {
    expect(parseLabel("T[uφ,EPP]").feats).toBe("uφ,EPP");
  });

  it("marks a boxed trace", () => {
    const parsed = parseLabel("{t_i}");
    expect(parsed.boxed).toBe(true);
    expect(parsed.sub).toBe("i");
    expect(parsed.base).toBe("t");
  });

  it("marks a struck-through copy", () => {
    const parsed = parseLabel("<copia>");
    expect(parsed.copy).toBe(true);
    expect(parsed.base).toBe("copia");
  });

  it("marks highlighting", () => {
    expect(parseLabel("NP!").highlight).toBe(true);
    expect(parseLabel("NP!").base).toBe("NP");
  });

  it("marks a triangle", () => {
    const parsed = parseLabel("DP^");
    expect(parsed.triangle).toBe(true);
    expect(parsed.base).toBe("DP");
  });

  it("keeps a superscript from being read as a triangle", () => {
    const parsed = parseLabel("X^{max}");
    expect(parsed.triangle).toBe(false);
    expect(parsed.sup).toBe("max");
  });

  it("extracts an arc label", () => {
    const parsed = parseLabel("NP@SUBJ");
    expect(parsed.arc).toBe("SUBJ");
    expect(parsed.base).toBe("NP");
  });

  it("extracts a note", () => {
    const parsed = parseLabel('NP::"una nota"');
    expect(parsed.note).toBe("una nota");
    expect(parsed.base).toBe("NP");
  });

  it("flags hidden nodes", () => {
    expect(parseLabel("ε").hidden).toBe(true);
    expect(parseLabel("∅").hidden).toBe(true);
    expect(parseLabel("NP").hidden).toBe(false);
  });

  it("keeps a plain label intact", () => {
    expect(parseLabel("gato").base).toBe("gato");
  });

  it("never returns an empty base for non-empty input", () => {
    for (const raw of ["NP!", "@X", "::n", "^", "<x>", "{t}"]) {
      expect(parseLabel(raw).base.length, raw).toBeGreaterThan(0);
    }
  });
});

describe("labelWidth", () => {
  it("has a floor", () => {
    expect(labelWidth(parseLabel("a"))).toBe(40);
  });

  it("grows with the label", () => {
    expect(labelWidth(parseLabel("constituyente"))).toBeGreaterThan(
      labelWidth(parseLabel("S")),
    );
  });

  it("accounts for features and affixes", () => {
    const plain = labelWidth(parseLabel("T"));
    expect(labelWidth(parseLabel("T[uφ,EPP]"))).toBeGreaterThan(plain);
    expect(labelWidth(parseLabel("X^{max}"))).toBeGreaterThan(plain);
    expect(labelWidth(parseLabel("X_i"))).toBeGreaterThan(plain);
  });

  it("is capped so one long label cannot blow up the drawing", () => {
    expect(labelWidth(parseLabel("a".repeat(500)))).toBeLessThanOrEqual(240);
  });
});

describe("parseMovementDirectives", () => {
  it("reads a move directive", () => {
    const arrows = parseMovementDirectives('move: wh -> tr "movimiento"');
    expect(arrows).toEqual([{ from: "wh", to: "tr", label: "movimiento" }]);
  });

  it("reads a directive without a label", () => {
    expect(parseMovementDirectives("move: a -> b")).toEqual([{ from: "a", to: "b" }]);
  });

  it("strips a leading hash", () => {
    expect(parseMovementDirectives("move: #wh -> #tr")[0]).toMatchObject({ from: "wh", to: "tr" });
  });

  it("reads several directives", () => {
    expect(parseMovementDirectives("move: a -> b\nmove: c -> d")).toHaveLength(2);
  });

  it("ignores text that is not a directive", () => {
    expect(parseMovementDirectives("[S [NP el]]")).toEqual([]);
  });
});

/* ============================================================
   Checks
   ============================================================ */

describe("dependency checks", () => {
  const valid = parseDependency("1 El 2 det DET\n2 gato 0 root NN");

  it("accepts a valid projective tree", () => {
    const results = checkDependency(valid, "es");
    expect(results.every((r) => r.level !== "error")).toBe(true);
    expect(results[0]!.message).toMatch(/válido/);
  });

  it("reports crossing arcs as a note, not an error", () => {
    // 1 -> 3 and 2 -> 4 cross.
    const tree = parseDependency("1 a 3 x X\n2 b 4 y Y\n3 c 0 root Z\n4 d 3 z Z");
    const notes = checkDependency(tree, "es").filter((r) => r.level === "note");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("detects a cycle", () => {
    // 1 -> 2 -> 1 is unreachable from a root, so the parser wraps them.
    const tree = parseDependency("1 a 2 x X\n2 b 1 y Y\n3 c 0 root Z");
    const errors = checkDependency(tree, "es").filter((r) => r.level === "error");
    expect(errors.some((e) => /Ciclo/.test(e.message))).toBe(true);
  });

  it("localises its messages", () => {
    expect(checkDependency(valid, "en")[0]!.message).toMatch(/Valid dependency tree/);
    expect(checkDependency(valid, "es")[0]!.message).toMatch(/válido/);
  });

  it("returns nothing for a tree with no dependency metadata", () => {
    expect(checkDependency(parseBrackets("[S el]"), "es")).toEqual([]);
  });
});

describe("crossingArcs", () => {
  it("finds no crossings in a projective tree", () => {
    const tree = parseDependency("1 a 2 x X\n2 b 0 root Y");
    expect(crossingArcs(tree.depMeta!.nodes)).toEqual([]);
  });

  it("labels a crossing with both words", () => {
    const tree = parseDependency("1 a 3 x X\n2 b 4 y Y\n3 c 0 root Z\n4 d 3 z Z");
    const crossings = crossingArcs(tree.depMeta!.nodes);
    expect(crossings.length).toBeGreaterThan(0);
    expect(crossings[0]).toContain("↔");
  });
});

describe("constituency checks", () => {
  it("accepts a fully binary tree", () => {
    const results = runChecks(parseBrackets("[S [NP el] [VP duerme]]"), { locale: "es" });
    expect(results[0]!.level).toBe("ok");
    expect(results[0]!.message).toMatch(/binaria/);
  });

  it("notes non-binary branching only under X-bar", () => {
    const tree = parseBrackets("[S [A a] [B b] [C c]]");
    const without = runChecks(tree, { locale: "es" });
    const withXbar = runChecks(tree, { locale: "es", xbar: true });
    expect(without.some((r) => /binarias/.test(r.message))).toBe(false);
    expect(withXbar.some((r) => /binarias/.test(r.message))).toBe(true);
  });

  it("always reports size", () => {
    const results = runChecks(parseBrackets("[S [NP el] [VP duerme]]"), { locale: "es" });
    expect(results.some((r) => /Nodos: 5/.test(r.message))).toBe(true);
  });

  it("localises the size line", () => {
    const results = runChecks(parseBrackets("[S el]"), { locale: "en" });
    expect(results.some((r) => /Nodes: 2/.test(r.message))).toBe(true);
  });
});

describe("allBinary", () => {
  it("accepts leaves and binary nodes", () => {
    expect(allBinary(parseBrackets("[A]"))).toBe(true);
    expect(allBinary(parseBrackets("[A [B b] [C c]]"))).toBe(true);
  });

  it("rejects a ternary node", () => {
    expect(allBinary(parseBrackets("[A [B b] [C c] [D d]]"))).toBe(false);
  });

  it("rejects a ternary node buried deep", () => {
    expect(allBinary(parseBrackets("[A [B [C c] [D d] [E e]] [F f]]"))).toBe(false);
  });
});

describe("badProjections", () => {
  it("accepts a projection containing its own category", () => {
    expect(badProjections(parseBrackets("[NP [N gato]]"))).toEqual([]);
  });

  it("flags a projection with no head of its category", () => {
    expect(badProjections(parseBrackets("[NP [V corre]]"))).toContain("NP");
  });

  it("does not match a category inside an unrelated label", () => {
    // The original searched JSON.stringify(subtree), so a word containing the
    // letters of the category could satisfy the check by accident.
    expect(badProjections(parseBrackets("[NP [N norte]]"))).toEqual([]);
    expect(badProjections(parseBrackets("[NP [X Viento]]"))).toContain("NP");
  });

  it("ignores nodes that are not projections", () => {
    expect(badProjections(parseBrackets("[S [X algo]]"))).toEqual([]);
  });
});

describe("movement checks", () => {
  const tree = parseBrackets("[CP [DP#wh quien] [C' [C c] [TP [DP#tr t] [T' [T t]]]]]");

  // La ayuda de la página dice «move: origen -> destino» y así escriben todos los
  // ejemplos: `from` es la huella, `to` el sitio de aterrizaje.
  it("reports c-command when the landing site c-commands the trace", () => {
    const results = checkMovement(tree, [{ from: "tr", to: "wh" }], "es");
    expect(results[0]?.level).toBe("ok");
  });

  it("climbs past non-branching nodes: c-command is defined by the first branching node", () => {
    // `which_road#wh` es una hoja bajo `Spec`, que no ramifica: quien manda-c es
    // el primer nodo que ramifica por encima (CP), y ese domina la huella.
    const unary = parseBrackets("[CP [Spec [DP who#wh]] [C' [C Ø] [TP [DP t#tr] [T' [T is]]]]]");
    expect(checkMovement(unary, [{ from: "tr", to: "wh" }], "es")[0]?.level).toBe("ok");
  });

  it("flags a movement written downwards, from the high position to the low one", () => {
    const results = checkMovement(tree, [{ from: "wh", to: "tr" }], "es");
    expect(results[0]?.level).toBe("note");
  });

  it("notes a missing pair", () => {
    const results = checkMovement(tree, [{ from: "nope", to: "wh" }], "es");
    expect(results[0]!.level).toBe("note");
    expect(results[0]!.message).toMatch(/No se encontró/);
  });

  it("includes the arrow label when given", () => {
    const results = checkMovement(tree, [{ from: "tr", to: "wh", label: "A-movimiento" }], "es");
    expect(results[0]!.message).toContain("A-movimiento");
  });

  it("returns nothing when there are no directives", () => {
    expect(checkMovement(tree, [], "es")).toEqual([]);
  });
});

/* ============================================================
   Export
   ============================================================ */

/** Lector mínimo de Newick (etiquetas sin comillas o entre comillas simples), solo para la prueba. */
interface NewickNode {
  readonly label: string;
  readonly children: readonly NewickNode[];
}

const readNewick = (text: string): NewickNode => {
  let i = 0;
  const label = (): string => {
    if (text[i] === "'") {
      let out = "";
      i += 1;
      for (;;) {
        if (i >= text.length) throw new Error("comilla sin cerrar");
        if (text[i] === "'" && text[i + 1] === "'") {
          out += "'";
          i += 2;
        } else if (text[i] === "'") {
          i += 1;
          return out;
        } else {
          out += text[i];
          i += 1;
        }
      }
    }
    let out = "";
    while (i < text.length && !"(),;".includes(text[i] ?? "")) {
      out += text[i];
      i += 1;
    }
    return out.replace(/_/g, " ");
  };
  const node = (): NewickNode => {
    const children: NewickNode[] = [];
    if (text[i] === "(") {
      i += 1;
      children.push(node());
      while (text[i] === ",") {
        i += 1;
        children.push(node());
      }
      if (text[i] !== ")") throw new Error(`se esperaba ) en ${i}`);
      i += 1;
    }
    return { label: label(), children };
  };
  const root = node();
  if (text.slice(i) !== ";") throw new Error(`sobra texto: ${text.slice(i)}`);
  return root;
};

const shape = (node: { readonly label: string; readonly children: readonly unknown[] }): NewickNode => ({
  label: node.label,
  children: node.children.map((child) => shape(child as NewickNode)),
});

describe("toNewick", () => {
  it("produces a single terminated statement", () => {
    const newick = toNewick(parseBrackets("[S [NP el] [VP duerme]]"));
    expect(newick.endsWith(";")).toBe(true);
    expect(newick.startsWith("(")).toBe(true);
  });

  it("uses underscores instead of spaces", () => {
    expect(toNewick(parseBrackets("[NP [N gato negro]]"))).toContain("gato_negro");
  });

  it("quotes a label with reserved characters instead of deleting them", () => {
    const newick = toNewick(parseBrackets("[NP [N x,y:z;w] [P .]]"));
    expect(newick).toContain("'x,y:z;w'");
    // Antes se borraban: «.» quedaba vacío y se escribía la etiqueta inventada «nodo».
    expect(newick).not.toContain("nodo");
  });

  it("doubles a quote inside a quoted label", () => {
    expect(toNewick(parseBrackets("[N' it's]"))).toBe("('it''s')'N''';");
  });

  it("reads back to the same tree", () => {
    for (const source of [
      "[S [NP [Det el] [N gato negro]] [VP duerme]]",
      "[CP [Spec qué] [C' [C Ø] [TP [DP t_i] [T' [T va] [VP comer]]]]]",
      "[N' [N x,y] [P .] [A it's]]",
    ]) {
      const tree = parseBrackets(source);
      expect(shape(readNewick(toNewick(tree)))).toEqual(shape(tree));
    }
  });

  it("emits a leaf for a single-node tree", () => {
    expect(toNewick(parseBrackets("[S]"))).toBe("S;");
  });
});

describe("toCoNLLU", () => {
  const dependency = parseDependency(
    "1 el 2 det DET\n2 gato 3 nsubj NOUN\n3 duerme 0 root VERB\n4 . 3 punct PUNCT",
  );
  const conllu = toCoNLLU(dependency) ?? "";
  const rows = conllu.split("\n").filter((line) => line && !line.startsWith("#"));

  it("only exists for dependency trees: a constituency tree has no heads to write", () => {
    expect(toCoNLLU(parseBrackets("[S [NP el gato] [VP duerme]]"))).toBeNull();
  });

  it("emits one token per word with ten tab-separated columns", () => {
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.split("\t")).toHaveLength(10);
  });

  it("writes sent_id and text, as the CoNLL-U format asks", () => {
    expect(conllu.startsWith("# sent_id = 1\n# text = el gato duerme .\n")).toBe(true);
  });

  it("keeps the heads and relations that were written, not invented ones", () => {
    expect(
      rows.map((row) => {
        const columns = row.split("\t");
        return [columns[0], columns[1], columns[6], columns[7]];
      }),
    ).toEqual([
      ["1", "el", "2", "det"],
      ["2", "gato", "3", "nsubj"],
      ["3", "duerme", "0", "root"],
      ["4", ".", "3", "punct"],
    ]);
  });

  it("puts a UD tag in UPOS and any other tag in XPOS", () => {
    expect(rows[1]?.split("\t")[3]).toBe("NOUN");
    const other = toCoNLLU(parseDependency("1 gato 0 root NC")) ?? "";
    const columns = other.split("\n").find((line) => line.startsWith("1\t"))?.split("\t") ?? [];
    expect(columns[3]).toBe("_");
    expect(columns[4]).toBe("NC");
  });

  it("ends the sentence with a blank line", () => {
    expect(conllu.endsWith("\n\n")).toBe(true);
  });
});

describe("JSON round-trip", () => {
  it("serialises and restores the structure", () => {
    const source = parseBrackets("[S [NP [Det el] [N gato]] [VP duerme]]");
    const restored = fromJSON(toJSON(source));
    expect(restored.label).toBe("S");
    expect(leavesOf(restored).map((n) => n.label)).toEqual(["el", "gato", "duerme"]);
  });

  it("keeps the movement directives", () => {
    const arrows = [{ from: "tr", to: "wh", label: "wh" }];
    expect(toJSON(parseBrackets("[S el]"), { directives: arrows }).directives).toEqual(arrows);
  });

  it("records the format and a timestamp", () => {
    const doc = toJSON(parseBrackets("[S el]"));
    expect(doc.format).toBe("LinguaLab ArborLab v1");
    expect(Number.isNaN(Date.parse(doc.generated))).toBe(false);
  });

  it("rejects unrecognised input", () => {
    expect(() => fromJSON(null)).toThrow(/no reconocido/);
    expect(() => fromJSON({})).toThrow(/no reconocido/);
    expect(() => fromJSON({ tree: { nope: 1 } })).toThrow(/no reconocido/);
  });

  it("marks restored leaves", () => {
    const restored = fromJSON(toJSON(parseBrackets("[S el]")));
    expect(restored.children[0]!.isLeaf).toBe(true);
  });
});

describe("leavesOf", () => {
  it("returns leaves in reading order", () => {
    expect(leavesOf(parseBrackets("[S [A a] [B [C b] [D c]]]")).map((n) => n.label)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("treats a lone node as a leaf", () => {
    expect(leavesOf(parseBrackets("[S]"))).toHaveLength(1);
  });
});

describe("suggestName", () => {
  it("derives a slug from the first leaf", () => {
    expect(suggestName(parseBrackets("[S [NP El Gato]]"))).toBe("arborlab-el-gato");
  });

  it("strips accents and punctuation", () => {
    expect(suggestName(parseBrackets("[S [NP árbol]]"))).toBe("arborlab-arbol");
    expect(suggestName(parseBrackets("[S [NP ¡hola!]]"))).toBe("arborlab-hola");
  });

  it("falls back when there is nothing usable", () => {
    expect(suggestName(parseBrackets("[S]"))).toBe("arborlab-s");
  });
});
