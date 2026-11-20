/* ============================================================
   LinguaLab — messages of the document comparison (S13)
   Same keys as `compare.es.ts`; see that file.
   ============================================================ */

import type { compareEs } from "./compare.es";

export const compareEn: Record<keyof typeof compareEs, string> = {
  "cmp.eyebrow": "Compare documents",
  "cmp.title": "Compare two or three documents",
  "cmp.sub":
    "Load two or three documents (.docx, PDF with text or .txt) and see how they are alike and how they differ: which words set each one apart, how much vocabulary they share, their lexical diversity and how each one uses a word.",
  "cmp.local":
    "The documents are read inside your browser; nothing is uploaded to any server. To read a PDF, the pdf.js reader is downloaded once from this same site.",
  "cmp.limits":
    "From a .docx the body is read (not footnotes or headers). From a PDF the text it stores is read: a scanned PDF has no text and is refused, and columns or tables may come out in another order. Up to 10 MB per file.",

  "cmp.load.title": "1. Documents",
  "cmp.load.label": "Choose 2 to 3 files (.docx, .pdf or .txt)",
  "cmp.load.empty": "There are no documents yet.",
  "cmp.settings.title": "2. Settings",
  "cmp.settings.stopwords": "Stopwords",
  "cmp.settings.stopwords.es": "Spanish",
  "cmp.settings.stopwords.en": "English",
  "cmp.settings.stopwords.both": "Both",
  "cmp.settings.stopwords.none": "None",
  "cmp.settings.minCount": "Minimum frequency",
  "cmp.settings.alpha": "Significance level",
  "cmp.settings.alphaNote":
    "Hundreds or thousands of words are tested at once: with p < 0.05, one in twenty would come out by chance. Besides, when two corpora are compared many common words come out significant (Kilgarriff, 1996, cited by Rayson and Garside, 2000). A stricter level keeps only the clearest differences: p < 0.0001 corresponds to G² > 15.14.",
  "cmp.run": "Compare",

  "cmp.profile.title": "3. Profile of each document",
  "cmp.profile.note":
    "TTR falls as a text gets longer even if its vocabulary does not change: to compare documents of different lengths, look at MSTTR (the mean TTR of 100-word stretches).",
  "cmp.keywords.title": "4. Keywords: each document against the others",
  "cmp.keywords.note":
    "G² (Dunning, 1993) says how sure it is that the difference is not chance; it grows with the size of the documents. Log ratio (Hardie, 2014) says how big it is: 1 is twice as frequent, 2 four times. The figures are checked against R in the site's tests.",
  "cmp.keywords.positive": "Used more in “{name}”",
  "cmp.keywords.negative": "Used less in “{name}”",
  "cmp.keywords.tested": "{count} words were tested.",
  "cmp.vocabulary.title": "5. Shared and own vocabulary",
  "cmp.vocabulary.note":
    "Word forms are compared, without lemmatising: “house” and “houses” count as different words. The Jaccard index is the share of two documents' vocabulary they have in common (0 = nothing, 1 = all).",
  "cmp.vocabulary.shared": "In every document",
  "cmp.vocabulary.unique": "Only in “{name}”",
  "cmp.vocabulary.jaccard": "Jaccard index",
  "cmp.frequency.title": "6. Frequencies, per 10,000 words",
  "cmp.frequency.note":
    "Frequency per 10,000 words lets documents of different lengths be compared. The most frequent words of each document are shown.",
  "cmp.kwic.title": "7. Concordance by document",
  "cmp.kwic.label": "Word",
  "cmp.kwic.run": "Search",
  "cmp.export.title": "Downloads",
  "cmp.export.keywords": "Keywords (.csv)",
  "cmp.export.frequency": "Frequencies (.csv)",
  "cmp.export.profile": "Profile (.csv)",

  "cmp.col.document": "Document",
  "cmp.col.measure": "Measure",
  "cmp.col.word": "Word",
  "cmp.col.here": "Here",
  "cmp.col.rest": "Rest",
  "cmp.col.herePer10k": "Here /10,000",
  "cmp.col.restPer10k": "Rest /10,000",
  "cmp.col.g2": "G²",
  "cmp.col.p": "p",
  "cmp.col.logRatio": "Log ratio",
  "cmp.col.pair": "Pair",
  "cmp.col.left": "Left",
  "cmp.col.node": "Node",
  "cmp.col.right": "Right",
  "cmp.measure.tokens": "Words",
  "cmp.measure.types": "Distinct forms",
  "cmp.measure.ttr": "TTR",
  "cmp.measure.msttr": "MSTTR",
  "cmp.measure.hapax": "Hapax (% of vocabulary)",
  "cmp.measure.sentences": "Sentences",
  "cmp.measure.wordsPerSentence": "Words per sentence",

  "cmp.status.ready": "Load two or three documents to start.",
  "cmp.status.reading": "Reading “{name}”…",
  "cmp.status.loaded": "“{name}” loaded: {words} words.",
  "cmp.status.compared": "Comparison ready: {count} documents.",
  "cmp.status.removed": "“{name}” removed.",
  "cmp.status.kwic": "{count} occurrences of “{word}”.",
  "cmp.error.tooMany": "Three documents at most: “{name}” was not loaded.",
  "cmp.error.tooFew": "At least two documents are needed.",
  "cmp.error.duplicate": "“{name}” is already loaded.",
  "cmp.error.unsupported-format": "“{name}” is not a .docx, a PDF or a .txt.",
  "cmp.error.too-large": "“{name}” is over 10 MB.",
  "cmp.error.corrupt": "“{name}” is damaged or cannot be opened.",
  "cmp.error.encrypted": "“{name}” has a password: save it without one and load it again.",
  "cmp.error.no-text":
    "“{name}” has no text to read. If it is a scanned PDF, it needs text recognition (OCR) first.",
  "cmp.error.reader-unavailable":
    "“{name}” could not be read because the reader did not download. Check your connection and load it again.",
  "cmp.error.read": "“{name}” could not be read.",
  "cmp.remove": "Remove",
  "cmp.removeLabel": "Remove {name}",
  "cmp.pages": "{count} pages",
  "cmp.words": "{count} words",
  "cmp.none": "None.",
};
