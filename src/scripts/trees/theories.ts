/* ============================================================
   LinguaLab — reglas de buena formación por teoría

   Cada formalismo que el selector ofrece comprueba las reglas de su propia
   fuente, citada junto a cada regla. Un «error» es una violación de la teoría;
   una «nota» es una convención que conviene saber pero que no invalida el árbol.
   Los mensajes explican la regla, no solo la nombran: los lee un estudiante.

   Fuentes (todas en src/data/references.json, verificadas):
   - Universal Dependencies v2: de Marneffe et al. (2021) y las guías de
     universaldependencies.org (las 37 relaciones universales; «exactamente una
     palabra es la cabeza de la oración, dependiente de una RAÍZ nocional»).
   - Constituyentes: el esquema del Penn Treebank (Marcus et al. 1993), donde
     cada palabra cuelga de su etiqueta de categoría.
   - X-barra: Chomsky (1981), cap. 2: cada SX proyecta de un núcleo X de su misma
     categoría a través de X′; el especificador es hijo de SX.
   - Minimalismo: Chomsky (1995), Ensamble y estructura de frase escueta: Ensamble
     une exactamente dos objetos, la etiqueta se proyecta de uno de ellos y los
     niveles de barra no son primitivos.
   - Morfología: Haspelmath y Sims, *Understanding Morphology*: la estructura
     interna de la palabra es jerárquica, un afijo a la vez.
   ============================================================ */

import type { Locale } from "../../i18n";
import type { CheckResult } from "./check-result";
import type { TreeNode } from "./parse";

const es = (locale: Locale): boolean => locale === "es";

/** Las 37 relaciones universales de UD v2 (universaldependencies.org/u/dep/). */
export const UD_RELATIONS: ReadonlySet<string> = new Set([
  "acl", "advcl", "advmod", "amod", "appos", "aux", "case", "cc", "ccomp", "clf", "compound",
  "conj", "cop", "csubj", "dep", "det", "discourse", "dislocated", "expl", "fixed", "flat",
  "goeswith", "iobj", "list", "mark", "nmod", "nsubj", "nummod", "obj", "obl", "orphan",
  "parataxis", "punct", "reparandum", "root", "vocative", "xcomp",
]);

/** La relación base de un subtipo: «nsubj:pass» → «nsubj». */
const baseRelation = (rel: string): string => rel.split(":")[0]?.trim().toLowerCase() ?? "";

export function checkUdRelations(tree: TreeNode, locale: Locale): CheckResult[] {
  const nodes = tree.depMeta?.nodes ?? [];
  const out: CheckResult[] = [];
  const unknown = nodes.filter((node) => node.rel !== undefined && !UD_RELATIONS.has(baseRelation(node.rel)));
  if (unknown.length > 0) {
    const list = unknown.map((node) => `${node.word ?? node.label} (${node.rel})`).join(", ");
    out.push({
      level: "error",
      message: es(locale)
        ? `Relaciones que no son de UD v2: ${list}. UD tiene 37 relaciones universales (nsubj, obj, obl, det…); un subtipo se escribe «base:subtipo», como nsubj:pass.`
        : `Relations that are not UD v2: ${list}. UD has 37 universal relations (nsubj, obj, obl, det…); a subtype is written «base:subtype», like nsubj:pass.`,
    });
  }
  const misplacedRoot = nodes.filter(
    (node) => (node.head === 0) !== (node.rel !== undefined && baseRelation(node.rel) === "root"),
  );
  if (misplacedRoot.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `En UD, la palabra con cabeza 0 lleva la relación «root», y ninguna otra la lleva. Revisa: ${misplacedRoot.map((node) => node.word ?? node.label).join(", ")}.`
        : `In UD the word whose head is 0 takes the relation «root», and no other word does. Check: ${misplacedRoot.map((node) => node.word ?? node.label).join(", ")}.`,
    });
  }
  return out;
}

/** La categoría de una etiqueta: «NP» y «N'» → «N»; «Spec» no tiene. */
export const categoryOf = (label: string): string | null => {
  const clean = label.trim();
  // En español la proyección máxima se escribe al revés: SN, SV, SP, SAdj.
  const spanish = SPANISH_PHRASE.exec(clean);
  if (spanish?.[1] !== undefined) return spanish[1];
  const phrase = /^([A-Za-z]+?)P$/.exec(clean);
  if (phrase?.[1] !== undefined) return phrase[1];
  const barred = /^([A-Za-z]+?)['′]+$/.exec(clean);
  if (barred?.[1] !== undefined) return barred[1];
  return /^[A-Za-z]+$/.test(clean) && clean !== "Spec" ? clean : null;
};

/** «SN», «SAdj»: S seguida de la categoría con mayúscula (no «S» sola ni «Spec»). */
const SPANISH_PHRASE = /^S([A-Z][A-Za-z]*)$/;

const isPhrase = (label: string): boolean => {
  const clean = label.trim();
  return SPANISH_PHRASE.test(clean) || /^[A-Za-z]+?P$/.test(clean);
};
const isBar = (label: string): boolean => /^[A-Za-z]+?['′]+$/.test(label.trim());

const walk = (node: TreeNode, visit: (node: TreeNode, parent: TreeNode | null) => void, parent: TreeNode | null = null): void => {
  visit(node, parent);
  for (const child of node.children) walk(child, visit, node);
};

const tooWide = (tree: TreeNode): string[] => {
  const wide: string[] = [];
  walk(tree, (node) => {
    if (node.children.length > 2) wide.push(node.label);
  });
  return [...new Set(wide)];
};

/** Penn Treebank: cada palabra cuelga de su propia categoría. */
export function checkPreterminals(tree: TreeNode, locale: Locale): CheckResult[] {
  const loose: string[] = [];
  walk(tree, (node) => {
    if (node.children.length > 1) {
      for (const child of node.children) if (child.isLeaf) loose.push(child.label);
    }
  });
  if (loose.length === 0) return [];
  return [
    {
      level: "note",
      message: es(locale)
        ? `Palabras sueltas junto a otros constituyentes: ${loose.join(", ")}. En el esquema del Penn Treebank cada palabra cuelga de su categoría, por ejemplo [V canta].`
        : `Words standing next to other constituents: ${loose.join(", ")}. In the Penn Treebank scheme each word hangs from its category, for example [V sings].`,
    },
  ];
}

export function checkXbar(tree: TreeNode, locale: Locale): CheckResult[] {
  const out: CheckResult[] = [];
  const wide = tooWide(tree);
  if (wide.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `Ramificación no binaria en ${wide.join(", ")}. En X-barra cada nodo tiene una o dos hijas: el complemento es hermano del núcleo y cada adjunto se une a X′ de a uno.`
        : `Non-binary branching at ${wide.join(", ")}. In X-bar every node has one or two daughters: the complement is the head's sister and each adjunct attaches to X′ one at a time.`,
    });
  }
  const headless: string[] = [];
  const misplacedSpec: string[] = [];
  walk(tree, (node, parent) => {
    const label = node.label.trim();
    if (label === "Spec" && (parent === null || !isPhrase(parent.label))) misplacedSpec.push(parent?.label ?? label);
    if (node.isLeaf || !(isPhrase(label) || isBar(label))) return;
    const category = categoryOf(label);
    const projects = node.children.some((child) => {
      const childLabel = child.label.trim();
      // Un SX hijo de otro de la misma categoría es una adjunción a SX, que
      // Rección y Ligamiento admite; cuenta como la proyección que continúa.
      return !child.isLeaf && categoryOf(childLabel) === category && (!isPhrase(childLabel) || isPhrase(label));
    });
    if (!projects) headless.push(label);
  });
  if (headless.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `Sin núcleo de su categoría: ${[...new Set(headless)].join(", ")}. Cada SX tiene como hija una X′ (o la X) de la misma categoría, y cada X′ tiene una X′ o la X: así se proyecta el núcleo.`
        : `No head of its own category: ${[...new Set(headless)].join(", ")}. Every XP has an X′ (or the X) of the same category as a daughter, and every X′ has an X′ or the X: that is how the head projects.`,
    });
  }
  if (misplacedSpec.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `«Spec» (especificador) fuera de un SX, bajo ${[...new Set(misplacedSpec)].join(", ")}. El especificador es hijo de SX y hermano de X′.`
        : `«Spec» (specifier) outside an XP, under ${[...new Set(misplacedSpec)].join(", ")}. The specifier is a daughter of XP and the sister of X′.`,
    });
  }
  return out;
}

export function checkMinimalist(tree: TreeNode, locale: Locale): CheckResult[] {
  const out: CheckResult[] = [];
  const wide = tooWide(tree);
  if (wide.length > 0) {
    out.push({
      level: "error",
      message: es(locale)
        ? `Más de dos hijas en ${wide.join(", ")}. Ensamble une exactamente dos objetos sintácticos: la ramificación es binaria.`
        : `More than two daughters at ${wide.join(", ")}. Merge combines exactly two syntactic objects: branching is binary.`,
    });
  }
  const bars: string[] = [];
  walk(tree, (node) => {
    if (!node.isLeaf && isBar(node.label)) bars.push(node.label.trim());
  });
  if (bars.length > 0) {
    out.push({
      level: "note",
      message: es(locale)
        ? `Etiquetas de nivel intermedio: ${[...new Set(bars)].join(", ")}. En la estructura de frase escueta (Chomsky 1995) X′ no es un primitivo: es solo una proyección que no es ni mínima ni máxima. Muchos manuales la siguen escribiendo por claridad.`
        : `Intermediate-level labels: ${[...new Set(bars)].join(", ")}. In Bare Phrase Structure (Chomsky 1995) X′ is not a primitive: it is just a projection that is neither minimal nor maximal. Many textbooks still write it for clarity.`,
    });
  }
  return out;
}

export function checkMorphology(tree: TreeNode, locale: Locale): CheckResult[] {
  const wide = tooWide(tree);
  if (wide.length === 0) return [];
  return [
    {
      level: "note",
      message: es(locale)
        ? `Más de dos hijas en ${wide.join(", ")}. La estructura de la palabra suele analizarse de a un afijo por vez; tres hijas dejan sin decidir qué se unió primero (la ambigüedad de «unlockable» depende justo de eso).`
        : `More than two daughters at ${wide.join(", ")}. Word structure is usually analysed one affix at a time; three daughters leave open what attached first (the ambiguity of «unlockable» depends on exactly that).`,
    },
  ];
}
