/* ============================================================
   LinguaLab — transcriber.js
   UI del transcriptor AFI (ES/EN): muestras, resultado,
   síntesis de voz para escuchar la salida.
   ============================================================ */
(function () {
  'use strict';

  var lang = 'es';

  function es() { return (document.documentElement.lang || 'es') === 'es'; }

  function examples() {
    var chart = window.IPA_CHART;
    return (chart && chart.examples) ? (lang === 'en' ? chart.examples.en : chart.examples.es) : [];
  }

  function renderSamples() {
    var box = document.getElementById('txSamples');
    if (!box) return;
    box.innerHTML = '';
    examples().forEach(function (ex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = ex.word;
      b.addEventListener('click', function () {
        var input = document.getElementById('txInput');
        if (input) { input.value = ex.word; run(); }
      });
      box.appendChild(b);
    });
  }

  function run() {
    var input = document.getElementById('txInput');
    var out = document.getElementById('txOut');
    if (!input || !out) return;
    var raw = input.value;
    var ph = window.LinguaLabPhonetics;
    if (!ph) return;
    out.textContent = raw.trim() ? ph.transcribe(raw, lang) : '/…/';
  }

  function say() {
    var out = document.getElementById('txOut');
    if (!out || !('speechSynthesis' in window)) return;
    var text = out.textContent.replace(/[\/\[\]]/g, '');
    if (!text || text === '…') return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'es-ES';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'es';
    var bES = document.getElementById('txES');
    var bEN = document.getElementById('txEN');
    if (bES) bES.setAttribute('aria-pressed', lang === 'es' ? 'true' : 'false');
    if (bEN) bEN.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    renderSamples();
    run();
  }

  function init() {
    var input = document.getElementById('txInput');
    var runBtn = document.getElementById('txRun');
    var sayBtn = document.getElementById('txSay');
    var clearBtn = document.getElementById('txClear');
    var bES = document.getElementById('txES');
    var bEN = document.getElementById('txEN');

    var runTimer = null;
    function debouncedRun() {
      clearTimeout(runTimer);
      runTimer = setTimeout(run, 100);
    }
    if (input) input.addEventListener('input', debouncedRun);
    if (runBtn) runBtn.addEventListener('click', run);
    if (sayBtn) sayBtn.addEventListener('click', say);
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (input) input.value = '';
      run();
    });
    if (bES) bES.addEventListener('click', function () { setLang('es'); });
    if (bEN) bEN.addEventListener('click', function () { setLang('en'); });

    // Sincroniza con el idioma global
    var I18n = window.LinguaLabI18n;
    var initial = (I18n && I18n.getLang && I18n.getLang()) ||
      document.documentElement.lang || 'es';
    setLang(initial);
    document.addEventListener('langchange', function (e) {
      setLang((e && e.detail) || document.documentElement.lang || 'es');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
