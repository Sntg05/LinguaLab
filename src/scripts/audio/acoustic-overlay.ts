/**
 * Curvas sobre el espectrograma: que se analiza, cuando y que se dibuja
 * (unidad 5.3).
 *
 * COMO EN PRAAT: SIN BOTONES
 *
 * En la ventana de sonido de Praat el tono, los formantes y la intensidad
 * aparecen solos sobre el espectrograma para el tramo que se ve, y cada uno se
 * muestra u oculta desde su menu. Aqui igual: cada vez que el visor pinta el
 * espectrograma, `draw` mira la ventana visible y, si lo que hay analizado no
 * la cubre, pide el analisis del tramo; al llegar, vuelve a pintar. Solo se
 * piden las curvas marcadas en sus casillas «mostrar».
 *
 * LO QUE NO SE ANALIZA SE DICE
 *
 * Con mas de 10 s a la vista no se analiza (`planVisibleAnalysis`) y el aviso
 * se escribe sobre el espectrograma y en la linea de estado, que es la que lee
 * un lector de pantalla. Un fallo del motor se informa igual. Nunca se dibuja
 * una curva de otro audio ni de otros parametros: cada resultado se guarda con
 * su tramo y sus parametros, y `reset` lo descarta al cambiar de audio.
 *
 * EL ESTADO QUEDA EN EL LIENZO
 *
 * `data-overlay` (`analysing`, `drawn`, `skipped`, `failed`, `hidden`) dice que
 * hay sobre el espectrograma; las pruebas e2e lo esperan antes de mirar pixeles.
 */

import type { AcousticError, AcousticTrack, Result } from "@lingualab/core";
import {
  LONGEST_ANALYSIS_SECONDS,
  planVisibleAnalysis,
  type AcousticAudio,
  type AcousticTracks,
  type AnalysisRange,
  type TrackParams,
} from "./acoustic-tracks";
import { drawAcousticOverlay, drawOverlayNotice, type OverlayLayers } from "./acoustic-render";
import type { Palette } from "./render";
import { format, type AudioStrings } from "./strings";
import type { ViewWindow } from "./view";

/** Rango de la intensidad en pantalla: el «view range» por defecto de Praat. */
export const INTENSITY_VIEW_RANGE = { min: 50, max: 100 } as const;

type Curve = "pitch" | "formants" | "intensity";

type CurveValue = AcousticTrack | readonly AcousticTrack[];

type OverlayState = "analysing" | "drawn" | "skipped" | "failed" | "hidden";

export interface AcousticOverlayOptions {
  readonly tracks: AcousticTracks;
  readonly strings: AudioStrings;
  readonly getAudio: () => AcousticAudio | null;
  /** Parametros del panel acustico (piso, techo, frecuencia maxima). */
  readonly params: () => TrackParams;
  readonly palette: () => Palette;
  readonly toggles: Readonly<Record<Curve, HTMLInputElement | null>>;
  readonly status: HTMLElement | null;
  /** Llega un resultado o cambia una casilla: el visor vuelve a pintar. */
  readonly onChange: () => void;
}

export interface AcousticOverlay {
  /** Dibuja las curvas del tramo visible sobre el espectrograma ya pintado. */
  draw(canvas: HTMLCanvasElement, view: ViewWindow, minHz: number, maxHz: number): void;
  /** El audio cambio: nada de lo analizado le corresponde. */
  reset(): void;
}

const CURVES: readonly Curve[] = ["pitch", "formants", "intensity"];

const paramsKey = (params: TrackParams): string =>
  `${params.floor}:${params.ceiling}:${params.maxFormantHz}`;

const seconds = (value: number): string => value.toFixed(2);

export const createAcousticOverlay = (options: AcousticOverlayOptions): AcousticOverlay => {
  const { strings, tracks } = options;

  // Lo analizado: tramo y parametros a los que corresponde cada resultado.
  let covered: { readonly range: AnalysisRange; readonly key: string } | null = null;
  const results = new Map<Curve, Result<CurveValue, AcousticError>>();
  const pending = new Set<Curve>();
  // Sube con cada audio nuevo y con cada tramo nuevo: un resultado que llega
  // tarde, de un tramo o un audio anterior, se descarta.
  let generation = 0;
  let lastMessage = "";

  const say = (message: string): void => {
    // Solo si cambia: durante la reproduccion se pinta en cada cuadro, y repetir
    // el mismo texto en una region `aria-live` lo haria leer una y otra vez.
    if (options.status === null || message === lastMessage) {
      return;
    }
    lastMessage = message;
    options.status.textContent = message;
  };

  const describe = (error: AcousticError): string => {
    if (error.code === "too-short") {
      return format(strings.text("audio.overlay.tooShort"), {
        duration: error.durationSeconds.toFixed(3),
      });
    }
    if (error.code === "unavailable") {
      return format(strings.text("audio.overlay.unavailable"), { detail: error.detail ?? "—" });
    }
    return error.detail;
  };

  const shown = (): Curve[] =>
    CURVES.filter((curve) => options.toggles[curve]?.checked !== false);

  const request = (
    curve: Curve,
    audio: AcousticAudio,
    range: AnalysisRange,
    params: TrackParams,
  ): void => {
    pending.add(curve);
    const ticket = generation;
    const outcome: Promise<Result<CurveValue, AcousticError>> =
      curve === "pitch"
        ? tracks.pitch(audio, range, params)
        : curve === "formants"
          ? tracks.formants(audio, range, params)
          : tracks.intensity(audio, range, params);
    void outcome
      .catch(
        (error: unknown): Result<CurveValue, AcousticError> => ({
          ok: false,
          error: {
            code: "analysis-failed",
            detail: error instanceof Error ? error.message : String(error),
          },
        }),
      )
      .then((result) => {
        if (ticket !== generation) {
          return;
        }
        pending.delete(curve);
        results.set(curve, result);
        options.onChange();
      });
  };

  const mark = (canvas: HTMLCanvasElement, state: OverlayState): void => {
    canvas.dataset.overlay = state;
  };

  /** Mas de 10 s a la vista: nada se analiza y el aviso va donde iban las curvas. */
  const drawSkipped = (canvas: HTMLCanvasElement, span: number): void => {
    const values = { span: span.toFixed(1), limit: LONGEST_ANALYSIS_SECONDS };
    drawOverlayNotice(
      canvas,
      format(strings.text("audio.overlay.zoomIn"), values),
      options.palette(),
    );
    mark(canvas, "skipped");
    say(format(strings.text("audio.overlay.skipped"), values));
  };

  /** Lo analizado y marcado, listo para dibujar; lo que falta o fallo no se dibuja. */
  const layersOf = (curves: readonly Curve[]): OverlayLayers => {
    const value = <T extends CurveValue>(curve: Curve): T | null => {
      const result = results.get(curve);
      return result?.ok === true && curves.includes(curve) ? (result.value as T) : null;
    };
    return {
      pitch: value<AcousticTrack>("pitch"),
      formants: value<readonly AcousticTrack[]>("formants") ?? [],
      intensity: value<AcousticTrack>("intensity"),
    };
  };

  /** El estado y la frase de la linea de estado, segun lo que haya llegado. */
  const report = (canvas: HTMLCanvasElement, curves: readonly Curve[], range: AnalysisRange) => {
    const failure = curves
      .map((curve) => results.get(curve))
      .find((result) => result !== undefined && !result.ok);
    if (failure !== undefined && !failure.ok) {
      mark(canvas, "failed");
      say(format(strings.text("audio.overlay.failed"), { detail: describe(failure.error) }));
      return;
    }
    if (curves.some((curve) => pending.has(curve))) {
      mark(canvas, "analysing");
      say(strings.text("audio.overlay.analysing"));
      return;
    }
    mark(canvas, "drawn");
    say(
      format(strings.text("audio.overlay.drawn"), {
        start: seconds(range.start),
        end: seconds(range.end),
      }),
    );
  };

  /**
   * El tramo cuyas curvas se dibujan. Si lo analizado ya no cubre la vista, o
   * cambiaron los parametros, se descarta y el tramo pasa a ser el nuevo.
   */
  const targetOf = (
    view: ViewWindow,
    audio: AcousticAudio,
    params: TrackParams,
  ): { readonly kind: "skip"; readonly span: number } | { readonly kind: "range"; readonly range: AnalysisRange } => {
    const key = paramsKey(params);
    const plan = planVisibleAnalysis(
      view,
      audio.duration,
      covered?.key === key ? covered.range : undefined,
    );
    if (plan.kind === "skip") {
      return plan;
    }
    if (plan.kind === "analyse") {
      covered = { range: plan.range, key };
      results.clear();
      pending.clear();
      generation += 1;
    }
    return { kind: "range", range: covered?.range ?? { start: 0, end: audio.duration } };
  };

  const draw = (
    canvas: HTMLCanvasElement,
    view: ViewWindow,
    minHz: number,
    maxHz: number,
  ): void => {
    const audio = options.getAudio();
    if (audio === null) {
      return;
    }
    const curves = shown();
    if (curves.length === 0) {
      mark(canvas, "hidden");
      say(strings.text("audio.overlay.none"));
      return;
    }

    const params = options.params();
    const target = targetOf(view, audio, params);
    if (target.kind === "skip") {
      drawSkipped(canvas, target.span);
      return;
    }
    const { range } = target;
    for (const curve of curves) {
      if (!results.has(curve) && !pending.has(curve)) {
        request(curve, audio, range, params);
      }
    }

    const counts = drawAcousticOverlay(canvas, layersOf(curves), {
      view,
      minHz,
      maxHz,
      pitchRange: { min: params.floor, max: params.ceiling },
      intensityRange: INTENSITY_VIEW_RANGE,
      palette: options.palette(),
    });
    canvas.dataset.overlayPitch = String(counts.pitch);
    canvas.dataset.overlayFormants = String(counts.formants);
    canvas.dataset.overlayIntensity = String(counts.intensity);
    report(canvas, curves, range);
  };

  for (const curve of CURVES) {
    options.toggles[curve]?.addEventListener("change", () => options.onChange());
  }

  return {
    draw,
    reset() {
      covered = null;
      results.clear();
      pending.clear();
      generation += 1;
      lastMessage = "";
    },
  };
};
