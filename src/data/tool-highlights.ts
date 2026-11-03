/* ============================================================
   LinguaLab — tool highlights for the landing page

   The catalog (`tools.json`) holds each tool's full, careful description.
   The landing needs something shorter: one line that says what the tool is
   for, and a notation sample in the tool's own visual language. Both live
   here, keyed by the catalog id, and `tool-highlights.test.ts` fails if a
   tool is added to or removed from the catalog without its highlight.
   ============================================================ */

export type SampleKind = "ipa" | "mono";

export interface ToolHighlight {
  /** One line, in each locale, that says what the tool is for. */
  readonly summary: { readonly es: string; readonly en: string };
  /** A real sample of the tool's notation, or null when none fits. */
  readonly sample: string | null;
  readonly sampleKind: SampleKind;
}

export const TOOL_HIGHLIGHTS: Readonly<Record<string, ToolHighlight>> = {
  // ---- Integrated: they open on this site ----
  fono: {
    summary: {
      es: "Tabla AFI con descripción articulatoria, corte sagital, audio y transcriptor para español e inglés.",
      en: "IPA chart with articulatory description, sagittal section, audio and a Spanish and English transcriber.",
    },
    sample: "θ ʃ ɲ ʎ ɾ",
    sampleKind: "ipa",
  },
  "acoustic-analysis": {
    summary: {
      es: "Dentro del visor de audio: F0, formantes F1–F3 e intensidad, con medición por intervalo y gráfico vocálico.",
      en: "Inside the audio viewer: F0, F1–F3 formants and intensity, with per-interval measurement and a vowel chart.",
    },
    sample: "F1 F2 F0",
    sampleKind: "mono",
  },
  ortografia: {
    summary: {
      es: "Tablas de reglas grafema→AFI con contexto y capa alofónica. Demos en español, inglés, portugués y wayuunaiki.",
      en: "Grapheme→IPA rule tables with context and an allophonic layer. Spanish, English, Portuguese and Wayuunaiki demos.",
    },
    sample: "ll → ʝ",
    sampleKind: "ipa",
  },
  phonemizer: {
    summary: {
      es: "Texto a AFI aproximado con eSpeak NG, para español latinoamericano e inglés estadounidense.",
      en: "Approximate text-to-IPA with eSpeak NG, for Latin American Spanish and American English.",
    },
    sample: "/ˈkasa/",
    sampleKind: "ipa",
  },
  arboles: {
    summary: {
      es: "Árboles de constituyentes, dependencias, X-barra y estructuras de datos, exportables a SVG, Newick y CoNLL-U.",
      en: "Constituency, dependency, X-bar and data-structure trees, exportable to SVG, Newick and CoNLL-U.",
    },
    sample: "[S [NP] [VP]]",
    sampleKind: "mono",
  },
  "jspsych-experiments": {
    summary: {
      es: "Juicios de aceptabilidad, elección forzada, lectura autocontrolada y decisión léxica, con resultados en CSV.",
      en: "Acceptability judgements, forced choice, self-paced reading and lexical decision, with CSV results.",
    },
    sample: "RT 412 ms",
    sampleKind: "mono",
  },
  "mapa-lenguas-colombia": {
    summary: {
      es: "Las lenguas que Glottolog registra en Colombia, con familia, Glottocode e ISO 639-3, en mapa y en tabla.",
      en: "The languages Glottolog records in Colombia, with family, Glottocode and ISO 639-3, as a map and a table.",
    },
    sample: "wayu1243",
    sampleKind: "mono",
  },
  tools: {
    summary: {
      es: "Frecuencias con dispersión, colocaciones (log-Dice, PMI), concordancias KWIC, n-gramas y legibilidad.",
      en: "Frequencies with dispersion, collocations (log-Dice, PMI), KWIC concordances, n-grams and readability.",
    },
    sample: "KWIC",
    sampleKind: "mono",
  },
  "textgrid-viewer": {
    summary: {
      es: "Forma de onda, espectrograma y capas de anotación que importan y exportan TextGrid de Praat.",
      en: "Waveform, spectrogram and annotation tiers that import and export Praat TextGrid.",
    },
    sample: ".TextGrid",
    sampleKind: "mono",
  },
  "elan-textgrid": {
    summary: {
      es: "Convierte entre ELAN (.eaf) y Praat (.TextGrid) sin que el archivo salga del navegador.",
      en: "Converts between ELAN (.eaf) and Praat (.TextGrid) without the file leaving the browser.",
    },
    sample: ".eaf ⇄ .TextGrid",
    sampleKind: "mono",
  },

  // ---- External: they open on another site ----
  praat: {
    summary: {
      es: "El programa de referencia para análisis acústico y para abrir TextGrid.",
      en: "The reference program for acoustic analysis and for opening TextGrid files.",
    },
    sample: null,
    sampleKind: "mono",
  },
  udpipe: {
    summary: {
      es: "Tokeniza, lematiza, etiqueta y analiza dependencias en más de cincuenta lenguas. El texto sale de tu equipo.",
      en: "Tokenises, lemmatises, tags and parses dependencies in over fifty languages. Your text leaves your computer.",
    },
    sample: null,
    sampleKind: "mono",
  },
  "ud-annotatrix": {
    summary: {
      es: "Editor de árboles de dependencias según Universal Dependencies, con CoNLL-U.",
      en: "Dependency tree editor following Universal Dependencies, with CoNLL-U.",
    },
    sample: null,
    sampleKind: "mono",
  },
  "lambda-notebook": {
    summary: {
      es: "Cuaderno de Jupyter para semántica formal: tipos, lambdas y composición.",
      en: "Jupyter notebook for formal semantics: types, lambdas and composition.",
    },
    sample: null,
    sampleKind: "mono",
  },
  "problang-rsa": {
    summary: {
      es: "Tutorial interactivo de pragmática bayesiana (Rational Speech Acts) en WebPPL.",
      en: "Interactive Bayesian pragmatics tutorial (Rational Speech Acts) in WebPPL.",
    },
    sample: null,
    sampleKind: "mono",
  },
  elan: {
    summary: {
      es: "Anotación por capas de audio y video, la referencia para documentación de campo.",
      en: "Layered audio and video annotation, the reference for field documentation.",
    },
    sample: null,
    sampleKind: "mono",
  },
  fieldworks: {
    summary: {
      es: "Léxico, paradigmas y textos de campo, de SIL.",
      en: "Lexicon, paradigms and field texts, by SIL.",
    },
    sample: null,
    sampleKind: "mono",
  },
  flibl: {
    summary: {
      es: "Scripts de Python para pasar textos entre ELAN y FieldWorks. Se ejecutan en tu equipo.",
      en: "Python scripts to move texts between ELAN and FieldWorks. They run on your computer.",
    },
    sample: null,
    sampleKind: "mono",
  },
  lexonomy: {
    summary: {
      es: "Servicio en línea para escribir y publicar diccionarios.",
      en: "Online service for writing and publishing dictionaries.",
    },
    sample: null,
    sampleKind: "mono",
  },
  "uniandes-lenguas": {
    summary: {
      es: "Corpus paralelos y modelos de traducción para wayuunaiki, arhuaco, inga y nasa. Aún sin enlace verificado.",
      en: "Parallel corpora and translation models for Wayuunaiki, Arhuaco, Inga and Nasa. No verified link yet.",
    },
    sample: null,
    sampleKind: "mono",
  },
};
