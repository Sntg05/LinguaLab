/* ============================================================
   LinguaLab — messages of part-of-speech tagging (S14)
   Same keys as `pos.es.ts`; see that file.
   ============================================================ */

import type { posEs } from "./pos.es";

export const posEn: Record<keyof typeof posEs, string> = {
  "pos.eyebrow": "Parts of speech",
  "pos.title": "Tag the parts of speech of a text",
  "pos.sub":
    "Each word gets its part of speech (noun, verb, determiner…) from the 17 universal categories of Universal Dependencies, the same ones ArborLab uses.",
  "pos.local": "Local processing: the text never leaves your browser. Each language's model is downloaded the first time you use it (about 1 MB).",
  "pos.limits":
    "It is a statistical model and it makes mistakes: it gets {es} % of the words in the AnCora test set right (Spanish) and {en} % in the EWT test set (English), and far fewer on words it never saw. Check the tags before using them as data.",
  "pos.text": "Text",
  "pos.language": "Language",
  "pos.run": "Tag",
  "pos.example": "Load an example",
  "pos.exampleText": "The teacher explained the difference between the subject and the object of the verb.",
  "pos.col.word": "Word",
  "pos.col.tag": "Category",
  "pos.col.count": "Count",
  "pos.col.share": "Share",
  "pos.tagged": "Tagged text",
  "pos.summary": "How often each category appears",
  "pos.exportCsv": "Download CSV",
  "pos.contractionNote": "“{word}” was split into two words, as in the training treebank.",
  "pos.status.ready": "Type a text and press “Tag”.",
  "pos.status.loading": "Tagging… the first time, the language model is downloaded.",
  "pos.status.done": "{count} words tagged. Check the doubtful ones: the model gets roughly one in {every} wrong.",
  "pos.status.empty": "Type a text first: there is nothing to tag.",
  "pos.status.error": "The model could not be downloaded from this site. Check the connection and try again.",
};
