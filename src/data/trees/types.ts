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
  /**
   * La teoría cuyas reglas de buena formación se comprueban
   * (`src/scripts/trees/theories.ts`). Sin teoría, solo se dibuja.
   */
  theory?: TreeTheory;
}

/** Los formalismos con reglas propias comprobadas contra su fuente. */
export type TreeTheory = "dependency" | "constituency" | "xbar" | "movement" | "minimalist" | "morphology";

/**
 * Formalismos que estuvieron en el selector y se retiraron (decisión D3 del
 * dueño, 2026-11-20). Se dibujaban con el mismo analizador de corchetes que los
 * árboles de constituyentes, y ninguno de ellos es un árbol de constituyentes:
 * mostrarlos así era enseñar otra cosa con su nombre. Se nombran en la página,
 * con el motivo, para que nadie crea que se olvidaron.
 */
export interface RetiredTreeType {
  readonly id: string;
  readonly name_es: string;
  readonly name_en: string;
  readonly reason_es: string;
  readonly reason_en: string;
}

export const RETIRED_TREE_TYPES: readonly RetiredTreeType[] = [
  {
    id: "ccg",
    name_es: "Gramática categorial combinatoria (CCG)",
    name_en: "Combinatory Categorial Grammar (CCG)",
    reason_es: "Una derivación de CCG combina categorías con reglas (aplicación, composición), y se dibuja como una prueba, no como un árbol de corchetes.",
    reason_en: "A CCG derivation combines categories with rules (application, composition) and is drawn as a proof, not as a bracketed tree.",
  },
  {
    id: "lfg",
    name_es: "Gramática léxico-funcional (LFG)",
    name_en: "Lexical-Functional Grammar (LFG)",
    reason_es: "La LFG tiene dos estructuras a la vez, la de constituyentes y la funcional (una matriz de rasgos), unidas por una correspondencia que un solo árbol no muestra.",
    reason_en: "LFG has two structures at once, constituent and functional (a feature matrix), linked by a correspondence a single tree cannot show.",
  },
  {
    id: "hpsg",
    name_es: "HPSG",
    name_en: "HPSG",
    reason_es: "La HPSG representa los signos como matrices de atributo y valor con estructura compartida, que no son nodos de un árbol de corchetes.",
    reason_en: "HPSG represents signs as attribute-value matrices with structure sharing, which are not the nodes of a bracketed tree.",
  },
  {
    id: "relational",
    name_es: "Gramática relacional",
    name_en: "Relational Grammar",
    reason_es: "La gramática relacional describe estratos de relaciones gramaticales (1, 2, 3, chômeur) que se dibujan como redes de arcos por estrato, no como corchetes.",
    reason_en: "Relational Grammar describes strata of grammatical relations (1, 2, 3, chômeur), drawn as stratal arc networks, not as brackets.",
  },
  {
    id: "semantic",
    name_es: "Semántica (forma lógica)",
    name_en: "Semantics (logical form)",
    reason_es: "Un árbol semántico necesita tipos y reglas de composición que se comprueben (e, t, ⟨e,t⟩); sin ellas, era solo un dibujo con etiquetas.",
    reason_en: "A semantic tree needs types and composition rules that are checked (e, t, ⟨e,t⟩); without them it was only a drawing with labels.",
  },
  {
    id: "tag",
    name_es: "Gramática de adjunción de árboles (TAG)",
    name_en: "Tree-Adjoining Grammar (TAG)",
    reason_es: "La TAG combina árboles elementales por sustitución y adjunción; lo que importa es la derivación entre árboles, que aquí no se representaba.",
    reason_en: "TAG combines elementary trees by substitution and adjunction; what matters is the derivation between trees, which was not represented here.",
  },
  {
    id: "reedkellogg",
    name_es: "Diagrama de Reed–Kellogg",
    name_en: "Reed–Kellogg diagram",
    reason_es: "El diagrama de Reed–Kellogg es un dibujo de líneas horizontales y diagonales con su propia convención, no un árbol: forzarlo a corchetes lo desfiguraba.",
    reason_en: "A Reed–Kellogg diagram is a drawing of horizontal and slanted lines with its own convention, not a tree: forcing it into brackets distorted it.",
  },
  {
    id: "cartography",
    name_es: "Cartografía sintáctica",
    name_en: "Syntactic cartography",
    reason_es: "La cartografía depende de un orden fijo de proyecciones funcionales (Force, Top, Foc, Fin…) que había que comprobar; sin esa comprobación, el dibujo no enseñaba la teoría.",
    reason_en: "Cartography depends on a fixed order of functional projections (Force, Top, Foc, Fin…) that would have to be checked; without that check, the drawing did not teach the theory.",
  },
];

export const TREE_TYPES: readonly TreeType[] = [
  {
    "id": "dependency",
    "group_es": "Análisis de dependencias",
    "group_en": "Dependency analysis",
    "name_es": "Dependencia (UD)",
    "name_en": "Dependency (UD)",
    "mode": "dep",
    "theory": "dependency",
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
    "theory": "constituency",
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
    "theory": "xbar",
    "blurb_es": "Toda proyección tiene un núcleo (X) que proyecta X′ y SX. El complemento es hermano del núcleo, el adjunto se une a X′ y el especificador es hijo de SX; los tres son opcionales. Ramificación binaria.",
    "blurb_en": "Every projection has a head (X) that projects X′ and XP. The complement is the sister of the head, an adjunct attaches to X′ and the specifier is a daughter of XP; all three are optional. Binary branching.",
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
    "theory": "movement",
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
    "theory": "minimalist",
    "blurb_es": "Merge externo e interno: copias inferiores tachadas, edge de vP y fases.",
    "blurb_en": "External and internal Merge: lower copies struck through, vP edge and phases.",
    "hint_es": "Escribe copias como <palabra> para dibujarlas tachadas.",
    "hint_en": "Write copies as <word> to draw them struck through."
  },
  {
    "id": "morphology",
    "group_es": "Otros formalismos",
    "group_en": "Other formalisms",
    "name_es": "Estructura de palabra",
    "name_en": "Word structure",
    "mode": "bracket",
    "theory": "morphology",
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
