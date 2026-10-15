import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable, OrthographyTableStatus } from "../domain/orthography-table";
import type { ClockPort } from "../ports/clock";
import type { IdGeneratorPort } from "../ports/id-generator";
import type {
  OrthographyRepositoryError,
  OrthographyRepositoryPort,
  OrthographyTableSummary,
} from "../ports/orthography-repository";
import { err, ok, type Result } from "../result";
import { validateOrthographyTable, type OrthographyIssue } from "./validate-orthography-table";

/**
 * Casos de uso del ciclo de vida de una tabla de ortografia.
 *
 * Todos reciben el puerto como dependencia explicita y no conocen otra cosa:
 * guardar en IndexedDB, en memoria o en el futuro en un archivo es una
 * decision del adaptador, no de estas funciones.
 */

export const createListOrthographyTables =
  (deps: { readonly tables: OrthographyRepositoryPort }) =>
  (): Promise<Result<readonly OrthographyTableSummary[], OrthographyRepositoryError>> =>
    deps.tables.list();

export const createRemoveOrthographyTable =
  (deps: { readonly tables: OrthographyRepositoryPort }) =>
  (id: string): Promise<Result<void, OrthographyRepositoryError>> =>
    deps.tables.remove(id);

export const createExportOrthographyTable =
  (deps: { readonly tables: OrthographyRepositoryPort }) =>
  (id: string): Promise<Result<string, OrthographyRepositoryError>> =>
    deps.tables.exportJson(id);

export const createImportOrthographyTable =
  (deps: { readonly tables: OrthographyRepositoryPort }) =>
  (text: string): Promise<Result<OrthographyTable, OrthographyRepositoryError>> =>
    deps.tables.importJson(text);

/**
 * Datos de una tabla que se va a guardar.
 *
 * `id` ausente significa tabla nueva; con `id`, el caso de uso actualiza una
 * existente. `version` solo lo aporta quien actualiza: una tabla nueva nace en
 * 1 y no en la version que el formulario arrastre de un borrador anterior.
 */
export interface OrthographyTableDraft {
  readonly id?: string;
  readonly languageId: string;
  readonly name: string;
  readonly version?: number;
  readonly classes: Readonly<Record<string, readonly string[]>>;
  readonly rules: readonly G2PRule[];
  readonly allophonic?: readonly G2PRule[];
  readonly notes?: string;
  readonly status?: OrthographyTableStatus;
}

export type SaveOrthographyTableError =
  | { readonly code: "table-invalid"; readonly issues: readonly OrthographyIssue[] }
  | OrthographyRepositoryError;

export interface SavedOrthographyTable {
  readonly table: OrthographyTable;
  /**
   * Instante ISO 8601 tomado del reloj inyectado. El dominio no guarda una
   * fecha de creacion, asi que el caso de uso la devuelve al llamador en vez
   * de perderla: es el unico lugar donde puede existir sin cambiar la entidad.
   */
  readonly savedAt: string;
}

export const createSaveOrthographyTable =
  (deps: {
    readonly tables: OrthographyRepositoryPort;
    readonly ids: IdGeneratorPort;
    readonly clock: ClockPort;
  }) =>
  async (
    draft: OrthographyTableDraft,
  ): Promise<Result<SavedOrthographyTable, SaveOrthographyTableError>> => {
    const isNew = draft.id === undefined;
    const table: OrthographyTable = {
      id: draft.id ?? deps.ids.generate(),
      languageId: draft.languageId,
      name: draft.name,
      version: draft.version ?? 1,
      classes: draft.classes,
      rules: draft.rules,
      ...(draft.allophonic !== undefined ? { allophonic: draft.allophonic } : {}),
      ...(draft.notes !== undefined ? { notes: draft.notes } : {}),
      status: draft.status ?? "draft",
    };

    // La validacion es la puerta de creacion: una tabla nueva con errores no
    // debe llegar al almacenamiento. Una actualizacion puede guardar un
    // borrador con avisos, porque obligar a completar la tabla para guardar
    // perderia el trabajo de quien esta a medio editarla.
    if (isNew) {
      const errors = validateOrthographyTable(table).filter((issue) => issue.severity === "error");
      if (errors.length > 0) {
        return err({ code: "table-invalid", issues: errors });
      }
    }

    const saved = await deps.tables.save(table);
    if (!saved.ok) {
      return err(saved.error);
    }

    return ok({ table: saved.value, savedAt: deps.clock.now().toISOString() });
  };
