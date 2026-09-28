/* ============================================================
   LinguaLab — ArborLab: cálculo de posiciones (layout)
   Algoritmo de Reingold–Tilford simplificado para árboles
   jerárquicos con ancho de etiqueta variable.
   Soporta bosques (varias raíces).
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    NODE_H: 54,       // altura del nodo
    H_GAP: 14,        // separación horizontal mínima entre hermanos
    V_GAP: 46,        // separación vertical entre niveles
    PAD: 40           // margen
  };

  function measure(label) {
    // ancho aproximado: 0.62em por carácter a 15px + padding
    var chars = String(label == null ? '' : label).length;
    return Math.max(46, chars * 9.4 + 22);
  }

  function layout(root, opts) {
    opts = opts || {};
    var gap = opts.gap != null ? opts.gap : CFG.H_GAP;
    var nodes = [];
    var idc = 0;

    // Fase 1: medir
    function measureTree(n, depth, parent) {
      n._id = idc++;
      n._depth = depth;
      n._parent = parent;
      n._w = measure(n.isLeaf ? n.label : (n.preLabel || n.label));
      n._children = n.children || [];
      if (n._children.length === 0) { n._tw = n._w; }
      else {
        var sum = 0;
        n._children.forEach(function (c, idx) {
          measureTree(c, depth + 1, n);
          sum += c._tw + (idx > 0 ? gap : 0);
        });
        n._tw = Math.max(n._w, sum);
      }
      return n;
    }

    // Fase 2: colocar
    function place(n, left) {
      var x;
      if (n._children.length === 0) {
        x = left + n._tw / 2;
      } else {
        var cur = left;
        n._children.forEach(function (c, idx) {
          if (idx > 0) cur += gap;
          place(c, cur);
          cur += c._tw;
        });
        var first = n._children[0], last = n._children[n._children.length - 1];
        x = (first._x + last._x) / 2;
        // Si el nodo mismo es más ancho, expandir hacia los lados
        if (n._w > n._tw) {
          var overflow = (n._w - n._tw) / 2;
          x = left + n._tw / 2;
          void overflow;
        }
      }
      n._x = x;
      n._y = CFG.PAD + n._depth * (CFG.NODE_H + CFG.V_GAP);
      nodes.push(n);
      return n;
    }

    measureTree(root, 0, null);

    // Bosque: si hay varias raíces, envolverlas
    var roots;
    if (root.forest || root.label === '' || root.multiRoot) {
      roots = root.children;
      // las coloca bajo un nodo virtual
      root._id = -1; root._depth = 0; root._children = roots;
      root._w = 0;
      var sum = 0;
      roots.forEach(function (c, i) { measureTree(c, 1, root); sum += c._tw + (i ? gap : 0); });
      root._tw = sum;
      var cur = 0;
      roots.forEach(function (c, i) {
        if (i > 0) cur += gap;
        place(c, cur);
        cur += c._tw;
      });
      root._x = (roots[0]._x + roots[roots.length - 1]._x) / 2;
      root._y = CFG.PAD;
      nodes.push(root);
    } else {
      place(root, 0);
    }

    // Normalizar: desplazar a origen
    var minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      var half = n._w / 2;
      if (n._x - half < minX) minX = n._x - half;
      if (n._x + half > maxX) maxX = n._x + half;
      if (n._y > maxY) maxY = n._y;
    });
    var dx = CFG.PAD - minX;
    nodes.forEach(function (n) { n._x += dx; });

    var width = (maxX + dx) + CFG.PAD;
    var height = maxY + CFG.NODE_H + CFG.PAD;

    return { nodes: nodes, root: root, width: width, height: height, cfg: CFG };
  }

  function maxDepth(n, d) {
    d = d || 0;
    var m = d;
    (n.children || []).forEach(function (c) { m = Math.max(m, maxDepth(c, d + 1)); });
    return m;
  }

  function countNodes(n) {
    var c = 1;
    (n.children || []).forEach(function (k) { c += countNodes(k); });
    return c;
  }

  function leaves(n) {
    if (!n.children || !n.children.length) return 1;
    var s = 0;
    n.children.forEach(function (k) { s += leaves(k); });
    return s;
  }

  function isBinary(n) {
    if (!n.children) return true;
    if (n.children.length > 2) return false;
    return n.children.every(isBinary);
  }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.layout = layout;
  window.LinguaLabTrees.metrics = {
    maxDepth: maxDepth, countNodes: countNodes, leaves: leaves, isBinary: isBinary
  };
})();
