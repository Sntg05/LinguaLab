/* ============================================================
   LinguaLab — token-viewer.js
   Sección interactiva: hover en cada token → etiqueta, lema,
   frecuencia y banda.
   ============================================================ */
(function () {
  'use strict';

  var TOKENS = [
    { w: 'El',     pos: 'DT',  upos_es: 'Determinante', upos_en: 'Determiner',    lemma: 'el',     freq: 412 },
    { w: 'gato',   pos: 'NN',  upos_es: 'Sustantivo',   upos_en: 'Noun',          lemma: 'gato',   freq: 34  },
    { w: 'negro',  pos: 'JJ',  upos_es: 'Adjetivo',     upos_en: 'Adjective',     lemma: 'negro',  freq: 21  },
    { w: 'saltó',  pos: 'VBD', upos_es: 'Verbo',        upos_en: 'Verb',          lemma: 'saltar', freq: 12  },
    { w: 'la',     pos: 'DT',  upos_es: 'Determinante', upos_en: 'Determiner',    lemma: 'la',     freq: 388 },
    { w: 'cerca',  pos: 'NN',  upos_es: 'Sustantivo',   upos_en: 'Noun',          lemma: 'cerca',  freq: 17  },
    { w: 'del',    pos: 'IN',  upos_es: 'Preposición',  upos_en: 'Adposition',    lemma: 'de+el',  freq: 96  },
    { w: 'jardín', pos: 'NN',  upos_es: 'Sustantivo',   upos_en: 'Noun',          lemma: 'jardín', freq: 9   },
    { w: 'mientras',pos:'IN',  upos_es: 'Conjunción',   upos_en: 'Conjunction',   lemma: 'mientras',freq: 44 },
    { w: 'el',     pos: 'DT',  upos_es: 'Determinante', upos_en: 'Determiner',    lemma: 'el',     freq: 412 },
    { w: 'perro',  pos: 'NN',  upos_es: 'Sustantivo',   upos_en: 'Noun',          lemma: 'perro',  freq: 38  },
    { w: 'dormía', pos: 'VBD', upos_es: 'Verbo',        upos_en: 'Verb',          lemma: 'dormir', freq: 15  },
    { w: '.',      pos: '.',   upos_es: 'Puntuación',   upos_en: 'Punctuation',   lemma: '.',      freq: 5120}
  ];

  function band(f) {
    if (f >= 300) return { key: 'alta',   cls: 'b-hi',  es: 'alta',   en: 'high' };
    if (f >= 50)  return { key: 'media',  cls: 'b-mid', es: 'media',  en: 'mid' };
    return                 { key: 'baja',  cls: 'b-lo',  es: 'baja',   en: 'low' };
  }

  function build() {
    var wrap = document.getElementById('tokenSentence');
    var out = document.getElementById('tokenReadout');
    if (!wrap) return;
    var es = (document.documentElement.lang || 'es') === 'es';
    wrap.innerHTML = '';
    var active = null;

    TOKENS.forEach(function (t) {
      var b = band(t.freq);
      var span = document.createElement('button');
      span.type = 'button';
      span.className = 'tok2 ' + b.cls;
      span.textContent = t.w;
      span.setAttribute('data-idx', TOKENS.indexOf(t));

      function show() {
        if (active) active.classList.remove('active');
        active = span;
        span.classList.add('active');
        if (!out) return;
        var rows = [
          [es ? 'Token' : 'Token', t.w],
          [es ? 'Etiqueta' : 'Tag', t.pos],
          [es ? 'Categoría' : 'Category', es ? t.upos_es : t.upos_en],
          [es ? 'Lemma' : 'Lemma', t.lemma],
          [es ? 'Frecuencia' : 'Frequency', String(t.freq)],
          [es ? 'Banda' : 'Band', es ? b.es : b.en]
        ];
        out.innerHTML = '';
        var dl = document.createElement('dl');
        rows.forEach(function (r) {
          var dt = document.createElement('dt'); dt.textContent = r[0];
          var dd = document.createElement('dd'); dd.textContent = r[1];
          dl.appendChild(dt); dl.appendChild(dd);
        });
        out.appendChild(dl);
      }
      span.addEventListener('mouseenter', show);
      span.addEventListener('focus', show);
      span.addEventListener('click', show);
      wrap.appendChild(span);
    });

    // Selección inicial
    var first = wrap.querySelector('.tok2');
    if (first) first.click();
  }

  document.addEventListener('DOMContentLoaded', build);
  document.addEventListener('langchange', build);
})();
