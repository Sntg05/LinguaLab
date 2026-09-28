/* ============================================================
   LinguaLab — text-tools.js
   Herramientas de análisis textual en el navegador:
   frecuencia, concordancia KWIC, estadísticas, n-gramas,
   legibilidad y exportación JSON.
   Guardrails aplicados: límite de tamaño, escape, rate-limit.
   ============================================================ */
(function () {
  'use strict';

  var G = window.LinguaLabGuardrails;
  var STOP_ES = ('de la que el en y a los del se las por un para con no una su al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mí antes algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros');
  var STOP_EN = ('the of and to in a is that it for as with was on be at by i this from or an but not are were has have had they you one all we can her has there been if more when will would who so no out up into do what about than its his their she only other time new some these may first then any my now such like our over man even most made after also did many before must through back years where much your way well down should because each just those people mr how too little state good very make world still own see men work long get here between both life being under never day same another know while last might us great old year off come since against go came right used take three');

  // Sets precalculados (evita split+indexOf por token → INP)
  var STOP_SET = (function () {
    var s = {};
    (STOP_ES + ' ' + STOP_EN).split(' ').forEach(function (w) { s[w] = 1; });
    return s;
  })();

  var state = { text: '', tab: 'freq', keyword: '' };

  /* ---------- Utilidades ---------- */
  function tokens(text) {
    var m = String(text).toLowerCase().match(/[a-záéíóúüñ0-9'’-]+/gi);
    return m || [];
  }

  function isStop(w) {
    var clean = w.replace(/[^\p{L}\p{N}'’-]/gu, '');
    return !!STOP_SET[clean];
  }

  function frequency(list, removeStop) {
    var map = {};
    list.forEach(function (w) {
      if (removeStop && isStop(w)) return;
      map[w] = (map[w] || 0) + 1;
    });
    return Object.keys(map)
      .map(function (w) { return { word: w, count: map[w] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
  }

  function splitSentences(text) {
    // Sin lookbehind (Safari < 16.4): parte por puntuación conservando el signo.
    var parts = String(text).split(/\n+/);
    var out = [];
    parts.forEach(function (p) {
      var m = p.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g);
      (m || [p]).forEach(function (s) {
        s = s.trim();
        if (s) out.push(s);
      });
    });
    return out;
  }

  function kwic(text, keyword) {
    if (!keyword) return [];
    var kw = keyword.toLowerCase();
    var sentences = splitSentences(text);
    var out = [];
    sentences.forEach(function (s) {
      var words = s.split(/\s+/);
      words.forEach(function (w, i) {
        var clean = w.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '');
        if (clean === kw) {
          out.push({
            left: words.slice(Math.max(0, i - 5), i).join(' '),
            node: w,
            right: words.slice(i + 1, i + 6).join(' ')
          });
        }
      });
    });
    return out;
  }

  function stats(list) {
    var n = list.length;
    var types = new Set(list).size;
    var freq = frequency(list, true);
    var hapax = freq.filter(function (f) { return f.count === 1; }).length;
    var sentences = Math.max(1, (state.text.match(/[.!?…]+/g) || []).length);
    return {
      tokens: n,
      types: types,
      ttr: n ? +(types / n).toFixed(4) : 0,
      hapax: hapax,
      hapaxRatio: freq.length ? +(hapax / freq.length).toFixed(4) : 0,
      sentences: sentences,
      avgSentenceLen: +(n / sentences).toFixed(2),
      avgWordLen: n ? +(list.join('').length / n).toFixed(2) : 0
    };
  }

  function ngrams(list, n) {
    var map = {};
    for (var i = 0; i + n <= list.length; i++) {
      var g = list.slice(i, i + n).join(' ');
      map[g] = (map[g] || 0) + 1;
    }
    return Object.keys(map)
      .map(function (g) { return { gram: g, count: map[g] }; })
      .filter(function (g) { return g.count > 1; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 30);
  }

  function readability(text) {
    var words = tokens(text);
    var sentences = Math.max(1, (text.match(/[.!?…]+/g) || []).length);
    var syl = words.reduce(function (acc, w) { return acc + syllables(w); }, 0);
    var w = Math.max(1, words.length);
    var s = sentences;
    var fleschES = 206.835 - 1.02 * (w / s) - 60.265 * (syl / w);       // Fernández-Huerta
    var fleschEN = 206.835 - 1.015 * (w / s) - 84.6 * (syl / w);        // Flesch Reading Ease
    var gradeEN = 0.39 * (w / s) + 11.8 * (syl / w) - 15.59;            // Flesch–Kincaid grade
    return {
      sentences: s, words: w, syllables: syl,
      fleschES: +fleschES.toFixed(1),
      fleschEN: +fleschEN.toFixed(1),
      gradeEN: +gradeEN.toFixed(1),
      avgSyllWord: +(syl / w).toFixed(2)
    };
  }

  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
    if (!w) return 0;
    var groups = w.match(/[aeiouáéíóúü]+/g);
    var n = groups ? groups.length : 1;
    if (/[aeiouáéíóúü]s?$/.test(w) && n > 1) n -= 0; // sin restas agresivas
    return Math.max(1, n);
  }

  /* ---------- Render ---------- */
  function tabFreq() {
    var list = tokens(state.text);
    var noStop = document.getElementById('chkStop') ? document.getElementById('chkStop').checked : true;
    var freq = frequency(list, noStop).slice(0, 40);
    var max = freq.length ? freq[0].count : 1;
    var html = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th scope="col">#</th><th scope="col">' + esc(L('palabra', 'word')) + '</th><th scope="col">' + esc(L('frecuencia', 'count')) +
      '</th><th scope="col">' + esc(L('barra', 'bar')) + '</th></tr></thead><tbody>';
    freq.forEach(function (f, i) {
      html += '<tr><td class="slate">' + (i + 1) + '</td><td><code>' + esc(f.word) + '</code></td>' +
        '<td><b>' + f.count + '</b></td>' +
        '<td><span class="bar"><span style="width:' + ((f.count / max) * 100) + '%"></span></span></td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function tabKWIC() {
    var kw = state.keyword || (document.getElementById('kwInput') || {}).value || '';
    var rows = kwic(state.text, kw.trim());
    if (!kw.trim())
      return '<p class="slate">' + esc(L('Introduce una palabra clave en «Palabra clave (nodo)».',
        'Enter a keyword in “Keyword (node)”.')) + '</p>';
    if (!rows.length)
      return '<p class="slate">' + esc(L('Sin coincidencias.', 'No matches.')) + '</p>';
    var html = '<div class="tbl-wrap"><table class="tbl kwic"><thead><tr>' +
      '<th scope="col">' + esc(L('Izquierda', 'Left')) + '</th><th scope="col">' + esc(L('Nodo', 'Node')) +
      '</th><th scope="col">' + esc(L('Derecha', 'Right')) + '</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><td class="r slate">' + esc(r.left) + '</td>' +
        '<td><b class="node">' + esc(r.node) + '</b></td>' +
        '<td class="slate">' + esc(r.right) + '</td></tr>';
    });
    html += '</tbody></table></div><p class="small slate">' + rows.length + ' ' +
      esc(L('concordancias', 'concordances')) + '</p>';
    return html;
  }

  function tabStats() {
    var s = stats(tokens(state.text));
    var pairs = [
      [L('Tokens', 'Tokens'), s.tokens],
      [L('Tipos', 'Types'), s.types],
      ['TTR', s.ttr],
      [L('Hapax', 'Hapax'), s.hapax + ' (' + (s.hapaxRatio * 100).toFixed(1) + '%)'],
      [L('Oraciones', 'Sentences'), s.sentences],
      [L('Media de palabras/oración', 'Avg words/sentence'), s.avgSentenceLen],
      [L('Media de letras/palabra', 'Avg letters/word'), s.avgWordLen]
    ];
    var html = '<dl class="stats">';
    pairs.forEach(function (p) {
      html += '<div><dt>' + esc(p[0]) + '</dt><dd>' + esc(String(p[1])) + '</dd></div>';
    });
    html += '</dl>';
    return html;
  }

  function tabNgrams() {
    var list = tokens(state.text);
    var out = '';
    [2, 3].forEach(function (n) {
      var grams = ngrams(list, n);
      out += '<h4 class="eyebrow">' + n + '-gramas</h4>';
      if (!grams.length) { out += '<p class="slate small">' + esc(L('Sin n-gramas repetidos.',
        'No repeated n-grams.')) + '</p>'; return; }
      out += '<div class="chips">';
      grams.forEach(function (g) {
        out += '<span class="chip"><code>' + esc(g.gram) + '</code><b>' + g.count + '</b></span>';
      });
      out += '</div>';
    });
    return out;
  }

  function tabRead() {
    var r = readability(state.text);
    var grade = r.fleschES >= 80 ? L('Fácil', 'Easy') : r.fleschES >= 60 ? L('Medio', 'Standard')
      : r.fleschES >= 40 ? L('Difícil', 'Difficult') : MuyDificil();
    var pairs = [
      [L('Índice Flesch (ES, Fernández-Huerta)', 'Flesch index (ES)'), r.fleschES],
      ['Flesch Reading Ease (EN)', r.fleschEN],
      ['Flesch–Kincaid grade (EN)', r.gradeEN],
      [L('Sílabas', 'Syllables'), r.syllables],
      [L('Sílabas por palabra', 'Syllables per word'), r.avgSyllWord],
      [L('Nivel', 'Level'), grade]
    ];
    var html = '<dl class="stats">';
    pairs.forEach(function (p) {
      html += '<div><dt>' + esc(p[0]) + '</dt><dd>' + esc(String(p[1])) + '</dd></div>';
    });
    html += '</dl>';
    return html;
  }

  function MuyDificil() { return L('Muy difícil', 'Very difficult'); }

  function render() {
    var box = document.getElementById('toolsResults');
    if (!box) return;
    if (!state.text.trim()) {
      box.innerHTML = '<p class="slate">' + esc(L('Pega un texto y pulsa «Analizar».',
        'Paste a text and hit “Analyse”.')) + '</p>';
      return;
    }
    var map = { freq: tabFreq, kwic: tabKWIC, stats: tabStats, ngrams: tabNgrams, read: tabRead };
    box.innerHTML = (map[state.tab] || tabFreq)();
  }

  /* ---------- Export ---------- */
  function exportJSON() {
    if (!G || !G.rateLimit(300, 'text-export')) return;
    var data = {
      tool: 'LinguaLab text station',
      generated: new Date().toISOString(),
      lang: document.documentElement.lang,
      stats: stats(tokens(state.text)),
      frequency: frequency(tokens(state.text), true).slice(0, 100),
      bigrams: ngrams(tokens(state.text), 2),
      trigrams: ngrams(tokens(state.text), 3),
      readability: readability(state.text)
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lingualab-analisis.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 10000);
  }

  /* ---------- Carga de texto (con guardrails) ---------- */
  function setText(raw) {
    // No mutar texto lingüístico: el render ya escapa vía esc()/textContent.
    var text = String(raw || '');
    if (!G) { state.text = text; return true; }
    var v = G.validateText(text);
    if (!v.ok) {
      alert(v.msg || 'Texto no válido');
      return false;
    }
    state.text = text;
    return true;
  }

  /* ---------- Helpers de i18n ---------- */
  function L(es, en) { return (document.documentElement.lang || 'es') === 'es' ? es : en; }
  function esc(s) { return G ? G.escapeHTML(s) : String(s); }

  /* ---------- Init ---------- */
  function init() {
    var input = document.getElementById('toolsInput');
    var run = document.getElementById('toolsRun');
    var clear = document.getElementById('toolsClear');
    var exp = document.getElementById('toolsExport');
    var sample = document.getElementById('toolsSample');
    var upload = document.getElementById('toolsUpload');
    var kw = document.getElementById('kwInput');

    if (run) run.addEventListener('click', function () {
      if (!G || !G.rateLimit(300, 'text-run')) return;
      if (input && setText(input.value)) render();
    });
    if (clear) clear.addEventListener('click', function () {
      state.text = ''; state.keyword = '';
      if (input) input.value = '';
      if (kw) kw.value = '';
      render();
    });
    if (exp) exp.addEventListener('click', exportJSON);
    if (sample) sample.addEventListener('click', function () {
      if (input) {
        input.value = SAMPLE_ES;
        if (setText(SAMPLE_ES)) render();
      }
    });
    var kwTimer = null;
    if (kw) kw.addEventListener('input', function () {
      clearTimeout(kwTimer);
      kwTimer = setTimeout(function () {
        state.keyword = kw.value;
        if (state.tab === 'kwic') render();
      }, 150);
    });
    if (upload) upload.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      if (G) {
        var v = G.validateFile(f);
        if (!v.ok) { alert(v.msg || 'Archivo no permitido'); e.target.value = ''; return; }
      }
      var reader = new FileReader();
      reader.onload = function () {
        if (input) input.value = String(reader.result || '');
        if (setText(String(reader.result || ''))) render();
        e.target.value = '';
      };
      reader.onerror = function () {
        alert((document.documentElement.lang || 'es') === 'es'
          ? 'No se pudo leer el archivo' : 'Could not read the file');
        e.target.value = '';
      };
      reader.readAsText(f, 'utf-8');
    });

    // Pestañas
    document.querySelectorAll('[data-tool-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.tab = b.getAttribute('data-tool-tab');
        document.querySelectorAll('[data-tool-tab]').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        render();
      });
    });

    var chk = document.getElementById('chkStop');
    if (chk) chk.addEventListener('change', render);

    render();
  }

  var SAMPLE_ES =
    'La lingüística de corpus estudia el lenguaje a partir de datos reales. ' +
    'Un corpus reúne textos auténticos que permiten medir frecuencias, colocaciones y dispersiones. ' +
    'La frecuencia de una palabra no depende solo de su importancia: el tamaño del corpus también cuenta. ' +
    'Por eso las medidas de asociación como log-Dice buscan comparabilidad entre corpus de distinto tamaño. ' +
    'El análisis de concordancias muestra cada ocurrencia de un nodo con su contexto inmediato. ' +
    'Sobre esa base se estudian la ley de Zipf, la diversidad léxica y los índices de legibilidad.';

  window.LinguaLabTextTools = {
    tokens: tokens, frequency: frequency, kwic: kwic, stats: stats,
    ngrams: ngrams, readability: readability, init: init, setText: setText
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
