/**
 * Superficie publica del adaptador de experimentos.
 *
 * Se publica como subpath propio (`@lingualab/adapters/experiment`) en vez de
 * entrar por el indice del paquete por una razon concreta: `jspsych` toca
 * `window` al importarse, y cualquier modulo que lo importe deja de poder
 * cargarse en Node. La interfaz necesita el motor —corre en el navegador—, pero
 * las pruebas del adaptador no, y separar las dos entradas mantiene esa frontera
 * visible en el `package.json`.
 *
 * La UI nunca importa `jspsych`: importa esta fabrica. El dia que la libreria
 * cambie de version o de API, se toca este directorio y nada mas.
 */
export {
  createJsPsychExperimentRunner,
  type CreateExperimentRunnerOptions,
  type EngineRunResult,
  type EngineTrialRow,
  type ExperimentEngine,
  type ExperimentEngineFactory,
} from "./jspsych-runner";

export { createJsPsychEngine, type CreateJsPsychEngineOptions } from "./jspsych-engine";

export {
  buildTimeline,
  DEFAULT_DESIGN,
  escapeMarkup,
  LIKERT_VALUES,
  readExperimentDesign,
  type BuildTimelineInput,
  type ExperimentDesign,
  type PlannedPlugin,
  type PlannedTrial,
} from "./timeline";
