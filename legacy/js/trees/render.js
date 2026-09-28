/* ============================================================
   LinguaLab — ArborLab: render SVG
   Dibuja nodos, ramas, índices, superíndices, rasgos, triángulos,
   nodos en caja (huellas/PRO), copias inferiores y flechas de
   movimiento (dashed).
   Usa currentColor + variables CSS → se adapta al tema.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- Analiza una etiqueta y la descompone ---------- */
  // soporta: base_i (índice), X^{max} (superíndice), T[uφ,EPP] (rasgos),
  //          {t_i} (caja), <copia> (baja y tachada), NP! (resaltado),
  //          [DP^ texto] triángulo, label@ARCO, label::"nota"
  function parseLabel(raw) {
    var s = String(raw == null ? '' : raw);
    var out = { base: s, sub: '', sup: '', feats: '', boxed: false, copy: false,
                highlight: false, arc: '', note: '', triangle: false, hidden: false };

    if (!s) return out;

    // hidden (nodo sintético)
    if (s === 'ε' || s === '0' || s === '∅') out.hidden = true;

    // resaltado NP!
    if (/!$/.test(s)) { out.highlight = true; s = s.replace(/!$/, ''); }

    // arco label@SUBJ
    var at = s.split('@');
    if (at.length === 2) { out.arc = at[1]; s = at[0]; }

    // nota label::"texto"
    var dc = s.split('::');
    if (dc.length >= 2) { out.note = dc.slice(1).join('::').replace(/^"|"$/g, ''); s = dc[0]; }

    // triángulo DP^
    if (/\^/.test(s) && !/\^\{/.test(s)) { out.triangle = true; s = s.replace(/\^/, ''); }

    // copia inferior <texto>
    if (/^<.*>$/.test(s)) { out.copy = true; s = s.slice(1, -1); }

    // caja {t_i}
    if (/^\{.*\}$/.test(s)) { out.boxed = true; s = s.slice(1, -1); }

    // superíndice X^{max} o X^max
    var supM = s.match(/\^\{([^}]*)\}|\^(\w+)/);
    if (supM) { out.sup = supM[1] || supM[2]; s = s.replace(supM[0], ''); }

    // rasgos [uφ, EPP]
    var feM = s.match(/\[([^\]]*)\]/);
    if (feM) { out.feats = feM[1]; s = s.replace(feM[0], ''); }

    // índice _i o _{1,2}
    var idxM = s.match(/_\{([^}]*)\}|_(\w)/);
    if (idxM) { out.sub = idxM[1] || idxM[2]; s = s.replace(idxM[0], ''); }

    out.base = s.trim();
    if (!out.base) out.base = raw;
    return out;
  }

  /* ---------- Ancho estimado de una etiqueta ---------- */
  function labelWidth(parsed) {
    var base = parsed.base.replace(/_/g, ' ');
    var w = Math.max(40, base.length * 9.6 + 16);
    if (parsed.feats) w += parsed.feats.length * 5.4;
    if (parsed.sup) w += parsed.sup.length * 5;
    if (parsed.sub) w += parsed.sub.length * 5;
    return Math.min(w, 240);
  }

  /* ---------- Dibuja un nodo ---------- */
  function drawNode(g, n, theme) {
    var p = parseLabel(n.label);
    n._parsed = p;
    var x = n._x, y = n._y;
    var w = labelWidth(p);
    n._w = Math.max(n._w, w);
    var half = w / 2;
    var NODE_H = 34;

    var stroke = theme.stroke || 'currentColor';
    var accent = theme.accent || 'var(--teal)';
    var plum = theme.plum || 'var(--gold)';
    var muted = theme.muted || 'var(--slate)';

    // Etiqueta del arco (arriba de la línea)
    if (p.arc) {
      g.appendChild(el('text', {
        x: x, y: y - 8, 'text-anchor': 'middle',
        'font-family': 'var(--mono)', 'font-size': '9.5',
        fill: plum, 'letter-spacing': '.08em'
      }, p.arc));
    }

    if (p.triangle) {
      // Triángulo sobre palabras no analizadas
      var baseY = y + NODE_H;
      g.appendChild(el('polygon', {
        points: (x - half) + ',' + baseY + ' ' + (x + half) + ',' + baseY + ' ' + x + ',' + y,
        fill: 'none', stroke: stroke, 'stroke-width': '1.4', opacity: '.75'
      }));
    } else if (p.boxed) {
      g.appendChild(el('rect', {
        x: x - half, y: y, width: w, height: NODE_H, rx: '7',
        fill: 'none', stroke: accent, 'stroke-width': '1.6',
        'stroke-dasharray': '5 3'
      }));
    } else {
      // Píldora estándar
      var fill = p.highlight ? 'var(--teal-lite)' :
                 (n.isLeaf ? 'var(--surface)' : 'transparent');
      var strokeCol = n.isLeaf ? muted : (p.highlight ? accent : stroke);
      g.appendChild(el('rect', {
        x: x - half, y: y, width: w, height: NODE_H, rx: '9',
        fill: fill, stroke: strokeCol,
        'stroke-width': n.isLeaf ? '1.2' : '1.6',
        opacity: p.copy ? '.55' : '1'
      }));
    }

    // Texto base
    var tx = el('text', {
      x: x, y: y + NODE_H / 2 + 5, 'text-anchor': 'middle',
      'font-family': n.isLeaf ? 'var(--serif)' : 'var(--sans)',
      'font-size': n.isLeaf ? '15' : '13.5',
      'font-weight': n.isLeaf ? '600' : '700',
      fill: p.copy ? muted : (n.isLeaf ? 'var(--ink)' : accent),
      'text-decoration': p.copy ? 'line-through' : 'none',
      opacity: p.copy ? '.6' : '1'
    }, p.base.replace(/_/g, ' '));
    g.appendChild(tx);

    // Índice inferior
    if (p.sub) {
      g.appendChild(el('text', {
        x: x + half - 6, y: y + NODE_H - 3, 'text-anchor': 'end',
        'font-family': 'var(--mono)', 'font-size': '9.5', fill: muted
      }, p.sub));
    }
    // Superíndice
    if (p.sup) {
      g.appendChild(el('text', {
        x: x - half + 6, y: y + 11, 'text-anchor': 'start',
        'font-family': 'var(--mono)', 'font-size': '9.5', fill: plum
      }, p.sup));
    }
    // Rasgos
    if (p.feats) {
      g.appendChild(el('text', {
        x: x, y: y + NODE_H + 12, 'text-anchor': 'middle',
        'font-family': 'var(--mono)', 'font-size': '9', fill: plum, opacity: '.9'
      }, '[' + p.feats + ']'));
    }
    // Nota
    if (p.note) {
      g.appendChild(el('text', {
        x: x, y: y - (p.arc ? 20 : 8), 'text-anchor': 'middle',
        'font-family': 'var(--mono)', 'font-size': '8.5', fill: muted, opacity: '.85'
      }, p.note));
    }

    n._half = half;
    n._boxH = NODE_H;
    return n;
  }

  /* ---------- Ramas ---------- */
  function drawEdges(g, n, theme) {
    if (!n.children || !n.children.length) return;
    var stroke = theme.stroke || 'currentColor';
    n.children.forEach(function (c) {
      var x1 = n._x, y1 = n._y + (n._boxH || 34);
      var x2 = c._x, y2 = c._y;
      // Línea en L o diagonal
      var midY = y1 + (y2 - y1) * 0.5;
      g.appendChild(el('path', {
        d: 'M' + x1 + ',' + y1 + ' L' + x1 + ',' + midY + ' L' + x2 + ',' + midY + ' L' + x2 + ',' + y2,
        fill: 'none', stroke: stroke, 'stroke-width': '1.5', opacity: '.7'
      }));
      drawEdges(g, c, theme);
    });
  }

  /* ---------- Flechas de movimiento (líneas directive: move: a -> b) ---------- */
  function drawArrows(g, layoutNodes, directives, theme) {
    if (!directives || !directives.length) return;
    var byId = {};
    layoutNodes.forEach(function (n) { if (n._idObj) byId[n._idObj] = n; });

    directives.forEach(function (d) {
      var a = byId[d.from], b = byId[d.to];
      if (!a || !b) return;
      var y = Math.max(a._y, b._y) + 46;
      var dashed = d.style !== 'solid';
      var color = d.color === 'red' ? 'var(--warn)' :
                  d.color === 'grey' || d.color === 'gray' ? 'var(--line2)' :
                  d.color === 'green' ? 'var(--ok)' : 'var(--teal)';
      var path = el('path', {
        d: 'M' + a._x + ',' + (a._y + 34) + ' Q' + ((a._x + b._x) / 2) + ',' + (y + 20) +
           ' ' + b._x + ',' + (b._y + 34),
        fill: 'none', stroke: color, 'stroke-width': '1.5',
        'stroke-dasharray': dashed ? '6 4' : 'none', opacity: '.9'
      });
      g.appendChild(path);
      // Punta de flecha hacia el destino
      g.appendChild(el('polygon', {
        points: b._x + ',' + (b._y + 34) + ' ' + (b._x - 4) + ',' + (b._y + 42) + ' ' +
                (b._x + 4) + ',' + (b._y + 42),
        fill: color
      }));
      if (d.label) {
        g.appendChild(el('text', {
          x: (a._x + b._x) / 2, y: y + 26, 'text-anchor': 'middle',
          'font-family': 'var(--mono)', 'font-size': '9.5', fill: color
        }, d.label));
      }
    });
  }

  /* ---------- Render completo ---------- */
  function render(tree, opts) {
    opts = opts || {};
    var theme = opts.theme || {};
    var L = window.LinguaLabTrees.layout(tree, opts);
    var svg = el('svg', {
      xmlns: NS,
      width: Math.max(L.width, 200),
      height: Math.max(L.height, 160),
      viewBox: '0 0 ' + Math.max(L.width, 200) + ' ' + Math.max(L.height, 160),
      role: 'img',
      'aria-label': opts.alt || 'Árbol sintáctico'
    });
    svg.style.color = 'var(--ink)';

    var gEdges = el('g', { class: 'edges' });
    var gNodes = el('g', { class: 'nodes' });
    svg.appendChild(gEdges);
    svg.appendChild(gNodes);

    // ids de movimiento
    L.nodes.forEach(function (n) {
      var p = parseLabel(n.label);
      var idm = n.label.match(/#(\w+)/);
      if (idm) n._idObj = idm[1];
      void p;
    });

    L.nodes.forEach(function (n) { drawNode(gNodes, n, theme); });
    drawEdges(gEdges, L.root, theme);
    drawArrows(gNodes, L.nodes, opts.directives, theme);

    return { svg: svg, layout: L };
  }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.render = render;
  window.LinguaLabTrees.parseLabel = parseLabel;
})();
