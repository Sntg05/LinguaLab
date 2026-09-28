/* ============================================================
   LinguaLab — ArborLab: parsers de entrada
   Formatos soportados:
   1. Corchetes etiquetados:  [S [SN [Det el] [N gato]]]
   2. Penn Treebank:          (S (DT el) (NN gato))
   3. Dependencia / CoNLL-U:  id palabra cabeza relación POS
   4. Esquema indentado:      jerarquía general por sangría
   Errores con línea y columna.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Error con posición ---------- */
  function PErr(msg, line, col) {
    var e = new Error(msg);
    e.name = 'ParseError';
    e.line = line || 1;
    e.col = col || 1;
    e.userMessage = msg + ' (línea ' + e.line + ', columna ' + e.col + ')';
    return e;
  }

  /* ============================================================
     1. PARSER DE CORCHETES / PARENTESIS
     ============================================================ */
  function parseBrackets(src) {
    src = String(src || '').trim();
    if (!src) throw PErr('Entrada vacía', 1, 1);

    var useRound = src.indexOf('(') >= 0 && src.indexOf('[') < 0;
    var OPEN = useRound ? '(' : '[';
    var CLOSE = useRound ? ')' : ']';

    var i = 0, line = 1, col = 1;
    var pos = { line: 1, col: 1 };

    function advance(n) {
      for (var k = 0; k < n; k++) {
        if (src[i] === '\n') { line++; col = 1; } else col++;
        i++;
      }
    }

    function skipWS() {
      while (i < src.length && /\s/.test(src[i])) advance(1);
    }

    // Lee texto hasta el siguiente bracket (hoja o contenido)
    function readText(stopSet) {
      var out = '';
      skipWS();
      var startLine = line, startCol = col;
      while (i < src.length && stopSet.indexOf(src[i]) < 0) {
        out += src[i];
        advance(1);
      }
      return { text: out.trim(), line: startLine, col: startCol };
    }

    function parseNode() {
      skipWS();
      if (i >= src.length) throw PErr('Se esperaba un nodo o ' + OPEN, line, col);
      if (src[i] !== OPEN) {
        // Es una hoja sin corchete (suelto)
        var leaf = readText([')', ']']);
        if (!leaf.text) throw PErr('Nodo vacío', leaf.line, leaf.col);
        return makeLeaf(leaf.text, leaf.line, leaf.col);
      }
      advance(1); // consume OPEN
      var openLine = line, openCol = col - 1;

      // Lee la etiqueta como primer token (hasta espacio o bracket).
      // Así [S [SN ...]] → etiqueta "S" y [Det el] → etiqueta "Det" + hoja "el".
      skipWS();
      var lblLine = line, lblCol = col;
      var lbl = '';
      while (i < src.length && !/\s/.test(src[i]) && src[i] !== OPEN &&
             src[i] !== CLOSE && src[i] !== '(' && src[i] !== ')' &&
             src[i] !== '[' && src[i] !== ']') {
        lbl += src[i];
        advance(1);
      }
      lbl = lbl.trim();
      if (!lbl) throw PErr('Falta la etiqueta del nodo', openLine, openCol);

      var node = { label: lbl, children: [], line: openLine, col: openCol, isLeaf: false };

      // Seguir leyendo hijos hasta cerrar
      while (true) {
        skipWS();
        if (i >= src.length) throw PErr('Falta ' + CLOSE + ' de «' + node.label + '»', openLine, openCol);
        if (src[i] === CLOSE) { advance(1); break; }
        if (src[i] === OPEN) {
          node.children.push(parseNode());
        } else {
          // texto suelto dentro del nodo → hoja
          var t = readText([')', ']', '(']);
          if (t.text) node.children.push(makeLeaf(t.text, t.line, t.col));
        }
      }

      // Si no tiene hijos, es hoja
      if (node.children.length === 0) {
        return makeLeaf(node.label, node.line, node.col);
      }
      return node;
    }

    function makeLeaf(text, l, c) {
      return { label: text.replace(/_/g, ' '), children: [], line: l, col: c, isLeaf: true };
    }

    var root = parseNode();
    skipWS();
    if (i < src.length) throw PErr('Texto sobrante tras el árbol', line, col);
    return root;
  }

  /* ============================================================
     2. PARSER DE DEPENDENCIA / CoNLL-U
     Formato:  id palabra cabeza relación POS
     CoNLL-U:  10 columnas tab separadas
     ============================================================ */
  function parseDependency(src) {
    var lines = String(src || '').split('\n');
    var nodes = [];
    var byId = {};

    lines.forEach(function (raw, idx) {
      var ln = idx + 1;
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;

      var cols = (raw.indexOf('\t') >= 0) ? raw.split('\t') : line.split(/\s+/);

      // Omitir multiword (1-2) y nodos vacíos (8.1)
      if (/^\d+-\d+$/.test(cols[0])) return;
      if (/^\d+\.\d+$/.test(cols[0])) return;

      var id, word, head, rel, pos;
      if (cols.length >= 10) {
        // CoNLL-U: ID FORM LEMMA UPOS XPOS FEATS HEAD DEPREL DEPS MISC
        id = cols[0]; word = cols[1]; pos = cols[3]; head = cols[6]; rel = cols[7];
      } else if (cols.length >= 5) {
        id = cols[0]; word = cols[1]; head = cols[2]; rel = cols[3]; pos = cols[4];
      } else if (cols.length === 4) {
        id = cols[0]; word = cols[1]; head = cols[2]; rel = cols[3]; pos = '_';
      } else {
        throw PErr('Se esperan 4 o 5 columnas (id palabra cabeza relación POS)', ln, 1);
      }

      if (!/^\d+$/.test(id)) throw PErr('El id debe ser un número entero: «' + id + '»', ln, 1);

      var node = {
        id: parseInt(id, 10), word: word, pos: pos || '_',
        head: head === '0' ? 0 : (parseInt(head, 10)),
        rel: rel || 'dep', line: ln, col: 1, children: [], isLeaf: true
      };
      if (isNaN(node.head)) throw PErr('Cabeza no válida: «' + head + '»', ln, 1);
      if (byId[node.id]) throw PErr('Id duplicado: ' + node.id, ln, 1);
      byId[node.id] = node;
      nodes.push(node);
    });

    if (!nodes.length) throw PErr('No se encontraron líneas de análisis', 1, 1);

    // Construir estructura
    var roots = [];
    nodes.forEach(function (n) {
      if (n.head === 0) { roots.push(n); return; }
      var parent = byId[n.head];
      if (!parent) throw PErr('La cabeza ' + n.head + ' de «' + n.word + '» no existe', n.line, 1);
      parent.children.push(n);
      parent.isLeaf = false;
    });

    if (roots.length === 0) throw PErr('Ninguna palabra es la raíz (cabeza 0)', 1, 1);

    var tree = roots.length === 1 ? roots[0] : {
      label: 'ROOT', children: roots, isLeaf: false, line: 1, col: 1, synthetic: true
    };
    tree.depMeta = { byId: byId, nodes: nodes, roots: roots };
    return tree;
  }

  /* ============================================================
     3. ESQUEMA INDENTADO (jerarquía general)
     ============================================================ */
  function parseOutline(src) {
    var lines = String(src || '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) throw PErr('Entrada vacía', 1, 1);

    var items = lines.map(function (raw, idx) {
      var m = raw.match(/^([\s\S]*?)(?:\s+\|\s+(.*))?$/);
      var indentStr = (raw.match(/^[ \t]*/) || [''])[0];
      var indent = indentStr.replace(/\t/g, '    ').length;
      var text = (m[1] || raw).trim()
        .replace(/^([-*•]\s+)/, '')        // viñetas
        .replace(/^[│├└─\s]+/, '')          // caracteres de `tree`
        .trim();
      return { indent: indent, text: text, second: (m[2] || '').trim(), line: idx + 1 };
    }).filter(function (x) { return x.text !== ''; });

    function build(pos, indent) {
      var node = {
        label: items[pos].text,
        children: [], line: items[pos].line, col: 1, isLeaf: false
      };
      if (items[pos].second) node.sub = items[pos].second;
      pos++;
      while (pos < items.length && items[pos].indent > indent) {
        var child = build(pos, items[pos].indent);
        node.children.push(child);
        pos = child._next;
      }
      node._next = pos;
      return node;
    }

    var roots = [];
    var p = 0;
    while (p < items.length) {
      var r = build(p, items[p].indent);
      roots.push(r);
      p = r._next;
    }

    var tree = roots.length === 1 ? roots[0] : {
      label: '', children: roots, isLeaf: false, line: 1, col: 1, forest: true
    };
    cleanNext(tree);
    return tree;
  }

  function cleanNext(n) {
    delete n._next;
    n.children.forEach(cleanNext);
    return n;
  }

  /* ============================================================
     4. ENTRADA "FÁCIL": frase → árbol de dependencia heurístico
     ============================================================ {
     */
  var SIMPLE_LEX = {
    det: ['el','la','los','las','un','una','unos','unas','este','esta','ese','esa','the','a','an','this','that','these','those','my','tu','su','our'],
    n:   ['gato','perro','hombre','mujer','niño','casa','libro','ciudad','agua','tiempo','día','año','cosa','cat','dog','man','woman','boy','house','book','city','water','time','day','year'],
    adj: ['negro','rojo','grande','pequeño','bueno','malo','viejo','joven','alto','largo','big','small','old','young','black','red','good','bad','long','tall'],
    v:   ['salta','saltó','corre','corrió','come','comió','ve','vio','hace','hizo','es','está','hay','era','dormía','maulló','jumped','runs','ate','sees','makes','is','was','sleeps','meows'],
    prep:['de','en','con','por','para','sobre','bajo','entre','hacia','desde','of','in','with','by','for','on','under','between','toward','from'],
    conj:['y','o','pero','que','cuando','mientras','si','and','or','but','that','when','while','if'],
    adv:['muy','bien','mal','rápido','despacio','siempre','nunca','very','well','fast','slowly','always','never']
  };

  function guessPOS(w) {
    var x = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    for (var k in SIMPLE_LEX) if (SIMPLE_LEX[k].indexOf(x) >= 0) return k;
    if (/^[aeiouáéíóú]/.test(x)) return 'v';
    if (x.length <= 3) return 'det';
    return 'n';
  }

  // Heurística didáctica: determinante+sustantivo → grupo; verbo como raíz
  function sentenceToTree(sentence) {
    var words = String(sentence).trim().split(/\s+/).filter(Boolean);
    if (!words.length) throw PErr('Escribe una frase', 1, 1);

    var tagged = words.map(function (w, i) {
      return { w: w, pos: guessPOS(w), i: i, children: [], line: 1, col: 1, isLeaf: true };
    });

    // Agrupar det + (adj)* + n → NP
    var groups = [];
    var i = 0;
    while (i < tagged.length) {
      var t = tagged[i];
      if (t.pos === 'det' || (t.pos === 'adj' && groups.length)) {
        var np = { label: 'NP', children: [t], isLeaf: false, line: 1, col: 1 };
        i++;
        while (i < tagged.length && (tagged[i].pos === 'adj' || tagged[i].pos === 'n')) {
          np.children.push(tagged[i]); i++;
        }
        if (np.children.length === 1 && np.children[0].pos === 'adj') {
          // adj suelto → sigue como está
          groups.push(np.children[0]);
        } else groups.push(np);
      } else if (t.pos === 'n') {
        groups.push({ label: 'NP', children: [t], isLeaf: false, line: 1, col: 1 });
        i++;
      } else if (t.pos === 'prep') {
        var pp = { label: 'PP', children: [t], isLeaf: false, line: 1, col: 1 };
        i++;
        if (i < tagged.length && (tagged[i].pos === 'det' || tagged[i].pos === 'n')) {
          var npIn = { label: 'NP', children: [], isLeaf: false, line: 1, col: 1 };
          while (i < tagged.length && (tagged[i].pos === 'det' || tagged[i].pos === 'adj' ||
                 tagged[i].pos === 'n')) {
            npIn.children.push(tagged[i]); i++;
          }
          if (npIn.children.length) pp.children.push(npIn);
        }
        groups.push(pp);
      } else {
        groups.push(t); i++;
      }
    }

    // Localizar el verbo principal → VP
    var verbIdx = -1;
    for (var j = 0; j < groups.length; j++) {
      var g = groups[j];
      if (g.isLeaf && g.pos === 'v') { verbIdx = j; break; }
      if (!g.isLeaf && g.label === 'VP') { verbIdx = j; break; }
    }
    if (verbIdx < 0) verbIdx = Math.min(1, groups.length - 1);

    var pre = groups.slice(0, verbIdx);
    var verb = groups[verbIdx];
    var post = groups.slice(verbIdx + 1);

    var vp = { label: 'VP', children: [verb].concat(post), isLeaf: false, line: 1, col: 1 };
    var s = { label: 'S', children: pre.concat([vp]), isLeaf: false, line: 1, col: 1 };
    if (!pre.length) s = { label: 'S', children: [vp], isLeaf: false, line: 1, col: 1 };
    return s;
  }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.parse = {
    brackets: parseBrackets,
    dependency: parseDependency,
    outline: parseOutline,
    sentenceToTree: sentenceToTree,
    guessPOS: guessPOS,
    PErr: PErr
  };
})();
