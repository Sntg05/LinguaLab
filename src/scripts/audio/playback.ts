/* ============================================================
   LinguaLab — reproduccion con Web Audio

   `AudioBufferSourceNode` con velocidad ajustable y bucle de la seleccion. Un
   nodo de fuente no se puede reutilizar: cada `start()` crea uno nuevo, y por eso
   el estado —desde donde suena y desde que instante del reloj de audio— se
   guarda al lado y se usa para calcular la posicion.

   La posicion NO se toma de `AudioContext.currentTime` directamente: se guarda el
   desfase entre el reloj del audio y el instante del buffer al arrancar. Asi la
   velocidad de reproduccion no descoloca el cursor.
   ============================================================ */

/** Tramo que se repite cuando el bucle esta activo. */
export interface LoopRegion {
  readonly start: number;
  readonly end: number;
}

export interface PlayOptions {
  readonly rate: number;
  readonly loop: LoopRegion | null;
}

export interface Playback {
  /** Cambiar de buffer detiene lo que este sonando: dos audios a la vez no se anotan. */
  setBuffer(buffer: AudioBuffer | null): void;
  readonly hasBuffer: () => boolean;
  readonly duration: () => number;
  play(from: number, options: PlayOptions): void;
  stop(): void;
  readonly isPlaying: () => boolean;
  /** Posicion actual en segundos; durante la pausa, la ultima alcanzada. */
  readonly position: () => number;
  onEnded(listener: () => void): void;
}

export const createPlayback = (context: AudioContext): Playback => {
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let offset = 0;
  let startedAt = 0;
  let rate = 1;
  let loop: LoopRegion | null = null;
  let listeners: (() => void)[] = [];

  const position = (): number => {
    if (source === null) {
      return offset;
    }
    const elapsed = (context.currentTime - startedAt) * rate;
    const raw = offset + elapsed;
    if (loop !== null) {
      const span = loop.end - loop.start;
      if (span > 0 && raw >= loop.start) {
        return loop.start + ((raw - loop.start) % span);
      }
    }
    return Math.min(raw, buffer?.duration ?? raw);
  };

  const stopSource = (): void => {
    if (source === null) {
      return;
    }
    const current = source;
    source = null;
    current.onended = null;
    try {
      current.stop();
    } catch {
      // `stop()` sobre una fuente ya detenida lanza en algunos navegadores.
    }
    current.disconnect();
  };

  return {
    setBuffer: (next) => {
      stopSource();
      buffer = next;
      offset = 0;
    },

    hasBuffer: () => buffer !== null,

    duration: () => buffer?.duration ?? 0,

    play: (from, options) => {
      if (buffer === null) {
        return;
      }
      stopSource();
      void context.resume();

      rate = options.rate > 0 ? options.rate : 1;
      loop = options.loop;
      offset = Math.min(Math.max(from, 0), buffer.duration);

      const node = context.createBufferSource();
      node.buffer = buffer;
      node.playbackRate.value = rate;

      if (loop !== null && loop.end > loop.start) {
        node.loop = true;
        node.loopStart = loop.start;
        node.loopEnd = Math.min(loop.end, buffer.duration);
        if (offset < loop.start || offset >= loop.end) {
          offset = loop.start;
        }
      }

      node.connect(context.destination);
      node.onended = () => {
        if (source === node) {
          source = null;
          offset = Math.min(offset, buffer?.duration ?? offset);
        }
        for (const listener of listeners) {
          listener();
        }
      };
      source = node;
      startedAt = context.currentTime;
      node.start(0, offset);
    },

    stop: () => {
      offset = position();
      stopSource();
      for (const listener of listeners) {
        listener();
      }
    },

    isPlaying: () => source !== null,

    position,

    onEnded: (listener) => {
      listeners = [...listeners, listener];
    },
  };
};
