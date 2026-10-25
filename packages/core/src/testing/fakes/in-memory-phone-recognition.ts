import type {
  DecodedAudio,
  PhoneRecognitionError,
  PhoneRecognitionParams,
  PhoneRecognitionPort,
  RecognizedPhone,
} from "../../ports/index";
import { err, ok, type Result } from "../../result";

/**
 * Fake del puerto de reconocimiento de fonos.
 *
 * Sirve para dos cosas mientras el servicio sea solo una propuesta: comprobar
 * que el contrato se puede implementar sin inventar nada, y dejar a mano un
 * doble determinista para el dia que alguien escriba la interfaz. Por defecto
 * responde `unavailable`, que es la verdad del sitio hoy; `available` y
 * `phones` existen para probar el camino feliz sin red.
 */
export interface InMemoryPhoneRecognitionOptions {
  /** Si el fake se declara disponible. Falso por defecto, como el sitio real. */
  readonly available?: boolean;
  /** Fonos que devuelve cuando esta disponible. */
  readonly phones?: readonly RecognizedPhone[];
  /** Duracion maxima aceptada, en segundos. Inexistente = sin limite. */
  readonly maxDurationSeconds?: number;
}

export class InMemoryPhoneRecognition implements PhoneRecognitionPort {
  readonly #available: boolean;
  readonly #phones: readonly RecognizedPhone[];
  readonly #maxDurationSeconds: number | undefined;

  constructor(options: InMemoryPhoneRecognitionOptions = {}) {
    this.#available = options.available ?? false;
    this.#phones = options.phones ?? [];
    this.#maxDurationSeconds = options.maxDurationSeconds;
  }

  isAvailable(): boolean {
    return this.#available;
  }

  recognize(
    audio: DecodedAudio,
    _params?: PhoneRecognitionParams,
  ): Promise<Result<readonly RecognizedPhone[], PhoneRecognitionError>> {
    if (!this.#available) {
      return Promise.resolve(
        err({
          code: "unavailable",
          detail: "no hay un servicio de reconocimiento configurado",
        }),
      );
    }

    if (
      this.#maxDurationSeconds !== undefined &&
      audio.durationSeconds > this.#maxDurationSeconds
    ) {
      return Promise.resolve(err({ code: "too-long", durationSeconds: audio.durationSeconds }));
    }

    return Promise.resolve(ok(this.#phones));
  }
}
