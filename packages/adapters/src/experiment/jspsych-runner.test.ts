import { type ExperimentSpec, isErr, isOk } from "@lingualab/core";
import { describe, expect, it } from "vitest";
import {
  type EngineRunResult,
  type EngineTrialRow,
  type ExperimentEngine,
  type ExperimentEngineFactory,
  createJsPsychExperimentRunner,
} from "./jspsych-runner";
import type { PlannedTrial } from "./timeline";

/**
 * Contrato del puerto `ExperimentRunnerPort` contra el adaptador de jsPsych.
 *
 * POR QUE jsPsych SE SUSTITUYE POR UN DOBLE Y NO SE PRUEBA DE VERDAD
 *
 * `jspsych` toca `window` al importarse, asi que en Node no se puede cargar: la
 * prueba del contrato corre sin navegador, como todas las de este repositorio.
 * Lo que se comprueba aqui es exactamente la parte que el adaptador decide —que
 * linea de tiempo se construye, que se le pide al motor y como se convierte lo
 * que devuelve en ensayos del puerto—, y el motor real queda reducido a una
 * traduccion de esa linea de tiempo a objetos de jsPsych, que es lo unico que
 * una prueba sin navegador no podria mirar. El viaje completo con navegador lo
 * mide `e2e/experiments.spec.ts`.
 */

const ITEMS = [
  { id: "e1", condition: "control", text: "El gato duerme." },
  { id: "e2", condition: "isla", text: "¿Quién dijo qué?" },
  { id: "e3", condition: "control", text: "La niña canta." },
] as const;

const spec = (
  kind: ExperimentSpec["kind"],
  items: ExperimentSpec["items"] = ITEMS,
  parameters: Readonly<Record<string, string | number | boolean>> = { seed: 5 },
): ExperimentSpec => ({ id: "prueba", kind, items, parameters });

interface FakeEngine {
  readonly factory: ExperimentEngineFactory;
  readonly timelines: PlannedTrial[][];
  readonly created: () => number;
}

const rowFor = (trial: PlannedTrial): EngineTrialRow | null => {
  const data = { ...trial.data };
  if (data.trialId === undefined) {
    return null;
  }
  switch (trial.plugin) {
    case "survey-likert":
      // jsPsych devuelve un objeto por pregunta, con el indice elegido.
      return { ...data, trial_type: trial.plugin, response: { Q0: 3 }, rt: 251.4 };
    case "html-button":
    case "audio-button":
      return { ...data, trial_type: trial.plugin, response: 1, rt: 612 };
    case "html-keyboard":
    case "audio-keyboard":
      return { ...data, trial_type: trial.plugin, response: trial.keys?.[0] ?? " ", rt: 480 };
    default:
      return { ...data, trial_type: trial.plugin, rt: 90 };
  }
};

const fakeEngine = (
  options: {
    readonly fail?: boolean;
    readonly aborted?: boolean;
    readonly result?: EngineRunResult;
  } = {},
): FakeEngine => {
  const timelines: PlannedTrial[][] = [];
  let created = 0;
  const factory: ExperimentEngineFactory = () => {
    created += 1;
    const engine: ExperimentEngine = {
      run: async (trials) => {
        timelines.push([...trials]);
        if (options.fail === true) {
          throw new Error("se cerro la pestaña");
        }
        if (options.result !== undefined) {
          return options.result;
        }
        const rows: EngineTrialRow[] = [];
        for (const trial of trials) {
          const row = rowFor(trial);
          if (row !== null) {
            rows.push(row);
          }
        }
        return { rows, aborted: options.aborted ?? false };
      },
      abort: () => {},
    };
    return engine;
  };
  return { factory, timelines, created: () => created };
};

const runner = (engine: FakeEngine) =>
  createJsPsychExperimentRunner({
    createEngine: engine.factory,
    toolVersion: "3.0.0",
    resolveAudio: (file) => `blob:prueba/${file}`,
  });

describe("createJsPsychExperimentRunner", () => {
  it("devuelve un ensayo por estimulo con la semilla y la version de la herramienta", async () => {
    const engine = fakeEngine();
    const result = await runner(engine).run(spec("acceptability"));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.trials).toHaveLength(3);
      expect(result.value.seed).toBe(5);
      expect(result.value.toolVersion).toBe("3.0.0");
      expect(result.value.trials.map((trial) => trial.trialId).sort()).toEqual(["e1", "e2", "e3"]);
      expect(result.value.trials.every((trial) => trial.participantId === "")).toBe(true);
      // La semilla viaja en cada fila ademas de en los resultados: una fila
      // exportada suelta tiene que seguir siendo interpretable.
      expect(result.value.trials.every((trial) => trial.seed === 5)).toBe(true);
      expect(result.value.trials.every((trial) => trial.toolVersion === "3.0.0")).toBe(true);
    }
  });

  it("marca cada ensayo con el participante anonimo que recibe", async () => {
    const engine = fakeEngine();
    const withParticipant = createJsPsychExperimentRunner({
      createEngine: engine.factory,
      toolVersion: "3.0.0",
      participantId: "p-abc123",
    });

    const result = await withParticipant.run(spec("acceptability"));

    if (isOk(result)) {
      expect(result.value.trials.every((trial) => trial.participantId === "p-abc123")).toBe(true);
    }
  });

  it("empieza con las instrucciones editables y sigue el orden del generador", async () => {
    const engine = fakeEngine();
    await runner(engine).run(
      spec("acceptability", ITEMS, { seed: 5, instructions: "Lee y juzga." }),
    );

    const timeline = engine.timelines[0];
    expect(timeline?.[0]?.plugin).toBe("instructions");
    expect(timeline?.[0]?.pages).toEqual(["Lee y juzga."]);
    expect(timeline?.slice(1).map((trial) => trial.data.trialId)).toHaveLength(3);
  });

  it("no dibuja pantalla de instrucciones si no hay texto", async () => {
    const engine = fakeEngine();
    await runner(engine).run(spec("acceptability"));

    expect(engine.timelines[0]?.every((trial) => trial.plugin !== "instructions")).toBe(true);
  });

  it("los juicios de aceptabilidad usan una escala de 1 a 7 y registran el valor", async () => {
    const engine = fakeEngine();
    const result = await runner(engine).run(
      spec("acceptability", ITEMS, {
        seed: 5,
        scaleLeft: "nada natural",
        scaleRight: "muy natural",
      }),
    );

    const likert = engine.timelines[0]?.find((trial) => trial.plugin === "survey-likert");
    expect(likert?.labels).toHaveLength(7);
    expect(likert?.labels?.[0]).toContain("nada natural");
    expect(likert?.labels?.[6]).toContain("muy natural");
    expect(likert?.data.condition).toBeDefined();

    if (isOk(result)) {
      expect(result.value.trials.map((trial) => trial.response)).toEqual(["4", "4", "4"]);
      expect(result.value.trials[0]?.reactionTimeMs).toBe(251);
    }
  });

  it("un 2AFC muestra las dos alternativas del texto y registra la elegida", async () => {
    const engine = fakeEngine();
    const pairs = [{ id: "p1", condition: "par", text: "perro|pero" }];
    const result = await runner(engine).run(spec("two-afc", pairs, { seed: 5 }));

    const trial = engine.timelines[0]?.find((planned) => planned.plugin === "html-button");
    expect(trial?.choices).toEqual(["perro", "pero"]);

    if (isOk(result)) {
      expect(result.value.trials[0]?.response).toBe("pero");
      expect(result.value.trials[0]?.reactionTimeMs).toBe(612);
    }
  });

  it("un 2AFC sin dos alternativas se rechaza en vez de inventarlas", async () => {
    const engine = fakeEngine();
    const broken = [{ id: "p1", condition: "par", text: "perro" }];

    const result = await runner(engine).run(spec("two-afc", broken, { seed: 5 }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
      expect(result.error.detail).toContain("p1");
    }
    expect(engine.timelines).toHaveLength(0);
  });

  it("la lectura autocontrolada registra un ensayo por palabra", async () => {
    const engine = fakeEngine();
    const phrases = [{ id: "s1", condition: "control", text: "La niña canta" }];

    const result = await runner(engine).run(spec("self-paced-reading", phrases, { seed: 5 }));

    const trials = engine.timelines[0]?.filter((planned) => planned.plugin === "html-keyboard");
    expect(trials).toHaveLength(3);
    expect(trials?.[0]?.stimulus).toBe("La");
    expect(trials?.[2]?.stimulus).toBe("canta");

    if (isOk(result)) {
      expect(result.value.trials.map((trial) => trial.trialId)).toEqual(["s1#1", "s1#2", "s1#3"]);
      expect(result.value.trials.map((trial) => trial.response)).toEqual(["", "", ""]);
      expect(result.value.trials.every((trial) => trial.reactionTimeMs === 480)).toBe(true);
    }
  });

  it("la decision lexica registra palabra o no palabra, no la tecla", async () => {
    const engine = fakeEngine();
    const words = [{ id: "l1", condition: "palabra", text: "mesa" }];

    const result = await runner(engine).run(
      spec("lexical-decision", words, {
        seed: 5,
        wordKey: "f",
        nonWordKey: "j",
        wordLabel: "palabra",
        nonWordLabel: "no palabra",
      }),
    );

    const trial = engine.timelines[0]?.find((planned) => planned.plugin === "html-keyboard");
    expect(trial?.keys).toEqual(["f", "j"]);
    // Sin esta linea, la persona ve el estimulo y no sabe que tecla significa
    // que: la asignacion viaja en el enunciado del ensayo.
    expect(trial?.prompt).toContain("f = palabra");
    expect(trial?.prompt).toContain("j = no palabra");

    if (isOk(result)) {
      expect(result.value.trials[0]?.response).toBe("word");
    }
  });

  it("un estimulo con audio usa el plugin de audio y la URL que resuelve la interfaz", async () => {
    const engine = fakeEngine();
    const pairs = [{ id: "p1", condition: "par", text: "perro|pero", audioFile: "perro.wav" }];

    await runner(engine).run(spec("two-afc", pairs, { seed: 5 }));

    const trial = engine.timelines[0]?.find((planned) => planned.plugin === "audio-button");
    expect(trial?.audioUrl).toBe("blob:prueba/perro.wav");
  });

  it("un audio declarado sin resolvedor se rechaza: fingir que suena seria mentir", async () => {
    const engine = fakeEngine();
    const pairs = [{ id: "p1", condition: "par", text: "perro|pero", audioFile: "perro.wav" }];
    const withoutResolver = createJsPsychExperimentRunner({
      createEngine: engine.factory,
      toolVersion: "3.0.0",
    });

    const result = await withoutResolver.run(spec("two-afc", pairs, { seed: 5 }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
      expect(result.error.detail).toContain("perro.wav");
    }
  });

  it("los juicios de aceptabilidad no reproducen audio y lo dicen", async () => {
    const engine = fakeEngine();
    const items = [{ id: "a1", condition: "control", text: "El gato duerme.", audioFile: "a.wav" }];

    const result = await runner(engine).run(spec("acceptability", items, { seed: 5 }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });

  it("rechaza una especificacion sin estimulos sin llegar a crear el motor", async () => {
    const engine = fakeEngine();

    const result = await runner(engine).run(spec("acceptability", [], { seed: 5 }));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
    expect(engine.created()).toBe(0);
  });

  it("un fallo del motor se devuelve como runtime-failed en vez de lanzar", async () => {
    const result = await runner(fakeEngine({ fail: true })).run(spec("acceptability"));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("runtime-failed");
      expect(result.error.detail).toContain("cerro la pestaña");
    }
  });

  it("una sesion interrumpida devuelve aborted, no resultados a medias", async () => {
    const result = await runner(fakeEngine({ aborted: true })).run(spec("acceptability"));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("aborted");
    }
  });

  it("la semilla de la especificacion manda sobre la aleatoria y el orden se repite", async () => {
    const fixed = () => 99;
    const first = createJsPsychExperimentRunner({
      createEngine: fakeEngine().factory,
      toolVersion: "3.0.0",
      seed: fixed,
    });
    const second = createJsPsychExperimentRunner({
      createEngine: fakeEngine().factory,
      toolVersion: "3.0.0",
      seed: fixed,
    });

    const a = await first.run(spec("acceptability", ITEMS, { seed: 12 }));
    const b = await second.run(spec("acceptability", ITEMS, { seed: 12 }));

    if (isOk(a) && isOk(b)) {
      expect(a.value.seed).toBe(12);
      expect(a.value.trials.map((trial) => trial.trialId)).toEqual(
        b.value.trials.map((trial) => trial.trialId),
      );
    }
  });

  it("sin semilla en la especificacion usa la fuente inyectada y la registra", async () => {
    const fixed = createJsPsychExperimentRunner({
      createEngine: fakeEngine().factory,
      toolVersion: "3.0.0",
      seed: () => 4242,
    });

    const result = await fixed.run(spec("acceptability", ITEMS, {}));

    if (isOk(result)) {
      expect(result.value.seed).toBe(4242);
    }
  });

  it("escapa el texto del CSV antes de entregarlo, porque jsPsych lo dibuja como HTML", async () => {
    const engine = fakeEngine();
    const items = [{ id: "x1", condition: "control", text: "<b>no es negrita</b>" }];

    await runner(engine).run(spec("acceptability", items, { seed: 5 }));

    const likert = engine.timelines[0]?.find((trial) => trial.plugin === "survey-likert");
    expect(likert?.stimulus).toBe("&lt;b&gt;no es negrita&lt;/b&gt;");
  });

  it("una semilla que no es un numero finito se rechaza", async () => {
    const result = await runner(fakeEngine()).run(
      spec("acceptability", ITEMS, { seed: "doce" as unknown as number }),
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("spec-invalid");
    }
  });
});
