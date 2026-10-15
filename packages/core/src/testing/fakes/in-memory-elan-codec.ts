import type { AnnotationDocument } from "../../domain/annotation";
import type { ElanCodecPort, ElanError } from "../../ports/elan-codec";
import { err, ok, type Result } from "../../result";

const EMPTY_DOCUMENT: AnnotationDocument = { tiers: [], xmin: 0, xmax: 0 };

/** Codec ELAN de mentira, con la misma forma que el de TextGrid pero asincrono. */
export class InMemoryElanCodec implements ElanCodecPort {
  private readonly document: AnnotationDocument;

  constructor(document: AnnotationDocument = EMPTY_DOCUMENT) {
    this.document = document;
  }

  async parse(bytes: Uint8Array): Promise<Result<AnnotationDocument, ElanError>> {
    if (bytes.length === 0) {
      return err({ code: "empty" });
    }
    return ok(this.document);
  }

  async serialize(doc: AnnotationDocument): Promise<Result<string, ElanError>> {
    return ok(JSON.stringify(doc));
  }
}
