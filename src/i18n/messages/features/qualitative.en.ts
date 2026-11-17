/* ============================================================
   LinguaLab — messages of the qualitative-analysis lab (T7)
   Same keys as `qualitative.es.ts`; see that file.
   ============================================================ */

import type { qualitativeEs } from "./qualitative.es";

export const qualitativeEn: Record<keyof typeof qualitativeEs, string> = {
  "qual.meta.title": "Qualitative analysis — LinguaLab",
  "qual.meta.description":
    "Code interviews and transcripts with a codebook, look at frequencies and co-occurrences, and measure intercoder agreement with Cohen's kappa and Krippendorff's alpha.",
  "qual.eyebrow": "Qualitative methods",
  "qual.title": "Qualitative coding and intercoder agreement",
  "qual.sub":
    "Define your codes, split the material into segments and mark which code applies to each one. The page counts frequencies and co-occurrences and, if someone else codes the same material, computes how much you agree.",
  "qual.local":
    "Everything happens in your browser: the material and the codings are not uploaded to any server. To keep your work, download the coding sheet (CSV) and load it again when you want to continue.",
  "qual.experimental":
    "Experimental. Whole segments (a line or a paragraph) are coded, not free spans inside a segment.",
  "qual.example.button": "Load an example",
  "qual.example.note":
    "An invented excerpt of a sociolinguistic interview with four codes, to see how it works before using your own material.",

  "qual.codebook.title": "1. Codebook",
  "qual.codebook.note":
    "Each code has a definition and rules of use: when it applies, when it does not, and an example. Without written rules, two people apply the same name to different things (MacQueen and colleagues, 1998).",
  "qual.codebook.name": "Code name",
  "qual.codebook.definition": "Definition",
  "qual.codebook.include": "When it applies",
  "qual.codebook.exclude": "When it does not apply",
  "qual.codebook.example": "Example",
  "qual.codebook.add": "Add code",
  "qual.codebook.import": "Import codebook (.csv)",
  "qual.codebook.export": "Download codebook (.csv)",
  "qual.codebook.empty": "There are no codes yet.",
  "qual.codebook.columns": "CSV columns",

  "qual.material.title": "2. Material",
  "qual.material.note":
    "Paste or load the text and choose how to split it. By line, each line is a segment (a turn in a transcript); by paragraph, whatever a blank line separates. Splitting again starts a new coding.",
  "qual.material.paste": "Text",
  "qual.material.pasteHint": "Interviewer: Where did you learn the language?\nParticipant: At home, with my grandmother.",
  "qual.material.file": "Or load a text file (.txt)",
  "qual.material.mode": "Split by",
  "qual.material.line": "line",
  "qual.material.paragraph": "paragraph",
  "qual.material.split": "Split into segments",
  "qual.material.resume": "Or continue a saved coding (.csv)",
  "qual.material.resumeNote":
    "Load a sheet downloaded from this page: it restores the segments and the marks, and adds any missing codes to the codebook.",

  "qual.coding.title": "3. Code",
  "qual.coding.note":
    "Mark the codes that apply to each segment. A segment can have several codes or none. Hover over a code's name to see its definition.",
  "qual.coding.empty": "Split the material into segments and add at least one code to start.",
  "qual.coding.export": "Download coding sheet (.csv)",

  "qual.results.title": "4. Frequencies and co-occurrences",
  "qual.results.note":
    "Frequency counts the segments where each code was applied. Co-occurrence counts the segments where two codes were applied together; the diagonal is the frequency. Two codes appearing together is a hint to go back to the material, not a demonstrated relationship.",
  "qual.results.frequencies": "Frequencies",
  "qual.results.cooccurrence": "Co-occurrences",
  "qual.results.empty": "They appear when there are segments and codes.",
  "qual.results.exportFrequencies": "Download frequencies (.csv)",
  "qual.results.exportCooccurrence": "Download co-occurrences (.csv)",

  "qual.agreement.title": "5. Intercoder agreement",
  "qual.agreement.note":
    "Each person codes the same material separately, with the same codebook, and downloads their sheet. Load the other people's sheets here: segments are paired by number and must have the same text.",
  "qual.agreement.files": "Other people's sheets (.csv)",
  "qual.agreement.includeMine": "Include my current coding",
  "qual.agreement.clear": "Remove the loaded sheets",
  "qual.agreement.run": "Compute agreement",
  "qual.agreement.empty": "Load at least one more sheet to compare.",
  "qual.agreement.export": "Download agreement report (.csv)",
  "qual.agreement.readPercent":
    "Percent agreement: of the segments everyone coded, on how many they all agree. It does not discount the agreement expected by chance.",
  "qual.agreement.readKappa":
    "Cohen's kappa (1960): two people only; it discounts chance. It is read with Landis and Koch's (1977) bands, which are a convention, not a threshold from the theory.",
  "qual.agreement.readAlpha":
    "Krippendorff's alpha: two or more people and missing data. Krippendorff considers α ≥ 0.800 reliable and allows tentative conclusions from 0.667.",
  "qual.agreement.validated":
    "The three figures are checked against the R package irr in the site's tests. One declared difference: if nobody varies (everyone always uses the same mark), alpha is undefined; irr gives 1.",

  "qual.col.code": "Code",
  "qual.col.definition": "Definition",
  "qual.col.segment": "No.",
  "qual.col.text": "Segment",
  "qual.col.segments": "Segments",
  "qual.col.share": "% of material",
  "qual.col.complete": "Comparable segments",
  "qual.col.percent": "Agreement",
  "qual.col.kappa": "Cohen's κ",
  "qual.col.alpha": "Krippendorff's α",
  "qual.col.actions": "Actions",

  "qual.status.ready": "Ready. Start with the codebook or load the example.",
  "qual.status.codeAdded": "Code “{code}” added.",
  "qual.status.codeRemoved": "Code “{code}” removed, with its marks.",
  "qual.status.codebookLoaded": "Codebook loaded: {count} codes.",
  "qual.status.split": "Material split into {count} segments.",
  "qual.status.resumed": "Coding restored: {segments} segments and {codes} codes.",
  "qual.status.example": "Example loaded: mark the codes of each segment.",
  "qual.status.agreement": "Agreement computed across {coders} sheets, over {segments} segments.",
  "qual.status.textLoaded": "Text file loaded. Choose how to split it.",

  "qual.error.codeEmpty": "The code needs a name.",
  "qual.error.codeDuplicate": "There is already a code with that name.",
  "qual.error.materialEmpty": "There is no text to split.",
  "qual.error.codebook": "The codebook could not be read: {detail}",
  "qual.error.coding": "The sheet “{file}” could not be read: {detail}",
  "qual.error.agreementFew": "At least two sheets are needed to compare.",
  "qual.error.mismatch":
    "Segment {segment} of sheet {sheet} has different text: those people did not code the same material.",
  "qual.error.file": "The file could not be read.",

  "qual.csv.unclosedQuote": "there is an unclosed quote on line {line}.",
  "qual.csv.missingCodeColumn": "the “code” column is missing.",
  "qual.csv.emptyName": "row {row} has no code name.",
  "qual.csv.duplicateName": "row {row} repeats the code “{name}”.",
  "qual.csv.empty": "the file is empty.",
  "qual.csv.badHeader": "the header must start with “segment,text”.",
  "qual.csv.noCodes": "there are no code columns after “segment,text”.",
  "qual.csv.badCodeName": "column {column} has no name or repeats another code.",
  "qual.csv.duplicateSegment": "row {row} repeats segment {segment}.",
  "qual.csv.badMark": "row {row}, column {column}, says “{value}”: 1, 0 or empty is expected.",

  "qual.remove": "Remove",
  "qual.removeLabel": "Remove the code {code}",
  "qual.markLabel": "{code}, segment {segment}",
  "qual.mine": "my current coding",
  "qual.notComputable": "—",
  "qual.notComputableNote":
    "“—”: it cannot be computed. Kappa needs exactly two sheets; alpha, that someone uses both marks; all three, segments coded by the people compared.",
  "qual.band.poor": "poor",
  "qual.band.slight": "slight",
  "qual.band.fair": "fair",
  "qual.band.moderate": "moderate",
  "qual.band.substantial": "substantial",
  "qual.band.almost-perfect": "almost perfect",
  "qual.verdict.reliable": "reliable",
  "qual.verdict.tentative": "tentative",
  "qual.verdict.unreliable": "insufficient",
};
