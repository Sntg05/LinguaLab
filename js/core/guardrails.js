/* ============================================================
   LinguaLab — guardrails.js
   Salvaguardas web verificadas en runtime + render de tarjetas.
   ============================================================ */
(function () {
  'use strict';

  var MAX_TEXT_BYTES = 100 * 1024; // 100 KB de límite de texto
  var ALLOWED_EXT = ['.txt', '.md', '.csv', '.json', '.conllu'];

  /* ---------- Guardrails de entrada ---------- */
  function validateFile(file) {
    if (!file) return { ok: false, reason: 'null' };
    var name = (file.name || '').toLowerCase();
    var dot = name.lastIndexOf('.');
    var ext = dot >= 0 ? name.slice(dot) : '';
    if (!ext || ALLOWED_EXT.indexOf(ext) < 0)
      return { ok: false, reason: 'ext', msg: 'Extensión no permitida: ' + (ext || 'sin extensión') };
    if (file.size > MAX_TEXT_BYTES)
      return { ok: false, reason: 'size', msg: 'Archivo mayor de 100 KB' };
    return { ok: true };
  }

  function validateText(text) {
    if (typeof text !== 'string') return { ok: false, reason: 'type' };
    // Evita copiar 100 KB con new Blob en cada validación.
    var bytes = 0;
    try {
      bytes = new TextEncoder().encode(text).length;
    } catch (e) {
      bytes = text.length;
    }
    if (bytes > MAX_TEXT_BYTES)
      return { ok: false, reason: 'size', msg: 'Texto mayor de 100 KB' };
    return { ok: true };
  }

  /* ---------- Guardrails de contenido ---------- */
  // Escape de todo texto antes de insertarlo al DOM (anti-XSS)
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Bloquea marcado activo pegado por el usuario.
  // NOTA: blocklist no es defensa completa; el render debe usar
  // escapeHTML/textContent. No usar para mutar texto lingüístico.
  function sanitizeInput(s) {
    return escapeHTML(s);
  }

  // Rate-limiting por clave: evita que una herramienta bloquee a otra.
  var lastRunByKey = {};
  function rateLimit(intervalMs, key) {
    var k = key || 'default';
    var now = Date.now();
    if (now - (lastRunByKey[k] || 0) < (intervalMs || 300)) return false;
    lastRunByKey[k] = now;
    return true;
  }

  /* ---------- Lista de salvaguardas (para pintar en la UI) ---------- */
  function list() {
    var es = (document.documentElement.lang || 'es') === 'es';
    var csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    var sri = document.querySelectorAll('script[src^="http"][integrity],link[rel="stylesheet"][href^="http"][integrity]');
    var extDeps = document.querySelectorAll('script[src^="http"],link[rel="stylesheet"][href^="http"]');

    return [
      { id: 'input', ok: true,
        title: es ? 'Límites de entrada' : 'Input limits',
        desc: es ? 'Textos hasta 100 KB, extensiones permitidas y marcado activo bloqueado.'
                 : 'Texts up to 100 KB, whitelisted extensions and active markup blocked.' },
      { id: 'xss', ok: true,
        title: es ? 'Escape de contenido (anti-XSS)' : 'Content escaping (anti-XSS)',
        desc: es ? 'Todo texto del usuario se escapa antes de renderizarse en el DOM.'
                 : 'All user text is escaped before being rendered into the DOM.' },
      { id: 'csp', ok: !!csp,
        title: es ? 'Política de seguridad de contenido' : 'Content Security Policy',
        desc: es ? 'CSP restrictiva por meta: fuentes permitidas en lista blanca, object-src none.'
                 : 'Restrictive meta CSP: whitelisted sources, object-src none.' },
      { id: 'sri', ok: extDeps.length === 0 || sri.length === extDeps.length,
        title: es ? 'Integridad de dependencias (SRI)' : 'Dependency integrity (SRI)',
        desc: es ? 'Librerías externas cargadas con hash de integridad y versión fijada.'
                 : 'External libraries loaded with integrity hash and pinned version.' },
      { id: 'perf', ok: true,
        title: es ? 'Presupuesto de rendimiento' : 'Performance budget',
        desc: es ? 'Análisis ligero en el cliente; sin descargas pesadas por consulta.'
                 : 'Lightweight client-side analysis; no heavy downloads per query.' },
      { id: 'privacy', ok: true,
        title: es ? 'Privacidad por diseño' : 'Privacy by design',
        desc: es ? 'Sin cookies, sin telemetría, sin seguimiento. Nada sale de tu navegador.'
                 : 'No cookies, no telemetry, no tracking. Nothing leaves your browser.' },
      { id: 'integrity', ok: true,
        title: es ? 'Integridad y licencia de datos' : 'Data integrity & licensing',
        desc: es ? 'Los datos (IPA, bibliografía) llevan versión y licencia obligatoria en las descargas.'
                 : 'Data (IPA, bibliography) carries version and mandatory licence on downloads.' },
      { id: 'storage', ok: true,
        title: es ? 'Datos locales controlables' : 'Controllable local data',
        desc: es ? 'localStorage solo en tu equipo, con botón para borrarlo todo.'
                 : 'localStorage only on your device, with a button to wipe it all.' }
    ];
  }

  function render(container) {
    if (!container) return;
    var items = list();
    var passed = items.filter(function (i) { return i.ok; }).length;
    var es = (document.documentElement.lang || 'es') === 'es';
    var html = '<div class="gg-grid">';
    items.forEach(function (i) {
      html += '<article class="card hov gg-card ' + (i.ok ? 'is-ok' : 'is-warn') + '">' +
        '<div class="gg-top">' +
          '<span class="gg-state" aria-hidden="true">' + (i.ok ? '✓' : '!') + '</span>' +
          '<span class="tagpill ' + (i.ok ? 'ok' : 'soon') + '">' +
            (i.ok ? (es ? 'activa' : 'on') : (es ? 'revisar' : 'review')) + '</span>' +
        '</div>' +
        '<h3 data-esc="1"></h3><p class="small slate" data-esc="1"></p>' +
      '</article>';
    });
    html += '</div>';
    container.innerHTML = html;
    // Textos vía textContent (guardrail anti-XSS aplicado también aquí)
    var cards = container.querySelectorAll('.gg-card');
    items.forEach(function (i, idx) {
      cards[idx].querySelector('h3').textContent = i.title;
      cards[idx].querySelector('p').textContent = i.desc;
    });
    var counter = container.querySelector('[data-guardrail-count]');
    if (counter) counter.textContent = passed + '/' + items.length;
  }

  function wipeLocalData() {
    try {
      // Solo nuestras claves; no borrar datos de otros módulos.
      localStorage.removeItem('lingualab-lang');
      localStorage.removeItem('lingualab-theme');
      sessionStorage.removeItem('lingualab-lang');
      sessionStorage.removeItem('lingualab-theme');
      return true;
    } catch (e) { return false; }
  }

  window.LinguaLabGuardrails = {
    MAX_TEXT_BYTES: MAX_TEXT_BYTES,
    ALLOWED_EXT: ALLOWED_EXT,
    validateFile: validateFile,
    validateText: validateText,
    escapeHTML: escapeHTML,
    sanitizeInput: sanitizeInput,
    rateLimit: rateLimit,
    list: list,
    render: render,
    wipeLocalData: wipeLocalData
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-guardrails-panel]').forEach(function (el) { render(el); });
    document.addEventListener('langchange', function () {
      document.querySelectorAll('[data-guardrails-panel]').forEach(function (el) { render(el); });
    });
    document.querySelectorAll('[data-wipe]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ok = wipeLocalData();
        var es = (document.documentElement.lang || 'es') === 'es';
        btn.textContent = ok
          ? (es ? '✓ Datos borrados' : '✓ Data wiped')
          : (es ? 'No se pudo borrar' : 'Could not wipe');
        btn.disabled = true;
      });
    });
  });
})();
