/* ============================================================
   LinguaLab — audio-player.js
   Reproductor de muestras IPA:
   1) intenta reproducir audio/ipa/<archivo>.ogg|wav  (opensource)
   2) si no hay archivo, sintetiza con Web Speech API (respaldo local)
   Dibuja una waveform sencilla con Web Audio API.
   Muestras libres: ver audio/README.md (atribución obligatoria).
   ============================================================ */
(function () {
  'use strict';

  var ctx = null;
  var currentSource = null;
  var lastFile = null;
  var fetchCtrl = null;
  var waveRaf = 0;

  // Mapeo símbolo → archivo de audio (si existe en audio/ipa/)
  var FILES = window.IPA_AUDIO_FILES || {};

  function fileFor(symbol) {
    if (FILES[symbol]) return FILES[symbol];
    // Normaliza: quita diacríticos de tie bar
    var key = String(symbol).replace(/[̥̬̪̻̺̪̃͡]/g, '');
    return FILES[key] || null;
  }

  function getCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(symbol) {
    stop();
    var file = fileFor(symbol);
    if (file) {
      playFile(file, symbol);
    } else {
      speak(symbol);
    }
  }

  function playFile(file, symbol) {
    lastFile = file;
    var url = 'audio/ipa/' + file;
    if (fetchCtrl && fetchCtrl.abort) fetchCtrl.abort();
    var ctrl = null;
    try { ctrl = new AbortController(); fetchCtrl = ctrl; } catch (e) {}
    var opts = ctrl ? { signal: ctrl.signal } : undefined;
    fetch(url, opts)
      .then(function (r) {
        if (!r.ok) throw new Error('404');
        return r.arrayBuffer();
      })
      .then(function (buf) {
        var c = getCtx();
        if (!c) { speak(symbol); return; }
        return c.decodeAudioData(buf).then(function (audio) {
          stop();
          currentSource = c.createBufferSource();
          currentSource.buffer = audio;
          currentSource.connect(c.destination);
          currentSource.start(0);
          drawWave(audio);
        });
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        speak(symbol);
      }); // Respaldo: voz del sistema
  }

  function speak(symbol) {
    if (!('speechSynthesis' in window)) return;
    // La voz lee el texto asociado al símbolo (muestra local, sin red)
    var text = String(symbol);
    var u = new SpeechSynthesisUtterance(text);
    u.lang = (document.documentElement.lang || 'es') === 'es' ? 'es-ES' : 'en-US';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    drawWaveTone();
  }

  function stop() {
    if (fetchCtrl && fetchCtrl.abort) { try { fetchCtrl.abort(); } catch (e) {} fetchCtrl = null; }
    if (waveRaf) { try { cancelAnimationFrame(waveRaf); } catch (e) {} waveRaf = 0; }
    if (currentSource) {
      try { currentSource.stop(); } catch (e) {}
      currentSource = null;
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /* ---------- Waveform ---------- */
  function drawWave(audioBuffer) {
    var canvas = document.getElementById('waveCanvas');
    if (!canvas) return;
    var c2d = canvas.getContext('2d');
    var data = audioBuffer.getChannelData(0);
    var w = canvas.width, h = canvas.height;
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#0E7C86';
    var step = Math.max(1, Math.floor(data.length / w));
    for (var x = 0; x < w; x++) {
      var min = 1, max = -1;
      for (var i = 0; i < step; i++) {
        var v = data[x * step + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      var y1 = (1 + min) * h / 2, y2 = (1 + max) * h / 2;
      c2d.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }

  // Waveform sintética cuando se usa la voz del sistema
  function drawWaveTone() {
    var canvas = document.getElementById('waveCanvas');
    if (!canvas) return;
    if (waveRaf) { try { cancelAnimationFrame(waveRaf); } catch (e) {} waveRaf = 0; }
    var c2d = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    c2d.clearRect(0, 0, w, h);
    var color = getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#0E7C86';
    c2d.fillStyle = color;
    var t0 = performance.now();
    function frame(now) {
      var elapsed = (now - t0) / 1000;
      if (elapsed > 1.4) { waveRaf = 0; return; }
      c2d.clearRect(0, 0, w, h);
      for (var x = 0; x < w; x++) {
        var env = Math.sin((x / w) * Math.PI) * Math.exp(-elapsed * 1.6);
        var amp = (h / 2) * env * (0.55 + 0.45 * Math.sin(x * 0.35 + elapsed * 18));
        c2d.fillRect(x, h / 2 - amp, 1, amp * 2);
      }
      waveRaf = requestAnimationFrame(frame);
    }
    waveRaf = requestAnimationFrame(frame);
  }

  function clearWave() {
    var canvas = document.getElementById('waveCanvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  window.LinguaLabAudio = { play: play, stop: stop, clearWave: clearWave, fileFor: fileFor };

  document.addEventListener('DOMContentLoaded', function () {
    var stopBtn = document.getElementById('waveStop');
    if (stopBtn) stopBtn.addEventListener('click', function () { stop(); clearWave(); });
  });
})();
