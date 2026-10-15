import type { AnnotationDocument } from "../../domain/annotation";
import type { TextGridCodecPort, TextGridError } from "../../ports/textgrid-codec";
import { err, ok, type Result } from "../../result";

const EMPTY_DOCUMENT: AnnotationDocument = { tiers: [], xmin: 0, xmax: 0 };

/**
 * Codec TextGrid de mentira.
 *
 * No interpreta bytes: un fake de codec no tiene por que implementar Praat.
 * Lo que si respeta es la discriminacion del contrato —bytes vacios son
 * `empty`— y la serializacion determinista, que es lo que un caso de uso
 * consume.
 */
export class InMemoryTextGridCodec implements TextGridCodecPort {
  private readonly document: AnnotationDocument;

  constructor(document: AnnotationDocument = EMPTY_DOCUMENT) {
    this.document = document;
  }

  parse(bytes: Uint8Array): Result<AnnotationDocument, TextGridError> {
    if (bytes.length === 0) {
      return err({ code: "empty" });
    }
    return ok(this.document);
  }

  serialize(doc: AnnotationDocument): string {
    return JSON.stringify(doc);
  }
}
