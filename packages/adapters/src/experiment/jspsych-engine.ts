/**
 * El motor real: la unica parte del adaptador que conoce jsPsych.
 *
 * POR QUE ESTA AISLADO EN UN ARCHIVO
 *
 * `jspsych` toca `window` al importarse, asi que cualquier modulo que lo importe
 * deja de poder cargarse en Node y con el se cae toda la suite de contrato. Aqui
 * solo vive la traduccion de `PlannedTrial` a objetos de jsPsych y la llamada a
 * `run`; todo lo que decide algo se prueba en `timeline.ts` y en
 * `jspsych-runner.ts`.
 *
 * POR QUE NO SE CARGA EL CSS DE JSSYCH
 *
 * `jspsych/css/jspsych.css` trae su propia tipografia y sus propios colores, que
 * no son los del sitio, y ademas pesa en el presupuesto de la pagina. Las clases
 * `jspsych-*` que los plugins generan se visten en
 * `src/styles/features/experiments.css`, con los tokens del proyecto.
 */
import AudioButtonResponsePlugin from "@jspsych/plugin-audio-button-response";
import AudioKeyboardResponsePlugin from "@jspsych/plugin-audio-keyboard-response";
import HtmlButtonResponsePlugin from "@jspsych/plugin-html-button-response";
import HtmlKeyboardResponsePlugin from "@jspsych/plugin-html-keyboard-response";
import InstructionsPlugin from "@jspsych/plugin-instructions";
import SurveyLikertPlugin from "@jspsych/plugin-survey-likert";
import { type JsPsych, initJsPsych } from "jspsych";
import type { EngineRunResult, EngineTrialRow, ExperimentEngine } from "./jspsych-runner";
import type { PlannedTrial } from "./timeline";

type Timeline = Parameters<JsPsych["run"]>[0];
type TrialObject = Record<string, unknown>;

export interface CreateJsPsychEngineOptions {
  /** Donde se dibuja el experimento. jsPsych agrega su contenedor aqui. */
  readonly displayElement: HTMLElement;
}

/**
 * Traduce un ensayo planificado al objeto que jsPsych espera.
 *
 * `data` viaja igual en las tres familias de plugins y es lo que despues
 * identifica la fila: sin el, una fila del CSV no se puede atribuir a un
 * estimulo.
 */
const toJsPsychTrial = (planned: PlannedTrial): TrialObject => {
  const data = planned.data;
  switch (planned.plugin) {
    case "instructions":
      return {
        type: InstructionsPlugin,
        pages: planned.pages ?? [],
        show_clickable_nav: true,
        allow_backward: false,
        button_label_next: planned.buttonLabel,
        data,
      };
    case "survey-likert":
      return {
        type: SurveyLikertPlugin,
        // El texto del estimulo es la pregunta; las anclas viajan en las
        // etiquetas de los extremos, que es donde se leen.
        questions: [{ prompt: planned.stimulus, labels: planned.labels, required: true }],
        button_label: planned.buttonLabel,
        data,
      };
    case "html-button":
      return {
        type: HtmlButtonResponsePlugin,
        stimulus: planned.stimulus,
        choices: planned.choices,
        data,
      };
    case "audio-button":
      return {
        type: AudioButtonResponsePlugin,
        stimulus: planned.audioUrl,
        choices: planned.choices,
        data,
      };
    case "html-keyboard":
      return {
        type: HtmlKeyboardResponsePlugin,
        stimulus: planned.stimulus,
        choices: planned.keys,
        prompt: planned.prompt,
        data,
      };
    case "audio-keyboard":
      return {
        type: AudioKeyboardResponsePlugin,
        stimulus: planned.audioUrl,
        choices: planned.keys,
        prompt: planned.prompt,
        data,
      };
    default:
      // El tipo es una union cerrada: llegar aqui significa que se agrego un
      // plugin al plan y no al motor, y un ensayo que no se ejecuta en silencio
      // es peor que un error visible.
      throw new Error(`plugin sin motor: ${String(planned.plugin)}`);
  }
};

export const createJsPsychEngine = (options: CreateJsPsychEngineOptions): ExperimentEngine => {
  let instance: JsPsych | undefined;
  let aborted = false;

  return {
    async run(trials: readonly PlannedTrial[]): Promise<EngineRunResult> {
      aborted = false;
      // Corridas sucesivas sobre el mismo contenedor: el contenedor de la
      // corrida anterior se descarta para no apilar dos experimentos.
      options.displayElement.replaceChildren();

      instance = initJsPsych({
        display_element: options.displayElement,
        // Los plugins de audio precargan sonido. Con Web Audio (el valor por
        // defecto) esa carga es un `fetch` del archivo, y la CSP del sitio limita
        // `connect-src` a 'self': un audio local llega como `blob:`, que esa
        // directiva no cubre. Con audio HTML el archivo se carga por `media-src`,
        // que si admite `blob:` —y que es el mismo camino que usa cualquier
        // `<audio>` de la pagina—. El costo es timing de audio menos fino, que
        // esta declarado en la pagina junto al aviso de los tiempos de reaccion.
        use_webaudio: false,
      });
      const timeline = trials.map(toJsPsychTrial);
      // jsPsych no exporta el tipo de su linea de tiempo, solo lo declara; el
      // objeto que armamos es exactamente el que `run` documenta.
      await instance.run(timeline as unknown as Timeline);

      const rows: EngineTrialRow[] = instance.data.get().values();
      return { rows, aborted };
    },
    abort(): void {
      aborted = true;
      instance?.abortExperiment();
    },
  };
};
