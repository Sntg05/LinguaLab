/* ============================================================
   LinguaLab — i18n.js
   Motor de idioma: español (por defecto) ⇄ inglés.
   - Cadenas en window.I18N_ES / window.I18N_EN (data/i18n/*.js)
   - DOM con data-i18n="clave" y data-i18n-attr="placeholder:clave"
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'lingualab-lang';
  var current = 'es';
  var dict = {};

  function available() { return ['es', 'en']; }

  function loadDict(lang) {
    // Los diccionarios se inyectan como globals por data/i18n/es.js y en.js
    if (lang === 'en') return window.I18N_EN || {};
    return window.I18N_ES || {};
  }

  function t(key, fallback) {
    var v = dict[key];
    if (v === undefined || v === null || v === '') v = fallback !== undefined ? fallback : key;
    return v;
  }

  function sanitizeRich(val) {
    // Allowlist mínima: <strong>, <em>, <code>. Todo lo demás se escapa.
    var tmp = String(val);
    tmp = tmp.replace(/&/g, '&amp;').replace(/</g, '\uE010').replace(/>/g, '\uE011');
    tmp = tmp.replace(/\uE010(strong|\/strong|em|\/em|code|\/code)\uE011/g, '<$1>');
    return tmp;
  }

  function applyTranslations(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var k = el.getAttribute('data-i18n');
      var val = t(k);
      // Soporte de HTML seguro interno (<strong>, <em>, <code>) solo si la clave lo trae
      if (/[<&]/.test(val)) el.innerHTML = sanitizeRich(val);
      else el.textContent = val;
    }
    // Atributos: data-i18n-attr="placeholder:claves.ph,aria-label:claves.x"
    var attrNodes = root.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) {
      var a = attrNodes[j];
      var spec = (a.getAttribute('data-i18n-attr') || '').split(',');
      for (var s = 0; s < spec.length; s++) {
        var parts = spec[s].split(':');
        if (parts.length === 2) a.setAttribute(parts[0].trim(), t(parts[1].trim()));
      }
    }
  }

  function setLang(lang) {
    if (available().indexOf(lang) < 0) lang = 'es';
    current = lang;
    dict = loadDict(lang);
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyTranslations(document);
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    updateControls();
  }

  function getLang() { return current; }

  function updateControls() {
    var buttons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === current ? 'true' : 'false');
    }
  }

  function init() {
    var saved = 'es';
    try { saved = localStorage.getItem(KEY) || 'es'; } catch (e) {}
    setLang(saved);
    var buttons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        setLang(this.getAttribute('data-lang'));
      });
    }
  }

  window.LinguaLabI18n = { t: t, setLang: setLang, getLang: getLang, apply: applyTranslations };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
