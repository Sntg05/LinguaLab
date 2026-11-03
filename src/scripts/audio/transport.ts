/* ============================================================
   LinguaLab — reproduccion del visor: contexto de audio, decodificador y cursor en marcha

   El `AudioContext` se crea tarde, la primera vez que hace falta decodificar:
   los navegadores no dejan que suene antes de un gesto de la persona, y crearlo
   al cargar la pagina deja un contexto suspendido y un aviso en la consola.
   Mientras suena, un `requestAnimationFrame` lleva el cursor con el audio.
   ============================================================ */

import { createPlayback, type Playback } from "./playback";
import { clamp } from "./selection";
import { loopRegionOf, type ViewerContext } from "./viewer-state";
import { createWebAudioDecoder, type WebAudioDecoder } from "./web-audio-decoder";

export interface Transport {
  readonly decoder: WebAudioDecoder;
  isPlaying(): boolean;
  /** Entrega el audio nuevo al reproductor, si ya existe. */
  setBuffer(buffer: AudioBuffer): void;
  /** Suena desde `from`, con la velocidad y el bucle que digan los controles. */
  play(from: number): void;
  /** Pausa si suena (dejando el cursor donde iba); si no, suena desde el cursor. */
  togglePlay(): void;
  /** Detiene la reproduccion y el cursor en marcha. */
  stop(): void;
}

export interface TransportDeps {
  readonly updateTransport: () => void;
  readonly updateCursor: () => void;
  readonly renderCanvas: () => void;
}

export const createTransport = (ctx: ViewerContext, deps: TransportDeps): Transport => {
  const { el, state } = ctx;
  let audioContext: AudioContext | null = null;
  let playback: Playback | null = null;
  let animation = 0;

  const stopAnimation = (): void => {
    if (animation !== 0) {
      cancelAnimationFrame(animation);
      animation = 0;
    }
  };

  const context = (): AudioContext | null => {
    if (audioContext === null) {
      if (typeof AudioContext === "undefined") {
        return null;
      }
      audioContext = new AudioContext();
      playback = createPlayback(audioContext);
      playback.onEnded(() => {
        stopAnimation();
        deps.updateTransport();
      });
    }
    return audioContext;
  };

  const decoder = createWebAudioDecoder(() => {
    const created = context();
    if (created === null) {
      throw new Error("Este navegador no ofrece Web Audio.");
    }
    return created;
  });

  const tick = (): void => {
    if (playback === null || !playback.isPlaying()) {
      stopAnimation();
      deps.updateTransport();
      return;
    }
    state.cursor = clamp(playback.position(), 0, state.audio?.duration ?? 0);
    deps.updateCursor();
    deps.renderCanvas();
    animation = requestAnimationFrame(tick);
  };

  const play = (from: number): void => {
    if (playback === null || state.audio === null) {
      return;
    }
    playback.setBuffer(state.audio.buffer);
    playback.play(from, {
      rate: Number(el.rateInput?.value ?? "1"),
      loop: el.loopInput?.checked === true ? loopRegionOf(state) : null,
    });
    deps.updateTransport();
    stopAnimation();
    animation = requestAnimationFrame(tick);
  };

  const togglePlay = (): void => {
    if (playback === null) {
      return;
    }
    if (playback.isPlaying()) {
      state.cursor = playback.position();
      playback.stop();
      stopAnimation();
      deps.updateTransport();
      deps.updateCursor();
      deps.renderCanvas();
      return;
    }
    play(state.cursor);
  };

  const stop = (): void => {
    playback?.stop();
    stopAnimation();
    deps.updateTransport();
  };

  return {
    decoder,
    isPlaying: () => playback?.isPlaying() ?? false,
    setBuffer: (buffer) => {
      playback?.setBuffer(buffer);
    },
    play,
    togglePlay,
    stop,
  };
};
