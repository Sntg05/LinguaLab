/**
 * De un plan de ensayos a una linea de tiempo declarativa.
 *
 * POR QUE ESTA CAPA EXISTE Y NO CONSTRUYE OBJETOS DE JSSYCH
 *
 * jsPsych toca `window` al importarse, asi que nada que lo importe se puede
 * probar en Node. Esta capa produce una descripcion plana —plugin, texto,
 * opciones, datos— que se puede comparar en una prueba y que el motor real
 * traduce a ensayos de jsPsych. Todo lo que hay que DECIDIR (que plantilla usa
 * que plugin, cuantas opciones tiene una escala, que se registra como respuesta)
 * se decide aqui, donde se puede medir.
 *
 * EL TEXTO SE ESCAPA
 *
 * jsPsych dibuja `stimulus`, `prompt` y `pages` con `innerHTML`. El texto de un
 * estimulo viene de un CSV que pego una persona, asi que no es de confianza:
 * se escapa una sola vez, aqui, y no en cada plugin. Sin esto, un `<img onerror>`
 * en una celda del CSV seria contenido ejecutable en la pagina del experimento.
 */
import type {
  ExperimentError,
  ExperimentSpec,
  ExperimentTrialPlan,
  GeneratedTrial,
} from "@lingualab/core";
import { err, ok, type Result } from "@lingualab/core";

/** Los plugins que el motor real sabe instanciar. */
export type PlannedPlugin =
  | "instructions"
  | "survey-likert"
  | "html-button"
  | "html-keyboard"
  | "audio-button"
  | "audio-keyboard";

/** Un ensayo resuelto, sin nada que sepa de jsPsych ni del DOM. */
export interface PlannedTrial {
  readonly plugin: PlannedPlugin;
  /** Texto del estimulo, ya escapado. */
  readonly stimulus: string;
  /** Paginas de la pantalla de instrucciones. */
  readonly pages?: readonly string[];
  /** Etiquetas de la escala Likert (indice 0 = valor 1). */
  readonly labels?: readonly string[];
  /** Botones visibles. */
  readonly choices?: readonly string[];
  /** Teclas aceptadas, en el mismo orden que `responseTokens`. */
  readonly keys?: readonly string[];
  /**
   * Lo que se registra como respuesta para cada opcion, en orden: el valor de la
   * escala, la alternativa elegida o `word`/`nonword`. Guardar la tecla o el
   * indice del boton ataria el CSV a los detalles de la pantalla.
   */
  readonly responseTokens?: readonly string[];
  readonly audioUrl?: string;
  readonly buttonLabel?: string;
  /** Enunciado que acompana al estimulo (por ejemplo, la asignacion de teclas). */
  readonly prompt?: string;
  /** Datos que viajan a la fila de resultados de jsPsych. */
  readonly data: Readonly<Record<string, string | number>>;
}

/** Los parametros del diseno, ya leidos de la especificacion. */
export interface ExperimentDesign {
  readonly seed: number;
  readonly blocks: number;
  readonly practiceTrials: number;
  readonly instructions: string;
  readonly continueLabel: string;
  readonly scaleLeft: string;
  readonly scaleRight: string;
  readonly wordKey: string;
  readonly nonWordKey: string;
  readonly wordLabel: string;
  readonly nonWordLabel: string;
}

/** Valores por defecto neutrales: la interfaz siempre los manda traducidos. */
export const DEFAULT_DESIGN: Omit<ExperimentDesign, "seed"> = {
  blocks: 1,
  practiceTrials: 0,
  instructions: "",
  continueLabel: "Continue",
  scaleLeft: "",
  scaleRight: "",
  wordKey: "f",
  nonWordKey: "j",
  wordLabel: "word",
  nonWordLabel: "nonword",
};

/** Los parametros numericos del diseno. */
const NUMBER_KEYS = ["blocks", "practiceTrials"] as const;

/** Los parametros de texto del diseno, incluidos los que la interfaz traduce. */
const STRING_KEYS = [
  "instructions",
  "continueLabel",
  "scaleLeft",
  "scaleRight",
  "wordKey",
  "nonWordKey",
  "wordLabel",
  "nonWordLabel",
] as const;

/** Ancho de la escala de aceptabilidad: 1 a 7, la de la plantilla del prompt. */
export const LIKERT_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

const invalid = (detail: string): Result<never, ExperimentError> =>
  err({ code: "spec-invalid", detail });

/**
 * Escapa lo que jsPsych va a interpretar como HTML.
 *
 * Se implementa aqui en vez de importar `src/scripts/core/guardrails` porque el
 * adaptador no conoce la interfaz: la direccion de dependencia va hacia adentro,
 * y un adaptador que importa `src` invertiria el hexagono.
 */
export const escapeMarkup = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const readString = (
  parameters: ExperimentSpec["parameters"],
  key: string,
  fallback: string,
): Result<string, ExperimentError> => {
  const value = parameters[key];
  if (value === undefined) {
    return ok(fallback);
  }
  if (typeof value !== "string") {
    return invalid(`el parametro «${key}» tiene que ser texto`);
  }
  return ok(value);
};

const readInteger = (
  parameters: ExperimentSpec["parameters"],
  key: string,
  fallback: number,
): Result<number, ExperimentError> => {
  const value = parameters[key];
  if (value === undefined) {
    return ok(fallback);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid(`el parametro «${key}» tiene que ser un numero`);
  }
  return ok(value);
};

const readSeed = (
  parameters: ExperimentSpec["parameters"],
  fallback: number,
): Result<number, ExperimentError> => {
  const value = parameters.seed;
  if (value === undefined) {
    return ok(fallback);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid("la semilla de la especificacion tiene que ser un numero finito");
  }
  return ok(value);
};

/**
 * Lee los parametros del diseno, con valores por defecto y errores nombrados.
 *
 * Devuelve `Result` y no lanza: un parametro con el tipo equivocado es una
 * especificacion mal escrita, y el mensaje dice cual para que se pueda corregir
 * sin leer el codigo.
 */
export const readExperimentDesign = (
  spec: ExperimentSpec,
  fallbackSeed: number,
): Result<ExperimentDesign, ExperimentError> => {
  const seed = readSeed(spec.parameters, fallbackSeed);
  if (!seed.ok) {
    return seed;
  }

  // Se parte de los valores por defecto y se sobreescribe solo lo que la
  // especificacion trae: asi una especificacion vieja, sin un parametro nuevo,
  // sigue abriendo en vez de fallar por una clave que entonces no existia.
  const design = { ...DEFAULT_DESIGN, seed: seed.value };

  for (const key of NUMBER_KEYS) {
    const value = readInteger(spec.parameters, key, design[key]);
    if (!value.ok) {
      return value;
    }
    design[key] = value.value;
  }

  for (const key of STRING_KEYS) {
    const value = readString(spec.parameters, key, design[key]);
    if (!value.ok) {
      return value;
    }
    design[key] = value.value;
  }

  return ok(design);
};

/** Una etiqueta por valor de la escala; las anclas van donde se leen. */
const likertLabels = (design: ExperimentDesign): string[] =>
  LIKERT_VALUES.map((value) => {
    const anchor = value === 1 ? design.scaleLeft : value === 7 ? design.scaleRight : "";
    return anchor === "" ? String(value) : `${value} · ${escapeMarkup(anchor)}`;
  });

const stageOf = (trial: GeneratedTrial): string => (trial.practice ? "practice" : "main");

const trialData = (trial: GeneratedTrial, trialId: string): Record<string, string | number> => ({
  trialId,
  condition: trial.condition,
  stage: stageOf(trial),
  block: trial.block,
});

interface AudioResolution {
  readonly audioUrl?: string;
}

const resolveAudio = (
  trial: GeneratedTrial,
  resolver: ((file: string) => string | undefined) | undefined,
): Result<AudioResolution, ExperimentError> => {
  const file = trial.audioFile;
  if (file === undefined) {
    return ok({});
  }
  if (resolver === undefined) {
    return invalid(
      `el estimulo «${trial.itemId}» pide el audio «${file}» y la interfaz no cargo ningun audio`,
    );
  }
  const url = resolver(file);
  if (url === undefined || url === "") {
    return invalid(`la interfaz no encontro el audio «${file}» del estimulo «${trial.itemId}»`);
  }
  return ok({ audioUrl: url });
};

/** Las plantillas que no pueden reproducir audio lo dicen en vez de ignorarlo. */
const rejectAudio = (trial: GeneratedTrial, kind: string): Result<true, ExperimentError> =>
  trial.audioFile === undefined
    ? ok(true)
    : invalid(`la plantilla «${kind}» no reproduce audio y «${trial.itemId}» declara uno`);

const buildAcceptability = (
  trial: GeneratedTrial,
  design: ExperimentDesign,
): Result<readonly PlannedTrial[], ExperimentError> => {
  const allowed = rejectAudio(trial, "acceptability");
  if (!allowed.ok) {
    return allowed;
  }
  return ok([
    {
      plugin: "survey-likert",
      stimulus: escapeMarkup(trial.text),
      labels: likertLabels(design),
      responseTokens: LIKERT_VALUES.map(String),
      buttonLabel: design.continueLabel,
      data: trialData(trial, trial.itemId),
    },
  ]);
};

const splitAlternatives = (trial: GeneratedTrial): Result<readonly string[], ExperimentError> => {
  const parts = trial.text.split("|").map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === "")) {
    return invalid(
      `el 2AFC necesita dos alternativas separadas por «|» en el texto, y «${trial.itemId}» no las tiene`,
    );
  }
  return ok(parts as readonly string[]);
};

const buildTwoAfc = (
  trial: GeneratedTrial,
  resolver: ((file: string) => string | undefined) | undefined,
): Result<readonly PlannedTrial[], ExperimentError> => {
  const alternatives = splitAlternatives(trial);
  if (!alternatives.ok) {
    return alternatives;
  }
  const audio = resolveAudio(trial, resolver);
  if (!audio.ok) {
    return audio;
  }
  const escaped = alternatives.value.map(escapeMarkup);
  return ok([
    {
      plugin: audio.value.audioUrl === undefined ? "html-button" : "audio-button",
      stimulus: escaped.join(" — "),
      choices: escaped,
      responseTokens: alternatives.value,
      ...(audio.value.audioUrl === undefined ? {} : { audioUrl: audio.value.audioUrl }),
      data: trialData(trial, trial.itemId),
    },
  ]);
};

const buildSelfPacedReading = (
  trial: GeneratedTrial,
): Result<readonly PlannedTrial[], ExperimentError> => {
  const allowed = rejectAudio(trial, "self-paced-reading");
  if (!allowed.ok) {
    return allowed;
  }
  const words = trial.text
    .trim()
    .split(/\s+/u)
    .filter((word) => word !== "");
  if (words.length === 0) {
    return invalid(`el estimulo «${trial.itemId}» no tiene palabras para leer`);
  }
  return ok(
    words.map((word, index) => ({
      plugin: "html-keyboard" as const,
      stimulus: escapeMarkup(word),
      keys: [" "] as readonly string[],
      responseTokens: [""] as readonly string[],
      // Un ensayo por palabra: el tiempo de cada una es el dato que se analiza,
      // y sumarlas en una sola fila lo borraria.
      data: { ...trialData(trial, `${trial.itemId}#${index + 1}`), word: index + 1 },
    })),
  );
};

const checkLexicalKeys = (design: ExperimentDesign): Result<true, ExperimentError> => {
  const keys = [design.wordKey, design.nonWordKey];
  if (keys.some((key) => key.length !== 1 || key.trim() === "")) {
    return invalid("las teclas de la decision lexica tienen que ser un caracter cada una");
  }
  if (design.wordKey === design.nonWordKey) {
    return invalid("las dos teclas de la decision lexica no pueden ser la misma");
  }
  return ok(true);
};

const buildLexicalDecision = (
  trial: GeneratedTrial,
  design: ExperimentDesign,
  resolver: ((file: string) => string | undefined) | undefined,
): Result<readonly PlannedTrial[], ExperimentError> => {
  const keys = checkLexicalKeys(design);
  if (!keys.ok) {
    return keys;
  }
  const audio = resolveAudio(trial, resolver);
  if (!audio.ok) {
    return audio;
  }
  return ok([
    {
      plugin: audio.value.audioUrl === undefined ? "html-keyboard" : "audio-keyboard",
      stimulus: escapeMarkup(trial.text),
      keys: [design.wordKey, design.nonWordKey],
      responseTokens: ["word", "nonword"],
      prompt: `${design.wordKey} = ${escapeMarkup(design.wordLabel)} · ${design.nonWordKey} = ${escapeMarkup(design.nonWordLabel)}`,
      ...(audio.value.audioUrl === undefined ? {} : { audioUrl: audio.value.audioUrl }),
      data: trialData(trial, trial.itemId),
    },
  ]);
};

export interface BuildTimelineInput {
  readonly spec: ExperimentSpec;
  readonly plan: ExperimentTrialPlan;
  readonly design: ExperimentDesign;
  /** Traduce el nombre de archivo de la columna `audio` a una URL local. */
  readonly resolveAudio?: (file: string) => string | undefined;
}

/**
 * Construye la linea de tiempo completa: instrucciones (si las hay) y ensayos.
 *
 * Los ensayos de practica se marcan en los datos en vez de en un bloque aparte:
 * jsPsych recibe una sola lista y el CSV de resultados necesita poder distinguir
 * lo que se analiza de lo que solo servia para aprender la tarea.
 */
export const buildTimeline = (
  input: BuildTimelineInput,
): Result<readonly PlannedTrial[], ExperimentError> => {
  const { spec, plan, design, resolveAudio: resolver } = input;
  const planned: PlannedTrial[] = [];

  if (design.instructions.trim() !== "") {
    planned.push({
      plugin: "instructions",
      stimulus: "",
      pages: [escapeMarkup(design.instructions)],
      buttonLabel: design.continueLabel,
      data: { stage: "instructions" },
    });
  }

  for (const trial of plan.trials) {
    const built =
      spec.kind === "acceptability"
        ? buildAcceptability(trial, design)
        : spec.kind === "two-afc"
          ? buildTwoAfc(trial, resolver)
          : spec.kind === "self-paced-reading"
            ? buildSelfPacedReading(trial)
            : buildLexicalDecision(trial, design, resolver);
    if (!built.ok) {
      return built;
    }
    planned.push(...built.value);
  }

  return ok(planned);
};
