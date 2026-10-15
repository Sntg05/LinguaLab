import type { G2PRule } from "../../domain/g2p-rule";
import type { OrthographyTable } from "../../domain/orthography-table";
import { orthographyTableFromJson, orthographyTableToJson } from "../../data/table-json";
import type {
  OrthographyRepositoryError,
  OrthographyRepositoryPort,
  OrthographyTableSummary,
} from "../../ports/orthography-repository";
import { err, ok, type Result } from "../../result";

/**
 * Repositorio de tablas en memoria.
 *
 * Es el fake del puerto y, a la vez, una implementacion de referencia: guarda
 * por identificador y delega la serializacion en el formato compartido del
 * nucleo (`data/table-json`), de modo que exportar desde aqui e importar en
 * IndexedDB no puedan discrepar.
 */

const cloneRule = (rule: G2PRule): G2PRule => ({
  grapheme: rule.grapheme,
  ipa: rule.ipa,
  ...(rule.before !== undefined ? { before: rule.before } : {}),
  ...(rule.after !== undefined ? { after: rule.after } : {}),
  ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
  ...(rule.note !== undefined ? { note: rule.note } : {}),
});

const cloneClasses = (
  classes: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> => {
  const copy: Record<string, readonly string[]> = {};
  for (const [name, members] of Object.entries(classes)) {
    copy[name] = [...members];
  }
  return copy;
};

const cloneTable = (table: OrthographyTable): OrthographyTable => ({
  id: table.id,
  languageId: table.languageId,
  name: table.name,
  version: table.version,
  classes: cloneClasses(table.classes),
  rules: table.rules.map(cloneRule),
  ...(table.allophonic !== undefined ? { allophonic: table.allophonic.map(cloneRule) } : {}),
  ...(table.notes !== undefined ? { notes: table.notes } : {}),
  status: table.status,
});

export class InMemoryOrthographyRepository implements OrthographyRepositoryPort {
  private readonly tables = new Map<string, OrthographyTable>();

  constructor(seed: readonly OrthographyTable[] = []) {
    for (const table of seed) {
      this.tables.set(table.id, cloneTable(table));
    }
  }

  async list(): Promise<Result<readonly OrthographyTableSummary[], OrthographyRepositoryError>> {
    const summaries = [...this.tables.values()].map((table) => ({
      id: table.id,
      name: table.name,
      languageId: table.languageId,
      status: table.status,
      ruleCount: table.rules.length,
    }));
    return ok(summaries);
  }

  async get(id: string): Promise<Result<OrthographyTable | null, OrthographyRepositoryError>> {
    const table = this.tables.get(id);
    return ok(table === undefined ? null : cloneTable(table));
  }

  async save(
    table: OrthographyTable,
  ): Promise<Result<OrthographyTable, OrthographyRepositoryError>> {
    this.tables.set(table.id, cloneTable(table));
    return ok(cloneTable(table));
  }

  async remove(id: string): Promise<Result<void, OrthographyRepositoryError>> {
    if (!this.tables.has(id)) {
      return err({ code: "not-found", id });
    }
    this.tables.delete(id);
    return ok(undefined);
  }

  async exportJson(id: string): Promise<Result<string, OrthographyRepositoryError>> {
    const table = this.tables.get(id);
    if (table === undefined) {
      return err({ code: "not-found", id });
    }
    return ok(orthographyTableToJson(table));
  }

  async importJson(text: string): Promise<Result<OrthographyTable, OrthographyRepositoryError>> {
    const parsed = orthographyTableFromJson(text);
    if (!parsed.ok) {
      return err(parsed.error);
    }
    this.tables.set(parsed.value.id, cloneTable(parsed.value));
    return ok(cloneTable(parsed.value));
  }
}
