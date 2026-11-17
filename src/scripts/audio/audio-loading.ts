/* ============================================================
   LinguaLab — carga del audio y calculo del espectrograma

   Un archivo de audio pasa por tres filtros antes de dibujarse: que el
   navegador tenga Web Audio, que el archivo no pase del tope y que se pueda
   decodificar en menos de la duracion maxima. Cada filtro que falla se dice con
   su propio mensaje: «no se pudo decodificar» no puede tapar «tu navegador no
   tiene Web Audio».
   ============================================================ */

/* El tope del audio, el formateo de tamanos y la decision viven en `./limits.ts`,
   con su prueba al lado: este archivo necesita DOM y no tiene prueba unitaria.
   Ver **P19** de `docs/PENDING.md`. */

import { createEmptyDocument, startAnnotationHistory } from "@lingualab/core";
import { readFileBytes } from "./files";
import { formatBytes, isOverLimit, MAX_AUDIO_BYTES } from "./limits";
import { spectrogramColumns } from "./spectrogram";
import { format, formatSeconds } from "./strings";
import { computePeaks } from "./waveform";
import {
  isDurationMismatch,
  SPECTROGRAM_MAX_COLUMNS,
  spectrogramSettings,
  WAVEFORM_BUCKETS,
} from "./viewer-rules";
import { currentDocument, type LoadedAudio, type ViewerContext } from "./viewer-state";
import type { DecodedAudioWithBuffer, WebAudioDecoder } from "./web-audio-decoder";

export interface AudioLoading {
  loadAudioFile(file: File): Promise<void>;
  /** Recalcula el espectrograma con los controles actuales y redibuja. */
  recomputeSpectrogram(): void;
}

export interface AudioLoadingDeps {
  readonly decoder: WebAudioDecoder;
  readonly setBuffer: (buffer: AudioBuffer) => void;
  /** Analisis, curvas y mediciones del audio anterior: se descartan al cargar otro. */
  readonly acoustic: { reset(): void } | null;
  readonly renderCanvas: () => void;
  readonly renderAll: () => void;
  readonly updatePersistence: () => void;
  readonly saveNow: () => Promise<void>;
}

export const createAudioLoading = (ctx: ViewerContext, deps: AudioLoadingDeps): AudioLoading => {
  const { el, state, strings, say } = ctx;

  const recomputeSpectrogram = (): void => {
    if (state.audio === null) {
      return;
    }
    const settings = spectrogramSettings({
      window: el.windowSelect?.value,
      minHz: el.minHzInput?.value,
      maxHz: el.maxHzInput?.value,
    });

    state.spectrogram = spectrogramColumns(state.audio.samples, {
      sampleRate: state.audio.sampleRate,
      windowSeconds: settings.windowSeconds,
      hopSeconds: settings.hopSeconds,
      minHz: settings.minHz,
      maxHz: settings.maxHz,
      maxColumns: SPECTROGRAM_MAX_COLUMNS,
    });
    deps.renderCanvas();
  };

  /** Lo que impide siquiera leer el archivo, dicho; `true` si se puede seguir. */
  const canRead = (file: File): boolean => {
    if (typeof AudioContext === "undefined") {
      // Sin Web Audio no hay decodificacion, ni reproduccion, ni espectrograma.
      // Decirlo antes de intentarlo evita un error de decodificacion que
      // culparia al archivo de una carencia del navegador.
      say(strings.text("audio.error.noAudio"), "error");
      return false;
    }
    // ANTES de leer y de decodificar: un archivo de este tamano no puede ser un
    // tramo de 300 s, y entregarselo a `decodeAudioData` llena la memoria antes
    // de que ningun limite lo detenga.
    if (isOverLimit(file.size, MAX_AUDIO_BYTES)) {
      say(
        format(strings.text("audio.error.tooLarge"), {
          size: formatBytes(file.size),
          limit: formatBytes(MAX_AUDIO_BYTES),
        }),
        "error",
      );
      return false;
    }
    return true;
  };

  /** Lee y decodifica; dice el fallo y devuelve `null` si algo no salio. */
  const decode = async (file: File): Promise<DecodedAudioWithBuffer | null> => {
    say(strings.text("audio.status.loading"), "busy");
    let bytes: Uint8Array;
    try {
      bytes = await readFileBytes(file);
    } catch {
      // Un fallo de lectura —permiso retirado, archivo movido, lector de
      // tarjetas desconectado— se cuenta como mensaje: antes quedaba como
      // promesa rechazada y la persona veia el visor cargando para siempre.
      say(strings.text("audio.error.read"), "error");
      return null;
    }
    const decoded = await deps.decoder.decodeToBuffer(bytes.buffer as ArrayBuffer, file.type);
    if (!decoded.ok) {
      const message =
        decoded.error.code === "too-long"
          ? format(strings.text("audio.error.tooLong"), {
              duration: Math.round(decoded.error.durationSeconds),
            })
          : strings.text("audio.error.decode");
      say(message, "error");
      return null;
    }
    return decoded.value;
  };

  /** Dice que el audio quedo cargado, o que no corresponde al documento abierto. */
  const reportLoaded = (audio: LoadedAudio, previousXmax: number): void => {
    if (isDurationMismatch(previousXmax, audio.duration)) {
      say(
        format(strings.text("audio.status.mismatch"), {
          xmax: formatSeconds(previousXmax),
          duration: formatSeconds(audio.duration),
        }),
        "error",
      );
      return;
    }
    say(
      format(strings.text("audio.status.loaded"), {
        name: audio.name,
        duration: formatSeconds(audio.duration),
      }),
      "ok",
    );
  };

  const loadAudioFile = async (file: File): Promise<void> => {
    if (!canRead(file)) {
      return;
    }
    const decoded = await decode(file);
    if (decoded === null) {
      return;
    }

    const samples = decoded.channels[0] ?? new Float32Array(0);
    const audio: LoadedAudio = {
      buffer: decoded.buffer,
      duration: decoded.durationSeconds,
      sampleRate: decoded.sampleRate,
      samples,
      peaks: computePeaks(samples, WAVEFORM_BUCKETS),
      name: file.name,
    };
    state.audio = audio;

    state.view = { start: 0, end: audio.duration };
    state.cursor = 0;
    deps.setBuffer(audio.buffer);

    if (el.cursorInput !== null) {
      el.cursorInput.max = String(audio.duration.toFixed(3));
      el.cursorInput.disabled = false;
    }

    // Un documento restaurado sobre un audio distinto se conserva, pero se avisa:
    // anotar sobre otro archivo es legitimo, anotar sin saberlo no.
    const previousXmax = currentDocument(state).xmax;

    if (previousXmax === 0) {
      state.history = startAnnotationHistory(createEmptyDocument(audio.duration));
      state.activeTier = 0;
    }

    // Otro archivo es otro analisis: lo medido sobre el anterior no se mezcla.
    deps.acoustic?.reset();
    recomputeSpectrogram();
    deps.renderAll();
    deps.updatePersistence();
    reportLoaded(audio, previousXmax);
    // Con el audio listo, el editor entero queda a la vista: la cabecera de la
    // pagina lo deja debajo del primer pliegue. `instant` y no `auto`: `auto`
    // hereda el `scroll-behavior: smooth` del sitio y la animacion se nota como
    // un salto lento. No mueve el foco: solo desplaza.
    el.editorBar?.scrollIntoView({ block: "start", behavior: "instant" });
    void deps.saveNow();
  };

  return { loadAudioFile, recomputeSpectrogram };
};
