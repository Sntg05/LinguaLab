import type { AcousticTrack } from "../../domain/acoustic";
import type {
  AcousticAnalysisPort,
  AcousticError,
  FormantParams,
  IntensityParams,
  PitchParams,
} from "../../ports/acoustic-analysis";
import type { DecodedAudio } from "../../ports/audio-decoder";
import { err, ok, type Result } from "../../result";

const FLAT_TRACK: AcousticTrack = { kind: "f0", times: [0], values: [0] };

export interface InMemoryAcousticAnalysisOptions {
  readonly available?: boolean;
  readonly track?: AcousticTrack;
}

/**
 * Analisis acustico de mentira. `available: false` reproduce el caso que la
 * especificacion obliga a manejar: el modulo WebAssembly no compilo para el
 * navegador, y la herramienta debe degradar con un aviso, no romperse.
 */
export class InMemoryAcousticAnalysis implements AcousticAnalysisPort {
  private readonly available: boolean;
  private readonly track: AcousticTrack;

  constructor(options: InMemoryAcousticAnalysisOptions = {}) {
    this.available = options.available ?? true;
    this.track = options.track ?? FLAT_TRACK;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async pitch(
    _audio: DecodedAudio,
    _params: PitchParams,
  ): Promise<Result<AcousticTrack, AcousticError>> {
    if (!this.available) {
      return err({ code: "unavailable", detail: "fake sin analisis" });
    }
    return ok(this.track);
  }

  async formants(
    _audio: DecodedAudio,
    _params: FormantParams,
  ): Promise<Result<readonly AcousticTrack[], AcousticError>> {
    if (!this.available) {
      return err({ code: "unavailable", detail: "fake sin analisis" });
    }
    return ok([this.track]);
  }

  async intensity(
    _audio: DecodedAudio,
    _params: IntensityParams,
  ): Promise<Result<AcousticTrack, AcousticError>> {
    if (!this.available) {
      return err({ code: "unavailable", detail: "fake sin analisis" });
    }
    return ok(this.track);
  }
}
