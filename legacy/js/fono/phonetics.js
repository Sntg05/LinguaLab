/* ============================================================
   LinguaLab — phonetics.js
   Transcripción aproximada grafema → AFI para español e inglés.
   REGULAR y fonema-a-fonema: no sustituye a un transcriptor
   morfológico; es una ayuda didáctica con avisos.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- ESPAÑOL ---------------- */
  // Reglas ordenadas de mayor a menor especificidad (largas primero).
  // Sin lookbehind para compatibilidad con Safari < 16.4 (solo lookahead).
  // La vibrante múltiple usa marcadores \uE000 (rr) y \uE001 (r inicial / tras n,l).
  var ES_RULES = [
    [/[cç](?=[eéií])/g, 'θ'],          // ce/ci → theta
    [/[cç](?=[aáouú])/g, 'k'],          // ca/co/cu → k
    [/ch/g, 'tʃ'],
    [/ll/g, 'ʎ'],                      // ll (antes que reglas de l suelta)
    [/ny/g, 'ɲ'],
    [/gu(?=[eéií])/g, 'ɡ'],
    [/g(?=[eéií])/g, 'x'],              // ge/gi → jota
    [/g(?=[aáouú])/g, 'ɡ'],
    [/h(?=[uú])/g, 'w'],
    [/h/g, ''],                         // h muda
    [/qu(?=[eéií])/g, 'k'],
    [/qu/g, 'k'],
    [/[q]/g, 'k'],
    [/rr/g, '\uE000'],                       // marcador vibrante múltiple
    [/^r/g, '\uE001'],                       // r inicial → vibrante múltiple
    [/([nl])r/g, '$1\uE001'],                // tras n/l → vibrante múltiple
    [/r/g, 'ɾ'],                        // resto simple → tap
    [/\uE000/g, 'r'],                        // restaura vibrante múltiple
    [/\uE001/g, 'r'],
    [/x/g, 'x'],                        // jota
    [/w/g, 'w'],
    [/y(?=[aeiou])/g, 'ʝ'],
    [/[íì]/g, 'i'], [/[úù]/g, 'u'], [/[éè]/g, 'e'], [/[óò]/g, 'o'], [/[áà]/g, 'a'],
    [/[üÜ]/g, 'u'],
    [/ñ/g, 'ɲ'],
    [/[q]/g, 'k'],
    [/z/g, 'θ'],                        // en distinción
    [/\s+/g, ' ']
  ];

  function transcribeES(word) {
    var w = String(word || '').toLowerCase().trim();
    if (!w) return '';
    // Quitar signos
    w = w.replace(/[.,;:!?¿¡"()]/g, '');
    var out = w;
    ES_RULES.forEach(function (r) {
      out = out.replace(r[0], r[1]);
    });
    // Limpieza de letras sobrantes no cubiertas
    out = out.replace(/[^a-zθxkɡʝʎɲɾrtʃʃiueoa ́íúéóáñç]/g, '');
    return '/' + out.trim() + '/';
  }

  /* ---------------- INGLÉS ---------------- */
  // Dígrafos primero (th/sh/ch/...) antes que reglas simples de c/g.
  var EN_RULES = [
    [/tion/g, 'ʃən'],
    [/sion/g, 'ʒən'],
    [/ture/g, 'tʃər'],
    [/igh(?=[aeiouy]|$)/g, 'aɪ'],
    [/ough/g, 'oʊ'],
    [/augh/g, 'ɔː'],
    [/eau/g, 'oʊ'],
    [/th/g, 'θ'],
    [/sh/g, 'ʃ'],
    [/ch/g, 'tʃ'],
    [/ph/g, 'f'],
    [/wh/g, 'w'],
    [/kn(?=[aeiou])/g, 'n'],
    [/wr/g, 'ɹ'],
    [/ng(?!$)/g, 'ŋɡ'],
    [/ng$/g, 'ŋ'],
    [/gh/g, ''],
    [/cie(?=[^aeiou]|$)/g, 'ʃi'],
    [/ge(?=[^aeiou]|$)/g, 'dʒ'],
    [/ce(?=[^aeiou]|$)/g, 's'],
    [/c(?=[ie])/g, 's'],
    [/c(?![ie])/g, 'k'],
    [/g(?=[ei])/g, 'dʒ'],
    [/g(?!h)/g, 'ɡ'],
    [/x/g, 'ks'],
    [/y(?=[aeiou])/g, 'j'],
    [/ee/g, 'iː'],
    [/ea/g, 'iː'],
    [/oo/g, 'uː'],
    [/ou/g, 'aʊ'],
    [/oi|oy/g, 'ɔɪ'],
    [/ai|ay/g, 'eɪ'],
    [/au|aw/g, 'ɔː'],
    [/ow/g, 'oʊ'],
    [/ie/g, 'iː'],
    [/ei|ey/g, 'eɪ'],
    [/ue/g, 'uː'],
    [/o(?=[aeiou])/g, 'oʊ'],
    [/a(?![^aeiou]|$)/g, 'ə'],
    [/e$/g, ''],                        // e muda final
    [/[áà]/g, 'æ'], [/[éè]/g, 'e'], [/[íì]/g, 'i'], [/[óò]/g, 'o'], [/[úù]/g, 'u'],
    [/\s+/g, ' ']
  ];

  var EN_VOWELS = 'aeiouy';

  function transcribeEN(word) {
    var w = String(word || '').toLowerCase().trim();
    if (!w) return '';
    w = w.replace(/[.,;:!?'"()]/g, '');
    var out = w;
    EN_RULES.forEach(function (r) { out = out.replace(r[0], r[1]); });
    // Sin reescritura global de a/o: corrompía diptongos (aɪ→ʌɪ, oʊ→ɒʊ).
    return '/' + out.trim() + '/';
  }

  /* ---------------- API ---------------- */
  function transcribe(text, lang) {
    lang = (lang || 'es').toLowerCase();
    var words = String(text || '').split(/\s+/).filter(Boolean);
    return words.map(function (w) {
      return lang === 'en' ? transcribeEN(w) : transcribeES(w);
    }).join(' ');
  }

  window.LinguaLabPhonetics = {
    transcribe: transcribe,
    es: transcribeES,
    en: transcribeEN
  };
})();
