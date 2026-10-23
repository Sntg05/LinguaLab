import type { AnnotationDocument } from "../domain/annotation";
import { isIntervalTier } from "../domain/annotation-edit";
import type { AnnotationStorageError, AnnotationStoragePort } from "../ports/annotation-storage";
import type { ClockPort } from "../ports/clock";
import { err, ok, type Result } from "../result";

/**
 * Casos de uso del proyecto de anotacion: guardar, cargar y listar.
 *
 * POR QUE UN CASO DE USO Y NO UNA LLAMADA DIRECTA AL PUERTO
 *
 * Guardar parece `storage.save(id, doc)` y no lo es: hay que decidir que un
 * identificador vacio es un error, hay que saber CUANDO se guardo —el aviso de
 * autoguardado que ve la persona es esa fecha— y hay que poder resumir que
 * contiene lo guardado sin abrir la base de datos. Todo eso es decision, no
 * persistencia, y por eso vive aqui y no en el adaptador.
 */

/** Lo que la interfaz necesita para decir «guardado»: que y cuando. */
export interface AnnotationProjectSnapshot {
  readonly projectId: string;
  readonly document: AnnotationDocument;
  readonly savedAt: Date;
  readonly tierCount: number;
  readonly intervalCount: number;
  readonly pointCount: number;
}

export interface AnnotationSummary {
  readonly tierCount: number;
  readonly intervalCount: number;
  readonly pointCount: number;
}

/** Conteo de lo anotado. Los puntos y los intervalos se cuentan aparte. */
export const summarizeAnnotation = (doc: AnnotationDocument): AnnotationSummary => {
  let intervalCount = 0;
  let pointCount = 0;

  for (const tier of doc.tiers) {
    if (isIntervalTier(tier)) {
      intervalCount += tier.items.length;
    } else {
      pointCount += tier.points.length;
    }
  }

  return { tierCount: doc.tiers.length, intervalCount, pointCount };
};

export interface SaveAnnotationProjectDeps {
  readonly storage: AnnotationStoragePort;
  readonly clock: ClockPort;
}

/**
 * Guarda y devuelve el resumen del guardado.
 *
 * Un identificador vacio no es un identificador valido y no se escribe: sin esta
 * comprobacion, un campo de nombre borrado guardaria el proyecto bajo la clave
 * `""` y el siguiente guardado lo pisaria sin que nadie lo notara.
 */
export const createSaveAnnotationProject =
  ({ storage, clock }: SaveAnnotationProjectDeps) =>
  async (
    projectId: string,
    doc: AnnotationDocument,
  ): Promise<Result<AnnotationProjectSnapshot, AnnotationStorageError>> => {
    if (projectId.trim() === "") {
      return err({ code: "unknown", detail: "El proyecto necesita un nombre para guardarse." });
    }

    const saved = await storage.save(projectId, doc);
    if (!saved.ok) {
      return saved;
    }

    return ok({
      projectId,
      document: doc,
      savedAt: clock.now(),
      ...summarizeAnnotation(doc),
    });
  };

/** Carga el documento guardado, o `null` si ese proyecto todavia no existe. */
export const createLoadAnnotationProject =
  ({ storage }: { readonly storage: AnnotationStoragePort }) =>
  async (projectId: string): Promise<Result<AnnotationDocument | null, AnnotationStorageError>> =>
    storage.load(projectId);

/** Los proyectos que hay en este navegador. */
export const createListAnnotationProjects =
  ({ storage }: { readonly storage: AnnotationStoragePort }) =>
  async (): Promise<Result<readonly string[], AnnotationStorageError>> =>
    storage.list();
