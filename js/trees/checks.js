/* ============================================================
   LinguaLab — ArborLab: validaciones (checks)
   • Dependencia: raíz única, una sola cabeza, sin ciclos,
     proyectividad (arcos cruzados)
   • Constitución: binariedad, X-bar, profundidad
   • Movimiento: c-command del destino sobre el origen
   Devuelve {level:'error'|'note'|'ok', msg}
   ============================================================ */
(function () {
  'use strict';

  function es() { return (document.documentElement.lang || 'es') === 'es'; }

  function isDep(tree) { return !!tree.depMeta; }

  /* ---------- Reglas de dependencia ---------- */
  function checkDependency(tree) {
    var out = [];
    var meta = tree.depMeta;
    if (!meta) return out;

    // 1. Raíz única
    if (meta.roots.length === 0) {
      out.push({ level: 'error', msg: es()
        ? 'Ninguna palabra es la raíz: falta una cabeza 0.'
        : 'No word is the root: a head 0 is missing.' });
    } else if (meta.roots.length > 1) {
      out.push({ level: 'error', msg: es()
        ? meta.roots.length + ' raíces encontradas: debe haber exactamente una.'
        : meta.roots.length + ' roots found: there must be exactly one.' });
    }

    // 2. Cada palabra tiene exactamente una cabeza (garantizado por el parser)
    // 3. Sin ciclos: subir de cada nodo debe llegar a la raíz
    var cycles = [];
    meta.nodes.forEach(function (n) {
      var seen = {}, cur = n, steps = 0;
      while (cur && cur.head !== 0 && steps < meta.nodes.length + 1) {
        if (seen[cur.id]) { cycles.push(cur.word); break; }
        seen[cur.id] = true;
        cur = meta.byId[cur.head];
        steps++;
      }
      if (steps > meta.nodes.length) cycles.push(n.word);
    });
    if (cycles.length) {
      out.push({ level: 'error', msg: es()
        ? 'Ciclo detectado desde: ' + uniq(cycles).join(', ')
        : 'Cycle detected from: ' + uniq(cycles).join(', ') });
    }

    // 4. Proyectividad: arcos que se cruzan
    var cross = crossingArcs(meta);
    if (cross.length) {
      out.push({ level: 'note', msg: es()
        ? 'Arcos cruzados (no proyectivo): ' + cross.join(', ') +
          '. Normal en lenguas de orden libre.'
        : 'Crossing arcs (non-projective): ' + cross.join(', ') +
          '. Common in free-word-order languages.' });
    }

    if (!out.length) {
      out.push({ level: 'ok', msg: es()
        ? 'Árbol de dependencia válido: raíz única, sin ciclos, proyectivo.'
        : 'Valid dependency tree: single root, acyclic, projective.' });
    }
    return out;
  }

  function crossingArcs(meta) {
    var pos = {};
    meta.nodes.forEach(function (n, i) { pos[n.id] = i; });
    var arcs = meta.nodes.filter(function (n) { return n.head !== 0; })
      .map(function (n) {
        var a = pos[n.head], b = pos[n.id];
        return { from: Math.min(a, b), to: Math.max(a, b), label: n.word };
      });
    var crossed = [];
    for (var i = 0; i < arcs.length; i++) {
      for (var j = i + 1; j < arcs.length; j++) {
        var A = arcs[i], B = arcs[j];
        if ((A.from < B.from && B.from < A.to && A.to < B.to) ||
            (B.from < A.from && A.from < B.to && B.to < A.to)) {
          crossed.push(A.label + '↔' + B.label);
        }
      }
    }
    return uniq(crossed);
  }

  /* ---------- Reglas de constitución ---------- */
  function checkConstituency(tree, opts) {
    var out = [];
    opts = opts || {};
    var binary = allBinary(tree);
    var depth = window.LinguaLabTrees.metrics.maxDepth(tree);
    var n = window.LinguaLabTrees.metrics.countNodes(tree);

    if (binary) {
      out.push({ level: 'ok', msg: es()
        ? 'Ramificación binaria en todos los nodos (compatible con X-bar).'
        : 'Binary branching at every node (X-bar compatible).' });
    } else if (opts.xbar) {
      out.push({ level: 'note', msg: es()
        ? 'Ramas no binarias detectadas: revisa si algún XP tiene más de dos hijas.'
        : 'Non-binary branching detected: check whether some XP has more than two daughters.' });
    }

    // X-bar: XP debe contener una proyección de su propia categoría
    if (opts.xbar) {
      var bad = badProjections(tree);
      if (bad.length) {
        out.push({ level: 'note', msg: es()
          ? 'Proyecciones sin núcleo X′: ' + bad.join(', ')
          : 'Projections lacking an X′ head: ' + bad.join(', ') });
      }
    }

    out.push({ level: 'ok', msg: (es() ? 'Nodos: ' : 'Nodes: ') + n +
      ' · ' + (es() ? 'profundidad ' : 'depth ') + depth });
    return out;
  }

  function allBinary(n) {
    if (!n.children || !n.children.length) return true;
    if (n.children.length > 2) return false;
    return n.children.every(allBinary);
  }

  function badProjections(n) {
    var bad = [];
    function walk(x) {
      if (!x.children || !x.children.length) return;
      var lbl = x.label || '';
      var m = lbl.match(/^([A-Z]+)P?$/);
      if (m) {
        var cat = m[1];
        var hasProj = JSON.stringify(x).indexOf(cat + "'") >= 0 ||
                      JSON.stringify(x).indexOf(cat + 'P') >= 0;
        if (!hasProj) bad.push(lbl);
      }
      x.children.forEach(walk);
    }
    walk(n);
    return uniq(bad);
  }

  /* ---------- Movimiento: c-command ---------- */
  function checkMovement(tree, directives) {
    var out = [];
    if (!directives || !directives.length) return out;

    var index = [];
    (function flat(n, path) {
      index.push({ node: n, path: path.slice() });
      (n.children || []).forEach(function (c, i) {
        var p = path.slice(); p.push(i); flat(c, p);
      });
    })(tree, []);

    // Mapa por id (#tr, #wh)
    var byId = {};
    index.forEach(function (it) {
      var m = it.node.label.match(/#(\w+)/);
      if (m) byId[m[1]] = it;
    });

    directives.forEach(function (d) {
      var a = byId[d.from], b = byId[d.to];
      if (!a || !b) {
        out.push({ level: 'note', msg: es()
          ? 'No se encontró el par de flecha «' + d.from + ' → ' + d.to + '» (usa #id).'
          : 'Arrow pair «' + d.from + ' → ' + d.to + '» not found (use #id).' });
        return;
      }
      // El origen (huella) debe estar bajo el destino (posición movida)
      var under = a.path.slice(0, b.path.length).join('/') === b.path.join('/');
      if (under) {
        out.push({ level: 'ok', msg: (es()
          ? '✓ c-command: la posición movida c-comanda su huella'
          : '✓ c-command: the landing site c-commands its trace') +
          (d.label ? ' (' + d.label + ')' : '') });
      } else {
        out.push({ level: 'note', msg: (es()
          ? '⚠ La posición movida NO c-comanda la huella'
          : '⚠ The landing site does NOT c-command the trace') +
          (d.label ? ' (' + d.label + ')' : '') });
      }
    });
    return out;
  }

  /* ---------- Determina tipo de árbol y aplica checks ---------- */
  function runAll(tree, opts) {
    opts = opts || {};
    var out = [];
    if (isDep(tree)) out = out.concat(checkDependency(tree));
    else out = out.concat(checkConstituency(tree, opts));
    if (opts.directives) out = out.concat(checkMovement(tree, opts.directives));
    return out;
  }

  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.checks = {
    runAll: runAll,
    checkDependency: checkDependency,
    checkConstituency: checkConstituency,
    checkMovement: checkMovement
  };
})();
