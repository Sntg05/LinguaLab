/* ============================================================
   LinguaLab — ArborLab: solvers de estructuras de datos
   BST, AVL, rojo-negro, heap, trie, árbol de expresión, Huffman.
   Cada solver devuelve un árbol {label, children} y un log.
   ============================================================ */
(function () {
  'use strict';

  function node(label, children) {
    return { label: String(label), children: children || [], isLeaf: !(children && children.length),
             line: 1, col: 1 };
  }
  function log() { return { lines: [] , push: function (s) { this.lines.push(s); } }; }

  function nums(text) {
    return String(text).split(/[\s,;]+/).map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return !isNaN(x); });
  }

  /* ---------------- BST ---------------- */
  function buildBST(values, opts) {
    opts = opts || {};
    var L = log();
    var root = null;
    function insert(v) {
      var path = [];
      if (!root) { root = { v: v, l: null, r: null }; L.push('insert ' + v + ' → raíz'); return; }
      var cur = root;
      while (true) {
        if (v === cur.v) { L.push('insert ' + v + ' → duplicado, omitido'); return; }
        var goLeft = v < cur.v;
        path.push(goLeft ? 'L' : 'R');
        if (goLeft) {
          if (!cur.l) { cur.l = { v: v, l: null, r: null }; break; }
          cur = cur.l;
        } else {
          if (!cur.r) { cur.r = { v: v, l: null, r: null }; break; }
          cur = cur.r;
        }
      }
      L.push('insert ' + v + ' → ' + (path.join('') || 'raíz') + ' (' + height() + ' niveles)');
    }
    function height(n) {
      if (arguments.length === 0) n = root;
      if (!n) return 0;
      return 1 + Math.max(height(n.l), height(n.r));
    }

    values.forEach(insert);

    if (opts.search != null && opts.search !== '') {
      var target = parseInt(opts.search, 10), cur = root, steps = 0, found = false;
      if (isNaN(target)) { L.push('buscar ' + opts.search + ' → no es un número válido'); }
      else {
      while (cur) {
        steps++;
        if (target === cur.v) { found = true; break; }
        cur = target < cur.v ? cur.l : cur.r;
      }
      L.push(found ? 'buscar ' + target + ' → encontrado en ' + steps + ' comparaciones'
                   : 'buscar ' + target + ' → no encontrado (' + steps + ' comparaciones)');
      }
    }

    function toTree(n) {
      if (!n) return null;
      var kids = [];
      var l = toTree(n.l), r = toTree(n.r);
      if (l) kids.push(l);
      if (r) kids.push(r);
      return node(n.v, kids);
    }
    var t = toTree(root) || node('vacío', []);
    return { tree: t, log: L.lines, height: height(), count: values.length };
  }

  /* ---------------- AVL ---------------- */
  function buildAVL(values) {
    var L = log();
    var rotations = [];
    var root = null;

    function h(n) { return n ? n.h : 0; }
    function upd(n) { n.h = 1 + Math.max(h(n.l), h(n.r)); return n; }
    function bf(n) { return h(n.l) - h(n.r); }

    function rotR(y) {
      var x = y.l, T2 = x.r;
      x.r = y; y.l = T2;
      rotations.push('rotación derecha en ' + y.v);
      return upd(y), upd(x), x;
    }
    function rotL(x) {
      var y = x.r, T2 = y.l;
      y.l = x; x.r = T2;
      rotations.push('rotación izquierda en ' + x.v);
      return upd(x), upd(y), y;
    }

    function insert(n, v) {
      if (!n) { L.push('insert ' + v + ' → hoja'); return nodeAVL(v); }
      if (v < n.v) n.l = insert(n.l, v);
      else if (v > n.v) n.r = insert(n.r, v);
      else { L.push('insert ' + v + ' → duplicado, omitido'); return n; }

      upd(n);
      var b = bf(n);
      if (b > 1 && v < n.l.v) { L.push('factor +2 en ' + n.v + ' → LL'); return rotR(n); }
      if (b < -1 && v > n.r.v) { L.push('factor -2 en ' + n.v + ' → RR'); return rotL(n); }
      if (b > 1 && v > n.l.v) { L.push('factor +2 en ' + n.v + ' → LR'); n.l = rotL(n.l); return rotR(n); }
      if (b < -1 && v < n.r.v) { L.push('factor -2 en ' + n.v + ' → RL'); n.r = rotR(n.r); return rotL(n); }
      return n;
    }
    function nodeAVL(v) { return { v: v, l: null, r: null, h: 1 }; }

    values.forEach(function (v) { root = insert(root, v); });

    function toTree(n) {
      if (!n) return null;
      var kids = [];
      var l = toTree(n.l), r = toTree(n.r);
      if (l) kids.push(l);
      if (r) kids.push(r);
      var lbl = n.v + ' · bf' + (bf(n) > 0 ? '+' : '') + bf(n);
      return node(lbl, kids);
    }
    var t = toTree(root) || node('vacío', []);
    return { tree: t, log: L.lines.concat(rotations), height: root ? root.h : 0, count: values.length };
  }

  /* ---------------- Rojo-negro (simplificado con recoloreo) ---------------- */
  function buildRB(values) {
    var L = log();
    var root = null, violations = [];

    function ins(v) {
      var parent = null, cur = root, dir = null;
      if (!root) { root = { v: v, c: 'black', l: null, r: null };
        L.push('insert ' + v + ' → raíz (negro)'); return; }
      while (cur) {
        parent = cur;
        if (v === cur.v) { L.push('insert ' + v + ' → duplicado, omitido'); return; }
        if (v < cur.v) { cur = cur.l; dir = 'L'; } else { cur = cur.r; dir = 'R'; }
      }
      var nn = { v: v, c: 'red', l: null, r: null };
      if (dir === 'L') parent.l = nn; else parent.r = nn;
      L.push('insert ' + v + ' → hijo rojo de ' + parent.v);
      fix(nn, parent);
    }

    function color(n) { return n ? n.c : 'black'; }

    function fix(n, p) {
      if (!p) { n.c = 'black'; return; }
      if (color(p) === 'black') return;
      var gp = grand(n);
      if (!gp) { p.c = 'black'; return; }
      var isLeft = (gp.l === p);
      var uncle = isLeft ? gp.r : gp.l;
      if (color(uncle) === 'red') {
        p.c = 'black'; uncle.c = 'black'; gp.c = 'red';
        L.push('tío rojo → recolorear abuelo ' + gp.v);
        fix(gp, grand(gp));
      } else {
        var inner = isLeft ? (p.r === n) : (p.l === n);
        if (inner) {
          if (isLeft) { gp.l = rotL(p); L.push('rotación izquierda en ' + p.v); }
          else { gp.r = rotR(p); L.push('rotación derecha en ' + p.v); }
        }
        // re-evaluación tras rotación local
        var p2 = isLeft ? gp.l : gp.r;
        var n2 = isLeft ? p2.l : p2.r;
        if (p2) p2.c = 'black';
        if (gp) { gp.c = 'red'; L.push('rotación en abuelo ' + gp.v + ' + recoloreo'); }
        void n2;
      }
      root.c = 'black';
    }

    function grand(n) {
      var p = parentOf(n);
      return p ? parentOf(p) : null;
    }
    function parentOf(n) {
      var c = root, par = null;
      while (c) {
        if (c === n) return par;
        par = c;
        c = (n.v < c.v) ? c.l : (n.v > c.v ? c.r : null);
        if (c === n) return par;
        // búsqueda por identidad falla con duplicados; usamos recorrido por valor
        if (n !== c && c && c.v === n.v && c !== n) { /* continúa */ }
      }
      // fallback: búsqueda por identidad recursiva
      return findPar(root, n);
    }
    function findPar(c, n) {
      if (!c) return null;
      if (c.l === n || c.r === n) return c;
      return findPar(c.l, n) || findPar(c.r, n);
    }

    function rotL(x) {
      var y = x.r; x.r = y.l; y.l = x; return y;
    }
    function rotR(y) {
      var x = y.l; y.l = x.r; x.r = y; return x;
    }

    values.forEach(ins);

    function toTree(n) {
      if (!n) return null;
      var kids = [];
      var l = toTree(n.l), r = toTree(n.r);
      if (l) kids.push(l);
      if (r) kids.push(r);
      return node(n.v + ' ' + (n.c === 'red' ? '●' : '○'), kids);
    }
    var t = toTree(root) || node('vacío', []);

    // Verificación de invariantes
    function check(n) {
      if (!n) return { ok: true, bh: 1 };
      if (color(n) === 'red' && (color(n.l) === 'red' || color(n.r) === 'red'))
        violations.push('rojo con hijo rojo en ' + n.v);
      var a = check(n.l), b = check(n.r);
      if (a.bh !== b.bh) violations.push('altura negra desigual bajo ' + n.v);
      return { ok: a.ok && b.ok, bh: a.bh + (color(n) === 'black' ? 1 : 0) };
    }
    check(root);

    if (violations.length) violations.forEach(function (v) { L.push('⚠ ' + v); });
    else L.push('✓ 5 invariantes de rojo-negro verificadas');

    return { tree: t, log: L, height: 0, count: values.length, violations: violations };
  }

  /* ---------------- Heap ---------------- */
  function buildHeap(values, opts) {
    opts = opts || {};
    var mode = opts.heapMode === 'max' ? 'max' : 'min';
    var L = log();
    var a = values.slice();

    function better(x, y) { return mode === 'max' ? x > y : x < y; }

    function siftUp(i) {
      while (i > 0) {
        var p = Math.floor((i - 1) / 2);
        if (better(a[i], a[p])) {
          var t = a[i]; a[i] = a[p]; a[p] = t;
          L.push('swap ' + a[p] + ' ↔ ' + a[i] + ' (sift up)');
          i = p;
        } else break;
      }
    }
    function siftDown(i) {
      var n = a.length;
      while (true) {
        var l = 2 * i + 1, r = 2 * i + 2, best = i;
        if (l < n && better(a[l], a[best])) best = l;
        if (r < n && better(a[r], a[best])) best = r;
        if (best === i) break;
        var t = a[i]; a[i] = a[best]; a[best] = t;
        L.push('swap ' + a[best] + ' ↔ ' + a[i] + ' (sift down)');
        i = best;
      }
    }

    for (var i = 1; i < a.length; i++) siftUp(i);
    if (opts.extract && a.length) {
      var rootVal = a[0];
      a[0] = a[a.length - 1]; a.pop();
      siftDown(0);
      L.push('extraer raíz ' + rootVal);
    }

    // Árbol completo desde array
    function toTree(i) {
      if (i >= a.length) return null;
      var kids = [];
      var l = toTree(2 * i + 1), r = toTree(2 * i + 2);
      if (l) kids.push(l);
      if (r) kids.push(r);
      return node(a[i] + (i === 0 ? ' (raíz)' : ''), kids);
    }
    var t = toTree(0) || node('vacío', []);
    L.push('array: [' + a.join(', ') + ']  · hijo de i → 2i+1, 2i+2');
    return { tree: t, log: L.lines, height: Math.ceil(Math.log2(a.length + 1)), count: a.length };
  }

  /* ---------------- Trie ---------------- */
  function buildTrie(text, opts) {
    opts = opts || {};
    var L = log();
    var words = String(text).split(/[\s,;]+/).filter(Boolean);
    var root = { ch: '', end: false, kids: {} };

    words.forEach(function (w) {
      w = w.toLowerCase();
      var cur = root;
      for (var i = 0; i < w.length; i++) {
        var c = w[i];
        if (!cur.kids[c]) cur.kids[c] = { ch: c, end: false, kids: {} };
        cur = cur.kids[c];
      }
      cur.end = true;
      L.push('insert «' + w + '» (' + w.length + ' pasos)');
    });

    // Compresión radix: unir cadenas sin bifurcación
    function toTree(n, depth) {
      var keys = Object.keys(n.kids);
      if (!keys.length) return null;
      var kids = [];
      keys.sort().forEach(function (k) {
        var child = n.kids[k];
        var label = k;
        if (opts.compress) {
          var c = child;
          while (Object.keys(c.kids).length === 1 && !c.end) {
            var nk = Object.keys(c.kids)[0];
            label += nk; c = c.kids[nk];
          }
          kids.push(toTreeFrom(c, label));
        } else {
          kids.push(toTreeFrom(child, label));
        }
      });
      return kids;
    }
    function toTreeFrom(n, label) {
      var kids = toTree(n) || [];
      return node(label + (n.end ? ' •' : ''), kids.length ? kids : []);
    }

    var t = node('ε', toTree(root) || []);
    L.push(opts.compress ? 'compresión radix aplicada' : 'trie sin comprimir');
    return { tree: t, log: L.lines, height: 0, count: words.length };
  }

  /* ---------------- Árbol de expresión ---------------- */
  function buildExpr(text) {
    var L = log();
    var src = String(text).replace(/\s+/g, '');
    var i = 0;

    function peek() { return src[i]; }
    function eat(c) { if (src[i] === c) { i++; return true; } return false; }

    function parseExpr() {
      var left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        var op = src[i++];
        var right = parseTerm();
        left = node(op, [left, right]);
        L.push('op ' + op + ' sobre ' + label(left) + ' y ' + label(right));
      }
      return left;
    }
    function parseTerm() {
      var left = parsePower();
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        var op = src[i++];
        var right = parsePower();
        left = node(op, [left, right]);
        L.push('op ' + op + ' precede sobre +/−');
      }
      return left;
    }
    // Potencia infija, asociativa a la derecha: 2^3^2 = 2^(3^2)
    function parsePower() {
      var left = parseFactor();
      if (peek() === '^') {
        i++;
        var right = parsePower();
        left = node('^', [left, right]);
        L.push('op ^ (potencia, asociativa a la derecha)');
      }
      return left;
    }
    function parseFactor() {
      // Unario: -x → (0 - x)
      if (peek() === '-' || peek() === '+') {
        var uop = src[i++];
        var operand = parseFactor();
        if (uop === '+') return operand;
        return node('−', [node('0', []), operand]);
      }
      if (peek() === '(') {
        i++; var inner = parseExpr(); eat(')'); return inner;
      }
      // Función: nombre(args) p.ej. sqrt(x), min(a,b)
      var nameStart = i;
      while (i < src.length && /[a-zA-Z]/.test(src[i])) i++;
      var fname = src.slice(nameStart, i);
      if (fname && peek() === '(') {
        i++; // consume (
        var args = [];
        if (peek() !== ')') {
          args.push(parseExpr());
          while (peek() === ',') { i++; args.push(parseExpr()); }
        }
        eat(')');
        L.push('función ' + fname + ' (' + args.length + ' args)');
        return node(fname, args.length ? args : [node('∅', [])]);
      }
      if (fname && peek() !== '(') {
        // Identificador simple sin paréntesis (p.ej. x, xy, x2)
        var rest = '';
        while (i < src.length && /[0-9a-zA-Z.,]/.test(src[i])) rest += src[i++];
        var tok0 = fname + rest;
        L.push('hoja ' + tok0);
        return node(tok0, []);
      }
      var start = i;
      while (i < src.length && /[0-9a-zA-Z.,]/.test(src[i])) i++;
      var tok = src.slice(start, i);
      if (!tok) { i++; return node('?', []); }
      L.push('hoja ' + tok);
      return node(tok, []);
    }

    var tree = parseExpr();
    if (i < src.length) L.push('⚠ carácter sobrante: «' + src.slice(i) + '»');

    // Recorridos (tres pasadas independientes)
    var pre = [], ino = [], post = [];
    (function walkPre(n) {
      pre.push(n.label);
      (n.children || []).forEach(walkPre);
    })(tree);
    (function walkIn(n) {
      var ch = n.children || [];
      if (!ch.length) { ino.push(n.label); return; }
      walkIn(ch[0]);
      ino.push(n.label);
      for (var k = 1; k < ch.length; k++) walkIn(ch[k]);
    })(tree);
    (function walkPost(n) {
      (n.children || []).forEach(walkPost);
      post.push(n.label);
    })(tree);
    L.push('pre-fijo:  ' + pre.join(' '));
    L.push('in-fijo:   ' + ino.join(' '));
    L.push('post-fijo: ' + post.join(' '));

    return { tree: tree, log: L.lines, height: 0, count: src.length, traversals: { pre: pre, ino: ino, post: post } };
  }

  function label(n) { return n.label; }

  /* ---------------- Huffman ---------------- */
  function buildHuffman(text) {
    var L = log();
    var src = String(text);
    var freq = {};
    src.split('').forEach(function (c) { if (c !== '\n') freq[c] = (freq[c] || 0) + 1; });

    var heapArr = Object.keys(freq).map(function (c) {
      return { ch: c, f: freq[c], l: null, r: null };
    });
    if (!heapArr.length) return { tree: node('vacío', []), log: ['texto vacío'], codes: {} };

    while (heapArr.length > 1) {
      heapArr.sort(function (a, b) { return a.f - b.f; });
      var a = heapArr.shift(), b = heapArr.shift();
      var parent = { ch: null, f: a.f + b.f, l: a, r: b };
      L.push('unir ' + fmt(a) + ' + ' + fmt(b) + ' = ' + parent.f);
      heapArr.push(parent);
    }

    var root = heapArr[0];
    var codes = {};
    (function assign(n, path) {
      if (!n.l && !n.r) { codes[n.ch] = path || '0'; return; }
      if (n.l) assign(n.l, path + '0');
      if (n.r) assign(n.r, path + '1');
    })(root, '');

    var total = src.length * 8;
    var coded = 0;
    Object.keys(codes).forEach(function (c) { coded += freq[c] * codes[c].length; });
    var entropy = 0;
    Object.keys(freq).forEach(function (c) {
      var p = freq[c] / src.length;
      entropy -= p * Math.log2(p);
    });
    L.push('original: ' + total + ' bits (8 por símbolo)');
    L.push('huffman:  ' + coded + ' bits');
    L.push('entropía: ' + (src.length * entropy).toFixed(1) + ' bits (límite teórico)');

    function fmt(n) { return n.ch === null ? '(' + n.f + ')' : n.ch + ':' + n.f; }

    function toTree(n) {
      if (!n) return null;
      if (!n.l && !n.r) return node((n.ch === ' ' ? '␣' : n.ch) + ' (' + n.f + ')', []);
      var kids = [];
      var l = toTree(n.l), r = toTree(n.r);
      if (l) kids.push(l);
      if (r) kids.push(r);
      return node(String(n.f), kids);
    }

    // tabla de códigos
    var table = Object.keys(codes).sort().map(function (c) {
      return (c === ' ' ? '␣' : c) + ' → ' + codes[c] + ' (' + freq[c] + ')';
    });
    L.push('--- códigos ---');
    table.forEach(function (r) { L.push(r); });

    return { tree: toTree(root), log: L.lines, codes: codes,
             stats: { total: total, coded: coded, entropy: entropy } };
  }

  /* ---------------- Dispatcher ---------------- */
  function solve(kind, input, opts) {
    opts = opts || {};
    switch (kind) {
      case 'bst':      return buildBST(nums(input), { search: opts.search });
      case 'avl':      return buildAVL(nums(input));
      case 'redblack': return buildRB(nums(input));
      case 'heap':     return buildHeap(nums(input), opts);
      case 'trie':     return buildTrie(input, opts);
      case 'expr':     return buildExpr(input);
      case 'huffman':  return buildHuffman(input);
      default: throw new Error('Tipo desconocido: ' + kind);
    }
  }

  var DATA_KINDS = ['bst', 'avl', 'redblack', 'heap', 'trie', 'expr', 'huffman'];

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.solvers = { solve: solve, DATA_KINDS: DATA_KINDS };
})();
