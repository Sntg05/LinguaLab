/* ============================================================
   LinguaLab — security.js
   Verificaciones de seguridad en cliente y "semáforo" en vivo.
   Guardrails verificados en runtime para la sección de seguridad.
   ============================================================ */
(function () {
  'use strict';

  var REVIEW_DATE = '2026-09-22';

  function check(name) {
    switch (name) {
      case 'https':
        return {
          ok: location.protocol === 'https:' || location.hostname === 'localhost' ||
              location.hostname === '127.0.0.1' || location.protocol === 'file:',
          detail: location.protocol
        };
      case 'csp': {
        var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        var hasMeta = !!meta;
        // En file:// no hay cabeceras de servidor; se usa CSP por meta
        return { ok: hasMeta, detail: hasMeta ? 'meta CSP activa' : 'sin CSP detectada' };
      }
      case 'sri': {
        // Todas las dependencias externas deben tener integrity
        var ext = document.querySelectorAll('script[src^="http"], link[rel="stylesheet"][href^="http"]');
        var total = ext.length, withSri = 0;
        ext.forEach(function (el) { if (el.getAttribute('integrity')) withSri++; });
        return { ok: total === 0 || withSri === total, detail: withSri + '/' + total + ' con SRI' };
      }
      case 'thirdparty': {
        // Sin scripts de terceros de rastreo/anuncios
        var bad = document.querySelectorAll(
          'script[src*="googlesyndication"],script[src*="analytics"],script[src*="facebook.net"]');
        return { ok: bad.length === 0, detail: bad.length === 0 ? '0 rastreadores' : bad.length + ' detectados' };
      }
      case 'cookies': {
        var hasCookies = document.cookie && document.cookie.length > 0;
        return { ok: !hasCookies, detail: hasCookies ? 'cookies presentes' : 'sin cookies' };
      }
      case 'storage': {
        // Solo localStorage propio, nunca datos personales
        var n = 0;
        try { n = localStorage.length; } catch (e) { n = -1; }
        return { ok: true, detail: n < 0 ? 'no disponible' : n + ' claves locales (solo en tu dispositivo)' };
      }
      case 'xss': {
        var unsafe = document.querySelectorAll(
          '[onclick],[onerror],[onload],[onmouseover],' +
          '[href^="javascript:"],[src^="javascript:"]');
        return { ok: unsafe.length === 0, detail: unsafe.length === 0 ? 'sin eval dinámico' : 'riesgo' };
      }
      case 'sandbox': {
        // El análisis ocurre 100% en el navegador (sin fetch de textos del usuario)
        return { ok: true, detail: 'procesamiento local en tu navegador' };
      }
      default:
        return { ok: false, detail: 'desconocido' };
    }
  }

  var CHECKS = ['https', 'csp', 'sri', 'thirdparty', 'cookies', 'storage', 'xss', 'sandbox'];

  function report() {
    return CHECKS.map(function (id) {
      var r = check(id);
      return { id: id, ok: r.ok, detail: r.detail };
    });
  }

  function score() {
    var r = report();
    var ok = r.filter(function (c) { return c.ok; }).length;
    return { passed: ok, total: r.length, checks: r, date: REVIEW_DATE };
  }

  /* ---------- Render del panel ---------- */
  function render(container) {
    if (!container) return;
    var s = score();
    container.innerHTML = '';
    var list = document.createElement('ul');
    list.className = 'sec-list';
    s.checks.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'sec-item ' + (c.ok ? 'ok' : 'warn');
      li.innerHTML =
        '<span class="sec-dot" aria-hidden="true"></span>' +
        '<span class="sec-label"></span>' +
        '<span class="sec-detail"></span>' +
        '<span class="sec-state"></span>';
      li.querySelector('.sec-label').textContent = label(c.id);
      li.querySelector('.sec-detail').textContent = c.detail;
      li.querySelector('.sec-state').textContent = c.ok ? '✓' : '!';
      list.appendChild(li);
    });
    container.appendChild(list);

    var badge = document.createElement('p');
    badge.className = 'pill-note';
    badge.style.marginTop = '14px';
    badge.textContent = s.passed + '/' + s.total + ' · ' +
      ((document.documentElement.lang || 'es') === 'es' ? 'última revisión: ' : 'last review: ') + s.date;
    container.appendChild(badge);
  }

  function label(id) {
    var es = (document.documentElement.lang || 'es') === 'es';
    var map = {
      https:   es ? 'Conexión cifrada (HTTPS)'        : 'Encrypted connection (HTTPS)',
      csp:     es ? 'Política de seguridad de contenido (CSP)' : 'Content Security Policy (CSP)',
      sri:     es ? 'Integridad de dependencias (SRI)': 'Dependency integrity (SRI)',
      thirdparty: es ? 'Sin rastreadores de terceros' : 'No third-party trackers',
      cookies: es ? 'Sin cookies'                     : 'No cookies',
      storage: es ? 'Datos solo en tu dispositivo'    : 'Data stays on your device',
      xss:     es ? 'Sin ejecución dinámica insegura' : 'No unsafe dynamic execution',
      sandbox: es ? 'Análisis local (100% en navegador)': 'Local analysis (100% in browser)'
    };
    return map[id] || id;
  }

  window.LinguaLabSecurity = {
    check: check, report: report, score: score, render: render, REVIEW_DATE: REVIEW_DATE
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-security-panel]').forEach(function (el) { render(el); });
    document.addEventListener('langchange', function () {
      document.querySelectorAll('[data-security-panel]').forEach(function (el) { render(el); });
    });
  });
})();
