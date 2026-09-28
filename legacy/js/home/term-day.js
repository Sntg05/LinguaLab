/* ============================================================
   LinguaLab — term-day.js
   "Fonema del día": símbolo IPA gigante animado, audio,
   paneles (en contexto / visual / por qué importa) y tira de días.
   ============================================================ */
(function () {
  'use strict';

  var TERMS = [
    {
      id: 'theta', symbol: 'θ', sound: 'th',
      ipa_es: '/θ/', ipa_en: '/θ/',
      name_es: 'fricativa dental sorda', name_en: 'voiceless dental fricative',
      ctx_es: 'El sonido de «c» en cierta pronunciación: {cielo}, {zapato}.',
      ctx_en: 'The sound of «th» in English: {think}, {path}.',
      why_es: 'Es uno de los rasgos más estudiados del español: su realización varía [θ]~[s] según región (distinción y seseo).',
      why_en: 'One of the most studied Spanish features: its realisation varies [θ]~[s] by region (distinción and seseo).',
      rel_es: ['sibilantes', 'seseo', 'ceceo'],
      rel_en: ['sibilants', 'seseo', 'ceceo'],
      viz: 'dental'
    },
    {
      id: 'schwa', symbol: 'ə', sound: 'uh',
      ipa_es: '/ə/', ipa_en: '/ə/',
      name_es: 'vocal neutra (schwa)', name_en: 'mid central vowel (schwa)',
      ctx_es: 'En inglés átono: {about}, {sofa}. En español solo en articulación relajada.',
      ctx_en: 'Unstressed English: {about}, {sofa}. In Spanish only in casual speech.',
      why_es: 'La vocal más frecuente del mundo: aparece en casi todas las lenguas en posición átona.',
      why_en: 'The most frequent vowel worldwide: it appears in almost every language unstressed.',
      rel_es: ['reducción vocálica', 'átono'],
      rel_en: ['vowel reduction', 'unstressed'],
      viz: 'vowel'
    },
    {
      id: 'ng', symbol: 'ŋ', sound: 'ng',
      ipa_es: '/ŋ/', ipa_en: '/ŋ/',
      name_es: 'nasal velar sonora', name_en: 'voiced velar nasal',
      ctx_es: 'Final de sílaba: {canto} [ˈkanto], y en inglés {sing} [sɪŋ].',
      ctx_en: 'Syllable-final: {sing} [sɪŋ], Spanish {canto} [ˈkanto].',
      why_es: 'Existe en español solo como alófono ante /k, g/: «banco» [ˈbanko]. Es un caso claro de alofonía condicionada.',
      why_en: 'In Spanish only as an allophone before /k, g/: «banco» [ˈbanko]. A clear case of conditioned alophony.',
      rel_es: ['nasales', 'alófono', 'catalanismo'],
      rel_en: ['nasals', 'allophone', 'velar'],
      viz: 'nasal'
    },
    {
      id: 'tap', symbol: 'ɾ', sound: 'rr',
      ipa_es: '/ɾ/', ipa_en: '/ɾ/',
      name_es: 'vibrante simple', name_en: 'tap',
      ctx_es: 'La «r» intervocálica: {caro} [ˈkaɾo] frente a {carro} [ˈkaro].',
      ctx_en: 'Intervocalic Spanish «r»: {caro} [ˈkaɾo] vs {carro} [ˈkaro].',
      why_es: 'Contrasta con la vibrante múltiple /r/: {caro} vs {carro}. Un mínimo fonémico clásico.',
      why_en: 'Contrasts with the trill /r/: {caro} vs {carro}. A classic phonemic minimal pair.',
      rel_es: ['vibrantes', 'mínimo fonémico'],
      rel_en: ['rhotics', 'minimal pair'],
      viz: 'liquid'
    },
    {
      id: 'tsh', symbol: 'tʃ', sound: 'ch',
      ipa_es: '/tʃ/', ipa_en: '/tʃ/',
      name_es: 'africada post-alveolar sorda', name_en: 'voiceless post-alveolar affricate',
      ctx_es: 'La «ch» de {chico} [ˈtʃiko].',
      ctx_en: 'The «ch» of {chair} [tʃɛə].',
      why_es: 'Fonema en español y catalán, pero no en portugués: buena entrada al estudio contrastivo.',
      why_en: 'A phoneme in Spanish and Catalan, but not Portuguese: a good entry into contrastive study.',
      rel_es: ['africadas', 'contrastivo'],
      rel_en: ['affricates', 'contrastive'],
      viz: 'affricate'
    }
  ];

  var VIZ = {
    dental: {
      es: 'Fricativa: el aire pasa por un estrecho entre la lengua y los dientes.',
      en: 'Fricative: air passes through a narrow gap between tongue and teeth.'
    },
    vowel: {
      es: 'Vocal: cavidad oral abierta, cuerdas vocales vibrando sin obstrucción.',
      en: 'Vowel: open oral cavity, vocal folds vibrating without obstruction.'
    },
    nasal: {
      es: 'Nasal: el velo del paladar baja y el aire sale por la nariz.',
      en: 'Nasal: the velum lowers and air exits through the nose.'
    },
    liquid: {
      es: 'Vibrante: la lengua vibra una vez contra el alveolo.',
      en: 'Tap: the tongue taps once against the alveolar ridge.'
    },
    affricate: {
      es: 'Africada: oclusión seguida de fricativa liberada lentamente.',
      en: 'Affricate: stop followed by slowly released fricative.'
    }
  };

  var current = 0;

  function t(key, fb) {
    return (window.LinguaLabI18n && window.LinguaLabI18n.t(key, fb)) || fb;
  }

  function render() {
    var root = document.getElementById('termDay');
    if (!root) return;
    var es = (document.documentElement.lang || 'es') === 'es';
    var term = TERMS[current];

    var symBox = root.querySelector('#termSymbol');
    if (symBox) {
      symBox.innerHTML = '';
      var chars = term.symbol.split('');
      chars.forEach(function (ch, i) {
        var sp = document.createElement('span');
        sp.className = 'ch';
        sp.textContent = ch;
        sp.style.animationDelay = (i * 0.09) + 's';
        symBox.appendChild(sp);
      });
    }

    setText('#termIPA', es ? term.ipa_es : term.ipa_en);
    setText('#termName', es ? term.name_es : term.name_en);
    setText('#termCtx', highlight(es ? (term.ctx_es || term.ctx_en) : (term.ctx_en || term.ctx_es), es));
    setText('#termWhy', es ? term.why_es : term.why_en);
    var viz = VIZ[term.viz] || { es: '', en: '' };
    setText('#termVizCap', es ? viz.es : viz.en);

    // Relacionados
    var rel = document.getElementById('termRel');
    if (rel) {
      rel.innerHTML = '';
      (es ? term.rel_es : term.rel_en).forEach(function (r) {
        var s = document.createElement('span');
        s.textContent = r;
        rel.appendChild(s);
      });
    }

    // Tira de días
    var strip = document.getElementById('termStrip');
    if (strip) {
      strip.innerHTML = '';
      TERMS.forEach(function (tm, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'totd-prev' + (i === current ? ' on' : '');
        var d = document.createElement('span'); d.className = 'pd'; d.textContent = '· ' + (i + 1);
        var w = document.createElement('span'); w.className = 'pt'; w.textContent = tm.symbol;
        b.appendChild(d); b.appendChild(w);
        b.addEventListener('click', function () { current = i; render(); });
        strip.appendChild(b);
      });
    }

    // Botón de audio (usa Web Speech como respaldo si no hay archivo)
    var say = document.getElementById('termSay');
    if (say && !say.dataset.bound) {
      say.dataset.bound = '1';
      say.addEventListener('click', function () {
        var tt = TERMS[current];
        if ('speechSynthesis' in window) {
          var u = new SpeechSynthesisUtterance(tt.sound);
          u.lang = (document.documentElement.lang || 'es') === 'es' ? 'es-ES' : 'en-US';
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
        }
      });
    }
  }

  function setText(sel, val) {
    var el = document.querySelector(sel);
    if (el) el.textContent = val;
  }

  function highlight(text, es) {
    // Rodea {palabra} con marcado (usa textContent por guardrail anti-XSS)
    return String(text).replace(/\{([^}]+)\}/g, '«$1»');
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('langchange', render);
})();
