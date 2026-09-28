import { describe, expect, it } from "vitest";
import { parseBrackets } from "./parse";
import {
  LAYOUT_CONFIG,
  countLeaves,
  countNodes,
  isBinary,
  layoutTree,
  maxDepth,
  measureLabel,
  type LayoutNode,
} from "./layout";

const tree = (source: string) => parseBrackets(source);

/** Find a laid-out node by its label. */
function find(layout: ReturnType<typeof layoutTree>, label: string): LayoutNode | undefined {
  return layout.nodes.find((n) => n.node.label === label);
}

describe("measureLabel", () => {
  it("has a floor so tiny labels still get a box", () => {
    expect(measureLabel("a")).toBe(46);
    expect(measureLabel("")).toBe(46);
  });

  it("grows with the number of characters", () => {
    expect(measureLabel("aaaa")).toBeGreaterThan(measureLabel("a"));
  });

  it("tolerates null and undefined", () => {
    expect(measureLabel(null)).toBe(46);
    expect(measureLabel(undefined)).toBe(46);
  });
});

describe("layoutTree — geometry", () => {
  it("places the root above its children", () => {
    const layout = layoutTree(tree("[S [NP el] [VP duerme]]"));
    expect(layout.root.y).toBeLessThan(find(layout, "el")!.y);
  });

  it("increases y by the level height", () => {
    const layout = layoutTree(tree("[A [B [C x]]]"));
    const a = find(layout, "A")!;
    const b = find(layout, "B")!;
    const c = find(layout, "C")!;
    const step = LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.vGap;
    expect(b.y - a.y).toBeCloseTo(step, 5);
    expect(c.y - b.y).toBeCloseTo(step, 5);
  });

  it("centres a parent over its children", () => {
    const layout = layoutTree(tree("[S [NP el] [VP duerme]]"));
    const np = find(layout, "NP")!;
    const vp = find(layout, "VP")!;
    expect(layout.root.x).toBeCloseTo((np.x + vp.x) / 2, 5);
  });

  it("keeps siblings from overlapping", () => {
    const layout = layoutTree(tree("[S [A a] [B b] [C c]]"));
    const siblings = layout.root.children.map((c) => c.x).sort((a, b) => a - b);
    for (let i = 1; i < siblings.length; i += 1) {
      expect(siblings[i]! - siblings[i - 1]!).toBeGreaterThan(0);
    }
  });

  it("keeps every node inside the reported bounds", () => {
    const layout = layoutTree(tree("[S [NP [Det el] [N gato]] [VP duerme]]"));
    for (const node of layout.nodes) {
      const half = node.width / 2;
      expect(node.x - half, node.node.label).toBeGreaterThanOrEqual(0);
      expect(node.x + half, node.node.label).toBeLessThanOrEqual(layout.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + LAYOUT_CONFIG.nodeHeight).toBeLessThanOrEqual(layout.height);
    }
  });

  it("reports a positive size even for a single node", () => {
    const layout = layoutTree(tree("[S]"));
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it("is wider for a wide tree than a narrow one", () => {
    const narrow = layoutTree(tree("[A [B b]]"));
    const wide = layoutTree(tree("[A [B b] [C c] [D d] [E e]]"));
    expect(wide.width).toBeGreaterThan(narrow.width);
  });

  it("is taller for a deep tree than a shallow one", () => {
    const shallow = layoutTree(tree("[A [B b]]"));
    const deep = layoutTree(tree("[A [B [C [D [E e]]]]]"));
    expect(deep.height).toBeGreaterThan(shallow.height);
  });

  it("honours a custom gap", () => {
    const tight = layoutTree(tree("[S [A a] [B b]]"), { gap: 0 });
    const loose = layoutTree(tree("[S [A a] [B b]]"), { gap: 100 });
    expect(loose.width).toBeGreaterThan(tight.width);
  });

  it("lays out a forest without losing a root", () => {
    const forest = {
      label: "",
      children: [tree("[A a]"), tree("[B b]")],
      isLeaf: false,
      line: 1,
      col: 1,
      forest: true,
    };
    const layout = layoutTree(forest);
    expect(find(layout, "a")).toBeDefined();
    expect(find(layout, "b")).toBeDefined();
  });

  it("does not mutate the tree it is given", () => {
    const source = tree("[S [NP el] [VP duerme]]");
    const before = JSON.stringify(source);
    layoutTree(source);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("can lay out the same tree twice with identical results", () => {
    const source = tree("[S [NP el] [VP duerme]]");
    const first = layoutTree(source);
    const second = layoutTree(source);
    expect(second.nodes.map((n) => [n.id, n.x, n.y])).toEqual(
      first.nodes.map((n) => [n.id, n.x, n.y]),
    );
  });

  it("gives every node a unique id", () => {
    const layout = layoutTree(tree("[S [A a] [B [C c]] [D d]]"));
    const ids = layout.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("records parent links consistently", () => {
    const layout = layoutTree(tree("[S [A a] [B b]]"));
    for (const node of layout.nodes) {
      for (const child of node.children) {
        expect(child.parent).toBe(node);
      }
    }
  });
});

describe("metrics", () => {
  it("counts nodes and leaves", () => {
    const source = tree("[S [NP el] [VP duerme]]");
    // S, NP, el, VP, duerme
    expect(countNodes(source)).toBe(5);
    // Only el and duerme: a node with one child is not a leaf.
    expect(countLeaves(source)).toBe(2);
  });

  it("measures depth in edges from the root", () => {
    expect(maxDepth(tree("[A]"))).toBe(0);
    expect(maxDepth(tree("[A [B b]]"))).toBe(2);
    expect(maxDepth(tree("[A [B [C c]]]"))).toBe(3);
  });

  it("detects non-binary branching", () => {
    expect(isBinary(tree("[S [A a] [B b]]"))).toBe(true);
    expect(isBinary(tree("[S [A a] [B b] [C c]]"))).toBe(false);
    expect(isBinary(tree("[S [A [B b] [C c]] [D d]]"))).toBe(true);
  });
});
