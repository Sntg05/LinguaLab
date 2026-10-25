/* ============================================================
   LinguaLab — mensajes de the ELAN ↔ TextGrid converter (segment 9)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `elan.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.
   ============================================================ */

export const elanEn = {
  "elan.eyebrow": "Converter",
  "elan.title": "ELAN ↔ TextGrid, without leaving the browser",
  "elan.sub":
    "Load an ELAN .eaf file or a Praat .TextGrid, look at its tiers and export it in the other format. The conversion goes through the same annotation model the viewer uses, so times and texts are not reinterpreted along the way.",
  "elan.local":
    "Files are read inside your browser. Nothing is uploaded to any server, and the conversion engine is served from this very site.",
  "elan.experimental":
    "Experimental. Always keep the original file: this tool translates formats, it does not replace checking the result in ELAN or Praat.",
  "elan.load.title": "1. Load a file",
  "elan.load.label": ".eaf or .TextGrid file",
  "elan.load.hint":
    "The format is detected from the file contents, not from its extension. An .eaf that is not XML, or a TextGrid that does not start with its header, is rejected instead of guessed.",
  "elan.tiers.title": "2. Tiers in the file",
  "elan.tiers.empty": "No tiers to show yet.",
  "elan.tiers.name": "Tier",
  "elan.tiers.kind": "Kind",
  "elan.tiers.items": "Items",
  "elan.tiers.sample": "First text",
  "elan.tiers.count": "{count} tier(s)",
  "elan.kind.interval": "Intervals",
  "elan.kind.point": "Points",
  "elan.export.title": "3. Export in the other format",
  "elan.export.hint":
    "The loaded file is exported, converted to the other format. The original file is not modified: the download is a new file.",
  "elan.export.textgrid": "Export as .TextGrid (Praat)",
  "elan.export.eaf": "Export as .eaf (ELAN)",
  "elan.loss.title": "Loss report",
  "elan.loss.intro":
    "ELAN supports structures the viewer's annotation model does not represent. This is what could not be converted, grouped by cause. An empty list means nothing was lost for that cause.",
  "elan.loss.empty": "Load a file to see what is kept and what is not.",
  "elan.loss.none": "Nothing was lost: everything the file carried could be converted.",
  "elan.loss.causeEmpty": "Nothing lost for this cause.",
  "elan.loss.pendingExport":
    "A TextGrid carries no ELAN structures to lose, so there is nothing to report here yet. The report is completed when the .eaf is exported, which is when the file is written.",
  "elan.loss.hierarchical": "Hierarchical tiers (they have a parent tier)",
  "elan.loss.references": "Tiers with annotations that point at another annotation",
  "elan.loss.vocabularies": "Controlled vocabularies",
  "elan.loss.notes": "What changed during the conversion",
  "elan.loss.notesEmpty": "The conversion did not need to change anything else.",
  "elan.limits":
    "What this tool does not do: automatic alignment, translation between tiers, or copying the audio. It does not decide for you what to do with what is lost either: it lists it and exports the rest.",
  "elan.status.idle": "Choose an .eaf or .TextGrid file.",
  "elan.status.reading": "Reading “{name}”…",
  "elan.status.loaded": "“{name}”: {format}, {count} tier(s). Ready to export.",
  "elan.status.exporting": "Converting and preparing the download…",
  "elan.status.exported": "Downloaded “{name}”. The original file was not touched.",
  "elan.status.busy": "Step {step} of {total}: {phase}",
  "elan.phase.runtime":
    "loading the Python engine (about 13 MB the first time, less if the server compresses it)",
  "elan.phase.wheel": "installing pympi-ling from this site",
  "elan.phase.convert": "converting the file",
  "elan.progress.label": "Conversion engine load",
  "elan.format.eaf": "ELAN (.eaf)",
  "elan.format.textgrid": "Praat (.TextGrid)",
  "elan.error.read": "The file could not be read: the browser did not hand over its contents.",
  "elan.error.tooLarge":
    "The file is {size} and this tool stops at {limit}. Trim the stretch you need and load it again: nothing was converted.",
  "elan.error.unknownFormat":
    "The file looks like neither an .eaf nor a .TextGrid. An .eaf starts with XML and a TextGrid with “File type = \"ooTextFile\"”.",
  "elan.error.empty": "The file is empty: there is nothing to convert.",
  "elan.error.malformedXml":
    "The .eaf is malformed: the XML cannot be read. The file was not modified.",
  "elan.error.unsupportedStructure":
    "The file is XML but does not have the structure of an .eaf this tool can read. The file was not modified.",
  "elan.error.unreadableEncoding":
    "The file is not in an encoding that can be read. Save it as UTF-8 and load it again.",
  "elan.error.runtimeUnavailable":
    "The conversion engine is not available in this browser: it may not support WebAssembly, the security policy may block it, or the Pyodide files could not be downloaded from this site.",
  "elan.error.textgrid":
    "The TextGrid could not be read ({code}). The file was not modified: nothing was lost.",
  "elan.error.detail": "Technical detail",
  "elan.note.gapFilled":
    "“{tier}”: {count} stretch(es) without annotations were filled with empty intervals so Praat can open the file.",
  "elan.note.referenceAnnotations":
    "“{tier}”: {count} annotation(s) point at another annotation instead of a time stretch, so they cannot be converted.",
  "elan.note.annotationWithoutTime":
    "“{tier}”: {count} annotation(s) point at a time slot with no value and were skipped.",
  "elan.note.tierEmpty": "The tier “{tier}” has no annotations.",
  "elan.note.overlapDetected":
    "“{tier}”: {count} annotation(s) overlap. Praat may reject the exported TextGrid; check the file in ELAN.",
  "elan.note.pointTierDropped":
    "The point tier “{tier}” ({count} mark(s)) is not written to ELAN: the format does not allow zero-length annotations.",
  "elan.note.emptyIntervalsDropped":
    "“{tier}”: {count} interval(s) with no text are silence padding and were not written to ELAN.",
  "elan.note.zeroLengthDropped":
    "“{tier}”: {count} zero-length interval(s) were not written to ELAN.",
  "elan.note.timeRounded":
    "“{tier}”: {count} time(s) were rounded to the millisecond, which is ELAN's unit.",
  "elan.note.tierUnwritable":
    "The tier “{tier}” could not be written to ELAN: the format requires a tier name.",
} as const;
