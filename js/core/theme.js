/* ============================================================
   LinguaLab — theme.js
   Tema: auto / claro / oscuro. Persistente + anti-flash.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'lingualab-theme';
  var VALID = ['auto', 'light', 'dark'];

  function get() {
    try {
      var v = localStorage.getItem(KEY);
      return VALID.indexOf(v) >= 0 ? v : 'auto';
    } catch (e) { return 'auto'; }
  }

  function set(mode) {
    if (VALID.indexOf(mode) < 0) mode = 'auto';
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    apply(mode);
    document.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
  }

  function apply(mode) {
    var root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    // Actualiza el icono del botón si existe
    var btn = document.getElementById('themeBtn');
    if (btn) {
      var eff = mode === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode;
      var icon = btn.querySelector('[aria-hidden="true"]');
      if (icon) icon.textContent = eff === 'dark' ? '🌙' : '☀️';
      else btn.textContent = eff === 'dark' ? '🌙' : '☀️';
      var label = (document.documentElement.lang || 'es') === 'es'
        ? 'Tema: ' + modeLabel(mode) + ' (clic para cambiar)'
        : 'Theme: ' + modeLabel(mode) + ' (click to change)';
      btn.setAttribute('title', label);
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', mode !== 'auto' ? 'true' : 'false');
    }
  }

  function modeLabel(mode) {
    var es = (document.documentElement.lang || 'es') === 'es';
    if (mode === 'auto') return es ? 'automático' : 'auto';
    if (mode === 'dark') return es ? 'oscuro' : 'dark';
    return es ? 'claro' : 'light';
  }

  function cycle() {
    var order = ['auto', 'light', 'dark'];
    var next = order[(order.indexOf(get()) + 1) % order.length];
    set(next);
  }

  // Aplica el tema guardado lo antes posible (se llama desde el <head> inline o aquí)
  window.LinguaLabTheme = { get: get, set: set, cycle: cycle };

  document.addEventListener('DOMContentLoaded', function () {
    apply(get());
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', cycle);
    // Si está en "auto", reacciona a cambios del sistema
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { if (get() === 'auto') apply('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    document.addEventListener('langchange', function () { apply(get()); });
  });
})();
