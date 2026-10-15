import type { AudioDecoderError, AudioDecoderPort, DecodedAudio } from "../../ports/audio-decoder";
import { err, ok, type Result } from "../../result";

const SILENCE: DecodedAudio = {
  sampleRate: 16000,
  channels: [new Float32Array(0)],
  durationSeconds: 0,
};

/** Decodificador de audio de mentira: devuelve una senal fija o falla si no hay bytes. */
export class InMemoryAudioDecoder implements AudioDecoderPort {
  private readonly audio: DecodedAudio;

  constructor(audio: DecodedAudio = SILENCE) {
    this.audio = audio;
  }

  async decode(
    bytes: ArrayBuffer,
    _mimeType?: string,
  ): Promise<Result<DecodedAudio, AudioDecoderError>> {
    if (bytes.byteLength === 0) {
      return err({ code: "decode-failed", detail: "fake sin datos de audio" });
    }
    return ok(this.audio);
  }
}
