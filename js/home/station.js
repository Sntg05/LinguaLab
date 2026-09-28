/* ============================================================
   LinguaLab — estación lingüística animada del hero
   (concordancia, tokens POS, frecuencia, código IPA)
   ============================================================ */
(function () {
  'use strict';

  var SAMPLE = "El gato negro saltó la cerca del jardín mientras el perro dormía.";
  var POS = [
    { w: 'El',     pos: 'DT',   lemma: 'el',    freq: 412 },
    { w: 'gato',   pos: 'NN',   lemma: 'gato',  freq: 34  },
    { w: 'negro',  pos: 'JJ',   lemma: 'negro', freq: 21  },
    { w: 'saltó',  pos: 'VBD',  lemma: 'saltar',freq: 12  },
    { w: 'la',     pos: 'DT',   lemma: 'la',    freq: 388 },
    { w: 'cerca',  pos: 'NN',   lemma: 'cerca', freq: 17  },
    { w: 'del',    pos: 'IN',   lemma: 'de+el', freq: 96  },
    { w: 'jardín', pos: 'NN',   lemma: 'jardín',freq: 9   },
    { w: 'mientras',pos:'IN',   lemma: 'mientras', freq: 44 },
    { w: 'el',     pos: 'DT',   lemma: 'el',    freq: 412 },
    { w: 'perro',  pos: 'NN',   lemma: 'perro', freq: 38  },
    { w: 'dormía', pos: 'VBD',  lemma: 'dormir',freq: 15  }
  ];

  var KWIC = [
    { l: 'saltó la cerca del',   n: 'gato',   r: 'negro mientras el perro' },
    { l: 'maulló el',            n: 'gato',   r: 'sobre el tejado cálido' },
    { l: 'el ruido despertó al', n: 'gato',   r: 'que ronroneaba dormido' },
    { l: 'vimos un',             n: 'gato',   r: 'cruzar la calle despacio' }
  ];

  var FREQ = [
    { w: 'gato',    n: 412 },
    { w: 'cerca',   n: 341 },
    { w: 'saltó',   n: 276 },
    { w: 'perro',   n: 180 },
    { w: 'jardín',  n: 132 },
    { w: 'dormía',  n: 98  },
    { w: 'mientras',n: 64  }
  ];

  var CODE = [
    'ˈgato', 'ˈs̃alte', 'ˈseɾ.ka', 'peɾˈðo',
    'jarˈðin', 'dorˈmi.a'
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderKWIC(root) {
    var pane = el('div', 'pane');
    pane.appendChild(el('h4', null, i18n('station.kwic', 'Concordancia — nodo: gato.')));
    KWIC.forEach(function (k, i) {
      var row = el('div', 'kw');
      row.style.animationDelay = (0.15 * i + 0.3) + 's';
      row.appendChild(el('span', 'l', k.l));
      row.appendChild(el('span', 'n', k.n));
      row.appendChild(el('span', 'r', k.r));
      pane.appendChild(row);
    });
    root.appendChild(pane);
  }

  function renderTokens(root) {
    var pane = el('div', 'pane');
    pane.appendChild(el('h4', null, i18n('station.tokens', 'Tokens y etiquetas POS')));
    var box = el('div', 'toks');
    POS.slice(0, 8).forEach(function (t, i) {
      var tk = el('div', 'tk');
      tk.style.animationDelay = (0.09 * i + 0.5) + 's';
      tk.appendChild(el('b', null, t.w));
      tk.appendChild(el('i', null, t.pos));
      box.appendChild(tk);
    });
    pane.appendChild(box);
    root.appendChild(pane);
  }

  function renderFreq(root) {
    var pane = el('div', 'pane');
    pane.appendChild(el('h4', null, i18n('station.freq', 'Frecuencia de palabras')));
    var box = el('div', 'freq');
    var max = FREQ[0].n;
    FREQ.forEach(function (f, i) {
      var row = el('div', 'frow');
      row.appendChild(el('span', 'fw', f.w));
      var tr = el('span', 'tr');
      var fl = el('span', 'fl');
      fl.style.setProperty('--w', ((f.n / max) * 100) + '%');
      tr.appendChild(fl);
      row.appendChild(tr);
      row.appendChild(el('span', 'fn', String(f.n)));
      box.appendChild(row);
      setTimeout(function () { fl.style.width = ((f.n / max) * 100) + '%'; }, 700 + i * 90);
    });
    pane.appendChild(box);
    root.appendChild(pane);
  }

  function renderCode(root) {
    var pane = el('div', 'pane');
    pane.appendChild(el('h4', null, i18n('station.code', 'Transcripción IPA')));
    var pre = el('div', 'code');
    CODE.forEach(function (c, i) {
      var line = el('div', null);
      var kw = el('span', 'k', '/ ');
      line.appendChild(kw);
      var s = el('span', 's', c);
      line.appendChild(s);
      line.appendChild(el('span', 'c', '  // '));
      pre.appendChild(line);
    });
    var caret = el('span', 'caret', '|');
    pre.appendChild(caret);
    pane.appendChild(pre);
    root.appendChild(pane);
  }

  function i18n(key, fb) {
    return (window.LinguaLabI18n && window.LinguaLabI18n.t(key, fb)) || fb;
  }

  function build() {
    var station = document.getElementById('station');
    if (!station) return;
    station.innerHTML = '';
    var top = el('div', 'top');
    ['','',''].forEach(function () { top.appendChild(el('i')); });
    top.appendChild(el('span', null, i18n('station.title', 'estación lingüística')));
    station.appendChild(top);

    var panes = el('div', 'panes');
    renderKWIC(panes);
    renderTokens(panes);
    renderFreq(panes);
    renderCode(panes);
    station.appendChild(panes);
  }

  document.addEventListener('DOMContentLoaded', build);
  document.addEventListener('langchange', build);
})();
