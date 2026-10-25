/* ============================================================
   LinguaLab — controlador del constructor de experimentos

   Une las piezas: el CSV y el plan salen del nucleo (`@lingualab/core`), el
   experimento lo ejecuta un adaptador que esta pantalla NO conoce —lo recibe
   como funcion— y aqui solo se decide que se muestra y cuando.

   NADA SALE DEL EQUIPO

   Los estimulos se pegan o se leen de un archivo local, los audios se cargan con
   `URL.createObjectURL` y la unica salida son los archivos que la persona
   descarga. No hay `fetch`, ni `FormData`, ni ningun destino remoto.

   TODO EL DOM SE CONSTRUYE CON NODOS

   Ni una sola cadena de HTML: el texto de los estimulos viene de un CSV que pego
   una persona y de ahi sale tambien hacia jsPsych, que lo recibe escapado por el
   adaptador. `innerHTML` no aparece en este archivo ni en los que lo acompanan.

   LO QUE ESTA PANTALLA NO PROMETE

   Que los milisegundos sean de laboratorio: los tiempos de reaccion dependen del
   navegador y del equipo, y la pagina lo dice antes de ejecutar. Tampoco evalua
   las respuestas de la decision lexica: registra lo que la persona respondio.
   ============================================================ */

import {
  type ExperimentKind,
  type ExperimentResults,
  type ExperimentSpec,
  type ExperimentTrialPlan,
  err,
  generateExperimentTrials,
  ok,
  type Result,
} from "@lingualab/core";
import { downloadText, toFileName } from "../audio/files";
import { parseStimulusCsv, type StimulusRow } from "./csv";
import { renderPreview } from "./preview";
import { buildResultsCsv, createParticipantId, seedFrom } from "./results";
import type { CreateExperimentRunner, ExperimentRunnerHandle } from "./runner";
import { format, type ExperimentsStrings } from "./strings";
import { buildExperimentSpec, DEFAULT_TEMPLATE, TEMPLATES } from "./templates";

export interface ExperimentsLabOptions {
  readonly strings: ExperimentsStrings;
  /** Texto de instrucciones por defecto de cada plantilla, ya traducido. */
  readonly defaults: Readonly<Record<ExperimentKind, string>>;
  readonly toolVersion: string;
  readonly createRunner: CreateExperimentRunner;
}

type StatusState = "idle" | "ok" | "warn" | "error";

interface Prepared {
  readonly spec: ExperimentSpec;
  readonly plan: ExperimentTrialPlan;
}

const element = <T extends Element>(root: ParentNode, selector: string): T => {
  const node = root.querySelector<T>(selector);
  if (node === null) {
    throw new Error(`falta el gancho ${selector}`);
  }
  return node;
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Monta el constructor sobre el marcado de `ExperimentsLab.astro`.
 *
 * Lanza si falta un gancho: `safeInit` contiene el fallo y lo nombra en la
 * consola, que es mejor que una pantalla a medio cablear sin sintomas.
 */
export const initExperimentsLab = (options: ExperimentsLabOptions): void => {
  const root = document.querySelector<HTMLElement>("[data-explab]");
  if (root === null) {
    return;
  }

  const strings = options.strings;
  const stimuli = element<HTMLTextAreaElement>(root, "[data-explab-stimuli]");
  const fileInput = element<HTMLInputElement>(root, "[data-explab-file]");
  const audioInput = element<HTMLInputElement>(root, "[data-explab-audio]");
  const status = element<HTMLElement>(root, "[data-explab-status]");
  const seedInput = element<HTMLInputElement>(root, "[data-explab-seed]");
  const blocksInput = element<HTMLInputElement>(root, "[data-explab-blocks]");
  const practiceInput = element<HTMLInputElement>(root, "[data-explab-practice]");
  const instructions = element<HTMLTextAreaElement>(root, "[data-explab-instructions]");
  const instructionsReset = element<HTMLButtonElement>(root, "[data-explab-instructions-reset]");
  const scaleLeft = element<HTMLInputElement>(root, "[data-explab-scale-left]");
  const scaleRight = element<HTMLInputElement>(root, "[data-explab-scale-right]");
  const previewButton = element<HTMLButtonElement>(root, "[data-explab-preview]");
  const previewBody = element<HTMLElement>(root, "[data-explab-preview-body]");
  const previewCount = element<HTMLElement>(root, "[data-explab-preview-count]");
  const specButton = element<HTMLButtonElement>(root, "[data-explab-spec]");
  const fullscreen = element<HTMLInputElement>(root, "[data-explab-fullscreen]");
  const runButton = element<HTMLButtonElement>(root, "[data-explab-run]");
  const abortButton = element<HTMLButtonElement>(root, "[data-explab-abort]");
  const stage = element<HTMLElement>(root, "[data-explab-stage]");
  const participantLine = element<HTMLElement>(root, "[data-explab-participant]");
  const downloadButton = element<HTMLButtonElement>(root, "[data-explab-download]");
  const templates = [...root.querySelectorAll<HTMLInputElement>('input[name="exp-template"]')];

  let audioUrls = new Map<string, string>();
  let results: ExperimentResults | null = null;
  let running = false;
  let abortRun: (() => void) | null = null;
  let kind = readKind();
  let appliedDefault = options.defaults[kind];

  const say = (text: string, state: StatusState): void => {
    status.textContent = text;
    status.dataset.state = state;
  };

  const resolveAudio = (file: string): string | undefined => audioUrls.get(file.toLowerCase());

  /** La plantilla marcada; si no hay ninguna valida, la de por defecto. */
  function readKind(): ExperimentKind {
    const checked = templates.find((radio) => radio.checked);
    return TEMPLATES.find((template) => template.kind === checked?.value)?.kind ?? DEFAULT_TEMPLATE;
  }

  const applyDefaultInstructions = (force: boolean): void => {
    const next = options.defaults[kind];
    if (force || instructions.value === appliedDefault || instructions.value.trim() === "") {
      instructions.value = next;
    }
    appliedDefault = next;
  };

  /** Lee la lista pegada o subida y traduce el error a una frase de la pagina. */
  const readStimuli = (): Result<readonly StimulusRow[], string> => {
    if (stimuli.value.trim() === "") {
      return err(strings.text("exp.error.empty"));
    }

    const parsed = parseStimulusCsv(stimuli.value);
    if (parsed.ok) {
      return parsed;
    }
    if (parsed.error.code === "empty") {
      return err(strings.text("exp.error.empty"));
    }
    const detail = parsed.error.detail;
    return err(
      parsed.error.line > 0
        ? format(strings.text("exp.error.csvLine"), { line: parsed.error.line, detail })
        : format(strings.text("exp.error.csv"), { detail }),
    );
  };

  /**
   * Lee la semilla del formulario y la deja escrita en el campo.
   *
   * Si estaba vacia se sortea una, y esa misma es la que se ve en la vista previa
   * y la que viaja al CSV: sortear una distinta en cada paso haria que el orden
   * que se reviso no fuera el que se ejecuta.
   */
  const readSeed = (): Result<number, string> => {
    const raw = seedInput.value.trim();
    if (raw !== "" && !/^\d+$/.test(raw)) {
      return err(strings.text("exp.error.seed"));
    }
    const seed = seedFrom(raw);
    seedInput.value = String(seed);
    return ok(seed);
  };

  const readCount = (
    input: HTMLInputElement,
    minimum: number,
    message: string,
  ): Result<number, string> => {
    const value = Number.parseInt(input.value, 10);
    if (!Number.isInteger(value) || value < minimum) {
      return err(message);
    }
    return ok(value);
  };

  /** El primer audio que la lista menciona y que no se cargo. */
  const missingAudio = (items: readonly StimulusRow[]): string | undefined =>
    items.find((item) => item.audioFile !== undefined && resolveAudio(item.audioFile) === undefined)
      ?.audioFile;

  /**
   * Lee el formulario y devuelve la especificacion y el plan, o el motivo para
   * no ejecutar. Es el unico camino: la vista previa, la exportacion y la
   * ejecucion usan el mismo, asi que no pueden discrepar.
   */
  const prepare = (): Result<Prepared, string> => {
    const items = readStimuli();
    if (!items.ok) {
      return items;
    }
    const seed = readSeed();
    if (!seed.ok) {
      return seed;
    }
    const blocks = readCount(blocksInput, 1, strings.text("exp.error.blocks"));
    if (!blocks.ok) {
      return blocks;
    }
    const practiceTrials = readCount(practiceInput, 0, strings.text("exp.error.practice"));
    if (!practiceTrials.ok) {
      return practiceTrials;
    }

    const audio = missingAudio(items.value);
    if (audio !== undefined) {
      return err(format(strings.text("exp.error.audioMissing"), { file: audio }));
    }

    const spec = buildExperimentSpec({
      kind,
      items: items.value,
      seed: seed.value,
      blocks: blocks.value,
      practiceTrials: practiceTrials.value,
      instructions: instructions.value,
      continueLabel: strings.text("exp.continueLabel"),
      scaleLeft: scaleLeft.value,
      scaleRight: scaleRight.value,
      wordLabel: strings.text("exp.lexical.word"),
      nonWordLabel: strings.text("exp.lexical.nonword"),
    });

    const plan = generateExperimentTrials(spec, {
      seed: seed.value,
      blocks: blocks.value,
      practiceTrials: practiceTrials.value,
    });
    if (!plan.ok) {
      return err(format(strings.text("exp.error.spec"), { detail: plan.error.detail ?? "" }));
    }

    return ok({ spec, plan: plan.value });
  };

  const showPreview = (prepared: Prepared): void => {
    previewCount.textContent = renderPreview(previewBody, prepared.plan, strings);
  };

  const clearPreview = (): void => {
    previewBody.replaceChildren();
    previewCount.textContent = strings.text("exp.preview.empty");
  };

  const refreshPreview = (): void => {
    const prepared = prepare();
    if (!prepared.ok) {
      clearPreview();
      say(prepared.error, "error");
      return;
    }
    showPreview(prepared.value);
    say(
      format(strings.text("exp.status.parsed"), {
        count: prepared.value.plan.mainCount,
        conditions: Object.keys(prepared.value.plan.conditionCounts).length,
      }),
      "ok",
    );
  };

  const setRunning = (active: boolean): void => {
    running = active;
    runButton.disabled = active;
    abortButton.hidden = !active;
    root.dataset.running = active ? "true" : "false";
  };

  const enterFullscreen = async (): Promise<boolean> => {
    if (document.fullscreenElement !== null) {
      return true;
    }
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  };

  const leaveFullscreen = async (): Promise<void> => {
    if (document.fullscreenElement === null) {
      return;
    }
    try {
      await document.exitFullscreen();
    } catch {
      // El navegador ya habia salido de pantalla completa: no hay nada que hacer.
    }
  };

  const describeFailure = (code: string, detail: string): string => {
    if (code === "aborted") {
      return strings.text("exp.status.aborted");
    }
    if (code === "spec-invalid") {
      return format(strings.text("exp.error.spec"), { detail });
    }
    return format(strings.text("exp.status.error"), { detail });
  };

  /** Una corrida completa: preparar el motor, ejecutar y recoger lo que salga. */
  const executeSession = async (
    prepared: Prepared,
    participantId: string,
  ): Promise<void> => {
    let handle: ExperimentRunnerHandle;
    try {
      handle = await options.createRunner({
        displayElement: stage,
        participantId,
        resolveAudio,
      });
    } catch (error) {
      // Cargar el motor puede fallar —un navegador viejo, una red que corta el
      // trozo bajo demanda— y eso no es lo mismo que un experimento que se cae a
      // la mitad: se dice cual de las dos cosas paso.
      say(`${strings.text("exp.error.runner")} ${describe(error)}`, "error");
      return;
    }

    try {
      abortRun = handle.abort;
      const outcome = await handle.runner.run(prepared.spec);

      if (!outcome.ok) {
        say(describeFailure(outcome.error.code, outcome.error.detail ?? ""), "warn");
        return;
      }
      results = outcome.value;
      downloadButton.disabled = false;
      say(
        format(strings.text("exp.status.finished"), { count: outcome.value.trials.length }),
        "ok",
      );
    } catch (error) {
      say(format(strings.text("exp.status.error"), { detail: describe(error) }), "error");
    } finally {
      abortRun = null;
    }
  };

  const run = async (): Promise<void> => {
    if (running) {
      return;
    }
    const prepared = prepare();
    if (!prepared.ok) {
      say(prepared.error, "error");
      return;
    }
    showPreview(prepared.value);

    const participantId = createParticipantId();
    participantLine.textContent = format(strings.text("exp.participant"), { id: participantId });
    results = null;
    downloadButton.disabled = true;

    setRunning(true);
    const wantsFullscreen = fullscreen.checked;
    const granted = wantsFullscreen ? await enterFullscreen() : true;
    // Solo se avisa del bloqueo cuando se pidio pantalla completa: si nadie la
    // pidio, decir que el navegador la nego seria inventar un problema.
    const fullscreenDenied = wantsFullscreen && !granted;
    say(
      fullscreenDenied
        ? `${strings.text("exp.status.running")} ${strings.text("exp.fullscreen.denied")}`
        : strings.text("exp.status.running"),
      fullscreenDenied ? "warn" : "idle",
    );

    await executeSession(prepared.value, participantId);
    setRunning(false);
    if (wantsFullscreen) {
      await leaveFullscreen();
    }
  };

  const abort = (): void => {
    if (abortRun === null) {
      return;
    }
    abortRun();
    say(strings.text("exp.status.aborted"), "warn");
  };

  const download = (): void => {
    if (results === null) {
      return;
    }
    const name = toFileName(`experimentos-${results.toolVersion}-${results.seed}`, "csv");
    downloadText(name, buildResultsCsv(results), "text/csv");
  };

  const exportSpec = (): void => {
    const prepared = prepare();
    if (!prepared.ok) {
      say(prepared.error, "error");
      return;
    }
    const seed = String(prepared.value.spec.parameters.seed ?? "0");
    const name = toFileName(`especificacion-${prepared.value.spec.kind}-${seed}`, "json");
    downloadText(name, `${JSON.stringify(prepared.value.spec, null, 2)}\n`, "application/json");
    say(strings.text("exp.status.spec"), "ok");
  };

  const readStimulusFile = async (file: File): Promise<void> => {
    try {
      stimuli.value = await file.text();
      refreshPreview();
    } catch (error) {
      say(format(strings.text("exp.status.error"), { detail: describe(error) }), "error");
    }
  };

  const loadAudio = (files: readonly File[]): void => {
    for (const url of audioUrls.values()) {
      URL.revokeObjectURL(url);
    }
    audioUrls = new Map<string, string>();
    for (const file of files) {
      audioUrls.set(file.name.toLowerCase(), URL.createObjectURL(file));
    }
    say(format(strings.text("exp.audio.loaded"), { count: audioUrls.size }), "ok");
  };

  const showTemplateNotes = (): void => {
    for (const note of root.querySelectorAll<HTMLElement>("[data-explab-note]")) {
      note.hidden = note.dataset.explabNote !== kind;
    }
  };

  /* ------------------------------ eventos ------------------------------ */

  for (const radio of templates) {
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }
      kind = readKind();
      showTemplateNotes();
      applyDefaultInstructions(false);
      refreshPreview();
    });
  }

  previewButton.addEventListener("click", refreshPreview);
  instructionsReset.addEventListener("click", () => applyDefaultInstructions(true));
  runButton.addEventListener("click", () => void run());
  abortButton.addEventListener("click", abort);
  downloadButton.addEventListener("click", download);
  specButton.addEventListener("click", exportSpec);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file !== undefined) {
      void readStimulusFile(file);
    }
    // Permite volver a elegir el mismo archivo: sin esto, el segundo intento no
    // dispara `change` y parece que la pagina se quedo colgada.
    fileInput.value = "";
  });

  audioInput.addEventListener("change", () => {
    loadAudio([...(audioInput.files ?? [])]);
  });

  for (const input of [seedInput, blocksInput, practiceInput, scaleLeft, scaleRight]) {
    input.addEventListener("change", refreshPreview);
  }

  let debounce: ReturnType<typeof setTimeout> | undefined;
  stimuli.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(refreshPreview, 250);
  });

  /* ------------------------------ arranque ---------------------------- */

  showTemplateNotes();
  instructions.value = appliedDefault;
  clearPreview();
  say(strings.text("exp.status.ready"), "idle");
};
