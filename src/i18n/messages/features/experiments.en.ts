/* ============================================================
   LinguaLab — mensajes de the four psycholinguistics experiments (segment 7)

   POR QUE ESTE ARCHIVO EXISTE, EN VEZ DE CRECER EL DICCIONARIO CENTRAL

   Una herramienta nueva trae su propia copia, y la copia crece en el mismo
   archivo que editan todas las demas. El diccionario central es un solo objeto
   literal: dos personas trabajando en dos herramientas chocan en las mismas
   lineas, y el choque no tiene nada que ver con lo que estan haciendo.

   Con un modulo por herramienta, cada una escribe sus claves en su archivo y
   `src/i18n/messages/es.ts` solo lo mezcla. Las claves llevan el prefijo
   `exp.` y una prueba comprueba que no se repitan entre modulos, que
   existan en los dos idiomas y que el prefijo se respete.

   QUE NO SE TRADUCE AQUI

   Los valores de respuesta que viajan al CSV («1»..«7», «word», «nonword») no
   son texto de interfaz: son datos que se analizan, y por eso viven en el codigo
   del adaptador y no en el diccionario. Un CSV cuyas respuestas cambian de
   idioma segun la ruta del sitio no se puede comparar entre sesiones.
   ============================================================ */

export const experimentsEn = {
  "exp.meta.title": "Psycholinguistics experiments",
  "exp.meta.description":
    "Build and run psycholinguistics experiments in your browser: acceptability judgements, forced choice, self-paced reading and lexical decision, with a reproducible seed and results as CSV. Nothing leaves your machine.",
  "exp.eyebrow": "Psycholinguistics",
  "exp.title": "Experiment builder",
  "exp.sub":
    "Load your stimuli, pick a template, review the order and run. When it ends you download a CSV with the responses, the reaction times, the seed and the tool version, which is what it takes to reproduce the session.",
  "exp.privacy":
    "Stimuli and audio stay in your browser: nothing is uploaded to a server. The only output is the file you download.",
  "exp.precision":
    "Reaction times in a browser have limited precision: they depend on the screen refresh rate, on machine load and on the keyboard. They are good for comparing conditions within the same session, not for publishing absolute milliseconds. If you need laboratory precision, measure with dedicated hardware.",

  "exp.consent.title": "Before running: consent and data",
  "exp.consent.note":
    "This guide is deliberately short and does not replace your ethics committee's review.",
  "exp.consent.item1":
    "Explain what is measured, how long it takes, what happens with the data, and that participation is voluntary and can be abandoned at any time.",
  "exp.consent.item2":
    "Collect consent outside this tool and keep it separately: no names, signatures or emails are asked for here.",
  "exp.consent.item3":
    "Each participant gets an anonymous identifier generated in this browser. Do not link it to a person in the same file.",
  "exp.consent.item4":
    "The CSV stays on the machine of whoever downloads it. Decide before starting where it is stored, who sees it and when it is deleted.",

  "exp.load.title": "1. Stimuli",
  "exp.load.note":
    "Paste the list or upload a CSV file. The columns are named id, condition, text and audio; audio is optional.",
  "exp.load.paste": "Stimulus list (CSV)",
  "exp.load.pasteHint": "id,condition,text,audio",
  "exp.load.file": "Upload a CSV file",
  "exp.load.columns": "What each column means",
  "exp.load.columnsNote":
    "id identifies the stimulus and is repeated in the results; condition is what you will compare; text is what is shown or read aloud; audio is the name of the file you load below.",
  "exp.load.audio": "Audio files (optional)",
  "exp.load.audioNote":
    "Files are loaded in this browser and never uploaded. The name has to match the one in the audio column.",

  "exp.design.title": "2. Template and design",
  "exp.design.template": "Template",
  "exp.design.seed": "Seed",
  "exp.design.seedHint":
    "With the same seed and the same list the order is identical. Leave it empty to draw a new one; whichever is used is written into the CSV.",
  "exp.design.blocks": "Blocks",
  "exp.design.practice": "Practice trials",
  "exp.design.instructions": "Instructions",
  "exp.design.instructionsHint":
    "Shown before the task. You can write in any language: full Unicode is preserved, including accents, IPA symbols and right-to-left scripts.",
  "exp.design.instructionsReset": "Restore the template text",
  "exp.design.scale": "Scale endpoints (1 to 7)",
  "exp.design.scaleLeft": "Left endpoint",
  "exp.design.scaleRight": "Right endpoint",
  "exp.continueLabel": "Continue",
  "exp.lexical.word": "word",
  "exp.lexical.nonword": "nonword",

  "exp.template.acceptability": "Acceptability judgements (1 to 7)",
  "exp.template.acceptability.note":
    "Each stimulus is judged on a 1-to-7 scale. The condition is what gets compared and the recorded response is the chosen number.",
  "exp.instructions.acceptability":
    "You will see one sentence at a time and judge how natural it sounds in your variety of the language.\n1 = not natural at all, 7 = completely natural.\nThere are no right answers: answer with your first impression.\nPress “Continue” to start.",
  "exp.template.two-afc": "Forced choice between two options (2AFC)",
  "exp.template.two-afc.note":
    "Write both alternatives in the text column separated by a vertical bar: “perro|pero”. If the stimulus has audio, it is played and the two alternatives appear as buttons.",
  "exp.instructions.two-afc":
    "You will hear or read a stimulus and choose between two options.\nPick the one you perceived, even if you are not sure.\nPress “Continue” to start.",
  "exp.template.self-paced-reading": "Self-paced reading, word by word",
  "exp.template.self-paced-reading.note":
    "Each stimulus is split on spaces and shown one word at a time. The space bar moves on, and each word's time is what gets recorded: one row per word.",
  "exp.instructions.self-paced-reading":
    "You will read sentences word by word.\nPress the space bar to see the next word and read at your own pace, naturally.\nPress “Continue” to start.",
  "exp.template.lexical-decision": "Lexical decision with reaction times",
  "exp.template.lexical-decision.note":
    "A stimulus is shown and you answer whether it is a word or not with the F and J keys. The tool does not score the answer: the condition in your list is what says which one was expected.",
  "exp.instructions.lexical-decision":
    "You will see stimuli one at a time.\nPress F if it is a word of the language and J if it is not.\nAnswer as fast as you can without making mistakes.\nPress “Continue” to start.",

  "exp.preview.title": "3. Preview",
  "exp.preview.note":
    "This is the order you get with this seed. Check it before running: it is exactly what the participant will see, practice trials included.",
  "exp.preview.refresh": "Refresh the preview",
  "exp.preview.order": "Order",
  "exp.preview.block": "Block",
  "exp.preview.condition": "Condition",
  "exp.preview.text": "Stimulus",
  "exp.preview.practice": "Practice",
  "exp.preview.spec": "Download the specification as JSON",
  "exp.preview.specNote":
    "The specification stores the list, the template, the seed and the design parameters; it is what lets you repeat the experiment later.",

  "exp.run.title": "4. Run",
  "exp.run.note":
    "The experiment takes over the page while it runs. When it ends, the CSV is downloaded from the results section.",
  "exp.run.fullscreen": "Run in full screen",
  "exp.run.start": "Run the experiment",
  "exp.run.abort": "Abort",
  "exp.run.stage": "Session running",

  "exp.results.title": "5. Results",
  "exp.results.note":
    "The CSV has one row per trial with the anonymous participant, the trial id, the condition, the response, the reaction time in milliseconds, the tool version and the seed.",
  "exp.results.download": "Download the results CSV",
  "exp.results.columns":
    "Responses are stored as a scale value (“1” to “7”), the chosen alternative (“perro”) or “word” / “nonword”, so the file does not depend on the language of the screen.",

  "exp.help.title": "How each template is built",
  "exp.help.twoafc":
    "2AFC: the text column holds both alternatives separated by “|” and the recorded response is the chosen alternative.",
  "exp.help.spr":
    "Self-paced reading: the response is empty and each word is a row with its own time, because adding them up would erase the measurement.",
  "exp.help.lexical":
    "Lexical decision: the answer is given with F (word) and J (nonword); “word” or “nonword” is recorded.",
  "exp.help.rt":
    "Times are rounded to milliseconds and counted from the moment the stimulus appears on screen.",

  "exp.status.ready": "Ready. Load the stimuli to start.",
  "exp.status.parsed": "{count} stimulus/stimuli in {conditions} condition(s).",
  "exp.status.running": "Session running: do not switch tabs or reload the page.",
  "exp.status.finished": "Finished: {count} trial(s) recorded. Download the CSV.",
  "exp.status.aborted": "The session was aborted and nothing was saved.",
  "exp.status.spec": "Specification downloaded: it is the file that lets you repeat this experiment.",
  "exp.status.error": "Could not run: {detail}",
  "exp.preview.empty": "There are no trials to show yet.",
  "exp.preview.count": "{total} trial(s): {practice} practice and {main} from the task.",
  "exp.audio.loaded": "{count} audio file(s) loaded in this browser.",
  "exp.participant": "Anonymous participant for this session: {id}.",
  "exp.fullscreen.denied":
    "The browser refused full screen; the experiment continues on the page.",
  "exp.error.empty": "Paste the list or upload a CSV file before continuing.",
  "exp.error.csv": "Could not read the list: {detail}",
  "exp.error.csvLine": "Could not read the list (line {line}): {detail}",
  "exp.error.audioMissing": "The list mentions the audio “{file}” and it is not loaded.",
  "exp.error.seed": "The seed has to be an integer greater than or equal to zero.",
  "exp.error.blocks": "The number of blocks has to be an integer greater than zero.",
  "exp.error.practice":
    "Practice trials cannot be negative or take up the whole list.",
  "exp.error.runner": "This browser could not load the experiment runner.",
  "exp.error.spec": "The specification is not valid: {detail}",
} as const;
