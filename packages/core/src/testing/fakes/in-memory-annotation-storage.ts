import type { AnnotationDocument } from "../../domain/annotation";
import type { AnnotationStorageError, AnnotationStoragePort } from "../../ports/annotation-storage";
import { ok, type Result } from "../../result";

/** Almacen de anotaciones en memoria, por identificador de proyecto. */
export class InMemoryAnnotationStorage implements AnnotationStoragePort {
  private readonly documents = new Map<string, AnnotationDocument>();

  async load(
    projectId: string,
  ): Promise<Result<AnnotationDocument | null, AnnotationStorageError>> {
    return ok(this.documents.get(projectId) ?? null);
  }

  async save(
    projectId: string,
    doc: AnnotationDocument,
  ): Promise<Result<void, AnnotationStorageError>> {
    this.documents.set(projectId, doc);
    return ok(undefined);
  }

  async list(): Promise<Result<readonly string[], AnnotationStorageError>> {
    return ok([...this.documents.keys()]);
  }

  async remove(projectId: string): Promise<Result<void, AnnotationStorageError>> {
    this.documents.delete(projectId);
    return ok(undefined);
  }
}
