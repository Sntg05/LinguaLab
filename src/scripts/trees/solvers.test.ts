import { describe, it, expect } from "vitest";
import {
  buildBST,
  buildAVL,
  buildRB,
  buildHeap,
  buildTrie,
  buildExpr,
  buildHuffman,
  solve,
  DATA_KINDS,
} from "./solvers";
import type { TreeNode } from "./parse";

/* ---------- tree-walking helpers (tests only) ---------- */

function inOrderNumbers(n: TreeNode): number[] {
  const vals: number[] = [];
  function walk(node: TreeNode) {
    if (node.isLeaf) {
      const v = parseInt(node.label, 10);
      if (!isNaN(v)) vals.push(v);
      return;
    }
    if (node.children[0]) walk(node.children[0]);
    const v = parseInt(node.label, 10);
    if (!isNaN(v)) vals.push(v);
    if (node.children[1]) walk(node.children[1]);
  }
  walk(n);
  return vals;
}

function avlBalanceFactors(n: TreeNode): number[] {
  const bfs: number[] = [];
  function walk(node: TreeNode) {
    const m = node.label.match(/·\s*bf\s*([+-]?\d+)/);
    if (m && m[1]) {
      bfs.push(parseInt(m[1], 10));
    }
    node.children.forEach(walk);
  }
  walk(n);
  return bfs;
}

interface RBCheckResult {
  bh: number;
  ok: boolean;
}
function rbCheck(node: TreeNode): RBCheckResult {
  const color = node.label.includes("●") ? "red" : "black";
  let ok = true;
  const left = node.children[0];
  const right = node.children[1];
  if (color === "red") {
    if (left && left.label.includes("●")) ok = false;
    if (right && right.label.includes("●")) ok = false;
  }
  const leftRes = left ? rbCheck(left) : { bh: 1, ok: true };
  const rightRes = right ? rbCheck(right) : { bh: 1, ok: true };
  if (leftRes.bh !== rightRes.bh) ok = false;
  const bh = leftRes.bh + (color === "black" ? 1 : 0);
  return { bh, ok };
}

function heapCheck(node: TreeNode, mode: "min" | "max"): boolean {
  const val = parseInt(node.label.replace(" (raíz)", ""), 10);
  if (isNaN(val)) return true;
  for (const child of node.children) {
    const childVal = parseInt(child.label.replace(" (raíz)", ""), 10);
    if (isNaN(childVal)) continue;
    if (mode === "min" && childVal < val) return false;
    if (mode === "max" && childVal > val) return false;
    if (!heapCheck(child, mode)) return false;
  }
  return true;
}

function trieHasPrefix(root: TreeNode, prefix: string): boolean {
  let cur = root;
  let i = 0;
  while (i < prefix.length) {
    const ch = prefix[i];
    if (!ch) return false;
    const next = cur.children.find((c) => {
      const label = c.label.replace(" •", "");
      return label.startsWith(ch);
    });
    if (!next) return false;
    const label = next.label.replace(" •", "");
    const remaining = prefix.slice(i);
    if (remaining.startsWith(label)) {
      i += label.length;
      cur = next;
    } else if (label.startsWith(remaining)) {
      return true;
    } else {
      return false;
    }
  }
  return true;
}

function evalExpr(node: TreeNode): number {
  if (node.isLeaf) {
    const v = parseFloat(node.label);
    return isNaN(v) ? 0 : v;
  }
  const a = node.children[0] ? evalExpr(node.children[0]) : 0;
  const b = node.children[1] ? evalExpr(node.children[1]) : 0;
  switch (node.label) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "%":
      return a % b;
    case "^":
      return Math.pow(a, b);
    case "−":
      return a - b;
    default:
      return 0;
  }
}

function huffmanRoundTrip(codes: Record<string, string>, text: string): boolean {
  let encoded = "";
  for (const c of text) {
    if (c === "\n") continue;
    const code = codes[c];
    if (!code) return false;
    encoded += code;
  }
  let decoded = "";
  let buf = "";
  for (const bit of encoded) {
    buf += bit;
    for (const [ch, code] of Object.entries(codes)) {
      if (buf === code) {
        decoded += ch;
        buf = "";
        break;
      }
    }
  }
  return decoded === text.replace(/\n/g, "");
}

/* ---------- BST ---------- */

describe("BST", () => {
  it("builds a normal BST", () => {
    const res = buildBST([5, 3, 7, 1, 4]);
    expect(res.tree.label).toBe("5");
    expect(res.count).toBe(5);
    expect(inOrderNumbers(res.tree)).toEqual([1, 3, 4, 5, 7]);
  });

  it("handles empty input", () => {
    const res = buildBST([]);
    expect(res.tree.label).toBe("vacío");
    expect(res.count).toBe(0);
  });

  it("handles duplicates by skipping them", () => {
    const res = buildBST([5, 3, 5, 3]);
    expect(res.count).toBe(4);
    // Only two unique values should appear in the tree
    const vals = inOrderNumbers(res.tree);
    expect(vals).toEqual([3, 5]);
  });

  it("in-order traversal is sorted", () => {
    const res = buildBST([10, 2, 15, 1, 5, 12, 20]);
    const sorted = inOrderNumbers(res.tree);
    const expected = [...sorted].sort((a, b) => a - b);
    expect(sorted).toEqual(expected);
  });
});

/* ---------- AVL ---------- */

describe("AVL", () => {
  it("builds a normal AVL tree", () => {
    const res = buildAVL([10, 20, 30, 40, 50]);
    expect(res.count).toBe(5);
    expect(res.height).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const res = buildAVL([]);
    expect(res.tree.label).toBe("vacío");
    expect(res.height).toBe(0);
  });

  it("balance factor of every node is in [-1, 1]", () => {
    const res = buildAVL([50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45]);
    const bfs = avlBalanceFactors(res.tree);
    for (const bf of bfs) {
      expect(bf).toBeGreaterThanOrEqual(-1);
      expect(bf).toBeLessThanOrEqual(1);
    }
  });
});

/* ---------- Red-Black ---------- */

describe("Red-Black", () => {
  it("builds a normal RB tree", () => {
    const res = buildRB([10, 20, 30, 15, 25]);
    expect(res.count).toBe(5);
    expect(res.violations).toEqual([]);
  });

  it("handles empty input", () => {
    const res = buildRB([]);
    expect(res.tree.label).toBe("vacío");
    expect(res.violations).toEqual([]);
  });

  it("root is black and invariants hold", () => {
    const res = buildRB([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const rootColor = res.tree.label.includes("●") ? "red" : "black";
    expect(rootColor).toBe("black");
    const check = rbCheck(res.tree);
    expect(check.ok).toBe(true);
  });

  it("has uniform black-height", () => {
    const res = buildRB([50, 25, 75, 10, 30, 60, 80]);
    const check = rbCheck(res.tree);
    expect(check.ok).toBe(true);
    expect(check.bh).toBeGreaterThan(0);
  });
});

/* ---------- Heap ---------- */

describe("Heap", () => {
  it("builds a normal min-heap", () => {
    const res = buildHeap([5, 3, 8, 1, 2], { heapMode: "min" });
    expect(res.count).toBe(5);
    expect(heapCheck(res.tree, "min")).toBe(true);
  });

  it("builds a normal max-heap", () => {
    const res = buildHeap([5, 3, 8, 1, 2], { heapMode: "max" });
    expect(res.count).toBe(5);
    expect(heapCheck(res.tree, "max")).toBe(true);
  });

  it("handles empty input", () => {
    const res = buildHeap([], { heapMode: "min" });
    expect(res.tree.label).toBe("vacío");
    expect(res.count).toBe(0);
  });

  it("extracts root correctly", () => {
    const res = buildHeap([1, 2, 3, 4, 5], { heapMode: "min", extract: true });
    expect(res.count).toBe(4);
    expect(heapCheck(res.tree, "min")).toBe(true);
  });

  it("heap property holds after sift operations", () => {
    const res = buildHeap([9, 5, 6, 2, 3], { heapMode: "max" });
    expect(heapCheck(res.tree, "max")).toBe(true);
  });
});

/* ---------- Trie ---------- */

describe("Trie", () => {
  it("builds a normal trie", () => {
    const res = buildTrie("cat car dog");
    expect(res.count).toBe(3);
    expect(trieHasPrefix(res.tree, "ca")).toBe(true);
    expect(trieHasPrefix(res.tree, "cat")).toBe(true);
    expect(trieHasPrefix(res.tree, "dog")).toBe(true);
  });

  it("handles empty input", () => {
    const res = buildTrie("");
    expect(res.count).toBe(0);
  });

  it("supports prefix lookups", () => {
    const res = buildTrie("apple apply ape apt");
    expect(trieHasPrefix(res.tree, "ap")).toBe(true);
    expect(trieHasPrefix(res.tree, "app")).toBe(true);
    expect(trieHasPrefix(res.tree, "xyz")).toBe(false);
  });

  it("supports radix compression", () => {
    const res = buildTrie("cat car card", { compress: true });
    expect(trieHasPrefix(res.tree, "car")).toBe(true);
    expect(trieHasPrefix(res.tree, "card")).toBe(true);
    expect(trieHasPrefix(res.tree, "cat")).toBe(true);
  });
});

/* ---------- Expression ---------- */

describe("Expression", () => {
  it("builds a normal expression tree", () => {
    const res = buildExpr("2+3*4");
    expect(evalExpr(res.tree)).toBe(14);
  });

  it("handles empty input", () => {
    const res = buildExpr("");
    // Empty source becomes empty string after replace, parseExpr returns node from parseTerm etc.
    // parseFactor will hit the empty tok branch and return node('?', []). So evalExpr returns 0.
    expect(evalExpr(res.tree)).toBe(0);
  });

  it("evaluates parsed tree matching direct arithmetic", () => {
    const cases = [
      { expr: "1+2+3", expected: 6 },
      { expr: "10-3*2", expected: 4 },
      { expr: "(1+2)*3", expected: 9 },
      { expr: "2^3^2", expected: 512 }, // right-associative: 2^(3^2) = 2^9 = 512
      { expr: "-5+3", expected: -2 },
      { expr: "100/4/5", expected: 5 },
    ];
    for (const c of cases) {
      const res = buildExpr(c.expr);
      expect(evalExpr(res.tree)).toBe(c.expected);
    }
  });

  it("handles unary plus and minus", () => {
    const res = buildExpr("--5");
    // --5 → -( -5 ) → -(0 - 5) → 0 - (0 - 5) = 5
    expect(evalExpr(res.tree)).toBe(5);
  });
});

/* ---------- Huffman ---------- */

describe("Huffman", () => {
  it("builds a normal Huffman tree", () => {
    const res = buildHuffman("aabbc");
    expect(Object.keys(res.codes).length).toBeGreaterThan(0);
    expect(huffmanRoundTrip(res.codes, "aabbc")).toBe(true);
  });

  it("handles empty input", () => {
    const res = buildHuffman("");
    expect(res.tree.label).toBe("vacío");
    expect(Object.keys(res.codes).length).toBe(0);
  });

  it("codes are prefix-free and round-trip", () => {
    const res = buildHuffman("hello world");
    expect(huffmanRoundTrip(res.codes, "hello world")).toBe(true);
    // Prefix-free check
    const codeList = Object.values(res.codes);
    for (let i = 0; i < codeList.length; i++) {
      for (let j = 0; j < codeList.length; j++) {
        if (i !== j) {
          expect(codeList[j]!.startsWith(codeList[i]!)).toBe(false);
        }
      }
    }
  });
});

/* ---------- Dispatcher ---------- */

describe("solve dispatcher", () => {
  it("dispatches to all DATA_KINDS", () => {
    for (const kind of DATA_KINDS) {
      expect(() => solve(kind, "1 2 3")).not.toThrow();
    }
  });

  it("throws on unknown kind", () => {
    expect(() => solve("unknown", "1 2 3")).toThrow("Tipo desconocido");
  });

  it("returns a tree for each kind", () => {
    for (const kind of DATA_KINDS) {
      const res = solve(kind, kind === "expr" ? "1+2" : "1 2 3");
      expect(res).toHaveProperty("tree");
      expect(res).toHaveProperty("log");
    }
  });
});
