/* ============================================================
   LinguaLab — bibliography.js
   Catálogo filtrable de recursos bibliográficos con descarga.
   Fuente: data/bibliography.js → window.BIBLIOGRAPHY
   ============================================================ */
(function () {
  'use strict';

  var G = window.LinguaLabGuardrails;
  function getData() { return window.BIBLIOGRAPHY || []; }
  var DATA = [];
  var state = { q: '', topic: 'all' };
  var topicsPopulated = false;

  function esc(s) { return G ? G.escapeHTML(s) : String(s); }
  function es() { return (document.documentElement.lang || 'es') === 'es'; }

  function topics() {
    var seen = {};
    DATA.forEach(function (d) {
      var k = es() ? d.topic : (d.topic_en || d.topic);
      seen[k] = true;
    });
    return Object.keys(seen).sort();
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.filter(function (d) {
      var topic = es() ? d.topic : (d.topic_en || d.topic);
      if (state.topic !== 'all' && topic !== state.topic) return false;
      if (!q) return true;
      var hay = [d.title_es, d.title_en, d.author, d.topic, d.topic_en, d.type, d.note_es, d.note_en, String(d.year)]
        .join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function render() {
    var box = document.getElementById('bibList');
    var sel = document.getElementById('bibTopic');
    var count = document.getElementById('bibCount');
    if (!box) return;

    // Poblar el selector de temas solo una vez (no perder foco en cada tecla)
    if (sel && !topicsPopulated) {
      sel.innerHTML = '';
      var optAll = document.createElement('option');
      optAll.value = 'all';
      optAll.textContent = es() ? 'Todos los temas' : 'All topics';
      sel.appendChild(optAll);
      topics().forEach(function (t) {
        var o = document.createElement('option');
        o.value = t; o.textContent = t;
        sel.appendChild(o);
      });
      topicsPopulated = true;
    }
    if (sel && topics().indexOf(state.topic) < 0 && state.topic !== 'all') {
      state.topic = 'all';
      sel.value = 'all';
    } else if (sel) {
      sel.value = state.topic;
    }

    var items = filtered();
    if (count) count.textContent = items.length + '/' + DATA.length;

    box.innerHTML = '';
    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'slate';
      p.textContent = es() ? 'Ningún recurso coincide con tu búsqueda.' : 'No resource matches your search.';
      box.appendChild(p);
      return;
    }

    items.forEach(function (d) {
      var card = document.createElement('article');
      card.className = 'card bib-card';

      var head = document.createElement('div');
      head.className = 'bib-head';
      var tags = document.createElement('div');
      tags.className = 'row';
      [es() ? d.topic : (d.topic_en || d.topic), es() ? d.type : (d.type_en || d.type), d.lang]
        .forEach(function (label) {
          var s = document.createElement('span');
          s.className = 'tagpill';
          s.textContent = label;
          tags.appendChild(s);
        });
      var year = document.createElement('span');
      year.className = 'tagpill live';
      year.textContent = d.year;
      tags.appendChild(year);
      head.appendChild(tags);

      var h3 = document.createElement('h3');
      h3.textContent = es() ? d.title_es : (d.title_en || d.title_es);
      card.appendChild(head);
      card.appendChild(h3);

      var author = document.createElement('p');
      author.className = 'bib-author slate small';
      author.textContent = d.author + ' · ' + d.license;
      card.appendChild(author);

      var note = document.createElement('p');
      note.className = 'small';
      note.textContent = es() ? (d.note_es || '') : (d.note_en || d.note_es || '');
      card.appendChild(note);

      var actions = document.createElement('div');
      actions.className = 'row bib-actions';

      if (d.file) {
        // Descarga directa desde docs/references/
        var a = document.createElement('a');
        a.className = 'btn solid sm';
        a.href = 'docs/references/' + encodeURIComponent(d.file);
        a.download = d.file;
        a.textContent = (es() ? 'Descargar ' : 'Download ') + d.file;
        actions.appendChild(a);
      }
      if (d.url && /^https:\/\//.test(d.url)) {
        var ext = document.createElement('a');
        ext.className = 'btn sm';
        ext.href = d.url;
        ext.target = '_blank';
        ext.rel = 'noopener noreferrer';
        ext.textContent = (es() ? 'Abrir enlace' : 'Open link') + ' ↗';
        actions.appendChild(ext);
      }
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  function init() {
    DATA = getData();
    topicsPopulated = false;
    var q = document.getElementById('bibSearch');
    var sel = document.getElementById('bibTopic');
    var qTimer = null;
    if (q) q.addEventListener('input', function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { state.q = q.value; render(); }, 150);
    });
    if (sel) sel.addEventListener('change', function () { state.topic = sel.value; render(); });
    render();
    document.addEventListener('langchange', function () { topicsPopulated = false; render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
