/* ============================================================
   LinguaLab — consultas del visor: «Obtener tono / F1 / F2 / intensidad»

   Como el menu de cada magnitud en la ventana de sonido de Praat (manual,
   «Intro 4.3» e «Intro 5.3»): con un tramo arrastrado se pide la media en el
   tramo; si no, el valor en el cursor. La respuesta es una frase en la fila de
   abajo del editor, region viva, con el instante o el tramo del que sale el
   numero, y dice «tramo sordo» o «sin valor» cuando el analisis no midio nada:
   nunca un 0 Hz.

   POR QUE SE ANALIZA EL AUDIO COMPLETO

   Las curvas analizan el tramo visible cortado como un audio aparte
   (`acoustic-tracks.ts`), y sus marcos no caen en los mismos instantes que los
   de Praat sobre el sonido entero. La consulta usa el mismo analisis que la
   tabla de mediciones, el del audio completo, que es el que se contrasta con
   las referencias de Praat (`e2e/fixtures/reference/`): asi el numero de la
   consulta y el de la tabla son el mismo y los dos estan validados. Se guarda
   en cache, de modo que la segunda consulta no vuelve a analizar.
   ============================================================ */

import type { AcousticError, AcousticTrack, Result } from "@lingualab/core";
import { type QueryAnswer, type QueryTarget, queryTrack } from "./acoustic-measure";
import type { AcousticAudio, AcousticTracks, TrackParams } from "./acoustic-tracks";
import { type AudioStringKey, format, formatSeconds } from "./strings";
import { draggedSelectionOf, type ViewerContext } from "./viewer-state";

export type QueryMagnitude = "pitch" | "f1" | "f2" | "intensity";

export interface AcousticQueryDeps {
  readonly tracks: AcousticTracks;
  readonly params: () => TrackParams;
}

export interface AcousticQuery {
  run(magnitude: QueryMagnitude): void;
  /** El audio cambio: la respuesta anterior ya no le corresponde. */
  reset(): void;
}

const NAMES: Readonly<Record<QueryMagnitude, AudioStringKey>> = {
  pitch: "audio.query.pitch",
  f1: "audio.query.f1",
  f2: "audio.query.f2",
  intensity: "audio.query.intensity",
};

const isMagnitude = (value: string | undefined): value is QueryMagnitude =>
  value !== undefined && Object.hasOwn(NAMES, value);

/** El tramo arrastrado, si lo hay; si no, el cursor. */
const targetOf = (ctx: ViewerContext): QueryTarget => {
  const dragged = draggedSelectionOf(ctx.state);
  if (dragged !== null) {
    return {
      kind: "selection",
      start: Math.min(dragged.anchor, dragged.head),
      end: Math.max(dragged.anchor, dragged.head),
    };
  }
  return { kind: "cursor", time: ctx.state.cursor };
};

const where = (target: QueryTarget): string =>
  target.kind === "cursor"
    ? formatSeconds(target.time)
    : `${target.start.toFixed(3)}–${formatSeconds(target.end)}`;

export const createAcousticQuery = (
  ctx: ViewerContext,
  deps: AcousticQueryDeps,
): AcousticQuery => {
  const output = ctx.root.querySelector<HTMLElement>("[data-audio-query-result]");
  const text = ctx.strings.text;

  // Cada consulta lleva un numero: si llegan dos seguidas, solo escribe la
  // ultima, aunque la primera termine despues (el analisis es asincrono).
  let latest = 0;

  const say = (message: string, state: "busy" | "ok" | "empty" | "error"): void => {
    if (output === null) {
      return;
    }
    output.textContent = message;
    output.dataset.state = state;
  };

  /** La frase de la respuesta, con la unidad y el instante o el tramo. */
  const describe = (
    magnitude: QueryMagnitude,
    target: QueryTarget,
    answer: QueryAnswer,
  ): { message: string; state: "ok" | "empty" } => {
    const what = text(NAMES[magnitude]);
    if (answer.kind === "undefined") {
      return {
        message: format(text(magnitude === "pitch" ? "audio.query.unvoiced" : "audio.query.none"), {
          what,
          where: where(target),
        }),
        state: "empty",
      };
    }
    const value = `${answer.value.toFixed(1)} ${magnitude === "intensity" ? "dB" : "Hz"}`;
    if (answer.kind === "value") {
      return {
        message: format(text("audio.query.atCursor"), {
          what,
          where: formatSeconds(answer.time),
          value,
        }),
        state: "ok",
      };
    }
    return {
      message: format(
        text(magnitude === "intensity" ? "audio.query.meanEnergy" : "audio.query.mean"),
        { what, where: where(target), value, count: answer.count },
      ),
      state: "ok",
    };
  };

  /** La pista de cada magnitud, sobre el audio completo y con los campos del panel. */
  const trackOf = async (
    magnitude: QueryMagnitude,
    audio: AcousticAudio,
  ): Promise<Result<AcousticTrack | undefined, AcousticError>> => {
    const range = { start: 0, end: audio.duration };
    const params = deps.params();
    if (magnitude === "pitch") {
      return deps.tracks.pitch(audio, range, params);
    }
    if (magnitude === "intensity") {
      return deps.tracks.intensity(audio, range, params);
    }
    const formants = await deps.tracks.formants(audio, range, params);
    return formants.ok
      ? { ok: true, value: formants.value[magnitude === "f1" ? 0 : 1] }
      : formants;
  };

  /** La respuesta, o el texto del fallo cuando no hay audio o el motor no pudo. */
  const answer = async (
    magnitude: QueryMagnitude,
    target: QueryTarget,
  ): Promise<QueryAnswer | string> => {
    const audio = ctx.state.audio;
    if (audio === null) {
      return text("audio.error.noAudio");
    }
    const outcome = await trackOf(magnitude, {
      samples: audio.samples,
      sampleRate: audio.sampleRate,
      duration: audio.duration,
    });
    if (!outcome.ok) {
      return format(text("audio.query.failed"), { detail: outcome.error.code });
    }
    return queryTrack(outcome.value, target, magnitude === "intensity" ? "intensity" : "frequency");
  };

  const run = (magnitude: QueryMagnitude): void => {
    latest += 1;
    const id = latest;
    const target = targetOf(ctx);
    say(text("audio.query.busy"), "busy");
    void answer(magnitude, target)
      .then((result) => {
        if (id !== latest) {
          return;
        }
        if (typeof result === "string") {
          say(result, "error");
          return;
        }
        const { message, state } = describe(magnitude, target, result);
        say(message, state);
      })
      .catch((error: unknown) => {
        if (id === latest) {
          say(
            format(text("audio.query.failed"), {
              detail: error instanceof Error ? error.message : String(error),
            }),
            "error",
          );
        }
      });
  };

  for (const button of ctx.root.querySelectorAll<HTMLButtonElement>("[data-audio-query]")) {
    button.addEventListener("click", () => {
      const magnitude = button.dataset.audioQuery;
      if (isMagnitude(magnitude)) {
        run(magnitude);
      }
    });
  }

  return {
    run,
    reset() {
      latest += 1;
      say("", "empty");
    },
  };
};
