/* ============================================================
   LinguaLab — mensajes de the acoustic analysis panels of the viewer (segment 8)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `acoustic.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.

   AQUI NO SE PROMETE NADA QUE NO SE HAYA MEDIDO

   El aviso de «Experimental» no es cortesia: la condicion para quitarlo es el
   contraste contra Praat sobre voces reales, y ese contraste todavia no existe.
   El texto de `acoustic.limits` lo dice con esas palabras.
   ============================================================ */

export const acousticEn = {
  "acoustic.title": "Acoustic analysis (experimental)",
  "acoustic.lead":
    "Pitch, formants and intensity of the loaded recording. The numbers come from praatfan, a reimplementation of Praat's algorithms that runs in your browser and in a separate worker, so the page stays responsive while it measures.",
  "acoustic.experimental": "Experimental: check your results against Praat before publishing them.",

  "acoustic.preset.label": "Voice preset",
  "acoustic.preset.custom": "Custom",
  "acoustic.preset.masculine": "Male voice (75–300 Hz)",
  "acoustic.preset.feminine": "Female voice (100–500 Hz)",
  "acoustic.preset.child": "Child voice (150–800 Hz)",

  "acoustic.pitch.title": "F0 contour (pitch)",
  "acoustic.pitch.floor": "Floor (Hz)",
  "acoustic.pitch.ceiling": "Ceiling (Hz)",
  "acoustic.pitch.run": "Compute F0",
  "acoustic.pitch.note":
    "The floor and ceiling bound the search. With a ceiling that is too low the analysis reports half the real frequency; with a floor that is too high it loses low voices.",
  "acoustic.canvas.f0": "Fundamental frequency contour, in hertz",

  "acoustic.formant.title": "Formants F1 to F3",
  "acoustic.formant.max": "Maximum frequency (Hz)",
  "acoustic.formant.run": "Compute formants",
  "acoustic.formant.overlay": "Overlay on the spectrogram",
  "acoustic.formant.note":
    "The maximum frequency must exceed the highest formant you expect: child voices usually need more than 5500 Hz.",

  "acoustic.intensity.title": "Intensity",
  "acoustic.intensity.run": "Compute intensity",
  "acoustic.intensity.note":
    "Signal level in decibels, measured with the same method and the same threshold as Praat.",
  "acoustic.canvas.intensity": "Intensity curve, in decibels",

  "acoustic.measure.title": "Measurement of the selection",
  "acoustic.measure.run": "Measure the selection",
  "acoustic.measure.export": "Export measurements to CSV",
  "acoustic.measure.clear": "Clear measurements",
  "acoustic.measure.note":
    "Measures the active interval —the one under the cursor— and, when there are no intervals, the whole audio. F0 is summarised without counting unvoiced frames; F1 and F2 are reported at 25, 50 and 75 percent and at the midpoint.",
  "acoustic.measure.empty": "No measurements yet. Choose an interval and request the measurement.",
  "acoustic.measure.head.label": "Label",
  "acoustic.measure.head.range": "Interval (s)",
  "acoustic.measure.head.f0": "F0 (Hz)",
  "acoustic.measure.head.mean": "Mean",
  "acoustic.measure.head.median": "Median",
  "acoustic.measure.head.min": "Minimum",
  "acoustic.measure.head.max": "Maximum",
  "acoustic.measure.head.intensity": "Mean intensity (dB)",
  "acoustic.measure.head.f1": "F1 (Hz)",
  "acoustic.measure.head.f2": "F2 (Hz)",
  "acoustic.measure.head.percent25": "25 %",
  "acoustic.measure.head.percent50": "50 %",
  "acoustic.measure.head.percent75": "75 %",
  "acoustic.measure.head.centre": "Centre",

  "acoustic.vowels.title": "Vowel chart F1–F2",
  "acoustic.vowels.x": "F2 (Hz), front to the left",
  "acoustic.vowels.y": "F1 (Hz), open below",
  "acoustic.vowels.empty": "Measured vowels appear here, labelled with the interval text.",
  "acoustic.canvas.vowels": "F1 and F2 scatter plot with inverted axes",

  "acoustic.status.idle":
    "The analysis runs in a worker: the first calculation loads the engine and may take a few seconds.",
  "acoustic.status.analysing": "Analysing… the calculation runs in a worker and the page keeps responding.",
  "acoustic.status.f0": "F0 contour ready: {count} voiced frames.",
  "acoustic.status.formants": "Formants computed.",
  "acoustic.status.intensity": "Intensity computed.",
  "acoustic.status.measured": "Measurement ready: {count} interval(s).",
  "acoustic.status.exported": "Measurements downloaded: {name}",
  "acoustic.status.cleared": "Measurements cleared.",
  "acoustic.error.noAudio": "Load an audio file before analysing it.",
  "acoustic.error.noSelection": "There is no active interval to measure.",
  "acoustic.error.unavailable":
    "Acoustic analysis is not available: {detail}. The rest of the viewer keeps working.",
  "acoustic.error.tooShort":
    "The audio lasts {duration} s and the analysis needs at least 0.05 s.",
  "acoustic.error.failed": "The analysis failed: {detail}",

  "acoustic.limits":
    "There are no reference audio files yet to check this analysis against Praat on real voices: until there are, these numbers help you look at the signal, but they are not measurements to publish.",
} as const;
