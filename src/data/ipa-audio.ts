/* ============================================================
   LinguaLab — IPA audio manifest
   Ported from legacy/data/. Data is verbatim; the `window.X =`
   global assignment became a typed ES module export.
   ============================================================ */


/**
 * Symbol → audio file name, resolved under /audio/ipa/.
 * A symbol missing from this map (or whose file is absent) falls back to
 * the browser's speech synthesis, so audio is never played unlicensed.
 */
export const IPA_AUDIO_FILES: Readonly<Record<string, string>> = {
  "p": "p.wav",
  "b": "b.wav",
  "t": "t.wav",
  "d": "d.wav",
  "k": "k.wav",
  "ɡ": "g.wav",
  "m": "m.wav",
  "n": "n.wav",
  "ɲ": "enye.wav",
  "ŋ": "enye_velar.wav",
  "f": "f.wav",
  "v": "v.wav",
  "s": "s.wav",
  "z": "z.wav",
  "ʃ": "esh.wav",
  "ʒ": "ezh.wav",
  "x": "jota.wav",
  "h": "h.wav",
  "θ": "ceta.wav",
  "ð": "ed.wav",
  "ɾ": "erre_tap.wav",
  "r": "erre_trill.wav",
  "t͡ʃ": "che.wav",
  "d͡ʒ": "yemina_dz.wav",
  "l": "ele.wav",
  "j": "jota_palatal.wav",
  "w": "u_semicerrada.wav",
  "a": "a_abierta.wav",
  "e": "e_semicerrada.wav",
  "i": "i_cerrada.wav",
  "o": "o_semicerrada.wav",
  "u": "u_cerrada.wav",
  "ə": "schwa.wav",
  "ɑ": "alfa.wav",
  "ɛ": "epsilon.wav",
  "ɔ": "o_abierta.wav",
  "ɪ": "i_corta.wav",
  "æ": "ash.wav"
};
