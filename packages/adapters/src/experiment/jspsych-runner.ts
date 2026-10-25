/**
 * Adaptador del puerto `ExperimentRunnerPort` sobre jsPsych.
 *
 * QUE HACE ESTE ARCHIVO Y QUE DEJA AL MOTOR
 *
 * Aqui se decide todo lo que se puede probar sin navegador: leer los parametros
 * del diseno, generar el plan con semilla, construir la linea de tiempo y
 * convertir las filas que devuelve jsPsych en ensayos del puerto. El motor real
 * (`jspsych-engine.ts`) solo traduce `PlannedTrial` a objetos de jsPsych, y por
 * eso es lo unico que no tiene prueba unitaria: `jspsych` toca `window` al
 * importarse.
 *
 * POR QUE EL MOTOR SE INYECTA
 *
 * Un adaptador que se construye a si mismo su dependencia no se puede probar sin
 * esa dependencia. Con la fabrica inyectada, la suite de contrato corre contra
 * un doble y la interfaz cablea el motor real en un solo sitio.
 *
 * POR QUE LA RESPUESTA SE TRADUCE A UN TOKEN
 *
 * jsPsych devuelve la tecla pulsada o el indice del boton. Eso ata el CSV a los
 * detalles de la pantalla: cambiar el orden de dos botones reescribiria el
 * significado de las respuestas ya recogidas. El adaptador guarda lo que la
 * respuesta SIGNIFICA —el valor de la escala, la alternativa elegida,
 * `word`/`nonword`— y deja la pantalla libre para cambiar.
 */
import {
  type ExperimentError,
  type ExperimentResults,
  type ExperimentSpec,
  type ExperimentTrial,
  type ExperimentRunnerPort,
  generateExperimentTrials,
  ok,
  err,
  type Result,
} from "@lingualab/core";
import {
  buildTimeline,
  type ExperimentDesign,
  type PlannedTrial,
  readExperimentDesign,
} from "./timeline";

/** Una fila tal como la entrega jsPsych: sus datos, `rt` y `response`. */
export interface EngineTrialRow {
  readonly [key: string]: unknown;
}

export interface EngineRunResult {
  readonly rows: readonly EngineTrialRow[];
  /**
   * `true` si la sesion se corto antes de terminar. Una sesion interrumpida no
   * produce archivo: media curva de respuestas es peor que ninguna, porque se
   * analiza como si estuviera completa.
   */
  readonly aborted: boolean;
}

/** Lo que el adaptador necesita de jsPsych: ejecutar una linea de tiempo. */
export interface ExperimentEngine {
  run(trials: readonly PlannedTrial[]): Promise<EngineRunResult>;
  abort(): void;
}

/** Fabrica de motores; se llama una vez por corrida para no reusar el estado. */
export type ExperimentEngineFactory = () => ExperimentEngine;

export interface CreateExperimentRunnerOptions {
  readonly createEngine: ExperimentEngineFactory;
  /** Version que se escribe en cada fila, para poder citar con que se genero. */
  readonly toolVersion: string;
  /** Identificador anonimo local del participante; cadena vacia si no se dio. */
  readonly participantId?: string;
  /** Fuente de semilla cuando la especificacion no trae una. */
  readonly seed?: () => number;
  /** Nombre de archivo de la columna `audio` -> URL local (blob) ya cargada. */
  readonly resolveAudio?: (file: string) => string | undefined;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff);

/**
 * Traduce la respuesta cruda del motor al token que se guarda.
 *
 * Los tres plugins devuelven formas distintas y conocidas: un indice de boton,
 * una tecla o un objeto por pregunta. No se adivina: si la forma no es ninguna
 * de las tres, se guarda la respuesta cruda en vez de inventar un valor.
 */
const responseToken = (planned: PlannedTrial, raw: unknown): string => {
  const tokens = planned.responseTokens ?? [];
  if (raw === undefined || raw === null || raw === "") {
    return "";
  }

  let index = -1;
  if (typeof raw === "number") {
    index = Number.isInteger(raw) ? raw : -1;
  } else if (typeof raw === "string") {
    const options = planned.keys ?? planned.choices ?? [];
    index = options.indexOf(raw);
  } else if (typeof raw === "object") {
    const first = Object.values(raw as Record<string, unknown>)[0];
    index = typeof first === "number" && Number.isInteger(first) ? first : -1;
  }

  const token = index >= 0 ? tokens[index] : undefined;
  return token ?? (typeof raw === "string" ? raw : "");
};

const reactionTime = (row: EngineTrialRow): number => {
  const value = row.rt;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    // Un ensayo sin `rt` no tiene tiempo de reaccion medido; cero es el unico
    // valor honesto y se ve en el CSV, mientras que un NaN rompe el analisis.
    return 0;
  }
  return Math.max(0, Math.round(value));
};

const plannedById = (timeline: readonly PlannedTrial[]): Map<string, PlannedTrial> => {
  const byId = new Map<string, PlannedTrial>();
  for (const planned of timeline) {
    const id = planned.data.trialId;
    if (typeof id === "string") {
      byId.set(id, planned);
    }
  }
  return byId;
};

/**
 * Convierte las filas del motor en ensayos del puerto.
 *
 * Las filas sin `trialId` son las pantallas de instrucciones: no son ensayos y
 * no entran al CSV.
 */
const toTrials = (
  rows: readonly EngineTrialRow[],
  timeline: readonly PlannedTrial[],
  participantId: string,
  seed: number,
  toolVersion: string,
): ExperimentTrial[] => {
  const byId = plannedById(timeline);
  const trials: ExperimentTrial[] = [];

  for (const row of rows) {
    const trialId = row.trialId;
    if (typeof trialId !== "string") {
      continue;
    }
    const planned = byId.get(trialId);
    if (planned === undefined) {
      continue;
    }
    const condition = planned.data.condition;
    trials.push({
      participantId,
      trialId,
      condition: typeof condition === "string" ? condition : "",
      response: responseToken(planned, row.response),
      reactionTimeMs: reactionTime(row),
      toolVersion,
      seed,
    });
  }

  return trials;
};

/**
 * Crea el adaptador. La semilla de la especificacion manda; si no hay, se pide a
 * la fuente inyectada y se registra en los resultados, porque un orden sin
 * semilla no se puede reproducir.
 */
export const createJsPsychExperimentRunner = (
  options: CreateExperimentRunnerOptions,
): ExperimentRunnerPort => {
  const participantId = options.participantId ?? "";
  const nextSeed = options.seed ?? randomSeed;

  const execute = async (
    spec: ExperimentSpec,
  ): Promise<Result<ExperimentResults, ExperimentError>> => {
    const design = readExperimentDesign(spec, nextSeed());
    if (!design.ok) {
      return design;
    }

    const plan = generateExperimentTrials(spec, {
      seed: design.value.seed,
      blocks: design.value.blocks,
      practiceTrials: design.value.practiceTrials,
    });
    if (!plan.ok) {
      return plan;
    }

    const timeline = buildTimeline({
      spec,
      plan: plan.value,
      design: design.value,
      ...(options.resolveAudio === undefined ? {} : { resolveAudio: options.resolveAudio }),
    });
    if (!timeline.ok) {
      return timeline;
    }

    const engine = options.createEngine();
    let outcome: EngineRunResult;
    try {
      outcome = await engine.run(timeline.value);
    } catch (error) {
      return err({ code: "runtime-failed", detail: describe(error) });
    }

    if (outcome.aborted) {
      return err({ code: "aborted", detail: "la sesion se interrumpio antes de terminar" });
    }

    const trials = toTrials(
      outcome.rows,
      timeline.value,
      participantId,
      design.value.seed,
      options.toolVersion,
    );
    return ok({ trials, seed: design.value.seed, toolVersion: options.toolVersion });
  };

  return { run: execute };
};

/** Reexportado para que la interfaz no tenga que importar dos modulos. */
export type { ExperimentDesign, PlannedTrial };
