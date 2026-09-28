/* ============================================================
   LinguaLab — ArborLab: lienzo (zoom + pan + ajustar)
   ============================================================ */
(function () {
  'use strict';

  function initCanvas(canvas) {
    var state = { scale: 1, x: 0, y: 0, dragging: false, lx: 0, ly: 0 };

    function apply() {
      var wrap = canvas.querySelector('.svgwrap');
      if (!wrap) return;
      wrap.style.transformOrigin = '0 0';
      wrap.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.scale + ')';
      var label = document.getElementById('zoomVal');
      if (label) label.textContent = Math.round(state.scale * 100) + '%';
    }

    function setScale(s, cx, cy) {
      var old = state.scale;
      state.scale = Math.max(0.2, Math.min(4, s));
      if (cx != null) {
        var rect = canvas.getBoundingClientRect();
        var px = cx - rect.left, py = cy - rect.top;
        state.x = px - (px - state.x) * (state.scale / old);
        state.y = py - (py - state.y) * (state.scale / old);
      }
      apply();
    }

    // Arrastrar
    canvas.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button, a')) return;
      state.dragging = true;
      state.lx = e.clientX; state.ly = e.clientY;
      canvas.classList.add('dragging');
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!state.dragging) return;
      state.x += e.clientX - state.lx;
      state.y += e.clientY - state.ly;
      state.lx = e.clientX; state.ly = e.clientY;
      apply();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      canvas.addEventListener(ev, function () {
        state.dragging = false;
        canvas.classList.remove('dragging');
      });
    });

    // Ctrl/⌘ + rueda → zoom; rueda normal → scroll nativo de la página.
    // (No se intercepta la rueda normal: mejora a11y y evita atrapar el scroll.)
    canvas.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(state.scale * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
      }
    }, { passive: false });

    // Teclado: flechas = pan, +/- = zoom (a11y 2.1.1)
    canvas.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 100 : 40;
      if (e.key === 'ArrowLeft') { state.x += step; apply(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { state.x -= step; apply(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { state.y += step; apply(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { state.y -= step; apply(); e.preventDefault(); }
      else if (e.key === '+' || e.key === '=') { setScale(state.scale * 1.2); e.preventDefault(); }
      else if (e.key === '-' || e.key === '_') { setScale(state.scale / 1.2); e.preventDefault(); }
      else if (e.key === '0') { state.scale = 1; state.x = 0; state.y = 0; apply(); e.preventDefault(); }
    });

    // Botones
    var out = document.getElementById('zoomOut');
    var inn = document.getElementById('zoomIn');
    var fit = document.getElementById('fitBtn');
    var act = document.getElementById('actualBtn');
    if (out) out.addEventListener('click', function () { setScale(state.scale / 1.2); });
    if (inn) inn.addEventListener('click', function () { setScale(state.scale * 1.2); });
    if (act) act.addEventListener('click', function () {
      state.scale = 1; state.x = 0; state.y = 0; apply();
    });
    if (fit) fit.addEventListener('click', function () {
      var svg = canvas.querySelector('svg');
      if (!svg) return;
      var cw = canvas.clientWidth - 40;
      var ch = canvas.clientHeight - 40;
      var sw = parseFloat(svg.getAttribute('width')) || 800;
      var sh = parseFloat(svg.getAttribute('height')) || 600;
      if (!(sw > 0) || !(sh > 0) || !(cw > 0) || !(ch > 0)) return;
      var s = Math.min(cw / sw, ch / sh, 2);
      state.scale = Math.max(0.2, Math.min(2, s));
      state.x = (canvas.clientWidth - sw * state.scale) / 2;
      state.y = 16;
      apply();
    });

    return {
      reset: function () { state.scale = 1; state.x = 0; state.y = 0; apply(); },
      fit: function () { if (fit) fit.click(); },
      state: state
    };
  }

  window.LinguaLabTrees = window.LinguaLabTrees || {};
  window.LinguaLabTrees.canvas = initCanvas;
})();
