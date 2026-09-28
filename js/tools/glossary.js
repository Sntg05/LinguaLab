/* ============================================================
   LinguaLab — glossary.js
   Glosario filtrable (ES/EN). Fuente: data/glossary.js
   ============================================================ */
(function () {
  'use strict';

  var G = window.LinguaLabGuardrails;
  function getData() { return window.GLOSSARY || []; }
  var DATA = [];
  var state = { q: '', field: 'all' };
  var fieldsPopulated = false;

  function esc(s) { return G ? G.escapeHTML(s) : String(s); }
  function es() { return (document.documentElement.lang || 'es') === 'es'; }

  function fields() {
    var seen = {};
    DATA.forEach(function (d) { seen[es() ? d.field_es : d.field_en] = true; });
    return Object.keys(seen).sort();
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.filter(function (d) {
      var f = es() ? d.field_es : d.field_en;
      if (state.field !== 'all' && f !== state.field) return false;
      if (!q) return true;
      var hay = [d.term_es, d.term_en, d.def_es, d.def_en, d.field_es, d.field_en, d.ex_es, d.ex_en]
        .join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function render() {
    var box = document.getElementById('glossList');
    var sel = document.getElementById('glossField');
    var count = document.getElementById('glossCount');
    if (!box) return;

    if (sel && !fieldsPopulated) {
      sel.innerHTML = '';
      var o = document.createElement('option');
      o.value = 'all'; o.textContent = es() ? 'Todos' : 'All';
      sel.appendChild(o);
      fields().forEach(function (f) {
        var op = document.createElement('option');
        op.value = f; op.textContent = f;
        sel.appendChild(op);
      });
      fieldsPopulated = true;
    }
    if (sel) {
      var wanted = state.field;
      sel.value = fields().indexOf(wanted) >= 0 ? wanted : 'all';
      state.field = sel.value;
    }

    var items = filtered();
    if (count) count.textContent = items.length + '/' + DATA.length;

    box.innerHTML = '';
    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'slate';
      p.textContent = es() ? 'Sin resultados.' : 'No results.';
      box.appendChild(p);
      return;
    }

    items.forEach(function (d) {
      var card = document.createElement('article');
      card.className = 'card gloss-card';
      var head = document.createElement('div');
      head.className = 'row';
      var tag = document.createElement('span');
      tag.className = 'tagpill live';
      tag.textContent = es() ? d.field_es : d.field_en;
      head.appendChild(tag);
      card.appendChild(head);

      var h3 = document.createElement('h3');
      h3.textContent = es() ? d.term_es : d.term_en;
      card.appendChild(h3);

      var def = document.createElement('p');
      def.textContent = es() ? d.def_es : d.def_en;
      card.appendChild(def);

      var ex = document.createElement('p');
      ex.className = 'gloss-ex serif small slate';
      ex.textContent = (es() ? d.ex_es : d.ex_en) || '';
      card.appendChild(ex);

      box.appendChild(card);
    });
  }

  function init() {
    DATA = getData();
    fieldsPopulated = false;
    var q = document.getElementById('glossSearch');
    var sel = document.getElementById('glossField');
    var qTimer = null;
    if (q) q.addEventListener('input', function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { state.q = q.value; render(); }, 150);
    });
    if (sel) sel.addEventListener('change', function () { state.field = sel.value; render(); });
    render();
    document.addEventListener('langchange', function () { fieldsPopulated = false; render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
