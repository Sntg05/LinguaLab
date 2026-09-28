/* ============================================================
   LinguaLab — ArborLab: solvers de estructuras de datos
   BST, AVL, rojo-negro, heap, trie, árbol de expresión, Huffman.
   Cada solver devuelve un árbol {label, children} y un log.
   ============================================================ */

import type { TreeNode } from "./parse";

function makeNode(label: string | number, children?: TreeNode[]): TreeNode {
  const ch = children ?? [];
  return {
    label: String(label),
    children: ch,
    isLeaf: ch.length === 0,
    line: 1,
    col: 1,
  };
}

interface Log {
  lines: string[];
  push(s: string): void;
}

function log(): Log {
  return {
    lines: [],
    push(s: string) {
      this.lines.push(s);
    },
  };
}

function nums(text: string | number): number[] {
  return String(text)
    .split(/[\s,;]+/)
    .map((x) => parseInt(x, 10))
    .filter((x) => !isNaN(x));
}

/* ---------------- BST ---------------- */

interface BSTNode {
  v: number;
  l: BSTNode | null;
  r: BSTNode | null;
}

export interface BSTOptions {
  search?: string;
}

export function buildBST(
  values: number[],
  opts?: BSTOptions,
): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
} {
  const L = log();
  let root: BSTNode | null = null;

  function insert(v: number) {
    const path: string[] = [];
    if (!root) {
      root = { v, l: null, r: null };
      L.push("insert " + v + " → raíz");
      return;
    }
    let cur = root;
    while (true) {
      if (v === cur.v) {
        L.push("insert " + v + " → duplicado, omitido");
        return;
      }
      const goLeft = v < cur.v;
      path.push(goLeft ? "L" : "R");
      if (goLeft) {
        if (!cur.l) {
          cur.l = { v, l: null, r: null };
          break;
        }
        cur = cur.l;
      } else {
        if (!cur.r) {
          cur.r = { v, l: null, r: null };
          break;
        }
        cur = cur.r;
      }
    }
    L.push(
      "insert " +
        v +
        " → " +
        (path.join("") || "raíz") +
        " (" +
        height() +
        " niveles)",
    );
  }

  function height(n?: BSTNode | null): number {
    if (n === undefined) n = root;
    if (!n) return 0;
    return 1 + Math.max(height(n.l), height(n.r));
  }

  values.forEach(insert);

  if (opts?.search != null && opts.search !== "") {
    const target = parseInt(opts.search, 10);
    let cur: BSTNode | null = root;
    let steps = 0;
    let found = false;
    if (isNaN(target)) {
      L.push("buscar " + opts.search + " → no es un número válido");
    } else {
      while (cur) {
        const node: BSTNode = cur;
        steps++;
        if (target === node.v) {
          found = true;
          break;
        }
        cur = target < node.v ? node.l : node.r;
      }
      L.push(
        found
          ? "buscar " + target + " → encontrado en " + steps + " comparaciones"
          : "buscar " +
              target +
              " → no encontrado (" +
              steps +
              " comparaciones)",
      );
    }
  }

  function toTree(n: BSTNode | null): TreeNode | null {
    if (!n) return null;
    const kids: TreeNode[] = [];
    const l = toTree(n.l);
    const r = toTree(n.r);
    if (l) kids.push(l);
    if (r) kids.push(r);
    return makeNode(n.v, kids);
  }

  const t = toTree(root) ?? makeNode("vacío", []);
  return { tree: t, log: L.lines, height: height(), count: values.length };
}

/* ---------------- AVL ---------------- */

interface AVLNode {
  v: number;
  l: AVLNode | null;
  r: AVLNode | null;
  h: number;
}

export function buildAVL(values: number[]): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
} {
  const L = log();
  const rotations: string[] = [];
  let root: AVLNode | null = null;

  function h(n: AVLNode | null): number {
    return n ? n.h : 0;
  }
  function upd(n: AVLNode): AVLNode {
    n.h = 1 + Math.max(h(n.l), h(n.r));
    return n;
  }
  function bf(n: AVLNode): number {
    return h(n.l) - h(n.r);
  }

  function rotR(y: AVLNode): AVLNode {
    const x = y.l!;
    const T2 = x.r;
    x.r = y;
    y.l = T2 ?? null;
    rotations.push("rotación derecha en " + y.v);
    upd(y);
    upd(x);
    return x;
  }
  function rotL(x: AVLNode): AVLNode {
    const y = x.r!;
    const T2 = y.l;
    y.l = x;
    x.r = T2 ?? null;
    rotations.push("rotación izquierda en " + x.v);
    upd(x);
    upd(y);
    return y;
  }

  function insert(n: AVLNode | null, v: number): AVLNode {
    if (!n) {
      L.push("insert " + v + " → hoja");
      return nodeAVL(v);
    }
    if (v < n.v) n.l = insert(n.l, v);
    else if (v > n.v) n.r = insert(n.r, v);
    else {
      L.push("insert " + v + " → duplicado, omitido");
      return n;
    }

    upd(n);
    const b = bf(n);
    if (b > 1 && n.l && v < n.l.v) {
      L.push("factor +2 en " + n.v + " → LL");
      return rotR(n);
    }
    if (b < -1 && n.r && v > n.r.v) {
      L.push("factor -2 en " + n.v + " → RR");
      return rotL(n);
    }
    if (b > 1 && n.l && v > n.l.v) {
      L.push("factor +2 en " + n.v + " → LR");
      n.l = rotL(n.l);
      return rotR(n);
    }
    if (b < -1 && n.r && v < n.r.v) {
      L.push("factor -2 en " + n.v + " → RL");
      n.r = rotR(n.r);
      return rotL(n);
    }
    return n;
  }

  function nodeAVL(v: number): AVLNode {
    return { v, l: null, r: null, h: 1 };
  }

  for (const v of values) {
    root = insert(root, v);
  }

  function toTree(n: AVLNode | null): TreeNode | null {
    if (!n) return null;
    const kids: TreeNode[] = [];
    const l = toTree(n.l);
    const r = toTree(n.r);
    if (l) kids.push(l);
    if (r) kids.push(r);
    const lbl = n.v + " · bf" + (bf(n) > 0 ? "+" : "") + bf(n);
    return makeNode(lbl, kids);
  }

  const t = toTree(root) ?? makeNode("vacío", []);
  return {
    tree: t,
    log: L.lines.concat(rotations),
    height: root ? root.h : 0,
    count: values.length,
  };
}

/* ---------------- Rojo-negro (simplificado con recoloreo) ---------------- */

interface RBNode {
  v: number;
  c: "red" | "black";
  l: RBNode | null;
  r: RBNode | null;
}

export function buildRB(values: number[]): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
  violations: string[];
} {
  const L = log();
  let root: RBNode | null = null;
  const violations: string[] = [];

  function ins(v: number) {
    let parent: RBNode | null = null;
    let cur = root;
    let dir: "L" | "R" | null = null;
    if (!root) {
      root = { v, c: "black", l: null, r: null };
      L.push("insert " + v + " → raíz (negro)");
      return;
    }
    while (cur) {
      parent = cur;
      if (v === cur.v) {
        L.push("insert " + v + " → duplicado, omitido");
        return;
      }
      if (v < cur.v) {
        cur = cur.l;
        dir = "L";
      } else {
        cur = cur.r;
        dir = "R";
      }
    }
    const nn: RBNode = { v, c: "red", l: null, r: null };
    if (dir === "L") parent!.l = nn;
    else parent!.r = nn;
    L.push("insert " + v + " → hijo rojo de " + parent!.v);
    fix(nn, parent);
  }

  function color(n: RBNode | null): "red" | "black" {
    return n ? n.c : "black";
  }

  function fix(n: RBNode, p: RBNode | null) {
    if (!p) {
      n.c = "black";
      return;
    }
    if (p.c === "black") return;
    const gp = grand(n);
    if (!gp) {
      p.c = "black";
      return;
    }
    const isLeft = gp.l === p;
    const uncle = isLeft ? gp.r : gp.l;
    if (color(uncle) === "red") {
      p.c = "black";
      if (uncle) uncle.c = "black";
      gp.c = "red";
      L.push("tío rojo → recolorear abuelo " + gp.v);
      fix(gp, parentOf(gp));
    } else {
      const inner = isLeft ? p.r === n : p.l === n;
      if (inner) {
        if (isLeft) {
          gp.l = rotL(p);
          L.push("rotación izquierda en " + p.v);
        } else {
          gp.r = rotR(p);
          L.push("rotación derecha en " + p.v);
        }
      }
      // re-evaluación tras rotación local
      const p2 = isLeft ? gp.l : gp.r;
      const n2 = p2 ? (isLeft ? p2.l : p2.r) : null;

      // Rotación exterior sobre el abuelo (faltaba en el legacy)
      const gpp = parentOf(gp);
      if (isLeft) {
        const newSub = rotR(gp);
        if (gpp) {
          if (gpp.l === gp) gpp.l = newSub;
          else gpp.r = newSub;
        } else {
          root = newSub;
        }
        L.push("rotación derecha en abuelo " + gp.v + " + recoloreo");
      } else {
        const newSub = rotL(gp);
        if (gpp) {
          if (gpp.l === gp) gpp.l = newSub;
          else gpp.r = newSub;
        } else {
          root = newSub;
        }
        L.push("rotación izquierda en abuelo " + gp.v + " + recoloreo");
      }

      if (p2) p2.c = "black";
      if (gp) gp.c = "red";
      void n2;
    }
    if (root) root.c = "black";
  }

  function grand(n: RBNode): RBNode | null {
    const p = parentOf(n);
    return p ? parentOf(p) : null;
  }
  function parentOf(n: RBNode): RBNode | null {
    if (n === root) return null;
    let par: RBNode | null = null;
    let c: RBNode | null = root;
    while (c) {
      if (c === n) return par;
      par = c;
      if (n.v < c.v) c = c.l;
      else if (n.v > c.v) c = c.r;
      else {
        // Value equal but different node — shouldn't happen (no duplicates),
        // but fall back to identity search
        return findPar(root, n);
      }
    }
    return findPar(root, n);
  }
  function findPar(c: RBNode | null, n: RBNode): RBNode | null {
    if (!c) return null;
    if (c.l === n || c.r === n) return c;
    return findPar(c.l, n) ?? findPar(c.r, n);
  }

  function rotL(x: RBNode): RBNode {
    const y = x.r!;
    x.r = y.l;
    y.l = x;
    return y;
  }
  function rotR(y: RBNode): RBNode {
    const x = y.l!;
    y.l = x.r;
    x.r = y;
    return x;
  }

  values.forEach(ins);

  function toTree(n: RBNode | null): TreeNode | null {
    if (!n) return null;
    const kids: TreeNode[] = [];
    const l = toTree(n.l);
    const r = toTree(n.r);
    if (l) kids.push(l);
    if (r) kids.push(r);
    return makeNode(n.v + " " + (n.c === "red" ? "●" : "○"), kids);
  }
  const t = toTree(root) ?? makeNode("vacío", []);

  // Verificación de invariantes
  function check(n: RBNode | null): { ok: boolean; bh: number } {
    if (!n) return { ok: true, bh: 1 };
    if (
      color(n) === "red" &&
      (color(n.l) === "red" || color(n.r) === "red")
    ) {
      violations.push("rojo con hijo rojo en " + n.v);
    }
    const a = check(n.l);
    const b = check(n.r);
    if (a.bh !== b.bh)
      violations.push("altura negra desigual bajo " + n.v);
    return { ok: a.ok && b.ok, bh: a.bh + (color(n) === "black" ? 1 : 0) };
  }
  check(root);

  if (violations.length)
    violations.forEach((v) => L.push("⚠ " + v));
  else L.push("✓ 5 invariantes de rojo-negro verificadas");

  return {
    tree: t,
    log: L.lines,
    height: 0,
    count: values.length,
    violations,
  };
}

/* ---------------- Heap ---------------- */

export interface HeapOptions {
  heapMode?: "max" | "min";
  extract?: boolean;
}

export function buildHeap(
  values: number[],
  opts?: HeapOptions,
): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
} {
  const mode = opts?.heapMode === "max" ? "max" : "min";
  const L = log();
  const a = values.slice();

  function better(x: number, y: number): boolean {
    return mode === "max" ? x > y : x < y;
  }

  function siftUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      const ai = a[i];
      const ap = a[p];
      if (ai === undefined || ap === undefined) break;
      if (better(ai, ap)) {
        a[i] = ap;
        a[p] = ai;
        L.push("swap " + ai + " ↔ " + ap + " (sift up)");
        i = p;
      } else break;
    }
  }
  function siftDown(i: number) {
    const n = a.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let best = i;
      if (l < n) {
        const al = a[l];
        const abest = a[best];
        if (al !== undefined && abest !== undefined && better(al, abest))
          best = l;
      }
      if (r < n) {
        const ar = a[r];
        const abest = a[best];
        if (ar !== undefined && abest !== undefined && better(ar, abest))
          best = r;
      }
      if (best === i) break;
      const ai = a[i];
      const abest = a[best];
      if (ai === undefined || abest === undefined) break;
      a[i] = abest;
      a[best] = ai;
      L.push("swap " + abest + " ↔ " + ai + " (sift down)");
      i = best;
    }
  }

  for (let i = 1; i < a.length; i++) siftUp(i);
  if (opts?.extract && a.length) {
    const rootVal = a[0];
    const last = a[a.length - 1];
    if (last !== undefined) {
      a[0] = last;
      a.pop();
      siftDown(0);
      L.push("extraer raíz " + rootVal);
    }
  }

  // Árbol completo desde array
  function toTree(i: number): TreeNode | null {
    if (i >= a.length) return null;
    const val = a[i];
    if (val === undefined) return null;
    const kids: TreeNode[] = [];
    const l = toTree(2 * i + 1);
    const r = toTree(2 * i + 2);
    if (l) kids.push(l);
    if (r) kids.push(r);
    return makeNode(val + (i === 0 ? " (raíz)" : ""), kids);
  }
  const t = toTree(0) ?? makeNode("vacío", []);
  L.push(
    "array: [" + a.join(", ") + "]  · hijo de i → 2i+1, 2i+2",
  );
  return {
    tree: t,
    log: L.lines,
    height: Math.ceil(Math.log2(a.length + 1)),
    count: a.length,
  };
}

/* ---------------- Trie ---------------- */

interface TrieNode {
  ch: string;
  end: boolean;
  kids: Record<string, TrieNode>;
}

export interface TrieOptions {
  compress?: boolean;
}

export function buildTrie(
  text: string | number,
  opts?: TrieOptions,
): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
} {
  const L = log();
  const words = String(text)
    .split(/[\s,;]+/)
    .filter(Boolean);
  const root: TrieNode = { ch: "", end: false, kids: {} };

  words.forEach((w) => {
    const word = w.toLowerCase();
    let cur = root;
    for (let i = 0; i < word.length; i++) {
      const c = word[i]!;
      if (!cur.kids[c]) cur.kids[c] = { ch: c, end: false, kids: {} };
      cur = cur.kids[c];
    }
    cur.end = true;
    L.push("insert «" + word + "» (" + word.length + " pasos)");
  });

  // Compresión radix: unir cadenas sin bifurcación
  function toTree(n: TrieNode): TreeNode[] | null {
    const keys = Object.keys(n.kids);
    if (!keys.length) return null;
    const kids: TreeNode[] = [];
    keys.sort().forEach((k) => {
      const child = n.kids[k];
      if (!child) return;
      let label = k;
      let c = child;
      if (opts?.compress) {
        while (Object.keys(c.kids).length === 1 && !c.end) {
          const nk = Object.keys(c.kids)[0];
          if (!nk) break;
          const next = c.kids[nk];
          if (!next) break;
          label += nk;
          c = next;
        }
        kids.push(toTreeFrom(c, label));
      } else {
        kids.push(toTreeFrom(c, label));
      }
    });
    return kids;
  }
  function toTreeFrom(n: TrieNode, label: string): TreeNode {
    const kids = toTree(n) ?? [];
    return makeNode(label + (n.end ? " •" : ""), kids.length ? kids : []);
  }

  const t = makeNode("ε", toTree(root) ?? []);
  L.push(
    opts?.compress ? "compresión radix aplicada" : "trie sin comprimir",
  );
  return { tree: t, log: L.lines, height: 0, count: words.length };
}

/* ---------------- Árbol de expresión ---------------- */

export function buildExpr(text: string | number): {
  tree: TreeNode;
  log: string[];
  height: number;
  count: number;
  traversals: { pre: string[]; ino: string[]; post: string[] };
} {
  const L = log();
  const src = String(text).replace(/\s+/g, "");
  let i = 0;

  function peek(): string | undefined {
    return src[i];
  }
  function eat(c: string): boolean {
    if (src[i] === c) {
      i++;
      return true;
    }
    return false;
  }

  function parseExpr(): TreeNode {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = src[i]!;
      i++;
      const right = parseTerm();
      left = makeNode(op, [left, right]);
      L.push("op " + op + " sobre " + labelOf(left) + " y " + labelOf(right));
    }
    return left;
  }
  function parseTerm(): TreeNode {
    let left = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = src[i]!;
      i++;
      const right = parsePower();
      left = makeNode(op, [left, right]);
      L.push("op " + op + " precede sobre +/−");
    }
    return left;
  }
  // Potencia infija, asociativa a la derecha: 2^3^2 = 2^(3^2)
  function parsePower(): TreeNode {
    let left = parseFactor();
    if (peek() === "^") {
      i++;
      const right = parsePower();
      left = makeNode("^", [left, right]);
      L.push("op ^ (potencia, asociativa a la derecha)");
    }
    return left;
  }
  function parseFactor(): TreeNode {
    // Unario: -x → (0 - x)
    if (peek() === "-" || peek() === "+") {
      const uop = src[i]!;
      i++;
      const operand = parseFactor();
      if (uop === "+") return operand;
      return makeNode("−", [makeNode("0", []), operand]);
    }
    if (peek() === "(") {
      i++;
      const inner = parseExpr();
      eat(")");
      return inner;
    }
    // Función: nombre(args) p.ej. sqrt(x), min(a,b)
    const nameStart = i;
    while (i < src.length && /[a-zA-Z]/.test(src[i]!)) i++;
    const fname = src.slice(nameStart, i);
    if (fname && peek() === "(") {
      i++; // consume (
      const args: TreeNode[] = [];
      if (peek() !== ")") {
        args.push(parseExpr());
        while (peek() === ",") {
          i++;
          args.push(parseExpr());
        }
      }
      eat(")");
      L.push("función " + fname + " (" + args.length + " args)");
      return makeNode(fname, args.length ? args : [makeNode("∅", [])]);
    }
    if (fname && peek() !== "(") {
      // Identificador simple sin paréntesis (p.ej. x, xy, x2)
      let rest = "";
      while (
        i < src.length &&
        /[0-9a-zA-Z.,]/.test(src[i]!)
      ) {
        rest += src[i]!;
        i++;
      }
      const tok0 = fname + rest;
      L.push("hoja " + tok0);
      return makeNode(tok0, []);
    }
    const start = i;
    while (
      i < src.length &&
      /[0-9a-zA-Z.,]/.test(src[i]!)
    )
      i++;
    const tok = src.slice(start, i);
    if (!tok) {
      i++;
      return makeNode("?", []);
    }
    L.push("hoja " + tok);
    return makeNode(tok, []);
  }

  const tree = parseExpr();
  if (i < src.length)
    L.push("⚠ carácter sobrante: «" + src.slice(i) + "»");

  // Recorridos (tres pasadas independientes)
  const pre: string[] = [];
  const ino: string[] = [];
  const post: string[] = [];
  (function walkPre(n: TreeNode) {
    pre.push(n.label);
    (n.children || []).forEach(walkPre);
  })(tree);
  (function walkIn(n: TreeNode) {
    const ch = n.children || [];
    if (!ch.length) {
      ino.push(n.label);
      return;
    }
    walkIn(ch[0]!);
    ino.push(n.label);
    for (let k = 1; k < ch.length; k++) walkIn(ch[k]!);
  })(tree);
  (function walkPost(n: TreeNode) {
    (n.children || []).forEach(walkPost);
    post.push(n.label);
  })(tree);
  L.push("pre-fijo:  " + pre.join(" "));
  L.push("in-fijo:   " + ino.join(" "));
  L.push("post-fijo: " + post.join(" "));

  return {
    tree,
    log: L.lines,
    height: 0,
    count: src.length,
    traversals: { pre, ino, post },
  };
}

function labelOf(n: TreeNode): string {
  return n.label;
}

/* ---------------- Huffman ---------------- */

interface HuffNode {
  ch: string | null;
  f: number;
  l: HuffNode | null;
  r: HuffNode | null;
}

export function buildHuffman(text: string | number): {
  tree: TreeNode;
  log: string[];
  codes: Record<string, string>;
  stats: { total: number; coded: number; entropy: number };
} {
  const L = log();
  const src = String(text);
  const freq: Record<string, number> = {};
  src.split("").forEach((c) => {
    if (c !== "\n") freq[c] = (freq[c] || 0) + 1;
  });

  let heapArr: HuffNode[] = Object.keys(freq).map((c) => {
    return { ch: c, f: freq[c]!, l: null, r: null };
  });
  if (!heapArr.length)
    return {
      tree: makeNode("vacío", []),
      log: ["texto vacío"],
      codes: {},
      stats: { total: 0, coded: 0, entropy: 0 },
    };

  while (heapArr.length > 1) {
    heapArr.sort((a, b) => a.f - b.f);
    const a = heapArr.shift();
    const b = heapArr.shift();
    if (!a || !b) break;
    const parent: HuffNode = {
      ch: null,
      f: a.f + b.f,
      l: a,
      r: b,
    };
    L.push("unir " + fmt(a) + " + " + fmt(b) + " = " + parent.f);
    heapArr.push(parent);
  }

  const root = heapArr[0];
  if (!root) {
    return {
      tree: makeNode("vacío", []),
      log: ["texto vacío"],
      codes: {},
      stats: { total: 0, coded: 0, entropy: 0 },
    };
  }

  const codes: Record<string, string> = {};
  (function assign(n: HuffNode, path: string) {
    if (!n.l && !n.r) {
      codes[n.ch!] = path || "0";
      return;
    }
    if (n.l) assign(n.l, path + "0");
    if (n.r) assign(n.r, path + "1");
  })(root, "");

  const total = src.length * 8;
  let coded = 0;
  Object.keys(codes).forEach((c) => {
    coded += (freq[c] || 0) * codes[c]!.length;
  });
  let entropy = 0;
  Object.keys(freq).forEach((c) => {
    const p = freq[c]! / src.length;
    entropy -= p * Math.log2(p);
  });
  L.push("original: " + total + " bits (8 por símbolo)");
  L.push("huffman:  " + coded + " bits");
  L.push(
    "entropía: " + (src.length * entropy).toFixed(1) + " bits (límite teórico)",
  );

  function fmt(n: HuffNode): string {
    return n.ch === null ? "(" + n.f + ")" : n.ch + ":" + n.f;
  }

  function toTree(n: HuffNode | null): TreeNode | null {
    if (!n) return null;
    if (!n.l && !n.r)
      return makeNode(
        (n.ch === " " ? "␣" : n.ch) + " (" + n.f + ")",
        [],
      );
    const kids: TreeNode[] = [];
    const l = toTree(n.l);
    const r = toTree(n.r);
    if (l) kids.push(l);
    if (r) kids.push(r);
    return makeNode(String(n.f), kids);
  }

  // tabla de códigos
  const table = Object.keys(codes)
    .sort()
    .map((c) => {
      return (c === " " ? "␣" : c) + " → " + codes[c] + " (" + freq[c] + ")";
    });
  L.push("--- códigos ---");
  table.forEach((r) => L.push(r));

  return {
    tree: toTree(root) ?? makeNode("vacío", []),
    log: L.lines,
    codes,
    stats: { total, coded, entropy },
  };
}

/* ---------------- Dispatcher ---------------- */

export interface SolveOptions {
  search?: string;
  heapMode?: "max" | "min";
  extract?: boolean;
  compress?: boolean;
}

export function solve(
  kind: string,
  input: string,
  opts?: SolveOptions,
) {
  switch (kind) {
    case "bst":
      return buildBST(nums(input), { search: opts?.search });
    case "avl":
      return buildAVL(nums(input));
    case "redblack":
      return buildRB(nums(input));
    case "heap":
      return buildHeap(nums(input), opts);
    case "trie":
      return buildTrie(input, opts);
    case "expr":
      return buildExpr(input);
    case "huffman":
      return buildHuffman(input);
    default:
      throw new Error("Tipo desconocido: " + kind);
  }
}

export const DATA_KINDS = [
  "bst",
  "avl",
  "redblack",
  "heap",
  "trie",
  "expr",
  "huffman",
] as const;
