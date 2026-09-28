/* ============================================================
   LinguaLab — ipa-chart.js
   Visualizador AFI/IPA responsive + ficha de símbolo.
   - Grid por categorías (escritorio) → tarjetas deslizables (móvil)
   - Búsqueda, filtro y selección de símbolo
   - Reproduce audio vía audio-player.js
   ============================================================ */
(function () {
  'use strict';

  var G = window.LinguaLabGuardrails;
  var CHART = window.IPA_CHART;
  var state = { q: '', cat: 'all', selected: null };

  function es() { return (document.documentElement.lang || 'es') === 'es'; }
  function esc(s) { return G ? G.escapeHTML(s) : String(s); }

  function allSymbols() {
    var out = [];
    CHART.categories.forEach(function (c) {
      c.symbols.forEach(function (s) {
        out.push(Object.assign({}, s, { cat: c.id, catName_es: c.name_es, catName_en: c.name_en }));
      });
    });
    return out;
  }

  function voicingMatches(s, q) {
    // Búsqueda EN: voiceless ↔ sorda, voiced ↔ sonora
    if (q.indexOf('voiceless') >= 0 && s.voicing === 'sorda') return true;
    if (q.indexOf('voiced') >= 0 && s.voicing === 'sonora') return true;
    if (q.indexOf('sorda') >= 0 && s.voicing === 'sorda') return true;
    if (q.indexOf('sonora') >= 0 && s.voicing === 'sonora') return true;
    return false;
  }

  function matches(s) {
    var q = state.q.trim().toLowerCase();
    if (state.cat !== 'all' && s.cat !== state.cat) return false;
    if (!q) return true;
    var hay = [s.ipa, s.es, s.en, s.place_es, s.place_en, s.manner_es, s.manner_en, s.voicing,
      s.catName_es, s.catName_en].join(' ').toLowerCase();
    if (hay.indexOf(q) >= 0) return true;
    return voicingMatches(s, q);
  }

  function renderChart() {
    var root = document.getElementById('ipaChart');
    if (!root || !CHART) return;
    root.innerHTML = '';

    CHART.categories.forEach(function (c) {
      var syms = c.symbols.map(function (s) {
        return Object.assign({}, s, { cat: c.id, catName_es: c.name_es, catName_en: c.name_en });
      }).filter(matches);
      if (!syms.length) return;

      var sec = document.createElement('section');
      sec.className = 'ipa-cat';

      var head = document.createElement('div');
      head.className = 'ipa-cat-head';
      var h3 = document.createElement('h3');
      h3.textContent = es() ? c.name_es : c.name_en;
      var note = document.createElement('p');
      note.className = 'small slate';
      note.textContent = es() ? c.note_es : c.note_en;
      var count = document.createElement('span');
      count.className = 'tagpill live';
      count.textContent = syms.length;
      head.appendChild(h3);
      head.appendChild(count);
      sec.appendChild(head);
      sec.appendChild(note);

      var grid = document.createElement('div');
      grid.className = 'ipa-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', es() ? c.name_es : c.name_en);

      syms.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ipa-cell' + (state.selected && state.selected.ipa === s.ipa ? ' on' : '');
        b.setAttribute('data-ipa', s.ipa);
        b.setAttribute('aria-label', s.ipa + ' — ' + (es() ? s.es : s.en));
        b.setAttribute('aria-pressed',
          state.selected && state.selected.ipa === s.ipa ? 'true' : 'false');

        var sym = document.createElement('span');
        sym.className = 'ipa-sym';
        sym.setAttribute('aria-hidden', 'true');
        sym.textContent = s.ipa;
        var lab = document.createElement('span');
        lab.className = 'ipa-lab';
        lab.setAttribute('aria-hidden', 'true');
        lab.textContent = es() ? s.place_es : s.place_en;
        b.appendChild(sym);
        b.appendChild(lab);

        grid.appendChild(b);
      });

      sec.appendChild(grid);
      root.appendChild(sec);
    });

    if (!root.children.length) {
      var p = document.createElement('p');
      p.className = 'slate center';
      p.textContent = es() ? 'Ningún símbolo coincide con la búsqueda.' : 'No symbol matches your search.';
      root.appendChild(p);
    }
  }

  function select(s, focusEl) {
    state.selected = s;
    renderDetail();
    // Actualiza .on sin reconstruir la rejilla (preserva foco de teclado)
    document.querySelectorAll('#ipaChart [data-ipa]').forEach(function (b) {
      var on = b.getAttribute('data-ipa') === s.ipa;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // Reproduce el audio automáticamente si hay archivo; si no, usa voz del sistema
    if (window.LinguaLabAudio) window.LinguaLabAudio.play(s.ipa);
    if (focusEl && focusEl.focus) focusEl.focus();
  }

  function renderDetail() {
    var box = document.getElementById('ipaDetail');
    if (!box) return;
    var s = state.selected;
    if (!s) {
      box.innerHTML = '<p class="slate">' +
        esc(es() ? 'Pulsa un símbolo del alfabeto para ver su ficha.'
                 : 'Tap a symbol in the alphabet to see its card.') + '</p>';
      return;
    }
    box.innerHTML = '';

    var sym = document.createElement('div');
    sym.className = 'detail-sym';
    sym.textContent = s.ipa;
    box.appendChild(sym);

    var name = document.createElement('h3');
    name.textContent = es() ? s.es : s.en;
    box.appendChild(name);

    var rows = [
      [es() ? 'Categoría' : 'Category', es() ? s.catName_es : s.catName_en],
      [es() ? 'Punto de articulación' : 'Place of articulation', es() ? s.place_es : s.place_en],
      [es() ? 'Modo' : 'Manner', es() ? s.manner_es : s.manner_en],
      [es() ? 'Fonación' : 'Voicing', s.voicing]
    ];
    var dl = document.createElement('dl');
    dl.className = 'detail-dl';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    box.appendChild(dl);

    var actions = document.createElement('div');
    actions.className = 'row';
    var play = document.createElement('button');
    play.type = 'button';
    play.className = 'btn solid sm';
    play.textContent = '🔊 ' + (es() ? 'Reproducir' : 'Play');
    play.addEventListener('click', function () {
      if (window.LinguaLabAudio) window.LinguaLabAudio.play(s.ipa);
    });
    actions.appendChild(play);
    box.appendChild(actions);
  }

  function renderFilters() {
    var bar = document.getElementById('ipaFilters');
    if (!bar) return;
    bar.innerHTML = '';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', es() ? 'Filtrar por categoría' : 'Filter by category');

    var mk = function (id, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-chip' + (state.cat === id ? ' on' : '');
      b.setAttribute('aria-pressed', state.cat === id ? 'true' : 'false');
      b.textContent = label;
      b.addEventListener('click', function () { state.cat = id; renderFilters(); renderChart(); });
      return b;
    };

    bar.appendChild(mk('all', es() ? 'Todos' : 'All'));
    CHART.categories.forEach(function (c) {
      bar.appendChild(mk(c.id, es() ? c.name_es : c.name_en));
    });
  }

  function findSymbol(ipa) {
    var found = null;
    CHART.categories.forEach(function (c) {
      c.symbols.forEach(function (s) {
        if (s.ipa === ipa) {
          found = Object.assign({}, s, { cat: c.id, catName_es: c.name_es, catName_en: c.name_en });
        }
      });
    });
    return found;
  }

  function init() {
    var q = document.getElementById('ipaSearch');
    var qTimer = null;
    if (q) q.addEventListener('input', function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { state.q = q.value; renderChart(); }, 120);
    });
    var root = document.getElementById('ipaChart');
    if (root) root.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ipa]') : null;
      if (!b || !root.contains(b)) return;
      var s = findSymbol(b.getAttribute('data-ipa'));
      if (s) select(s);
    });
    renderFilters();
    renderChart();
    renderDetail();
    document.addEventListener('langchange', function () {
      renderFilters(); renderChart(); renderDetail();
    });
  }

  window.LinguaLabIPA = { chart: CHART, select: select, allSymbols: allSymbols };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
