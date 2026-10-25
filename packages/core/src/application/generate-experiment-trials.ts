/**
 * Generador de ensayos de un experimento, con semilla reproducible.
 *
 * POR QUE ESTA AQUI Y NO EN EL ADAPTADOR DE JSSYCH
 *
 * El orden de presentacion es el corazon metodologico de un experimento: si dos
 * participantes ven disenos distintos sin que nadie lo sepa, la comparacion no
 * significa nada. Ese orden no depende de la libreria que dibuja las pantallas,
 * asi que vive en el nucleo, se prueba en Node y no sabe nada de jsPsych ni del
 * DOM. El adaptador recibe este plan ya resuelto y solo lo traduce a ensayos.
 *
 * POR QUE UN PRNG PROPIO Y NO `Math.random`
 *
 * `Math.random` no se puede sembrar. Con el, «reproducible» seria una promesa
 * sin forma de comprobarla. `mulberry32` son cuatro lineas de aritmetica de
 * enteros de 32 bits: la misma semilla da la misma secuencia en cualquier motor
 * de JavaScript, hoy y dentro de cinco anos, y no anade una dependencia.
 *
 * QUE DECIDE ESTE MODULO, Y POR QUE
 *
 * 1. **Practica.** Los ensayos de practica se TOMAN de la lista y no vuelven a
 *    aparecer en los bloques principales. Repetir el mismo estimulo en la
 *    practica y en la tarea ensena la respuesta antes de medirla. Como esa
 *    eleccion reduce el conjunto principal, el plan lo declara: `practiceCount`
 *    dice cuantos se reservaron y el conteo por condicion cuenta solo los
 *    ensayos reales, para que nadie lea un total que no cuadra.
 *
 * 2. **Bloques.** Se reparte la secuencia en bloques de tamano equilibrado (se
 *    diferencian como mucho en uno) y las condiciones se intercalan antes de
 *    cortar, para que el orden no consista en tandas de una sola condicion. Lo
 *    que este modulo NO promete es que cada bloque contenga todas las
 *    condiciones: con siete estimulos en tres bloques hay un bloque de un solo
 *    ensayo, y un bloque de un ensayo tiene la condicion que tiene.
 *
 * 3. **Semilla.** Se recibe como parametro y sale en el plan. Viene de los
 *    parametros del diseno (o de la aleatoriedad del navegador si no hay), pero
 *    este modulo no la inventa: una funcion pura que sortea numeros no se puede
 *    probar.
 */
import type { ExperimentItem, ExperimentSpec } from "../domain/experiment";
import type { ExperimentError } from "../ports/experiment-runner";
import { err, ok, type Result } from "../result";

/** Un ensayo con su lugar en la sesion. */
export interface GeneratedTrial {
  /** Posicion en el orden de presentacion, empezando en 1. */
  readonly index: number;
  readonly itemId: string;
  readonly condition: string;
  readonly text: string;
  readonly audioFile?: string;
  /** 0 para la practica; 1..n para los bloques que se analizan. */
  readonly block: number;
  readonly practice: boolean;
}

/** El diseno ya resuelto: que se presenta, en que orden y cuantas veces. */
export interface ExperimentTrialPlan {
  readonly seed: number;
  readonly trials: readonly GeneratedTrial[];
  /** Ensayos reservados a la practica; no estan en ningun bloque real. */
  readonly practiceCount: number;
  /** Ensayos que se analizan (los que no son de practica). */
  readonly mainCount: number;
  readonly blockCount: number;
  /**
   * Ensayos por condicion, contando solo los reales. La practica queda fuera
   * porque su composicion es incidental y sumarla haria que el total no
   * coincidiera con los ensayos analizables.
   */
  readonly conditionCounts: Readonly<Record<string, number>>;
}

export interface GenerateExperimentTrialsOptions {
  readonly seed: number;
  /** Cantidad de bloques reales; 1 por defecto. */
  readonly blocks?: number;
  /** Ensayos de practica reservados de la lista; 0 por defecto. */
  readonly practiceTrials?: number;
}

const invalid = (detail: string): Result<never, ExperimentError> =>
  err({ code: "spec-invalid", detail });

/**
 * PRNG determinista de 32 bits (mulberry32).
 *
 * Devuelve un numero en [0, 1). La aritmetica es toda entera hasta la division
 * final, asi que no hay redondeos que dependan de la plataforma.
 */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher-Yates sobre una copia: la lista que entra no se toca. */
const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = out[index] as T;
    out[index] = out[target] as T;
    out[target] = current;
  }
  return out;
};

/** Agrupa conservando el orden de primera aparicion, que es lo que fija la semilla. */
const groupByCondition = (items: readonly ExperimentItem[]): ExperimentItem[][] => {
  const groups = new Map<string, ExperimentItem[]>();
  for (const item of items) {
    const group = groups.get(item.condition);
    if (group === undefined) {
      groups.set(item.condition, [item]);
    } else {
      group.push(item);
    }
  }
  return [...groups.values()];
};

/**
 * Encadena una vuelta por cada condicion hasta agotarlas: la secuencia alterna
 * condiciones en lugar de dejar bloques largos de una sola.
 */
const interleave = (groups: readonly ExperimentItem[][]): ExperimentItem[] => {
  const out: ExperimentItem[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let round = 0; round < longest; round += 1) {
    for (const group of groups) {
      const item = group[round];
      if (item !== undefined) {
        out.push(item);
      }
    }
  }
  return out;
};

/** Cortes de tamano equilibrado: los primeros bloques se llevan el sobrante. */
const splitIntoBlocks = <T>(values: readonly T[], blockCount: number): T[][] => {
  const base = Math.floor(values.length / blockCount);
  const extra = values.length % blockCount;
  const blocks: T[][] = [];
  let cursor = 0;
  for (let block = 0; block < blockCount; block += 1) {
    const size = base + (block < extra ? 1 : 0);
    blocks.push(values.slice(cursor, cursor + size));
    cursor += size;
  }
  return blocks;
};

const countByCondition = (trials: readonly GeneratedTrial[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const trial of trials) {
    if (trial.practice) {
      continue;
    }
    counts[trial.condition] = (counts[trial.condition] ?? 0) + 1;
  }
  return counts;
};

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0;

/**
 * Resuelve el orden completo de la sesion.
 *
 * Devuelve `Result` y no lanza: una lista vacia, dos items con el mismo `id` o
 * una practica que se come el experimento son entradas mal formadas, no
 * accidentes del entorno.
 */
export const generateExperimentTrials = (
  spec: ExperimentSpec,
  options: GenerateExperimentTrialsOptions,
): Result<ExperimentTrialPlan, ExperimentError> => {
  const { seed } = options;
  const blockCount = options.blocks ?? 1;
  const practiceCount = options.practiceTrials ?? 0;

  if (!Number.isFinite(seed)) {
    return invalid("la semilla tiene que ser un numero finito para poder reproducir el orden");
  }
  if (!isPositiveInteger(blockCount)) {
    return invalid("la cantidad de bloques tiene que ser un entero mayor que cero");
  }
  if (!isNonNegativeInteger(practiceCount)) {
    return invalid("la cantidad de ensayos de practica no puede ser negativa");
  }
  if (spec.items.length === 0) {
    return invalid("el experimento no tiene estimulos");
  }

  const seen = new Set<string>();
  for (const item of spec.items) {
    if (seen.has(item.id)) {
      // Un id repetido hace que la fila de resultados no se pueda atribuir a un
      // estimulo: el analisis se vuelve ambiguo y en silencio.
      return invalid(`el identificador «${item.id}» aparece en mas de un estimulo`);
    }
    seen.add(item.id);
  }

  if (practiceCount >= spec.items.length) {
    return invalid(
      "los ensayos de practica se toman de la lista de estimulos y no pueden consumirla entera",
    );
  }

  const random = createRandom(seed);
  const shuffled = shuffle(spec.items, random);
  const practiceItems = shuffled.slice(0, practiceCount);
  const mainItems = shuffled.slice(practiceCount);

  if (blockCount > mainItems.length) {
    return invalid(
      `hay ${mainItems.length} estimulo(s) para ${blockCount} bloque(s): algun bloque quedaria vacio`,
    );
  }

  const mainSequence = interleave(
    groupByCondition(mainItems).map((group) => shuffle(group, random)),
  );
  const blocks = splitIntoBlocks(mainSequence, blockCount);

  const trials: GeneratedTrial[] = [];
  let index = 0;

  for (const item of practiceItems) {
    index += 1;
    trials.push(toTrial(item, index, 0, true));
  }
  for (const [blockIndex, block] of blocks.entries()) {
    for (const item of block) {
      index += 1;
      trials.push(toTrial(item, index, blockIndex + 1, false));
    }
  }

  return ok({
    seed,
    trials,
    practiceCount,
    mainCount: mainSequence.length,
    blockCount,
    conditionCounts: countByCondition(trials),
  });
};

const toTrial = (
  item: ExperimentItem,
  index: number,
  block: number,
  practice: boolean,
): GeneratedTrial =>
  item.audioFile === undefined
    ? { index, itemId: item.id, condition: item.condition, text: item.text, block, practice }
    : {
        index,
        itemId: item.id,
        condition: item.condition,
        text: item.text,
        audioFile: item.audioFile,
        block,
        practice,
      };
