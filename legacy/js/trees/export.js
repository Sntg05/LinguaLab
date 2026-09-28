/* ============================================================
   LinguaLab — ArborLab: exportación
   • SVG  (guardar / copiar código)
   • PNG  (canvas)
   • Script reutilizable:
       - JSON editable (re-importable en ArborLab)
       - Newick (herramientas filogenéticas/grafo)
       - CoNLL-U / Brat (para NLP)
   ============================================================ */
(function () {
  'use strict';

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------- SVG ---------- */
  function svgString(svg) {
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Inyecta variables resueltas para que el SVG aislado se vea bien
    var cs = getComputedStyle(document.documentElement);
    var vars = ['--ink', '--teal', '--gold', '--slate', '--surface', '--teal-lite', '--line2', '--warn', '--ok'];
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = ':root{' + vars.map(function (v) {
      return v + ':' + (cs.getPropertyValue(v).trim() || '#000');
    }).join(';') + '}';
    clone.insertBefore(style, clone.firstChild);
    // Resuelve var() inline del SVG (currentColor) via cssText
    var xml = new XMLSerializer().serializeToString(clone);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
  }

  function saveSVG(svg, name) {
    download((name || 'arborlab') + '.svg', svgString(svg), 'image/svg+xml;charset=utf-8');
  }

  function copySVG(svg) {
    var text = svgString(svg);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('clipboard no disponible'));
  }

  function savePNG(svg, name) {
    var w = parseInt(svg.getAttribute('width'), 10) || 800;
    var h = parseInt(svg.getAttribute('height'), 10) || 600;
    // Capar escala para evitar OOM en móvil (máx. 2048px por lado)
    var scale = Math.min(2, 2048 / Math.max(w, h));
    var data = svgString(svg);
    var blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      var c = canvas.getContext('2d');
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.setTransform(scale, 0, 0, scale, 0, 0);
      c.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (b) {
        if (!b) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = (name || 'arborlab') + '.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
      });
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  }

  /* ---------- Serialización del árbol ---------- */
  function toJSON(tree, meta) {
    function ser(n) {
      var o = { label: n.label };
      if (n.children && n.children.length) o.children = n.children.map(ser);
      return o;
    }
    return {
      format: 'LinguaLab ArborLab v1',
      generated: new Date().toISOString(),
      kind: meta && meta.kind ? meta.kind : 'constituency',
      lang: document.documentElement.lang || 'es',
      tree: ser(tree),
      directives: (meta && meta.directives) || []
    };
  }

  function fromJSON(obj) {
    function de(o) {
      return {
        label: o.label,
        children: (o.children || []).map(de),
        isLeaf: !(o.children && o.children.length),
        line: 1, col: 1
      };
    }
    if (!obj || !obj.tree) throw new Error('JSON no reconocido');
    return de(obj.tree);
  }

  /* ---------- Newick ---------- */
  function toNewick(tree) {
    function esc(s) {
      return String(s || '').replace(/\s+/g, '_').replace(/[(),:;'"\[\]]/g, '');
    }
    function ser(n) {
      var lbl = esc(n.label);
      if (!n.children || !n.children.length) return lbl || 'nodo';
      return '(' + n.children.map(ser).join(',') + ')' + lbl;
    }
    return ser(tree) + ';';
  }

  /* ---------- CoNLL-U / Brat ---------- */
  function toCoNLLU(tree) {
    // Solo hojas como tokens (UD válido): internos no se emiten.
    var leaves = [];
    (function collect(n) {
      if (!n.children || !n.children.length) { leaves.push(n); return; }
      n.children.forEach(collect);
    })(tree);

    var out = ['# text = ' + leaves.map(function (n) { return String(n.label).replace(/_/g, ' '); }).join(' ')];
    leaves.forEach(function (n, idx) {
      var id = idx + 1;
      var form = String(n.label).replace(/_/g, ' ');
      var head = id === 1 ? 0 : 1;
      var rel = id === 1 ? 'root' : 'dep';
      out.push([
        id,
        form,
        form.toLowerCase(),
        guessUPOS(form),
        '_',
        '_',
        head,
        rel,
        '_',
        '_'
      ].join('\t'));
    });
    out.push('');
    return out.join('\n');
  }

  function guessUPOS(w) {
    var x = w.toLowerCase();
    if (/^[.,;:!?…]$/.test(x)) return 'PUNCT';
    if (['el','la','los','las','un','una','the','a','an','this','that'].indexOf(x) >= 0) return 'DET';
    if (['de','en','con','por','para','sobre','of','in','with','by','for','on'].indexOf(x) >= 0) return 'ADP';
    if (['y','o','pero','and','or','but'].indexOf(x) >= 0) return 'CCONJ';
    if (['es','está','was','is','son','era'].indexOf(x) >= 0) return 'AUX';
    if (/[áéíóú]|\d/.test(x) || x.length > 3) {
      return /[aeiou]$/.test(x) ? 'VERB' : 'NOUN';
    }
    return 'NOUN';
  }

  /* ---------- Menú de descarga "script" ---------- */
  function downloadScript(tree, meta) {
    var kind = (meta && meta.scriptKind) || 'json';
    var name = (meta && meta.name) || 'arborlab-arbol';
    if (kind === 'newick') {
      download(name + '.nwk', toNewick(tree), 'text/plain;charset=utf-8');
    } else if (kind === 'conllu') {
      download(name + '.conllu', toCoNLLU(tree), 'text/plain;charset=utf-8');
    } else if (kind === 'brat') {
      download(name + '.txt', toBrat(tree), 'text/plain;charset=utf-8');
    } else {
      download(name + '.json', JSON.stringify(toJSON(tree, meta), null, 2),
        'application/json;charset=utf-8');
    }
  }

  function toBrat(tree) {
    // Formato stand-off sencillo: solo texto
    var words = [];
    (function w(n) {
      if (!n.children || !n.children.length) { words.push(n.label.replace(/_/g, ' ')); return; }
      n.children.forEach(w);
    })(tree);
    return words.join(' ') + '\n';
  }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.exporter = {
    saveSVG: saveSVG, savePNG: savePNG, copySVG: copySVG, svgString: svgString,
    toJSON: toJSON, fromJSON: fromJSON, toNewick: toNewick,
    toCoNLLU: toCoNLLU, toBrat: toBrat, downloadScript: downloadScript, download: download
  };
})();
