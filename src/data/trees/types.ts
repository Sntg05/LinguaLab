/* ============================================================
   LinguaLab — ArborLab tree type registry
   Ported from the TYPES array in legacy/js/trees/app.js. Each type
   declares which parser and options it needs, so the page can drive the
   right pipeline from one table.
   ============================================================ */

/** Which pipeline builds the tree. */
export type TreeMode = "dep" | "bracket" | "outline" | "data" | "table";

export interface TreeType {
  id: string;
  group_es: string;
  group_en: string;
  name_es: string;
  name_en: string;
  mode: TreeMode;
  blurb_es: string;
  blurb_en: string;
  hint_es: string;
  hint_en: string;
  /** Extra checks to apply. */
  opts?: { xbar?: boolean };
}

export const TREE_TYPES: readonly TreeType[] = [
  {
    "id": "dependency",
    "group_es": "Análisis de dependencias",
    "group_en": "Dependency analysis",
    "name_es": "Dependencia (UD)",
    "name_en": "Dependency (UD)",
    "mode": "dep",
    "blurb_es": "Cada nodo es una palabra; los arcos van de la cabeza a su dependiente con la relación gramatical.",
    "blurb_en": "Every node is a word; arcs run from the head to its dependent, labelled with the relation.",
    "hint_es": "Cada línea: id palabra cabeza relación POS · o CoNLL-U completo.",
    "hint_en": "Each line: id word head relation POS · or full CoNLL-U."
  },
  {
    "id": "constituency",
    "group_es": "Análisis de constituyentes",
    "group_en": "Constituency analysis",
    "name_es": "Constitución (frases)",
    "name_en": "Constituency (phrases)",
    "mode": "bracket",
    "blurb_es": "La frase se descompone en sintagmas anidados hasta llegar a las palabras.",
    "blurb_en": "The sentence splits into nested phrases down to the words.",
    "hint_es": "[S [SN [Det el] [N gato]]] o Penn (S (DT el) (NN gato)).",
    "hint_en": "[S [NP [DT the] [NN cat]]] or Penn (S (DT the) (NN cat))."
  },
  {
    "id": "xbar",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "X-bar",
    "name_en": "X-bar",
    "mode": "bracket",
    "opts": {
      "xbar": true
    },
    "blurb_es": "Toda proyección tiene núcleo, complemento, adjunto y espéculo; ramificación estrictamente binaria.",
    "blurb_en": "Every projection has a head, complement, adjunct and specifier; strictly binary branching.",
    "hint_es": "[NP [Spec [Det the]] [N' [N student] [PP of physics]]]",
    "hint_en": "[NP [Spec [Det the]] [N' [N student] [PP of physics]]]"
  },
  {
    "id": "movement",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "Movimiento (GB)",
    "name_en": "Movement (GB)",
    "mode": "bracket",
    "blurb_es": "D-estructura vs S-estructura: huellas {t}, PRO y flechas de movimiento con chequeo de c-command.",
    "blurb_en": "D-structure vs S-structure: traces {t}, PRO and movement arrows with c-command checking.",
    "hint_es": "Usa #id en nodos y  move: origen -> destino \"etiqueta\"",
    "hint_en": "Use #id on nodes and  move: from -> to \"label\""
  },
  {
    "id": "minimalist",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "Minimalista",
    "name_en": "Minimalist",
    "mode": "bracket",
    "blurb_es": "Merge externo e interno: copias inferiores tachadas, edge de vP y fases.",
    "blurb_en": "External and internal Merge: lower copies struck through, vP edge and phases.",
    "hint_es": "Escribe copias como <palabra> para dibujarlas tachadas.",
    "hint_en": "Write copies as <word> to draw them struck through."
  },
  {
    "id": "cartography",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "Cartográfica",
    "name_en": "Cartographic",
    "mode": "bracket",
    "blurb_es": "Split-CP y orden fino de adverbios: ForceP, TopP, FocP, FinP.",
    "blurb_en": "Split-CP and fine adverb order: ForceP, TopP, FocP, FinP.",
    "hint_es": "[ForceP [Force Ø] [TopP [Top that] [FinP ...]]]",
    "hint_en": "[ForceP [Force Ø] [TopP [Top that] [FinP ...]]]"
  },
  {
    "id": "ccg",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "CCG (derivaciones)",
    "name_en": "CCG (derivations)",
    "mode": "bracket",
    "blurb_es": "Categorías funcionales X/Y y X\\Y; derivaciones dibujadas de abajo arriba.",
    "blurb_en": "Functional categories X/Y and X\\Y; derivations drawn bottom-up.",
    "hint_es": "[S\\NP]/NP   ·   [conj [S/NP cooked] [S/NP ate]]",
    "hint_en": "[S\\NP]/NP   ·   [conj [S/NP cooked] [S/NP ate]]"
  },
  {
    "id": "lfg",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "LFG (c/f-estructura)",
    "name_en": "LFG (c/f-structure)",
    "mode": "bracket",
    "blurb_es": "Estructura de constituyentes y funciones gramaticales en paralelo.",
    "blurb_en": "Constituency structure and grammatical functions in parallel.",
    "hint_es": "[IP [NP María] [I' [I lee] [NP un libro]]]",
    "hint_en": "[IP [NP Mary] [I' [I reads] [NP a book]]]"
  },
  {
    "id": "hpsg",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "HPSG (rasgos)",
    "name_en": "HPSG (features)",
    "mode": "bracket",
    "blurb_es": "Matrices de atributo-valor con estructura compartida [1].",
    "blurb_en": "Attribute-value matrices with structure sharing [1].",
    "hint_es": "[Sign [HEAD verb] [SUBJ ⟨DP⟩]]",
    "hint_en": "[Sign [HEAD verb] [SUBJ ⟨DP⟩]]"
  },
  {
    "id": "relational",
    "group_es": "Teoría sintáctica",
    "group_en": "Syntactic theory",
    "name_es": "Gramática relacional",
    "name_en": "Relational Grammar",
    "mode": "bracket",
    "blurb_es": "Relaciones gramaticales por estratos: 1 sujeto, 2 objeto, 3 indirecto, Cho chômeur.",
    "blurb_en": "Grammatical relations per stratum: 1 subject, 2 object, 3 indirect, Cho chômeur.",
    "hint_es": "[Cláusula [1,2 libro] [2,1 leído]]",
    "hint_en": "[Clause [1,2 book] [2,1 read]]"
  },
  {
    "id": "semantic",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "Semántica (LF)",
    "name_en": "Semantic (LF)",
    "mode": "bracket",
    "blurb_es": "Tipos e, t, ⟨e,t⟩ y elevación de cuantificadores.",
    "blurb_en": "Types e, t, ⟨e,t⟩ and quantifier raising.",
    "hint_es": "[VP sleeps [type ⟨e,t⟩]]",
    "hint_en": "[VP sleeps [type ⟨e,t⟩]]"
  },
  {
    "id": "tag",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "TAG (adición)",
    "name_en": "TAG (adjoining)",
    "mode": "bracket",
    "blurb_es": "Árboles elementales iniciales (α) y auxiliares (β) con nodo pie *.",
    "blurb_en": "Elementary initial (α) and auxiliary (β) trees with foot node *.",
    "hint_es": "[β [S* [AdjP often] [S*]]]",
    "hint_en": "[β [S* [AdjP often] [S*]]]"
  },
  {
    "id": "reedkellogg",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "Reed–Kellogg",
    "name_en": "Reed–Kellogg",
    "mode": "bracket",
    "blurb_es": "Diagramas clásicos de línea base: sujeto | predicado, complementos y modificadores.",
    "blurb_en": "Classic baseline diagrams: subject | predicate, complements and modifiers.",
    "hint_es": "[Línea [Suj gato] [Pred [V saltó] [O cerca]]]",
    "hint_en": "[Line [Subj cat] [Pred [V jumped] [Obj fence]]]"
  },
  {
    "id": "morphology",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "Estructura de palabra",
    "name_en": "Word structure",
    "mode": "bracket",
    "blurb_es": "Orden de afijación: prefijos, raíz y sufijos; ambigüedad léxica.",
    "blurb_en": "Affixation order: prefixes, root and suffixes; lexical ambiguity.",
    "hint_es": "[Palabra [Pref un-] [Base [Base lock] [Suf -able]]]",
    "hint_en": "[Word [Pref un-] [Base [Base lock] [Suf -able]]]"
  },
  {
    "id": "general",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "Jerarquía general",
    "name_en": "General hierarchy",
    "mode": "outline",
    "blurb_es": "Árbol libre por sangría: índices, carpetas, taxonomías, familias.",
    "blurb_en": "Free tree by indentation: outlines, folders, taxonomies, families.",
    "hint_es": "Un elemento por línea; sangría para hijos;  |  para una nota.",
    "hint_en": "One item per line; indent for children;  |  for a note."
  },
  {
    "id": "bst",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Árbol binario de búsqueda",
    "name_en": "Binary search tree",
    "mode": "data",
    "blurb_es": "Izquierda menor, derecha mayor: búsqueda, inserción y borrado con sus tres casos.",
    "blurb_en": "Left smaller, right larger: search, insert and delete with its three cases.",
    "hint_es": "Una lista de números separados por espacios. Añade  buscar: n  para buscar.",
    "hint_en": "A list of numbers separated by spaces. Add  search: n  to search."
  },
  {
    "id": "avl",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "AVL",
    "name_en": "AVL",
    "mode": "data",
    "blurb_es": "Primer árbol autoequilibrado: factor de balance y cuatro rotaciones.",
    "blurb_en": "First self-balancing tree: balance factor and four rotations.",
    "hint_es": "Números separados por espacios. Se muestran los factores bf.",
    "hint_en": "Numbers separated by spaces. Balance factors bf are shown."
  },
  {
    "id": "redblack",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Rojo-negro",
    "name_en": "Red-black",
    "mode": "data",
    "blurb_es": "Cinco invariantes de coloración y recoloreo/rotación tras cada inserción.",
    "blurb_en": "Five colour invariants and recolour/rotation after each insertion.",
    "hint_es": "Números separados por espacios ● rojo  ○ negro.",
    "hint_en": "Numbers separated by spaces ● red  ○ black."
  },
  {
    "id": "heap",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Heap (min/max)",
    "name_en": "Heap (min/max)",
    "mode": "data",
    "blurb_es": "Árbol completo en array: sift up y sift down, hijo en 2i+1 y 2i+2.",
    "blurb_en": "Complete tree in an array: sift up and sift down, child at 2i+1 and 2i+2.",
    "hint_es": "Números separados por espacios. Usa las casillas para max-heap o extraer.",
    "hint_en": "Numbers separated by spaces. Use the boxes for max-heap or extract."
  },
  {
    "id": "trie",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Trie (prefijos)",
    "name_en": "Trie (prefix)",
    "mode": "data",
    "blurb_es": "Una letra por nivel: búsqueda O(m) y autocompletado. Compresión radix opcional.",
    "blurb_en": "One letter per level: O(m) lookup and autocomplete. Optional radix compression.",
    "hint_es": "Una palabra por línea.",
    "hint_en": "One word per line."
  },
  {
    "id": "expr",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Árbol de expresión",
    "name_en": "Expression tree",
    "mode": "data",
    "blurb_es": "Precedencia visible y recorridos pre/in/post-fijo; evaluación post-orden.",
    "blurb_en": "Visible precedence and pre/in/post-order traversals; post-order evaluation.",
    "hint_es": "Ej.: 3 + 4 * 2   ·  (a + b) * sqrt(c)",
    "hint_en": "E.g.: 3 + 4 * 2   ·  (a + b) * sqrt(c)"
  },
  {
    "id": "huffman",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Huffman",
    "name_en": "Huffman",
    "mode": "data",
    "blurb_es": "Códigos prefijos óptimos comparados con 8 bits y con la entropía.",
    "blurb_en": "Optimal prefix codes compared with 8 bits and with the entropy.",
    "hint_es": "Cualquier texto; se calculan frecuencias por carácter.",
    "hint_en": "Any text; character frequencies are computed."
  },
  {
    "id": "comparison",
    "group_es": "Estructuras de datos",
    "group_en": "Data structures",
    "name_es": "Tabla comparativa",
    "name_en": "Comparison table",
    "mode": "table",
    "blurb_es": "Complejidades de búsqueda, inserción y borrado de cada estructura.",
    "blurb_en": "Search, insert and delete complexity of each structure.",
    "hint_es": "No requiere entrada.",
    "hint_en": "No input required."
  }
];

/** Types grouped for the sidebar, preserving the declared order. */
export interface TreeGroup {
  name_es: string;
  name_en: string;
  types: TreeType[];
}

export const TREE_GROUPS: readonly TreeGroup[] = TREE_TYPES.reduce<TreeGroup[]>((groups, type) => {
  const last = groups[groups.length - 1];
  if (last && last.name_en === type.group_en) {
    last.types.push(type);
    return groups;
  }
  groups.push({ name_es: type.group_es, name_en: type.group_en, types: [type] });
  return groups;
}, []);

export function treeType(id: string): TreeType | undefined {
  return TREE_TYPES.find((type) => type.id === id);
}

/** Types that take a numeric or word sequence rather than a notation. */
export function isDataMode(type: TreeType): boolean {
  return type.mode === "data";
}
