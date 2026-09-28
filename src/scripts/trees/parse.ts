/* ============================================================
   LinguaLab — ArborLab input parsers

   Four input formats, all producing the same TreeNode shape:
     1. Labelled brackets:  [S [NP [Det el] [N gato]]]
     2. Penn Treebank:      (S (DT el) (NN gato))
     3. Dependency/CoNLL-U: id word head relation POS
     4. Indented outline:   hierarchy by indentation

   Parse failures carry a line and column, so the UI can point at the
   offending character instead of just refusing the input.
   ============================================================ */

/** A parse failure with a position, for the error message in the UI. */
export class ParseError extends Error {
  readonly line: number;
  readonly col: number;

  constructor(message: string, line = 1, col = 1) {
    super(message);
    this.name = "ParseError";
    this.line = line;
    this.col = col;
  }

  /** Message with the position appended, ready to show. */
  get userMessage(): string {
    return `${this.message} (línea ${this.line}, columna ${this.col})`;
  }
}

export interface DependencyMeta {
  byId: Record<number, TreeNode>;
  nodes: TreeNode[];
  roots: TreeNode[];
}

export interface TreeNode {
  label: string;
  children: TreeNode[];
  line: number;
  col: number;
  isLeaf: boolean;

  /* Dependency trees */
  id?: number;
  word?: string;
  pos?: string;
  head?: number;
  rel?: string;
  depMeta?: DependencyMeta;

  /* Indented outlines: a note attached after a ` | ` separator. */
  sub?: string;

  /* Markers for nodes the parser had to invent. */
  synthetic?: boolean;
  forest?: boolean;
}

/**
 * Build a leaf node.
 *
 * Underscores separate words in Penn Treebank ("New_York"), but the notation
 * also uses `_i` for an index. Converting every underscore to a space lost
 * the index: `el_i` became the two words "el i".
 *
 * A trailing `_x` or `_{x}` is kept so the renderer can draw it as a
 * subscript. A longer trailing run such as `_city` is a word separator, not
 * an index, so it still becomes a space.
 */
function leaf(text: string, line: number, col: number): TreeNode {
  return {
    label: text.replace(/_(?!(?:\w|\{[^}]*\})$)/g, " "),
    children: [],
    line,
    col,
    isLeaf: true,
  };
}

/* ============================================================
   1. Brackets / Penn Treebank
   ============================================================ */

/**
 * Parse bracketed or Penn-style notation.
 *
 * Round brackets are assumed when the input contains `(` and no `[`, so the
 * same function handles both notations.
 */
export function parseBrackets(source: string): TreeNode {
  const src = String(source ?? "").trim();
  if (!src) throw new ParseError("Entrada vacía", 1, 1);

  const useRound = src.includes("(") && !src.includes("[");
  const OPEN = useRound ? "(" : "[";
  const CLOSE = useRound ? ")" : "]";
  const ANY_OPEN = ["(", "["];
  const ANY_CLOSE = [")", "]"];

  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (n: number): void => {
    for (let k = 0; k < n; k += 1) {
      if (src[i] === "\n") {
        line += 1;
        col = 1;
      } else {
        col += 1;
      }
      i += 1;
    }
  };

  const skipWhitespace = (): void => {
    while (i < src.length && /\s/.test(src[i] ?? "")) advance(1);
  };

  /** Read until one of `stopChars`, returning the trimmed text and position. */
  const readText = (stopChars: readonly string[]) => {
    skipWhitespace();
    const startLine = line;
    const startCol = col;
    let out = "";
    while (i < src.length && !stopChars.includes(src[i] ?? "")) {
      out += src[i];
      advance(1);
    }
    return { text: out.trim(), line: startLine, col: startCol };
  };

  const parseNode = (): TreeNode => {
    skipWhitespace();
    if (i >= src.length) throw new ParseError(`Se esperaba un nodo o ${OPEN}`, line, col);

    if (src[i] !== OPEN) {
      // A bare leaf with no bracket around it.
      const bare = readText(ANY_CLOSE);
      if (!bare.text) throw new ParseError("Nodo vacío", bare.line, bare.col);
      return leaf(bare.text, bare.line, bare.col);
    }

    advance(1); // consume the opening bracket
    const openLine = line;
    const openCol = col - 1;

    // The label is the first token: up to whitespace or a bracket. This is
    // what makes `[Det el]` a node labelled Det with one leaf child.
    skipWhitespace();
    let label = "";
    while (
      i < src.length &&
      !/\s/.test(src[i] ?? "") &&
      !ANY_OPEN.includes(src[i] ?? "") &&
      !ANY_CLOSE.includes(src[i] ?? "")
    ) {
      label += src[i];
      advance(1);
    }
    label = label.trim();
    if (!label) throw new ParseError("Falta la etiqueta del nodo", openLine, openCol);

    const node: TreeNode = {
      label,
      children: [],
      line: openLine,
      col: openCol,
      isLeaf: false,
    };

    for (;;) {
      skipWhitespace();
      if (i >= src.length) {
        throw new ParseError(`Falta ${CLOSE} de «${node.label}»`, openLine, openCol);
      }
      if (src[i] === CLOSE) {
        advance(1);
        break;
      }
      if (src[i] === OPEN) {
        node.children.push(parseNode());
      } else {
        // Loose text inside a node becomes a leaf.
        const text = readText([...ANY_CLOSE, ...ANY_OPEN]);
        if (text.text) {
          node.children.push(leaf(text.text, text.line, text.col));
        } else {
          // The character is a bracket of the other notation, so readText
          // stopped without consuming anything. Without this guard the loop
          // never advances and the parser hangs instead of reporting.
          throw new ParseError(
            `Carácter inesperado «${src[i]}» dentro de «${node.label}»`,
            line,
            col,
          );
        }
      }
    }

    if (node.children.length === 0) return leaf(node.label, node.line, node.col);
    return node;
  };

  const root = parseNode();
  skipWhitespace();
  if (i < src.length) throw new ParseError("Texto sobrante tras el árbol", line, col);
  return root;
}

/* ============================================================
   2. Dependency / CoNLL-U
   ============================================================ */

/**
 * Parse dependency notation.
 *
 * Accepts both the compact `id word head relation POS` form and full
 * 10-column CoNLL-U. Multiword tokens (1-2) and empty nodes (8.1) are
 * skipped, as the format intends.
 */
export function parseDependency(source: string): TreeNode {
  const lines = String(source ?? "").split("\n");
  const nodes: TreeNode[] = [];
  const byId: Record<number, TreeNode> = {};

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;

    const cols = raw.includes("\t") ? raw.split("\t") : line.split(/\s+/);
    const first = cols[0] ?? "";

    if (/^\d+-\d+$/.test(first)) return; // multiword token
    if (/^\d+\.\d+$/.test(first)) return; // empty node

    let id: string;
    let word: string;
    let head: string;
    let rel: string;
    let pos: string;

    if (cols.length >= 10) {
      // ID FORM LEMMA UPOS XPOS FEATS HEAD DEPREL DEPS MISC
      [id, word] = [cols[0] ?? "", cols[1] ?? ""];
      pos = cols[3] ?? "_";
      head = cols[6] ?? "0";
      rel = cols[7] ?? "dep";
    } else if (cols.length >= 5) {
      [id, word, head, rel] = [cols[0] ?? "", cols[1] ?? "", cols[2] ?? "0", cols[3] ?? "dep"];
      pos = cols[4] ?? "_";
    } else if (cols.length === 4) {
      [id, word, head, rel] = [cols[0] ?? "", cols[1] ?? "", cols[2] ?? "0", cols[3] ?? "dep"];
      pos = "_";
    } else {
      throw new ParseError(
        "Se esperan 4 o 5 columnas (id palabra cabeza relación POS)",
        lineNumber,
        1,
      );
    }

    if (!/^\d+$/.test(id)) {
      throw new ParseError(`El id debe ser un número entero: «${id}»`, lineNumber, 1);
    }

    const headValue = head === "0" ? 0 : Number.parseInt(head, 10);
    if (Number.isNaN(headValue)) {
      throw new ParseError(`Cabeza no válida: «${head}»`, lineNumber, 1);
    }

    const numericId = Number.parseInt(id, 10);
    if (byId[numericId]) throw new ParseError(`Id duplicado: ${numericId}`, lineNumber, 1);

    const node: TreeNode = {
      label: word,
      children: [],
      line: lineNumber,
      col: 1,
      isLeaf: true,
      id: numericId,
      word,
      pos: pos || "_",
      head: headValue,
      rel: rel || "dep",
    };

    byId[numericId] = node;
    nodes.push(node);
  });

  if (nodes.length === 0) {
    throw new ParseError("No se encontraron líneas de análisis", 1, 1);
  }

  const roots: TreeNode[] = [];
  for (const node of nodes) {
    if (node.head === 0) {
      roots.push(node);
      continue;
    }

    // `head` is optional on the shared node type, so narrow it explicitly.
    const head = node.head;
    if (head === undefined) {
      throw new ParseError(`Falta la cabeza de «${node.word}»`, node.line, 1);
    }

    const parent = byId[head];
    if (!parent) {
      throw new ParseError(
        `La cabeza ${head} de «${node.word}» no existe`,
        node.line,
        1,
      );
    }
    parent.children.push(node);
    parent.isLeaf = false;
  }

  if (roots.length === 0) {
    throw new ParseError("Ninguna palabra es la raíz (cabeza 0)", 1, 1);
  }

  const tree: TreeNode =
    roots.length === 1 && roots[0]
      ? roots[0]
      : {
          label: "ROOT",
          children: roots,
          isLeaf: false,
          line: 1,
          col: 1,
          synthetic: true,
        };

  tree.depMeta = { byId, nodes, roots };
  return tree;
}

/* ============================================================
   3. Indented outline
   ============================================================ */

/**
 * Parse an indentation-based hierarchy.
 *
 * A trailing ` | note` on a line becomes the node's `sub`. The recursive
 * build returns the next index instead of tagging nodes with a temporary
 * field, so the produced tree needs no clean-up pass.
 */
export function parseOutline(source: string): TreeNode {
  const lines = String(source ?? "")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) throw new ParseError("Entrada vacía", 1, 1);

  const items = lines
    .map((raw, index) => {
      const match = /^([\s\S]*?)(?:\s+\|\s+(.*))?$/.exec(raw);
      const prefix = /^[│├└─\s]*/.exec(raw)?.[0] ?? "";

      // Pasted `tree` output carries its hierarchy in box-drawing characters,
      // in four-character groups (`│   `, `├── `, `└── `), not in leading
      // spaces. Reading only whitespace would flatten it into a forest.
      const indent = /[│├└─]/.test(prefix)
        ? Math.floor(prefix.length / 4)
        : prefix.replace(/\t/g, "    ").length;
      const text = (match?.[1] ?? raw)
        .trim()
        .replace(/^([-*•]\s+)/, "") // bullets
        .replace(/^[│├└─\s]+/, "") // box-drawing characters
        .trim();
      return { indent, text, second: (match?.[2] ?? "").trim(), line: index + 1 };
    })
    .filter((item) => item.text !== "");

  if (items.length === 0) throw new ParseError("Entrada vacía", 1, 1);

  const build = (start: number, indent: number): { node: TreeNode; next: number } => {
    const item = items[start]!;
    const node: TreeNode = {
      label: item.text,
      children: [],
      line: item.line,
      col: 1,
      isLeaf: false,
    };
    if (item.second) node.sub = item.second;

    let pos = start + 1;
    while (pos < items.length && items[pos]!.indent > indent) {
      const child = build(pos, items[pos]!.indent);
      node.children.push(child.node);
      pos = child.next;
    }

    return { node, next: pos };
  };

  const roots: TreeNode[] = [];
  let p = 0;
  while (p < items.length) {
    const result = build(p, items[p]!.indent);
    roots.push(result.node);
    p = result.next;
  }

  if (roots.length === 1 && roots[0]) return roots[0];
  return {
    label: "",
    children: roots,
    isLeaf: false,
    line: 1,
    col: 1,
    forest: true,
  };
}

/* ============================================================
   4. "Easy" input: sentence to a heuristic dependency tree
   ============================================================ */

/** Small closed-class lexicon for the didactic tagger. */
const SIMPLE_LEX: Readonly<Record<string, readonly string[]>> = {
  det: ["el","la","los","las","un","una","unos","unas","este","esta","ese","esa","the","a","an","this","that","these","those","my","tu","su","our"],
  n: ["gato","perro","hombre","mujer","niño","casa","libro","ciudad","agua","tiempo","día","año","cosa","cat","dog","man","woman","boy","house","book","city","water","time","day","year"],
  adj: ["negro","rojo","grande","pequeño","bueno","malo","viejo","joven","alto","largo","big","small","old","young","black","red","good","bad","long","tall"],
  v: [
    "salta","saltó","salto","corre","corrió","come","comió","ve","vio","hace","hizo",
    "es","está","estan","están","hay","era","dormía","duerme","duermen","maulló","maúlla",
    "ladra","ladró","bebe","bebió","canta","cantó","baila","bailó","escribe","escribió",
    "lee","leyó","mira","miró","quiere","quieren","puede","pueden","tiene","tienen",
    "va","viene","salió","sale","entró","entra","trabaja","trabajó","estudia","estudió",
    "juega","jugó","vive","vivió","murió","nació","compró","compra","vendió","vende",
    "abrió","abre","cerró","cierra","habla","habló","piensa","pensó","sabe","conoce",
    "espera","llega","llegó","parte","partió","sube","baja","grita","llora","ríe",
    "camina","vuela","ama","odia","necesita","ayuda","encuentra","perdió","ganó",
    "jumped","runs","ran","walks","walked","ate","eats","drinks","drank","sings","sang",
    "reads","writes","wrote","sees","saw","looks","wants","can","has","goes","comes",
    "works","studies","plays","lives","died","bought","sold","opened","closed",
    "speaks","spoke","thinks","knows","waits","arrives","leaves","climbs","shouts",
    "cries","laughs","flies","swims","loves","likes","needs","helps","makes","made",
    "takes","took","gives","gave","says","said","tells","told","finds","found",
    "keeps","kept","brings","brought","begins","began","seems","feels","felt",
    "becomes","became","shows","showed","hears","heard","means","sleeps","slept","meows",
    "is","was","were","are","am",
  ],
  prep: ["de","en","con","por","para","sobre","bajo","entre","hacia","desde","of","in","with","by","for","on","under","between","toward","from"],
  conj: ["y","o","pero","que","cuando","mientras","si","and","or","but","that","when","while","if"],
  adv: ["muy","bien","mal","rápido","despacio","siempre","nunca","very","well","fast","slowly","always","never"],
};

/**
 * Guess a part of speech from a word.
 *
 * Deliberately crude: a closed list, then a vowel-initial guess, then length.
 * It exists so the "easy" mode can produce a plausible tree from a plain
 * sentence, not to be a real tagger.
 */
export function guessPOS(word: string): string {
  const normalised = word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  for (const [tag, words] of Object.entries(SIMPLE_LEX)) {
    if (words.includes(normalised)) return tag;
  }
  if (/^[aeiouáéíóú]/.test(normalised)) return "v";
  if (normalised.length <= 3) return "det";
  return "n";
}

/**
 * Build a heuristic constituency tree from a plain sentence.
 * Groups determiner + adjectives + noun into an NP, prepositional phrases
 * into a PP, then hangs everything off the main verb.
 */
export function sentenceToTree(sentence: string): TreeNode {
  const words = String(sentence).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) throw new ParseError("Escribe una frase", 1, 1);

  const tagged: TreeNode[] = words.map((word) => {
    const node = leaf(word, 1, 1);
    node.pos = guessPOS(word);
    return node;
  });

  const groups: TreeNode[] = [];
  let i = 0;

  while (i < tagged.length) {
    const token = tagged[i]!;

    if (token.pos === "det" || (token.pos === "adj" && groups.length > 0)) {
      const np: TreeNode = { label: "NP", children: [token], isLeaf: false, line: 1, col: 1 };
      i += 1;
      while (i < tagged.length && ["adj", "n"].includes(tagged[i]!.pos ?? "")) {
        np.children.push(tagged[i]!);
        i += 1;
      }
      // A determiner on its own with no noun is not really a phrase.
      if (np.children.length === 1 && np.children[0]!.pos === "adj") {
        groups.push(np.children[0]!);
      } else {
        groups.push(np);
      }
    } else if (token.pos === "n") {
      groups.push({ label: "NP", children: [token], isLeaf: false, line: 1, col: 1 });
      i += 1;
    } else if (token.pos === "prep") {
      const pp: TreeNode = { label: "PP", children: [token], isLeaf: false, line: 1, col: 1 };
      i += 1;
      if (i < tagged.length && ["det", "n"].includes(tagged[i]!.pos ?? "")) {
        const inner: TreeNode = { label: "NP", children: [], isLeaf: false, line: 1, col: 1 };
        while (i < tagged.length && ["det", "adj", "n"].includes(tagged[i]!.pos ?? "")) {
          inner.children.push(tagged[i]!);
          i += 1;
        }
        if (inner.children.length > 0) pp.children.push(inner);
      }
      groups.push(pp);
    } else {
      groups.push(token);
      i += 1;
    }
  }

  // The main verb becomes the head of the VP.
  let verbIndex = groups.findIndex(
    (g) => (g.isLeaf && g.pos === "v") || (!g.isLeaf && g.label === "VP"),
  );
  if (verbIndex < 0) verbIndex = Math.min(1, groups.length - 1);

  const pre = groups.slice(0, verbIndex);
  const verb = groups[verbIndex]!;
  const post = groups.slice(verbIndex + 1);

  const vp: TreeNode = {
    label: "VP",
    children: [verb, ...post],
    isLeaf: false,
    line: 1,
    col: 1,
  };

  return {
    label: "S",
    children: [...pre, vp],
    isLeaf: false,
    line: 1,
    col: 1,
  };
}

export const PARSERS = {
  brackets: parseBrackets,
  dependency: parseDependency,
  outline: parseOutline,
  sentenceToTree,
  guessPOS,
} as const;
