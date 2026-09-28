/* ============================================================
   LinguaLab — ArborLab: aplicación principal
   Coordina: navegación de tipos, tabs fácil/texto, ejemplos,
   parseo, layout, render, checks, export y guía.
   Interfaz 100% i18n (es/en).
   ============================================================ */
(function () {
  'use strict';

  var T = window.LinguaLabTrees;
  var G = window.LinguaLabGuardrails;

  var TYPES = [
    /* --- Lingüísticos: dependencia --- */
    { id:'dependency', group_es:'Análisis de dependencias', group_en:'Dependency analysis',
      name_es:'Dependencia (UD)', name_en:'Dependency (UD)',
      mode:'dep',
      blurb_es:'Cada nodo es una palabra; los arcos van de la cabeza a su dependiente con la relación gramatical.',
      blurb_en:'Every node is a word; arcs run from the head to its dependent, labelled with the relation.',
      hint_es:'Cada línea: id palabra cabeza relación POS · o CoNLL-U completo.',
      hint_en:'Each line: id word head relation POS · or full CoNLL-U.' },
    { id:'constituency', group_es:'Análisis de constituyentes', group_en:'Constituency analysis',
      name_es:'Constitución (frases)', name_en:'Constituency (phrases)',
      mode:'bracket',
      blurb_es:'La frase se descompone en sintagmas anidados hasta llegar a las palabras.',
      blurb_en:'The sentence splits into nested phrases down to the words.',
      hint_es:'[S [SN [Det el] [N gato]]] o Penn (S (DT el) (NN gato)).',
      hint_en:'[S [NP [DT the] [NN cat]]] or Penn (S (DT the) (NN cat)).' },
    /* --- Teoría --- */
    { id:'xbar', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'X-bar', name_en:'X-bar', mode:'bracket', opts:{xbar:true},
      blurb_es:'Toda proyección tiene núcleo, complemento, adjunto y espéculo; ramificación estrictamente binaria.',
      blurb_en:'Every projection has a head, complement, adjunct and specifier; strictly binary branching.',
      hint_es:'[NP [Spec [Det the]] [N\' [N student] [PP of physics]]]',
      hint_en:'[NP [Spec [Det the]] [N\' [N student] [PP of physics]]]' },
    { id:'movement', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'Movimiento (GB)', name_en:'Movement (GB)', mode:'bracket',
      blurb_es:'D-estructura vs S-estructura: huellas {t}, PRO y flechas de movimiento con chequeo de c-command.',
      blurb_en:'D-structure vs S-structure: traces {t}, PRO and movement arrows with c-command checking.',
      hint_es:'Usa #id en nodos y  move: origen -> destino "etiqueta"',
      hint_en:'Use #id on nodes and  move: from -> to "label"' },
    { id:'minimalist', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'Minimalista', name_en:'Minimalist', mode:'bracket',
      blurb_es:'Merge externo e interno: copias inferiores tachadas, edge de vP y fases.',
      blurb_en:'External and internal Merge: lower copies struck through, vP edge and phases.',
      hint_es:'Escribe copias como <palabra> para dibujarlas tachadas.',
      hint_en:'Write copies as <word> to draw them struck through.' },
    { id:'cartography', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'Cartográfica', name_en:'Cartographic', mode:'bracket',
      blurb_es:'Split-CP y orden fino de adverbios: ForceP, TopP, FocP, FinP.',
      blurb_en:'Split-CP and fine adverb order: ForceP, TopP, FocP, FinP.',
      hint_es:'[ForceP [Force Ø] [TopP [Top that] [FinP ...]]]',
      hint_en:'[ForceP [Force Ø] [TopP [Top that] [FinP ...]]]' },
    { id:'ccg', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'CCG (derivaciones)', name_en:'CCG (derivations)', mode:'bracket',
      blurb_es:'Categorías funcionales X/Y y X\\Y; derivaciones dibujadas de abajo arriba.',
      blurb_en:'Functional categories X/Y and X\\Y; derivations drawn bottom-up.',
      hint_es:'[S\\NP]/NP   ·   [conj [S/NP cooked] [S/NP ate]]',
      hint_en:'[S\\NP]/NP   ·   [conj [S/NP cooked] [S/NP ate]]' },
    { id:'lfg', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'LFG (c/f-estructura)', name_en:'LFG (c/f-structure)', mode:'bracket',
      blurb_es:'Estructura de constituyentes y funciones gramaticales en paralelo.',
      blurb_en:'Constituency structure and grammatical functions in parallel.',
      hint_es:'[IP [NP María] [I\' [I lee] [NP un libro]]]',
      hint_en:'[IP [NP Mary] [I\' [I reads] [NP a book]]]' },
    { id:'hpsg', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'HPSG (rasgos)', name_en:'HPSG (features)', mode:'bracket',
      blurb_es:'Matrices de atributo-valor con estructura compartida [1].',
      blurb_en:'Attribute-value matrices with structure sharing [1].',
      hint_es:'[Sign [HEAD verb] [SUBJ ⟨DP⟩]]',
      hint_en:'[Sign [HEAD verb] [SUBJ ⟨DP⟩]]' },
    { id:'relational', group_es:'Teoría sintáctica', group_en:'Syntactic theory',
      name_es:'Gramática relacional', name_en:'Relational Grammar', mode:'bracket',
      blurb_es:'Relaciones gramaticales por estratos: 1 sujeto, 2 objeto, 3 indirecto, Cho chômeur.',
      blurb_en:'Grammatical relations per stratum: 1 subject, 2 object, 3 indirect, Cho chômeur.',
      hint_es:'[Cláusula [1,2 libro] [2,1 leído]]',
      hint_en:'[Clause [1,2 book] [2,1 read]]' },
    { id:'semantic', group_es:'Otros formalismos', group_en:'Other formalisms',
      name_es:'Semántica (LF)', name_en:'Semantic (LF)', mode:'bracket',
      blurb_es:'Tipos e, t, ⟨e,t⟩ y elevación de cuantificadores.',
      blurb_en:'Types e, t, ⟨e,t⟩ and quantifier raising.',
      hint_es:'[VP sleeps [type ⟨e,t⟩]]',
      hint_en:'[VP sleeps [type ⟨e,t⟩]]' },
    { id:'tag', group_es:'Otros formalismos', group_en:'Other formalisms',
      name_es:'TAG (adición)', name_en:'TAG (adjoining)', mode:'bracket',
      blurb_es:'Árboles elementales iniciales (α) y auxiliares (β) con nodo pie *.',
      blurb_en:'Elementary initial (α) and auxiliary (β) trees with foot node *.',
      hint_es:'[β [S* [AdjP often] [S*]]]',
      hint_en:'[β [S* [AdjP often] [S*]]]' },
    { id:'reedkellogg', group_es:'Otros formalismos', group_en:'Other formalisms',
      name_es:'Reed–Kellogg', name_en:'Reed–Kellogg', mode:'bracket',
      blurb_es:'Diagramas clásicos de línea base: sujeto | predicado, complementos y modificadores.',
      blurb_en:'Classic baseline diagrams: subject | predicate, complements and modifiers.',
      hint_es:'[Línea [Suj gato] [Pred [V saltó] [O cerca]]]',
      hint_en:'[Line [Subj cat] [Pred [V jumped] [Obj fence]]]' },
    { id:'morphology', group_es:'Otros formalismos', group_en:'Other formalisms',
      name_es:'Estructura de palabra', name_en:'Word structure', mode:'bracket',
      blurb_es:'Orden de afijación: prefijos, raíz y sufijos; ambigüedad léxica.',
      blurb_en:'Affixation order: prefixes, root and suffixes; lexical ambiguity.',
      hint_es:'[Palabra [Pref un-] [Base [Base lock] [Suf -able]]]',
      hint_en:'[Word [Pref un-] [Base [Base lock] [Suf -able]]]' },
    { id:'general', group_es:'Otros formalismos', group_en:'Other formalisms',
      name_es:'Jerarquía general', name_en:'General hierarchy', mode:'outline',
      blurb_es:'Árbol libre por sangría: índices, carpetas, taxonomías, familias.',
      blurb_en:'Free tree by indentation: outlines, folders, taxonomies, families.',
      hint_es:'Un elemento por línea; sangría para hijos;  |  para una nota.',
      hint_en:'One item per line; indent for children;  |  for a note.' },

    /* ===== ESTRUCTURAS DE DATOS ===== */
    { id:'bst', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Árbol binario de búsqueda', name_en:'Binary search tree', mode:'data',
      blurb_es:'Izquierda menor, derecha mayor: búsqueda, inserción y borrado con sus tres casos.',
      blurb_en:'Left smaller, right larger: search, insert and delete with its three cases.',
      hint_es:'Una lista de números separados por espacios. Añade  buscar: n  para buscar.',
      hint_en:'A list of numbers separated by spaces. Add  search: n  to search.' },
    { id:'avl', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'AVL', name_en:'AVL', mode:'data',
      blurb_es:'Primer árbol autoequilibrado: factor de balance y cuatro rotaciones.',
      blurb_en:'First self-balancing tree: balance factor and four rotations.',
      hint_es:'Números separados por espacios. Se muestran los factores bf.',
      hint_en:'Numbers separated by spaces. Balance factors bf are shown.' },
    { id:'redblack', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Rojo-negro', name_en:'Red-black', mode:'data',
      blurb_es:'Cinco invariantes de coloración y recoloreo/rotación tras cada inserción.',
      blurb_en:'Five colour invariants and recolour/rotation after each insertion.',
      hint_es:'Números separados por espacios ● rojo  ○ negro.',
      hint_en:'Numbers separated by spaces ● red  ○ black.' },
    { id:'heap', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Heap (min/max)', name_en:'Heap (min/max)', mode:'data',
      blurb_es:'Árbol completo en array: sift up y sift down, hijo en 2i+1 y 2i+2.',
      blurb_en:'Complete tree in an array: sift up and sift down, child at 2i+1 and 2i+2.',
      hint_es:'Números separados por espacios. Usa las casillas para max-heap o extraer.',
      hint_en:'Numbers separated by spaces. Use the boxes for max-heap or extract.' },
    { id:'trie', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Trie (prefijos)', name_en:'Trie (prefix)', mode:'data',
      blurb_es:'Una letra por nivel: búsqueda O(m) y autocompletado. Compresión radix opcional.',
      blurb_en:'One letter per level: O(m) lookup and autocomplete. Optional radix compression.',
      hint_es:'Una palabra por línea.',
      hint_en:'One word per line.' },
    { id:'expr', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Árbol de expresión', name_en:'Expression tree', mode:'data',
      blurb_es:'Precedencia visible y recorridos pre/in/post-fijo; evaluación post-orden.',
      blurb_en:'Visible precedence and pre/in/post-order traversals; post-order evaluation.',
      hint_es:'Ej.: 3 + 4 * 2   ·  (a + b) * sqrt(c)',
      hint_en:'E.g.: 3 + 4 * 2   ·  (a + b) * sqrt(c)' },
    { id:'huffman', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Huffman', name_en:'Huffman', mode:'data',
      blurb_es:'Códigos prefijos óptimos comparados con 8 bits y con la entropía.',
      blurb_en:'Optimal prefix codes compared with 8 bits and with the entropy.',
      hint_es:'Cualquier texto; se calculan frecuencias por carácter.',
      hint_en:'Any text; character frequencies are computed.' },
    { id:'comparison', group_es:'Estructuras de datos', group_en:'Data structures',
      name_es:'Tabla comparativa', name_en:'Comparison table', mode:'table',
      blurb_es:'Complejidades de búsqueda, inserción y borrado de cada estructura.',
      blurb_en:'Search, insert and delete complexity of each structure.',
      hint_es:'No requiere entrada.',
      hint_en:'No input required.' }
  ];

  var state = { type: 'dependency', mode: 'text', tree: null, directives: [], lastResult: null };

  /* ---------- i18n local ---------- */
  function isES() { return (document.documentElement.lang || 'es') === 'es'; }
  function t(k, fb) { return (window.LinguaLabI18n && window.LinguaLabI18n.t(k, fb)) || fb; }
  function esc(s) { return G ? G.escapeHTML(s) : String(s); }
  function typeById(id) { return TYPES.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- Navegación de tipos ---------- */
  function renderTypes() {
    var nav = document.getElementById('typeNav');
    if (!nav) return;
    nav.innerHTML = '';
    var groups = [];
    TYPES.forEach(function (ty) {
      var g = isES() ? ty.group_es : ty.group_en;
      if (groups.indexOf(g) < 0) groups.push(g);
    });
    var title = document.createElement('h2');
    title.textContent = t('tree.types', 'Tipos de árbol');
    nav.appendChild(title);

    groups.forEach(function (g) {
      var h = document.createElement('h2');
      h.textContent = g;
      h.style.opacity = '.7';
      nav.appendChild(h);
      TYPES.filter(function (ty) {
        return (isES() ? ty.group_es : ty.group_en) === g;
      }).forEach(function (ty) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = isES() ? ty.name_es : ty.name_en;
        b.setAttribute('aria-current', ty.id === state.type ? 'true' : 'false');
        b.addEventListener('click', function () { selectType(ty.id); });
        nav.appendChild(b);
      });
    });
  }

  function selectType(id) {
    state.type = id;
    renderTypes();
    renderPanel();
    // cargar ejemplo por defecto
    var exs = (window.TREE_EXAMPLES || {})[id];
    var sel = document.getElementById('exampleSel');
    if (sel && exs && exs.length) { sel.value = '0'; loadExample(); }
    else draw();
  }

  /* ---------- Panel ---------- */
  function renderPanel() {
    var ty = typeById(state.type);
    if (!ty) return;
    var title = document.getElementById('panelTitle');
    var blurb = document.getElementById('panelBlurb');
    var hint = document.getElementById('hint');
    var srcLabel = document.getElementById('srcLabel');
    if (title) title.textContent = isES() ? ty.name_es : ty.name_en;
    if (blurb) blurb.textContent = isES() ? ty.blurb_es : ty.blurb_en;
    if (hint) hint.innerHTML = esc(isES() ? ty.hint_es : ty.hint_en);
    if (srcLabel) srcLabel.textContent = t('tree.input', 'Entrada');

    // tabs de modo
    var easyTab = document.getElementById('tabEasy');
    var textTab = document.getElementById('tabText');
    var tabsWrap = document.getElementById('modeTabs');
    var easyBox = document.getElementById('easy');
    var textField = document.getElementById('textField');
    var opts = document.getElementById('opts');

    var isLing = ty.mode === 'bracket' || ty.mode === 'dep';
    if (tabsWrap) tabsWrap.hidden = !isLing;
    if (easyBox) easyBox.hidden = !(isLing && state.mode === 'easy');
    if (textField) textField.hidden = false;

    if (easyTab) easyTab.setAttribute('aria-pressed', state.mode === 'easy' ? 'true' : 'false');
    if (textTab) textTab.setAttribute('aria-pressed', state.mode === 'text' ? 'true' : 'false');

    // opciones específicas
    if (opts) {
      opts.innerHTML = '';
      if (state.type === 'heap') {
        opts.appendChild(checkbox('heapMax', isES() ? 'Max-heap (por defecto: min-heap)' : 'Max-heap (default: min-heap)'));
        opts.appendChild(checkbox('heapExtract', isES() ? 'Extraer la raíz tras construir' : 'Extract the root after building'));
      }
      if (state.type === 'trie') {
        opts.appendChild(checkbox('trieCompress', isES() ? 'Comprimir cadenas (radix)' : 'Compress chains (radix)'));
      }
      if (state.type === 'bst') {
        opts.appendChild(textInput('bstSearch', isES() ? 'Buscar valor' : 'Search value'));
      }
      if (state.type === 'xbar') {
        var c = checkbox('xbarCheck', isES() ? 'Comprobar reglas X-bar' : 'Check X-bar rules');
        c.querySelector('input').checked = true;
        opts.appendChild(c);
      }
      if (ty.mode === 'bracket') {
        opts.appendChild(checkbox('handdrawn',
          isES() ? 'Aspecto de boceto (pinceladas)' : 'Hand-drawn look'));
      }
      if (ty.mode === 'dep') {
        opts.appendChild(checkbox('showHierarchy',
          isES() ? 'Ver también como jerarquía' : 'Also show as hierarchy'));
      }
    }

    renderExamples();
    updateGuideLink();
  }

  function checkbox(id, label) {
    var lab = document.createElement('label');
    lab.className = 'opt';
    var inp = document.createElement('input');
    inp.type = 'checkbox'; inp.id = id;
    var sp = document.createElement('span'); sp.textContent = label;
    lab.appendChild(inp); lab.appendChild(sp);
    return lab;
  }
  function textInput(id, label) {
    var lab = document.createElement('label');
    lab.className = 'opt';
    var sp = document.createElement('span'); sp.textContent = label;
    var inp = document.createElement('input');
    inp.type = 'text'; inp.id = id; inp.placeholder = '0';
    lab.appendChild(sp); lab.appendChild(inp);
    return lab;
  }

  function renderExamples() {
    var sel = document.getElementById('exampleSel');
    if (!sel) return;
    var exs = (window.TREE_EXAMPLES || {})[state.type] || [];
    sel.innerHTML = '';
    var def = document.createElement('option');
    def.value = '';
    def.textContent = t('tree.examples', 'Cargar ejemplo');
    sel.appendChild(def);
    exs.forEach(function (ex, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = isES() ? ex.name_es : ex.name_en;
      sel.appendChild(o);
    });
  }

  function loadExample() {
    var sel = document.getElementById('exampleSel');
    var src = document.getElementById('src');
    if (!sel || !src || sel.value === '') return;
    var exs = (window.TREE_EXAMPLES || {})[state.type] || [];
    var ex = exs[parseInt(sel.value, 10)];
    if (ex) {
      src.value = ex.text;
      draw();
    }
  }

  function updateGuideLink() {
    var link = document.getElementById('guideLink');
    if (!link) return;
    var map = { redblack: 'g-rb', comparison: 'g-compare' };
    var id = map[state.type] || ('g-' + state.type);
    if (!document.getElementById(id)) id = 'guide';
    link.setAttribute('href', '#' + id);
  }

  /* ---------- Dibujo ---------- */
  function clearMsg() {
    var m = document.getElementById('msg');
    if (m) { m.className = 'msg'; m.innerHTML = ''; }
  }
  function setMsg(level, text) {
    var m = document.getElementById('msg');
    if (!m) return;
    m.className = 'msg ' + level;
    m.textContent = text;
  }

  function parseDirectives(src) {
    var dirs = [];
    String(src).split('\n').forEach(function (line) {
      var m = line.match(/^\s*move:\s*(\w+)\s*->\s*(\w+)\s*(?:"([^"]*)")?\s*(.*)$/);
      if (m) {
        var extra = (m[4] || '').split(/\s+/);
        dirs.push({
          from: m[1], to: m[2], label: m[3] || '',
          style: extra.indexOf('solid') >= 0 ? 'solid' : 'dashed',
          color: (['red','green','grey','gray','black'].filter(function (c) {
            return extra.indexOf(c) >= 0; })[0]) || 'teal'
        });
      }
    });
    return dirs;
  }

  function stripDirectives(src) {
    return String(src).split('\n').filter(function (l) {
      return !/^\s*(move|link|title|subtitle|panel|note|tree):/.test(l);
    }).join('\n');
  }

  function draw() {
    var ty = typeById(state.type);
    var src = document.getElementById('src');
    if (!ty || !src) return;
    clearMsg();

    // rate-limit guardrail
    if (G && !G.rateLimit(250)) return;

    var raw = G ? G.sanitizeInput(src.value) : src.value;

    // Tabla comparativa no necesita entrada
    if (ty.mode === 'table') { renderComparison(); return; }

    try {
      var directives = parseDirectives(raw);
      var clean = stripDirectives(raw);
      var tree, result = null, opts = { directives: directives };

      if (ty.mode === 'dep') {
        tree = T.parse.dependency(clean);
      } else if (ty.mode === 'outline') {
        tree = T.parse.outline(clean);
      } else if (ty.mode === 'data') {
        var sopts = {};
        var hm = document.getElementById('heapMax');
        var he = document.getElementById('heapExtract');
        var tc = document.getElementById('trieCompress');
        var bs = document.getElementById('bstSearch');
        if (hm) sopts.heapMode = hm.checked ? 'max' : 'min';
        if (he) sopts.extract = he.checked;
        if (tc) sopts.compress = tc.checked;
        if (bs) sopts.search = bs.value.trim();
        result = T.solvers.solve(state.type, clean, sopts);
        tree = result.tree;
        state.lastResult = result;
      } else {
        tree = T.parse.brackets(clean);
      }

      // Opciones de chequeo
      var xb = document.getElementById('xbarCheck');
      if (xb) opts.xbar = xb.checked;
      opts.directives = directives;
      state.directives = directives;

      var out = T.render.render(tree, opts);
      var canvas = document.getElementById('canvas');
      if (canvas) {
        canvas.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'svgwrap fresh';
        wrap.appendChild(out.svg);
        canvas.appendChild(wrap);
        if (window._arborCanvas) window._arborCanvas.reset();
      }
      state.tree = tree;

      // Chequeos + estadísticas
      var checks = T.checks.runAll(tree, opts);
      renderResults(checks, result, tree);
    } catch (e) {
      var m = e.userMessage || e.message;
      setMsg('error', (isES() ? 'Error: ' : 'Error: ') + m);
      var res = document.getElementById('results');
      if (res) res.innerHTML = '';
    }
  }

  function renderResults(checks, solverResult, tree) {
    var box = document.getElementById('results');
    if (!box) return;
    box.innerHTML = '';

    // Estadísticas
    var m = T.metrics;
    var stats = [
      [isES() ? 'Nodos' : 'Nodes', m.countNodes(tree)],
      [isES() ? 'Hojas (palabras)' : 'Leaves (words)', m.leaves(tree)],
      [isES() ? 'Profundidad' : 'Depth', m.maxDepth(tree)],
      [isES() ? 'Binario' : 'Binary', m.isBinary(tree) ? '✓' : '✗']
    ];
    var dl = document.createElement('dl');
    dl.className = 'stats';
    stats.forEach(function (s) {
      var div = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = s[0];
      var dd = document.createElement('dd'); dd.textContent = String(s[1]);
      div.appendChild(dt); div.appendChild(dd); dl.appendChild(div);
    });
    box.appendChild(dl);

    // Chequeos
    if (checks && checks.length) {
      var ul = document.createElement('ul');
      ul.className = 'checks';
      checks.forEach(function (c) {
        var li = document.createElement('li');
        li.className = 'chk-' + c.level;
        li.textContent = c.msg;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    // Log de solvers
    if (solverResult && solverResult.log && solverResult.log.length) {
      var h = document.createElement('h3');
      h.textContent = isES() ? 'Registro de operaciones' : 'Operation log';
      box.appendChild(h);
      var pre = document.createElement('pre');
      pre.className = 'logbox';
      pre.textContent = solverResult.log.join('\n');
      box.appendChild(pre);
    }
  }

  /* ---------- Tabla comparativa ---------- */
  function renderComparison() {
    var box = document.getElementById('results');
    var canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.innerHTML = '<div class="empty">' +
        esc(isES() ? 'Selecciona un tipo de estructura para dibujarla.'
                   : 'Pick a structure type to draw it.') + '</div>';
    }
    if (!box) return;
    box.innerHTML = '';
    var rows = [
      ['BST', 'O(log n) media', 'O(n) peor', 'O(log n)', isES() ? 'aprendizaje, entrada aleatoria' : 'learning, random input'],
      ['AVL', 'O(log n)', 'O(log n)', 'O(log n)', isES() ? 'consultas frecuentes' : 'lookup-heavy work'],
      ['Rojo-negro', 'O(log n)', 'O(log n)', 'O(log n)', isES() ? 'librerías generales' : 'general-purpose libraries'],
      ['Heap', 'O(n)', 'O(log n)', 'O(log n) raíz', isES() ? 'colas de prioridad' : 'priority queues'],
      ['Trie', 'O(m)', 'O(m)', 'O(m)', isES() ? 'prefijos, autocompletado' : 'prefixes, autocomplete'],
      ['Huffman', '—', 'O(n log n)', '—', isES() ? 'compresión óptima' : 'optimal compression']
    ];
    var h = document.createElement('h3');
    h.textContent = isES() ? 'Complejidades comparadas' : 'Complexity comparison';
    box.appendChild(h);
    var wrap = document.createElement('div');
    wrap.className = 'tbl-wrap';
    var table = document.createElement('table');
    table.className = 'tbl';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    (isES() ? ['Árbol','Buscar','Insertar','Borrar','Mejor para']
            : ['Tree','Search','Insert','Delete','Best for']).forEach(function (x) {
      var th = document.createElement('th'); th.textContent = x; hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);
    var tb = document.createElement('tbody');
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      r.forEach(function (c, i) {
        var td = document.createElement('td');
        if (i > 0 && i < 4) td.className = 'code';
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    box.appendChild(wrap);
    var p = document.createElement('p');
    p.className = 'small slate';
    p.textContent = isES() ? 'n = elementos almacenados · m = longitud de la palabra buscada'
                           : 'n = stored items · m = length of the key searched';
    box.appendChild(p);
  }

  /* ---------- Constructor fácil ---------- */
  function easyMake() {
    var inp = document.getElementById('easySentence');
    var src = document.getElementById('src');
    if (!inp || !src) return;
    var ty = typeById(state.type);
    try {
      if (ty.mode === 'dep') {
        // Fácil → dependencia heurística convertida a CoNLL-U
        var tree = T.parse.sentenceToTree(inp.value);
        src.value = treeToDep(tree);
      } else {
        src.value = inp.value;
      }
      draw();
    } catch (e) {
      setMsg('error', e.userMessage || e.message);
    }
  }

  function treeToDep(tree) {
    var rows = [], id = 0;
    (function walk(n, headId) {
      id++;
      var myId = id;
      if (!n.children || !n.children.length) {
        var pos = T.parse.guessPOS(n.label).toUpperCase();
        rows.push([myId, n.label, headId, 'dep', pos]);
        return myId;
      }
      rows.push([myId, '_', headId, headId === 0 ? 'root' : 'dep', '_']);
      n.children.forEach(function (c) { walk(c, myId); });
      return myId;
    })(tree, 0);
    // arreglar raíz
    return rows.map(function (r) {
      if (r[0] === 1) r[2] = 0, r[3] = 'root';
      return r.join(' ');
    }).join('\n');
  }

  /* ---------- Export ---------- */
  function exportKind(kind) {
    if (!state.tree) { setMsg('note', isES() ? 'Dibuja un árbol primero.' : 'Draw a tree first.'); return; }
    var ty = typeById(state.type);
    var meta = { kind: ty.mode, scriptKind: kind, name: 'arborlab-' + state.type,
                 directives: state.directives };
    T.exporter.downloadScript(state.tree, meta);
  }

  function showSVGCode() {
    var svg = document.querySelector('#canvas svg');
    if (!svg) return;
    var dlg = document.getElementById('codeDlg');
    var txt = document.getElementById('codeText');
    if (txt) txt.value = T.exporter.svgString(svg);
    if (dlg && dlg.showModal) dlg.showModal();
  }

  function copySVGCode() {
    var svg = document.querySelector('#canvas svg');
    if (!svg) return;
    T.exporter.copySVG(svg).then(function () {
      var st = document.getElementById('toast');
      if (st) { st.textContent = isES() ? '✓ Copiado' : '✓ Copied';
        setTimeout(function () { st.textContent = ''; }, 2000); }
    }).catch(function () { showSVGCode(); });
  }

  /* ---------- Init ---------- */
  function init() {
    // Tabs modo
    var te = document.getElementById('tabEasy');
    var tt = document.getElementById('tabText');
    if (te) te.addEventListener('click', function () { state.mode = 'easy'; renderPanel(); });
    if (tt) tt.addEventListener('click', function () { state.mode = 'text'; renderPanel(); });

    var mk = document.getElementById('easyMake');
    if (mk) mk.addEventListener('click', easyMake);

    var ex = document.getElementById('exampleSel');
    if (ex) ex.addEventListener('change', loadExample);

    var db = document.getElementById('drawBtn');
    if (db) db.addEventListener('click', draw);
    var cb = document.getElementById('clearBtn');
    if (cb) cb.addEventListener('click', function () {
      var src = document.getElementById('src');
      if (src) src.value = '';
      clearMsg();
      var res = document.getElementById('results'); if (res) res.innerHTML = '';
      var cv = document.getElementById('canvas');
      if (cv) cv.innerHTML = '<div class="empty">' +
        esc(isES() ? 'Escribe o carga un ejemplo para empezar.'
                   : 'Type or load an example to start.') + '</div>';
      state.tree = null;
    });

    // Zoom
    var canvas = document.getElementById('canvas');
    if (canvas && T.canvas) window._arborCanvas = T.canvas(canvas);

    // Export
    var sv = document.getElementById('svgBtn'); if (sv) sv.addEventListener('click', function () {
      var s = document.querySelector('#canvas svg');
      if (s) T.exporter.saveSVG(s, 'arborlab-' + state.type);
    });
    var pg = document.getElementById('pngBtn'); if (pg) pg.addEventListener('click', function () {
      var s = document.querySelector('#canvas svg'); if (s) T.exporter.savePNG(s, 'arborlab-' + state.type);
    });
    var cp = document.getElementById('codeBtn'); if (cp) cp.addEventListener('click', copySVGCode);
    var sc = document.getElementById('scriptBtn'); if (sc) sc.addEventListener('click', function () {
      var dlg = document.getElementById('scriptDlg');
      if (dlg && dlg.showModal) dlg.showModal();
    });
    document.querySelectorAll('[data-script-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        exportKind(b.getAttribute('data-script-kind'));
        var d = document.getElementById('scriptDlg'); if (d) d.close();
      });
    });
    var cl = document.getElementById('closeDlg');
    if (cl) cl.addEventListener('click', function () {
      var d = document.getElementById('codeDlg'); if (d) d.close();
    });
    var cop = document.getElementById('copyBtn');
    if (cop) cop.addEventListener('click', function () {
      var txt = document.getElementById('codeText');
      if (txt) {
        txt.select();
        navigator.clipboard ? navigator.clipboard.writeText(txt.value) :
          document.execCommand('copy');
        var st = document.getElementById('copyState');
        if (st) st.textContent = isES() ? '✓ Copiado' : '✓ Copied';
      }
    });
    var cls2 = document.getElementById('closeScript');
    if (cls2) cls2.addEventListener('click', function () {
      var d = document.getElementById('scriptDlg'); if (d) d.close();
    });

    // Botones "probar" de la guía
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () {
        var kind = b.getAttribute('data-try');
        var idx = parseInt(b.getAttribute('data-ex') || '0', 10);
        var exs = (window.TREE_EXAMPLES || {})[kind] || [];
        var e = exs[idx] || exs[0];
        if (!e) return;
        selectType(kind);
        setTimeout(function () {
          var src = document.getElementById('src');
          if (src) { src.value = e.text; draw(); }
          document.getElementById('app').scrollIntoView({ behavior: 'smooth' });
        }, 60);
      });
    });

    // Render inicial
    renderTypes();
    renderPanel();
    var first = (window.TREE_EXAMPLES || {}).dependency;
    if (first && first[0]) {
      var srcEl = document.getElementById('src');
      if (srcEl) srcEl.value = first[0].text;
    }
    draw();

    // Redibujar al cambiar idioma
    document.addEventListener('langchange', function () {
      renderTypes(); renderPanel(); draw();
    });

    // Ctrl+Enter para dibujar
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); draw(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
