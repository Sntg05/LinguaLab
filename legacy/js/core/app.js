/* ============================================================
   LinguaLab — app.js
   Núcleo de la interfaz: nav, scroll reveal, ticker, ripple,
   barra de progreso, volver arriba, glow de cursor.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Header pegado + barra de progreso + to-top ---------- */
  function initScrollUI() {
    var header = document.querySelector('header.site');
    var prog = document.getElementById('prog');
    var toTop = document.getElementById('toTop');

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (header) header.classList.toggle('stuck', y > 8);
      if (prog) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      }
      if (toTop) toTop.classList.toggle('show', y > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toTop) toTop.addEventListener('click', function () {
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Menú móvil ---------- */
  function initBurger() {
    var burger = document.getElementById('burger');
    var nav = document.getElementById('mainNav');
    if (!burger || !nav) return;
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Cierra al pulsar un enlace
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    // Escape cierra y devuelve el foco al botón
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* ---------- Reveal al hacer scroll ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.rv, .stg');
    if (!els.length) return;
    // Revela también al recibir foco (teclado) y si no hay IO
    function reveal(el) { el.classList.add('in'); }
    document.addEventListener('focusin', function (e) {
      var t = e.target.closest ? e.target.closest('.rv,.stg') : null;
      if (t) reveal(t);
    });
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Ripple en botones ---------- */
  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement('span');
      span.className = 'rip';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left - size / 2) + 'px';
      span.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 620);
    });
  }

  /* ---------- Glow que sigue el cursor en tarjetas ---------- */
  function initCardGlow() {
    var raf = 0, last = null;
    document.addEventListener('pointermove', function (e) {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (!last) return;
        var card = last.target.closest ? last.target.closest('.card') : null;
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (last.clientX - r.left) + 'px');
        card.style.setProperty('--my', (last.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  /* ---------- Palabras rotativas ---------- */
  function initSwap() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var swaps = document.querySelectorAll('.swap');
    if (!swaps.length) return;
    swaps.forEach(function (sw) {
      var spans = sw.querySelectorAll('span');
      if (spans.length < 2) return;
      var idx = 0;
      spans[0].classList.add('on');
      var timer = setInterval(function () {
        if (document.hidden || sw.dataset.paused === '1') return;
        spans[idx].classList.remove('on');
        idx = (idx + 1) % spans.length;
        spans[idx].classList.add('on');
      }, 2600);
      // Pausa fuera de viewport
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            sw.dataset.paused = en.isIntersecting ? '0' : '1';
          });
        }).observe(sw);
      }
      void timer;
    });
  }

  /* ---------- Contadores (sección de números) ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var start = performance.now(), dur = 1400;
        function step(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toLocaleString(
            (document.documentElement.lang || 'es'));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Marcar enlace activo de la nav ---------- */
  function initActiveNav() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (path === '' ) path = 'index.html';
    document.querySelectorAll('nav.main a[href]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (href && href === path) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- Boletín (sin inline onsubmit) ---------- */
  function initNewsletter() {
    var form = document.getElementById('newsForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('newsEmail');
      var status = document.getElementById('newsStatus');
      var email = input ? input.value.trim() : '';
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var isES = (document.documentElement.lang || 'es') === 'es';
      if (!valid) {
        if (input) input.setAttribute('aria-invalid', 'true');
        if (status) status.textContent = isES
          ? 'Escribe un correo válido para suscribirte.'
          : 'Enter a valid email to subscribe.';
        if (input) input.focus();
        return;
      }
      if (input) input.removeAttribute('aria-invalid');
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.textContent = '✓';
      if (status) status.textContent = isES
        ? '¡Gracias! Revisa tu correo para confirmar.'
        : 'Thanks! Check your email to confirm.';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScrollUI();
    initBurger();
    initReveal();
    initRipple();
    initCardGlow();
    initSwap();
    initCounters();
    initActiveNav();
    initNewsletter();
  });
})();
